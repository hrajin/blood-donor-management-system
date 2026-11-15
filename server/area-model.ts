import mongoose from 'mongoose';
import type { ApiErrorBody } from '../shared/donor.ts';
import { type Area, areaNameKey, builtInArea, builtInAreasOf } from '../shared/locations.ts';

// Areas admins add when the built-in list has no match. Built-in areas live in locations.json.
const areaSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    // `areaNameKey(name)`: the unique index stops two spellings that differ only in case or spaces.
    nameKey: { type: String, required: true },
    districtId: { type: String, required: true },
  },
  { timestamps: true },
);

areaSchema.index({ districtId: 1, nameKey: 1 }, { unique: true });

export const AreaModel = mongoose.model('Area', areaSchema);

type AreaDocument = { _id: mongoose.Types.ObjectId; name: string; districtId: string };

const toArea = (document: AreaDocument): Area => ({
  id: document._id.toString(),
  districtId: document.districtId,
  name: document.name,
});

/** Every area in the district, built-in and added, by name. */
export async function areasOf(districtId: string): Promise<Area[]> {
  const added = await AreaModel.find({ districtId }, { name: 1, districtId: 1 }).lean();
  return [...builtInAreasOf(districtId), ...added.map(toArea)].sort((a, b) =>
    a.name.localeCompare(b.name),
  );
}

/** The area, if it exists and lies in `districtId`. */
export async function findArea(areaId: string, districtId: string): Promise<Area | null> {
  const builtIn = builtInArea(areaId);
  if (builtIn) return builtIn.districtId === districtId ? builtIn : null;
  if (!mongoose.isValidObjectId(areaId)) return null;
  const added = await AreaModel.findOne(
    { _id: areaId, districtId },
    { name: 1, districtId: 1 },
  ).lean();
  return added ? toArea(added) : null;
}

/**
 * Adds an area to the district, unless one with the same name (ignoring case and spaces)
 * already exists; then that one is returned instead, so the list never holds duplicates.
 */
export async function addArea(
  districtId: string,
  name: string,
): Promise<{ area: Area; created: boolean }> {
  const nameKey = areaNameKey(name);
  const builtIn = builtInAreasOf(districtId).find((area) => areaNameKey(area.name) === nameKey);
  if (builtIn) return { area: builtIn, created: false };

  const existing = await AreaModel.findOne({ districtId, nameKey }).lean();
  if (existing) return { area: toArea(existing), created: false };
  try {
    const created = await AreaModel.create({
      name: name.trim().replace(/\s+/g, ' '),
      nameKey,
      districtId,
    });
    return { area: toArea(created.toObject()), created: true };
  } catch (error) {
    // Another admin added the same name a moment ago: return theirs.
    if (!(error instanceof mongoose.mongo.MongoServerError) || error.code !== 11000) throw error;
    const winner = await AreaModel.findOne({ districtId, nameKey }).lean();
    if (!winner) throw error;
    return { area: toArea(winner), created: false };
  }
}

/** The 400 body when the chosen area is not in the chosen district. */
export const unknownArea: ApiErrorBody = {
  error: 'Check the highlighted fields',
  fields: { areaId: 'Choose an area / city in this district' },
};
