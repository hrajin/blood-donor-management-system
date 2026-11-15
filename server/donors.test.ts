import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { after, before, test } from 'node:test';
import mongoose from 'mongoose';
import { addDays, bangladeshDate } from '../shared/bangladesh-time.ts';
import type { BloodRequest, SuggestionResult } from '../shared/blood-request.ts';
import type { DashboardStats } from '../shared/dashboard.ts';
import type { ApiErrorBody, Donor, DonorInput, DonorPage } from '../shared/donor.ts';
import { builtInAreasOf, districts, districtsOf } from '../shared/locations.ts';
import { createApp } from './app.ts';
import { AreaModel } from './area-model.ts';
import { BloodRequestModel } from './blood-request-model.ts';
import { loadConfig } from './config.ts';
import { DonorModel } from './donor-model.ts';

const config = loadConfig({
  NODE_ENV: 'test',
  MONGODB_URI: process.env.TEST_MONGODB_URI ?? 'mongodb://127.0.0.1:27027/bdms_test',
  SESSION_SECRET: 'test-only-session-secret-0123456789abcdef',
  ADMIN_EMAIL: 'admin@example.com',
  ADMIN_PASSWORD: 'test-only-password',
});

let server: Server;
let baseUrl: string;

before(async () => {
  await mongoose.connect(config.MONGODB_URI);
  await mongoose.connection.dropDatabase();
  await DonorModel.init();
  await BloodRequestModel.init();
  await AreaModel.init();
  server = createApp(config).listen(0);
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
});

after(async () => {
  // Resolves once in-flight responses finish, including session writes after the body is sent.
  await server[Symbol.asyncDispose]();
  await mongoose.disconnect();
});

async function signIn(password = config.ADMIN_PASSWORD): Promise<Response> {
  return fetch(`${baseUrl}/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: config.ADMIN_EMAIL, password }),
  });
}

async function adminCookie(): Promise<string> {
  const response = await signIn();
  assert.equal(response.status, 204);
  const cookie = response.headers.getSetCookie()[0];
  assert.ok(cookie);
  return cookie.split(';')[0] ?? '';
}

function send(cookie: string, method: string, path: string, body?: unknown): Promise<Response> {
  return fetch(`${baseUrl}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function locationIn(districtIndex: number) {
  const district = districts[districtIndex];
  const area = district && builtInAreasOf(district.id)[0];
  assert.ok(district && area, 'location data is loaded');
  return { divisionId: district.divisionId, districtId: district.id, areaId: area.id };
}

function donor(phone: string, districtIndex: number): DonorInput {
  return {
    name: `Donor ${phone}`,
    phone,
    email: null,
    dateOfBirth: '1995-06-15',
    gender: 'female',
    // NIDs must be unique too; deriving them from the phone keeps the two in step.
    nidNumber: phone.slice(1),
    presentAddress: 'House 1, Road 1',
    permanentAddress: 'House 1, Road 1',
    bloodGroup: 'O+',
    available: true,
    donationCount: 0,
    lastDonatedAt: null,
    ...locationIn(districtIndex),
  };
}

test('donor routes require an admin session', async () => {
  const response = await fetch(`${baseUrl}/donors`);
  assert.equal(response.status, 401);
});

test('a wrong password does not sign in', async () => {
  const response = await signIn('not-the-password');
  assert.equal(response.status, 401);
  assert.equal(response.headers.getSetCookie().length, 0);
});

test('adds donors, filters them by zone and changes availability', async () => {
  const cookie = await adminCookie();
  const created = await send(cookie, 'POST', '/donors', donor('01711111111', 0));
  assert.equal(created.status, 201);
  const first = (await created.json()) as Donor;
  const otherDistrict = districts.findIndex((d) => d.divisionId !== first.divisionId);
  assert.equal(
    (await send(cookie, 'POST', '/donors', donor('01822222222', otherDistrict))).status,
    201,
  );

  const inDistrict = (await (
    await send(cookie, 'GET', `/donors?districtId=${first.districtId}`)
  ).json()) as DonorPage;
  assert.deepEqual(
    inDistrict.donors.map((d) => d.phone),
    ['01711111111'],
  );

  const toggled = await send(cookie, 'PATCH', `/donors/${first.id}/availability`, {
    available: false,
  });
  assert.equal(toggled.status, 200);

  const available = (await (
    await send(cookie, 'GET', `/donors?divisionId=${first.divisionId}&available=true`)
  ).json()) as DonorPage;
  assert.equal(available.total, 0);
});

test('rejects an area that is not in the chosen district', async () => {
  const cookie = await adminCookie();
  const mismatched = { ...donor('01933333333', 0), areaId: locationIn(1).areaId };

  const response = await send(cookie, 'POST', '/donors', mismatched);
  assert.equal(response.status, 400);
  const body = (await response.json()) as { fields: Record<string, string> };
  assert.ok(body.fields.areaId);
});

test('rejects a second donor with the same phone number or NID', async () => {
  const cookie = await adminCookie();
  const first = donor('01544444444', 0);
  assert.equal((await send(cookie, 'POST', '/donors', first)).status, 201);

  const samePhone = await send(cookie, 'POST', '/donors', {
    ...donor('01544444444', 1),
    nidNumber: '9999999999',
  });
  assert.equal(samePhone.status, 409);
  assert.ok(((await samePhone.json()) as ApiErrorBody).fields?.phone);

  const sameNid = await send(cookie, 'POST', '/donors', {
    ...donor('01577777777', 1),
    nidNumber: first.nidNumber,
  });
  assert.equal(sameNid.status, 409);
  assert.ok(((await sameNid.json()) as ApiErrorBody).fields?.nidNumber);
});

test('the dashboard counts donors by blood group and month, and lists top donors', async () => {
  assert.equal((await fetch(`${baseUrl}/dashboard`)).status, 401);
  const cookie = await adminCookie();
  const unavailable = { ...donor('01655555555', 0), bloodGroup: 'AB-', available: false };
  const available = {
    ...donor('01666666666', 0),
    bloodGroup: 'AB-',
    donationCount: 7,
    lastDonatedAt: '2025-01-15',
  };
  assert.equal((await send(cookie, 'POST', '/donors', unavailable)).status, 201);
  assert.equal((await send(cookie, 'POST', '/donors', available)).status, 201);

  const response = await send(cookie, 'GET', '/dashboard');
  assert.equal(response.status, 200);
  const stats = (await response.json()) as DashboardStats;
  const registered = await DonorModel.countDocuments();
  assert.equal(stats.totals.registered, registered);
  assert.equal(stats.totals.newLast30Days, registered);
  assert.deepEqual(
    stats.byBloodGroup.find((count) => count.bloodGroup === 'AB-'),
    {
      bloodGroup: 'AB-',
      available: 1,
      unavailable: 1,
    },
  );
  assert.equal(stats.byBloodGroup.length, 8);
  assert.equal(stats.registrationsByMonth.length, 6);
  assert.equal(stats.registrationsByMonth.at(-1)?.count, registered);
  assert.deepEqual(
    stats.topDonors.map((top) => [top.name, top.donationCount, top.lastDonatedAt]),
    [[available.name, 7, '2025-01-15']],
  );
});

test('sorts donors by availability and by last donation', async () => {
  const cookie = await adminCookie();
  const list = async (sort: string) =>
    ((await (await send(cookie, 'GET', `/donors?sort=${sort}`)).json()) as DonorPage).donors;

  const byAvailability = await list('availability');
  const firstUnavailable = byAvailability.findIndex((d) => !d.available);
  assert.ok(firstUnavailable > 0, 'there are available and unavailable donors');
  assert.ok(byAvailability.slice(firstUnavailable).every((d) => !d.available));

  const byDonation = await list('lastDonation');
  assert.equal(byDonation[0]?.lastDonatedAt, '2025-01-15');
  assert.equal(byDonation.at(-1)?.lastDonatedAt, null);

  assert.equal((await send(cookie, 'GET', '/donors?sort=unknown')).status, 400);
});

test('suggests eligible donors nearest first, and a recorded donation fulfils the request', async () => {
  const cookie = await adminCookie();
  const district = districts.find(
    (d) => builtInAreasOf(d.id).length > 1 && districtsOf(d.divisionId).length > 1,
  );
  const neighbour = district && districtsOf(district.divisionId).find((d) => d.id !== district.id);
  const [area, otherArea] = district ? builtInAreasOf(district.id) : [];
  const neighbourArea = neighbour && builtInAreasOf(neighbour.id)[0];
  assert.ok(district && neighbour && area && otherArea && neighbourArea);
  const today = bangladeshDate(new Date());
  const at = (areaId: string, districtId: string) => ({
    divisionId: district.divisionId,
    districtId,
    areaId,
  });

  async function addDonor(phone: string, changes: Partial<DonorInput>): Promise<Donor> {
    const response = await send(cookie, 'POST', '/donors', {
      ...donor(phone, 0),
      bloodGroup: 'B-',
      ...changes,
    });
    assert.equal(response.status, 201);
    return (await response.json()) as Donor;
  }
  const sameArea = await addDonor('01910000001', at(area.id, district.id));
  const sameDivision = await addDonor('01910000002', {
    ...at(neighbourArea.id, neighbour.id),
    donationCount: 3,
    lastDonatedAt: addDays(today, -200),
  });
  await addDonor('01910000003', {
    ...at(otherArea.id, district.id),
    donationCount: 1,
    lastDonatedAt: addDays(today, -30),
  });
  await addDonor('01910000004', { ...at(area.id, district.id), available: false });
  await addDonor('01910000005', { ...at(area.id, district.id), bloodGroup: 'A+' });

  const created = await send(cookie, 'POST', '/requests', {
    patientName: 'Test Patient',
    bloodGroup: 'B-',
    component: 'whole-blood',
    unitsRequired: 1,
    urgency: 'emergency',
    requiredOn: today,
    hospitalName: 'Test Hospital',
    hospitalAddress: null,
    ward: null,
    ...at(area.id, district.id),
    reason: null,
    contactName: 'Test Contact',
    contactPhone: '01399999999',
    relationship: 'family',
    notes: null,
  });
  assert.equal(created.status, 201);
  const request = (await created.json()) as BloodRequest;
  assert.match(request.code, /^RQ-\d{6}-\d{4}$/);

  const result = (await (
    await send(cookie, 'GET', `/requests/${request.id}/suggestions`)
  ).json()) as SuggestionResult;
  assert.deepEqual(
    result.suggestions.map((s) => [s.donor.id, s.tier]),
    [
      [sameArea.id, 1],
      [sameDivision.id, 3],
    ],
  );
  assert.equal(result.excluded.recentlyDonated, 1);
  assert.equal(result.excluded.unavailable, 1);

  const donation = await send(
    cookie,
    'POST',
    `/requests/${request.id}/responses/${sameArea.id}/donation`,
  );
  assert.equal(donation.status, 200);
  assert.equal(((await donation.json()) as BloodRequest).status, 'fulfilled');
  const donorAfter = (await (await send(cookie, 'GET', `/donors/${sameArea.id}`)).json()) as Donor;
  assert.equal(donorAfter.donationCount, 1);
  assert.equal(donorAfter.lastDonatedAt, today);

  const late = await send(cookie, 'PUT', `/requests/${request.id}/responses/${sameDivision.id}`, {
    status: 'agreed',
  });
  assert.equal(late.status, 409);
});

test('admins can add an area once, and donors there are suggested first', async () => {
  const cookie = await adminCookie();
  const district = districts.find((d) => builtInAreasOf(d.id).length > 0);
  const builtIn = district && builtInAreasOf(district.id)[0];
  assert.ok(district && builtIn);

  const added = await send(cookie, 'POST', '/areas', {
    districtId: district.id,
    name: 'Test Block C',
  });
  assert.equal(added.status, 201);
  const area = (await added.json()) as { id: string; name: string };
  const again = await send(cookie, 'POST', '/areas', {
    districtId: district.id,
    name: '  test   block c ',
  });
  assert.equal(again.status, 200);
  assert.equal(((await again.json()) as { id: string }).id, area.id);
  const sameAsBuiltIn = await send(cookie, 'POST', '/areas', {
    districtId: district.id,
    name: builtIn.name.toUpperCase(),
  });
  assert.equal(((await sameAsBuiltIn.json()) as { id: string }).id, builtIn.id);

  const place = { divisionId: district.divisionId, districtId: district.id };
  const add = async (phone: string, areaId: string) => {
    const response = await send(cookie, 'POST', '/donors', {
      ...donor(phone, 0),
      ...place,
      areaId,
      bloodGroup: 'AB+',
    });
    assert.equal(response.status, 201);
    return (await response.json()) as Donor;
  };
  const inArea = await add('01920000001', area.id);
  assert.equal(inArea.areaName, 'Test Block C');
  const elsewhere = await add('01920000002', builtIn.id);

  const created = await send(cookie, 'POST', '/requests', {
    patientName: 'Area Patient',
    bloodGroup: 'AB+',
    component: 'whole-blood',
    unitsRequired: 1,
    urgency: 'normal',
    requiredOn: bangladeshDate(new Date()),
    hospitalName: 'Area Hospital',
    hospitalAddress: null,
    ward: null,
    ...place,
    areaId: area.id,
    reason: null,
    contactName: 'Area Contact',
    contactPhone: '01399999998',
    relationship: 'friend',
    notes: null,
  });
  assert.equal(created.status, 201);
  const request = (await created.json()) as BloodRequest;
  const result = (await (
    await send(cookie, 'GET', `/requests/${request.id}/suggestions`)
  ).json()) as SuggestionResult;
  const tiers = new Map(result.suggestions.map((s) => [s.donor.id, s.tier]));
  assert.equal(tiers.get(inArea.id), 1);
  assert.equal(tiers.get(elsewhere.id), 2);
});

test('a donor needs only a name, a mobile number and a blood group', async () => {
  const cookie = await adminCookie();
  const minimal = (phone: string) => ({
    name: `Quick ${phone}`,
    phone,
    bloodGroup: 'O-',
    email: null,
    dateOfBirth: null,
    gender: null,
    nidNumber: null,
    divisionId: null,
    districtId: null,
    areaId: null,
    presentAddress: null,
    permanentAddress: null,
    available: true,
    donationCount: 0,
    lastDonatedAt: null,
  });
  // Two donors without an NID: the NID is unique only when it is given.
  assert.equal((await send(cookie, 'POST', '/donors', minimal('01930000001'))).status, 201);
  const second = await send(cookie, 'POST', '/donors', minimal('01930000002'));
  assert.equal(second.status, 201);
  assert.equal(((await second.json()) as Donor).areaName, null);

  const missingBloodGroup = await send(cookie, 'POST', '/donors', {
    ...minimal('01930000003'),
    bloodGroup: null,
  });
  assert.equal(missingBloodGroup.status, 400);
});
