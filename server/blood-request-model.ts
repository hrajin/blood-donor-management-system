import mongoose from 'mongoose';
import { bangladeshDate } from '../shared/bangladesh-time.ts';
import {
  type BloodRequestSummary,
  cancelReasons,
  components,
  relationships,
  requestReasons,
  requestStatuses,
  responseStatuses,
  urgencies,
} from '../shared/blood-request.ts';
import { bloodGroups } from '../shared/donor.ts';

const responseSchema = new mongoose.Schema(
  {
    donorId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Donor' },
    status: { type: String, required: true, enum: responseStatuses },
    updatedAt: { type: Date, required: true },
  },
  { _id: false },
);

const requestSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true },
    patientName: { type: String, required: true },
    bloodGroup: { type: String, required: true, enum: bloodGroups },
    component: { type: String, required: true, enum: components },
    unitsRequired: { type: Number, required: true, min: 1 },
    urgency: { type: String, required: true, enum: urgencies },
    // A Bangladesh calendar date, `YYYY-MM-DD`, the same shape the API uses.
    requiredOn: { type: String, required: true },
    hospitalName: { type: String, required: true },
    hospitalAddress: { type: String, default: null },
    ward: { type: String, default: null },
    divisionId: { type: String, required: true },
    districtId: { type: String, required: true },
    areaId: { type: String, required: true },
    // Saved with the ID, as areas are never renamed.
    areaName: { type: String, required: true },
    reason: { type: String, enum: [...requestReasons, null], default: null },
    contactName: { type: String, required: true },
    contactPhone: { type: String, required: true },
    relationship: { type: String, required: true, enum: relationships },
    notes: { type: String, default: null },
    status: { type: String, required: true, enum: requestStatuses },
    cancelReason: { type: String, enum: [...cancelReasons, null], default: null },
    cancelNote: { type: String, default: null },
    closedAt: { type: Date, default: null },
    responses: { type: [responseSchema], default: [] },
  },
  { timestamps: true },
);

requestSchema.index({ status: 1, urgency: 1, requiredOn: 1 });
requestSchema.index({ 'responses.donorId': 1, status: 1 });

export const BloodRequestModel = mongoose.model('BloodRequest', requestSchema);

export type BloodRequestDocument = mongoose.InferSchemaType<typeof requestSchema> & {
  _id: mongoose.Types.ObjectId;
};

const counterSchema = new mongoose.Schema({ _id: String, seq: { type: Number, required: true } });
const CounterModel = mongoose.model('Counter', counterSchema);

/** The next code for today in Bangladesh, e.g. `RQ-261115-0001` (SRS FR-REQ-02). */
export async function nextRequestCode(now: Date): Promise<string> {
  const day = bangladeshDate(now).slice(2).replaceAll('-', '');
  // One atomic increment per code, so two requests can never get the same number.
  const counter = await CounterModel.findOneAndUpdate(
    { _id: `request-${day}` },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: 'after' },
  ).lean();
  if (!counter) throw new Error('The request counter was not created');
  return `RQ-${day}-${String(counter.seq).padStart(4, '0')}`;
}

export function toRequestSummary(document: BloodRequestDocument): BloodRequestSummary {
  const statuses = document.responses.map((response) => response.status);
  return {
    id: document._id.toString(),
    code: document.code,
    patientName: document.patientName,
    bloodGroup: document.bloodGroup,
    component: document.component,
    unitsRequired: document.unitsRequired,
    urgency: document.urgency,
    requiredOn: document.requiredOn,
    hospitalName: document.hospitalName,
    hospitalAddress: document.hospitalAddress ?? null,
    ward: document.ward ?? null,
    divisionId: document.divisionId,
    districtId: document.districtId,
    areaId: document.areaId,
    areaName: document.areaName,
    reason: document.reason ?? null,
    contactName: document.contactName,
    contactPhone: document.contactPhone,
    relationship: document.relationship,
    notes: document.notes ?? null,
    status: document.status,
    agreed: statuses.filter((status) => status === 'agreed').length,
    donated: statuses.filter((status) => status === 'donated').length,
    createdAt: document.createdAt.toISOString(),
  };
}
