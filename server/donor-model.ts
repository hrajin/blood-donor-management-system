import mongoose from 'mongoose';
import type { DonorContact } from '../shared/blood-request.ts';
import { bloodGroups, type Donor, genders } from '../shared/donor.ts';

const donorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true, unique: true },
    bloodGroup: { type: String, required: true, enum: bloodGroups },
    // Everything below the blood group is optional; null means "not recorded".
    email: { type: String, default: null },
    // Calendar dates are stored as `YYYY-MM-DD` strings, the same shape the API uses.
    dateOfBirth: { type: String, default: null },
    gender: { type: String, enum: [...genders, null], default: null },
    nidNumber: { type: String, default: null },
    divisionId: { type: String, default: null },
    districtId: { type: String, default: null },
    areaId: { type: String, default: null },
    // Saved with the ID, as areas are never renamed; added areas would otherwise need a lookup.
    areaName: { type: String, default: null },
    presentAddress: { type: String, default: null },
    permanentAddress: { type: String, default: null },
    available: { type: Boolean, required: true },
    // Set when a recorded donation made the donor unavailable; they are restored on this day.
    availableAgainOn: { type: String, default: null },
    donationCount: { type: Number, required: true, min: 0 },
    // Null until the first donation.
    lastDonatedAt: { type: String, default: null },
  },
  { timestamps: true },
);

donorSchema.index({ divisionId: 1, districtId: 1, areaId: 1, bloodGroup: 1, available: 1 });
donorSchema.index({ name: 1, _id: 1 });
// NID numbers are unique when given; the partial filter lets many donors have none.
donorSchema.index(
  { nidNumber: 1 },
  { unique: true, partialFilterExpression: { nidNumber: { $type: 'string' } } },
);

export const DonorModel = mongoose.model('Donor', donorSchema);

type DonorDocument = mongoose.InferSchemaType<typeof donorSchema> & {
  _id: mongoose.Types.ObjectId;
};

export function toDonor(document: DonorDocument): Donor {
  return {
    id: document._id.toString(),
    name: document.name,
    phone: document.phone,
    email: document.email ?? null,
    dateOfBirth: document.dateOfBirth ?? null,
    gender: document.gender ?? null,
    nidNumber: document.nidNumber ?? null,
    bloodGroup: document.bloodGroup,
    divisionId: document.divisionId ?? null,
    districtId: document.districtId ?? null,
    areaId: document.areaId ?? null,
    areaName: document.areaName ?? null,
    presentAddress: document.presentAddress ?? null,
    permanentAddress: document.permanentAddress ?? null,
    available: document.available,
    availableAgainOn: document.availableAgainOn ?? null,
    donationCount: document.donationCount,
    lastDonatedAt: document.lastDonatedAt ?? null,
    createdAt: document.createdAt.toISOString(),
    updatedAt: document.updatedAt.toISOString(),
  };
}

type ContactFields = Pick<
  DonorDocument,
  | '_id'
  | 'name'
  | 'phone'
  | 'bloodGroup'
  | 'divisionId'
  | 'districtId'
  | 'areaId'
  | 'areaName'
  | 'available'
  | 'donationCount'
  | 'lastDonatedAt'
>;

export const contactProjection = {
  name: 1,
  phone: 1,
  bloodGroup: 1,
  divisionId: 1,
  districtId: 1,
  areaId: 1,
  areaName: 1,
  available: 1,
  donationCount: 1,
  lastDonatedAt: 1,
} as const;

export function toDonorContact(document: ContactFields): DonorContact {
  return {
    id: document._id.toString(),
    name: document.name,
    phone: document.phone,
    bloodGroup: document.bloodGroup,
    divisionId: document.divisionId ?? null,
    districtId: document.districtId ?? null,
    areaId: document.areaId ?? null,
    areaName: document.areaName ?? null,
    available: document.available,
    donationCount: document.donationCount,
    lastDonatedAt: document.lastDonatedAt ?? null,
  };
}
