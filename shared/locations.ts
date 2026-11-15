import data from './locations.json' with { type: 'json' };

export type Division = { id: string; name: string };
export type District = { id: string; divisionId: string; name: string };
/** A place inside a district: an upazila, a well-known city area, or one an admin added. */
export type Area = { id: string; districtId: string; name: string };

export type Location = { divisionId: string; districtId: string; areaId: string };

export const divisions: Division[] = data.divisions;
export const districts: District[] = data.districts;
/** The built-in areas; areas added by admins are stored in the database. */
export const builtInAreas: Area[] = data.areas;

const districtById = new Map(districts.map((district) => [district.id, district]));
const builtInAreaById = new Map(builtInAreas.map((area) => [area.id, area]));
const nameById = new Map([...divisions, ...districts].map((zone) => [zone.id, zone.name]));

export function districtsOf(divisionId: string): District[] {
  return districts.filter((district) => district.divisionId === divisionId);
}

export function builtInAreasOf(districtId: string): Area[] {
  return builtInAreas.filter((area) => area.districtId === districtId);
}

export function builtInArea(id: string): Area | undefined {
  return builtInAreaById.get(id);
}

/** The name of a division or district. Area names travel with the data that uses them. */
export function zoneName(id: string): string {
  return nameById.get(id) ?? 'Unknown';
}

/** The district belongs to the division. The area is checked on the server, which knows them all. */
export function isValidDistrict({
  divisionId,
  districtId,
}: {
  divisionId: string;
  districtId: string;
}): boolean {
  return districtById.get(districtId)?.divisionId === divisionId;
}

/** Area names compare without regard to case or extra spaces. */
export function areaNameKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** The most precise place known: `Banani, Dhaka`, `Dhaka`, `Dhaka division` or "not recorded". */
export function placeName(place: {
  areaName: string | null;
  districtId: string | null;
  divisionId: string | null;
}): string {
  if (place.districtId) {
    return [place.areaName, zoneName(place.districtId)].filter(Boolean).join(', ');
  }
  if (place.divisionId) return `${zoneName(place.divisionId)} division`;
  return 'Location not recorded';
}
