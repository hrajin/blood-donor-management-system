import mongoose from 'mongoose';
import type { DonorContact } from '../shared/blood-request.ts';
import { bloodGroups, type Donor, genders } from '../shared/donor.ts';

const donorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true, unique: true },
    email: { type: String, default: null },
    // Calendar dates are stored as `YYYY-MM-DD` strings, the same shape the API uses.
    dateOfBirth: { type: String, required: true },
    gender: { type: String, required: true, enum: genders },
    nidNumber: { type: String, required: true, unique: true },
    bloodGroup: { type: String, required: true, enum: bloodGroups },
    divisionId: { type: String, required: true },
    districtId: { type: String, required: true },
    upazilaId: { type: String, required: true },
    presentAddress: { type: String, required: true },
    permanentAddress: { type: String, required: true },
    available: { type: Boolean, required: true },
    donationCount: { type: Number, required: true, min: 0 },
    // Null until the first donation.
    lastDonatedAt: { type: String, default: null },
  },
  { timestamps: true },
);

donorSchema.index({ divisionId: 1, districtId: 1, upazilaId: 1, bloodGroup: 1, available: 1 });
donorSchema.index({ name: 1, _id: 1 });

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
    dateOfBirth: document.dateOfBirth,
    gender: document.gender,
    nidNumber: document.nidNumber,
    bloodGroup: document.bloodGroup,
    divisionId: document.divisionId,
    districtId: document.districtId,
    upazilaId: document.upazilaId,
    presentAddress: document.presentAddress,
    permanentAddress: document.permanentAddress,
    available: document.available,
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
  | 'upazilaId'
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
  upazilaId: 1,
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
    divisionId: document.divisionId,
    districtId: document.districtId,
    upazilaId: document.upazilaId,
    available: document.available,
    donationCount: document.donationCount,
    lastDonatedAt: document.lastDonatedAt ?? null,
  };
}
