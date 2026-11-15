import data from './locations.json' with { type: 'json' };

export type Division = { id: string; name: string };
export type District = { id: string; divisionId: string; name: string };
export type Upazila = { id: string; districtId: string; name: string };

export type Location = { divisionId: string; districtId: string; upazilaId: string };

export const divisions: Division[] = data.divisions;
export const districts: District[] = data.districts;
export const upazilas: Upazila[] = data.upazilas;

const districtById = new Map(districts.map((district) => [district.id, district]));
const upazilaById = new Map(upazilas.map((upazila) => [upazila.id, upazila]));
const nameById = new Map(
  [...divisions, ...districts, ...upazilas].map((zone) => [zone.id, zone.name]),
);

export function districtsOf(divisionId: string): District[] {
  return districts.filter((district) => district.divisionId === divisionId);
}

export function upazilasOf(districtId: string): Upazila[] {
  return upazilas.filter((upazila) => upazila.districtId === districtId);
}

export function zoneName(id: string): string {
  return nameById.get(id) ?? 'Unknown';
}

export function isValidLocation({ divisionId, districtId, upazilaId }: Location): boolean {
  const district = districtById.get(districtId);
  const upazila = upazilaById.get(upazilaId);
  return district?.divisionId === divisionId && upazila?.districtId === districtId;
}
