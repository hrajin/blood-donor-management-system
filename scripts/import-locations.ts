import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';

// Raw files: https://github.com/nuhil/bangladesh-geocode (divisions, districts, upazilas).
// Zones are keyed by their official BBS geocode, which stays stable across dataset releases.
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

const rawDivisions = await readTable('divisions.json', rawDivision);
const rawDistricts = await readTable('districts.json', rawDistrict);
const rawUpazilas = await readTable('upazilas.json', rawUpazila);

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
  upazilas: rawUpazilas
    .map((u) => ({
      id: u.bbs_code,
      districtId: parentCode(districtCodes, u.district_id, u.name),
      name: u.name,
    }))
    .sort(byName),
};

await writeFile(output, `${JSON.stringify(locations, null, 2)}\n`);
console.log(
  `Wrote ${locations.divisions.length} divisions, ${locations.districts.length} districts and ${locations.upazilas.length} upazilas to shared/locations.json`,
);
