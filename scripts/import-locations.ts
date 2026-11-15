import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';

// Raw files: https://github.com/nuhil/bangladesh-geocode (divisions, districts, upazilas), plus
// popular-areas.json, our own list of well-known city areas that are not upazilas.
// Official zones are keyed by their BBS geocode, which stays stable across dataset releases;
// popular areas by their district code and name, e.g. `BD3026-uttara`.
const rawDir = path.join(import.meta.dirname, '../data/locations');
const output = path.join(import.meta.dirname, '../shared/locations.json');

const rawZone = z.object({ id: z.string(), name: z.string().min(1), bbs_code: z.string().min(1) });
const rawDivision = rawZone;
const rawDistrict = rawZone.extend({ division_id: z.string() });
const rawUpazila = rawZone.extend({ district_id: z.string() });

async function readTable<T extends z.ZodType>(file: string, row: T): Promise<z.infer<T>[]> {
  const entries = z
    .array(z.object({ type: z.string(), data: z.unknown().optional() }))
    .parse(JSON.parse(await readFile(path.join(rawDir, file), 'utf8')));
  const table = entries.find((entry) => entry.type === 'table');
  if (!table) throw new Error(`${file} has no table entry`);
  return z.array(row).parse(table.data);
}

function codesById(rows: { id: string; bbs_code: string }[], label: string): Map<string, string> {
  const codes = new Map(rows.map((row) => [row.id, row.bbs_code]));
  if (new Set(codes.values()).size !== rows.length) throw new Error(`Duplicate ${label} codes`);
  return codes;
}

function parentCode(codes: Map<string, string>, parentId: string, child: string): string {
  const code = codes.get(parentId);
  if (!code) throw new Error(`${child} refers to missing parent ${parentId}`);
  return code;
}

const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name);

const slug = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const rawDivisions = await readTable('divisions.json', rawDivision);
const rawDistricts = await readTable('districts.json', rawDistrict);
const rawUpazilas = await readTable('upazilas.json', rawUpazila);
const popularAreas = z
  .record(z.string(), z.array(z.string().trim().min(1)))
  .parse(JSON.parse(await readFile(path.join(rawDir, 'popular-areas.json'), 'utf8')));

const divisionCodes = codesById(rawDivisions, 'division');
const districtCodes = codesById(rawDistricts, 'district');
codesById(rawUpazilas, 'upazila');

const locations = {
  divisions: rawDivisions.map((d) => ({ id: d.bbs_code, name: d.name })).sort(byName),
  districts: rawDistricts
    .map((d) => ({
      id: d.bbs_code,
      divisionId: parentCode(divisionCodes, d.division_id, d.name),
      name: d.name,
    }))
    .sort(byName),
};

const districtByName = new Map(locations.districts.map((d) => [d.name, d]));
const upazilaAreas = rawUpazilas.map((u) => ({
  id: u.bbs_code,
  districtId: parentCode(districtCodes, u.district_id, u.name),
  name: u.name,
}));
const popular = Object.entries(popularAreas).flatMap(([districtName, names]) => {
  const district = districtByName.get(districtName);
  if (!district) throw new Error(`popular-areas.json names unknown district ${districtName}`);
  return names.map((name) => ({
    id: `${district.id}-${slug(name)}`,
    districtId: district.id,
    name,
  }));
});

// One list of areas: every upazila and every popular area, unique by name within a district.
const areas = [...upazilaAreas, ...popular].sort(byName);
const seen = new Set<string>();
for (const area of areas) {
  const key = `${area.districtId}:${area.name.toLowerCase()}`;
  if (seen.has(key))
    throw new Error(`Area ${area.name} appears twice in district ${area.districtId}`);
  seen.add(key);
}
if (new Set(areas.map((area) => area.id)).size !== areas.length)
  throw new Error('Duplicate area IDs');

await writeFile(output, `${JSON.stringify({ ...locations, areas }, null, 2)}\n`);
console.log(
  `Wrote ${locations.divisions.length} divisions, ${locations.districts.length} districts and ${areas.length} areas (${upazilaAreas.length} upazilas, ${popular.length} popular areas) to shared/locations.json`,
);
