import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import locations from '../shared/locations.json' with { type: 'json' };

// Usage: node scripts/import-hospitals.ts <health_facilities.geojson>
// The file is the OpenStreetMap health-facility export of Bangladesh from the Humanitarian
// OpenStreetMap Team (https://data.humdata.org/dataset/hotosm_bgd_health_facilities), ODbL licence.
// It is large and changes often, so it is downloaded rather than kept in the repository.
// data/hospitals/common-hospitals.json is our own list of well-known hospitals, by district name,
// added so that they are found even if the OpenStreetMap volunteers have not mapped them.
const input = process.argv[2];
if (!input) throw new Error('Pass the path of health_facilities.geojson');
const commonFile = path.join(import.meta.dirname, '../data/hospitals/common-hospitals.json');
const output = path.join(import.meta.dirname, '../shared/hospitals.json');

const facility = z.object({
  properties: z.object({
    id: z.string(),
    amenity: z.string().nullable(),
    name: z.string().nullable(),
    name_en: z.string().nullable(),
    name_latin: z.string().nullable(),
    adm1_pcode: z.string().nullable(),
    adm2_pcode: z.string().nullable(),
    adm3_name: z.string().nullable(),
  }),
});
const file = z.object({ features: z.array(facility) });

const bengaliLetters = /[\u0980-\u09FF]/;
// Volunteers also tag pharmacies, shops and test entries as hospitals; real hospitals say what they are.
const hospitalWord =
  /hospital|medical|clinic|health|complex|institute|college|cent(re|er)|sanatorium|infirmary|maternity|diagnostic|nursing|sadar/i;
const notAHospital = /pharmacy|medicine|drug|store|vet\b|veterinary|dental|community clinic/i;
const maxNameLength = 80;

function cleanName(properties: z.infer<typeof facility>['properties']): string | null {
  const candidates = [properties.name_en, properties.name, properties.name_latin];
  const name = candidates.find((candidate) => candidate && !bengaliLetters.test(candidate));
  if (!name) return null;
  // Mappers often append a transliteration "(...)" or the type and address after a comma, e.g.
  // "Asia General Hospital, Hospital, Green Road, Dhaka"; the name is what comes before.
  const cleaned = (name.split(',')[0] ?? '')
    .replace(/\(.*?\)/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  // A single word such as "Hospital" says nothing about which one it is.
  if (!cleaned.includes(' ') || cleaned.length > maxNameLength) return null;
  if (!hospitalWord.test(cleaned) || notAHospital.test(cleaned)) return null;
  return cleaned;
}

const divisionIds = new Set(locations.divisions.map((division) => division.id));
const districtById = new Map(locations.districts.map((district) => [district.id, district]));
const areaIdByName = new Map(
  locations.areas.map((area) => [`${area.districtId}:${area.name.toLowerCase()}`, area.id]),
);

const slug = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const { features } = file.parse(JSON.parse(await readFile(input, 'utf8')));
type Hospital = {
  id: string;
  name: string;
  divisionId: string;
  districtId: string;
  areaId: string | null;
};
const hospitals = new Map<string, Hospital>();
for (const { properties } of features) {
  if (properties.amenity !== 'hospital') continue;
  const name = cleanName(properties);
  const district = districtById.get(properties.adm2_pcode ?? '');
  if (!name || !district || !divisionIds.has(district.divisionId)) continue;
  const areaId = areaIdByName.get(`${district.id}:${properties.adm3_name?.toLowerCase()}`) ?? null;
  // One entry per name and district: OpenStreetMap often maps a hospital as a node and a building.
  hospitals.set(`${name.toLowerCase()}:${district.id}`, {
    id: properties.id,
    name,
    divisionId: district.divisionId,
    districtId: district.id,
    areaId,
  });
}

// Added last, so that a name OpenStreetMap already has keeps its mapped location.
const commonHospitals = z
  .record(z.string(), z.array(z.string().trim().min(1)))
  .parse(JSON.parse(await readFile(commonFile, 'utf8')));
const districtByName = new Map(locations.districts.map((district) => [district.name, district]));
for (const [districtName, names] of Object.entries(commonHospitals)) {
  const district = districtByName.get(districtName);
  if (!district) throw new Error(`common-hospitals.json names unknown district ${districtName}`);
  for (const name of names) {
    const key = `${name.toLowerCase()}:${district.id}`;
    if (hospitals.has(key)) continue;
    hospitals.set(key, {
      id: `${district.id}-${slug(name)}`,
      name,
      divisionId: district.divisionId,
      districtId: district.id,
      areaId: null,
    });
  }
}

const sorted = [...hospitals.values()].sort((a, b) => a.name.localeCompare(b.name));
await writeFile(output, `${JSON.stringify(sorted, null, 2)}\n`);
console.log(`Wrote ${sorted.length} hospitals to shared/hospitals.json`);
