import mongoose from 'mongoose';
import { builtInHospitals, type Hospital, hospitalNameKey } from '../shared/hospitals.ts';

// Hospitals admins add when the built-in list has no match. Built-in ones live in hospitals.json.
const hospitalSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    // `hospitalNameKey(name)`: the unique index stops spellings that differ only in case or spaces.
    nameKey: { type: String, required: true },
    // The location chosen when it was added; any part may be missing.
    divisionId: { type: String, default: null },
    districtId: { type: String, default: null },
    areaId: { type: String, default: null },
  },
  { timestamps: true },
);

hospitalSchema.index({ districtId: 1, nameKey: 1 }, { unique: true });

export const HospitalModel = mongoose.model('Hospital', hospitalSchema);

type HospitalDocument = {
  _id: mongoose.Types.ObjectId;
  name: string;
  divisionId?: string | null | undefined;
  districtId?: string | null | undefined;
  areaId?: string | null | undefined;
};

const toHospital = (document: HospitalDocument): Hospital => ({
  id: document._id.toString(),
  name: document.name,
  divisionId: document.divisionId ?? null,
  districtId: document.districtId ?? null,
  areaId: document.areaId ?? null,
});

/** The hospitals admins added; the built-in ones are in the web app already. */
export async function addedHospitals(): Promise<Hospital[]> {
  const added = await HospitalModel.find().sort({ name: 1 }).lean();
  return added.map(toHospital);
}

/**
 * Adds a hospital, unless one with the same name (ignoring case and spaces) already exists in
 * that district; then that one is returned instead, so the list never holds duplicates.
 */
export async function addHospital(
  input: Omit<Hospital, 'id'>,
): Promise<{ hospital: Hospital; created: boolean }> {
  const nameKey = hospitalNameKey(input.name);
  // Without a district, a built-in hospital of that name in any district counts as a match.
  const builtIn = builtInHospitals.find(
    (hospital) =>
      hospitalNameKey(hospital.name) === nameKey &&
      (input.districtId === null || hospital.districtId === input.districtId),
  );
  if (builtIn) return { hospital: builtIn, created: false };

  const existing = await HospitalModel.findOne({ districtId: input.districtId, nameKey }).lean();
  if (existing) return { hospital: toHospital(existing), created: false };
  try {
    const created = await HospitalModel.create({
      ...input,
      name: input.name.trim().replace(/\s+/g, ' '),
      nameKey,
    });
    return { hospital: toHospital(created.toObject()), created: true };
  } catch (error) {
    // Another admin added the same name a moment ago: return theirs.
    if (!(error instanceof mongoose.mongo.MongoServerError) || error.code !== 11000) throw error;
    const winner = await HospitalModel.findOne({ districtId: input.districtId, nameKey }).lean();
    if (!winner) throw error;
    return { hospital: toHospital(winner), created: false };
  }
}
