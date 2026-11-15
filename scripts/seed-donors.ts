// Adds sample donors to the database in MONGODB_URI, for trying the app out.
// Usage: pnpm db:seed [count]   (default 500)
import mongoose from 'mongoose';
import { z } from 'zod';
import { DonorModel } from '../server/donor-model.ts';
import { bangladeshDate, shiftYears } from '../shared/bangladesh-time.ts';
import { type BloodGroup, type DonorInput, donorInput, type Gender } from '../shared/donor.ts';
import { builtInAreas, districts, zoneName } from '../shared/locations.ts';

const env = z
  .object({ MONGODB_URI: z.string().min(1), SEED_COUNT: z.coerce.number().int().min(1).max(5000) })
  .parse({ MONGODB_URI: process.env.MONGODB_URI, SEED_COUNT: process.argv[2] ?? '500' });

const dayMs = 24 * 60 * 60 * 1000;
const now = new Date();

const maleNames = [
  'Rahim',
  'Karim',
  'Hasan',
  'Tanvir',
  'Arif',
  'Sakib',
  'Imran',
  'Fahim',
  'Rafiq',
  'Jamal',
  'Nayeem',
  'Shuvo',
  'Mahmud',
  'Rakib',
  'Sohel',
  'Anik',
  'Habib',
  'Zahid',
];
const femaleNames = [
  'Fatema',
  'Ayesha',
  'Nusrat',
  'Sumaiya',
  'Tania',
  'Mim',
  'Farzana',
  'Sadia',
  'Rumana',
  'Jannat',
  'Nasrin',
  'Tasnim',
  'Shirin',
  'Lamia',
  'Sharmin',
  'Ritu',
  'Munni',
  'Afroza',
];
const familyNames = [
  'Ahmed',
  'Hossain',
  'Islam',
  'Rahman',
  'Khan',
  'Chowdhury',
  'Sarker',
  'Akter',
  'Begum',
  'Uddin',
  'Mia',
  'Talukder',
  'Sheikh',
  'Bhuiyan',
  'Mollah',
  'Das',
  'Roy',
  'Barua',
];
const roads = [
  'Road 3',
  'Road 7',
  'Lake Road',
  'College Road',
  'Station Road',
  'Main Road',
  'Hospital Road',
  'Bazar Road',
];

// Roughly the blood group mix of Bangladesh, so rare negatives can show up as shortages.
const bloodGroupWeights: [BloodGroup, number][] = [
  ['B+', 33],
  ['O+', 29],
  ['A+', 26],
  ['AB+', 8],
  ['B-', 1.5],
  ['O-', 1.2],
  ['A-', 0.9],
  ['AB-', 0.4],
];

const pick = <T>(items: readonly T[]): T => {
  const item = items[Math.floor(Math.random() * items.length)];
  if (item === undefined) throw new Error('Cannot pick from an empty list');
  return item;
};
const between = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1));
const digits = (length: number) => Array.from({ length }, () => between(0, 9)).join('');

function weighted<T>(choices: [T, number][]): T {
  let roll = Math.random() * choices.reduce((sum, [, weight]) => sum + weight, 0);
  for (const [choice, weight] of choices) {
    roll -= weight;
    if (roll < 0) return choice;
  }
  const last = choices.at(-1);
  if (!last) throw new Error('No choices');
  return last[0];
}

function unique(make: () => string, taken: Set<string>): string {
  for (;;) {
    const value = make();
    if (!taken.has(value)) {
      taken.add(value);
      return value;
    }
  }
}

type SeedLocation = { divisionId: string; districtId: string; areaId: string; areaName: string };

// Built-in areas include well-known city areas such as Uttara or Agrabad, not just upazilas.
function randomLocation(): SeedLocation {
  const area = pick(builtInAreas);
  const district = districts.find((d) => d.id === area.districtId);
  if (!district) throw new Error(`Area ${area.id} has no district`);
  return {
    divisionId: district.divisionId,
    districtId: district.id,
    areaId: area.id,
    areaName: area.name,
  };
}

function address(location: SeedLocation): string {
  return `House ${between(1, 120)}, ${pick(roads)}, ${location.areaName}, ${zoneName(location.districtId)}`;
}

function sampleDonor(phones: Set<string>, nids: Set<string>): DonorInput & { areaName: string } {
  const gender = weighted<Gender>([
    ['male', 62],
    ['female', 36],
    ['other', 1],
  ]);
  const firstName = pick(gender === 'female' ? femaleNames : maleNames);
  const name = `${firstName} ${pick(familyNames)}`;
  // At least 18 × 365 + 5 days is at least 18 years, whatever the leap years.
  const daysOld = between(18 * 365 + 5, 60 * 365);
  const dateOfBirth = bangladeshDate(new Date(now.getTime() - daysOld * dayMs));

  // A quarter have not donated yet; the rest lean towards a few donations, with some regulars.
  const donationCount = Math.random() < 0.25 ? 0 : 1 + Math.floor(Math.random() ** 2.2 * 40);
  const earliestDonation = Date.parse(shiftYears(dateOfBirth, 16));
  const latestDaysBack = Math.floor((now.getTime() - earliestDonation) / dayMs);
  const lastDonatedAt =
    donationCount === 0
      ? null
      : bangladeshDate(
          new Date(now.getTime() - between(7, Math.min(3 * 365, latestDaysBack)) * dayMs),
        );

  const location = randomLocation();
  const presentAddress = address(location);
  const permanentLocation = Math.random() < 0.5 ? location : randomLocation();

  const donor = donorInput.parse({
    name,
    phone: unique(() => `01${between(3, 9)}${digits(8)}`, phones),
    email:
      Math.random() < 0.6
        ? `${name.toLowerCase().replace(' ', '.')}${between(1, 999)}@example.com`
        : null,
    dateOfBirth,
    gender,
    nidNumber: unique(() => `${between(1, 9)}${digits(9)}`, nids),
    bloodGroup: weighted(bloodGroupWeights),
    ...location,
    presentAddress,
    permanentAddress: permanentLocation === location ? presentAddress : address(permanentLocation),
    available: Math.random() < 0.65,
    donationCount,
    lastDonatedAt,
  });
  return { ...donor, areaName: location.areaName };
}

await mongoose.connect(env.MONGODB_URI);
try {
  await DonorModel.init();
  const existing = await DonorModel.find({}, { phone: 1, nidNumber: 1 }).lean();
  const phones = new Set(existing.map((donor) => donor.phone));
  const nids = new Set(existing.flatMap((donor) => (donor.nidNumber ? [donor.nidNumber] : [])));

  const donors = Array.from({ length: env.SEED_COUNT }, () => {
    // Registered at some point in the last 8 months, so the monthly chart has data.
    const createdAt = new Date(now.getTime() - Math.random() * 240 * dayMs);
    return { ...sampleDonor(phones, nids), createdAt, updatedAt: createdAt };
  });
  // `timestamps: false` keeps the spread-out registration dates set above.
  await DonorModel.insertMany(donors, { timestamps: false });
  console.log(`Added ${donors.length} sample donors`);
} finally {
  await mongoose.disconnect();
}
