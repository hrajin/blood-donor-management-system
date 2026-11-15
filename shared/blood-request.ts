import { z } from 'zod';
import { addDays, bangladeshDate } from './bangladesh-time.ts';
import { type BloodGroup, bangladeshMobile, bloodGroups } from './donor.ts';
import { isValidLocation } from './locations.ts';

// Values and limits follow SRS Table 3.4-A and §8.3.
export const maxUnits = 10;
export const maxDaysAhead = 30;

export const components = [
  'whole-blood',
  'red-cells',
  'platelets-random',
  'platelets-apheresis',
  'plasma',
  'not-sure',
] as const;
export type Component = (typeof components)[number];
export const componentLabels: Record<Component, string> = {
  'whole-blood': 'Whole blood',
  'red-cells': 'Red cells',
  'platelets-random': 'Platelets (random donor)',
  'platelets-apheresis': 'Platelets (apheresis)',
  plasma: 'Plasma',
  'not-sure': 'Not sure',
};

export const urgencies = ['emergency', 'normal'] as const;
export type Urgency = (typeof urgencies)[number];
export const urgencyLabels: Record<Urgency, string> = {
  emergency: 'Emergency',
  normal: 'Normal',
};

export const requestReasons = [
  'surgery',
  'accident-trauma',
  'childbirth',
  'thalassemia',
  'cancer',
  'dengue',
  'anaemia',
  'other',
] as const;
export type RequestReason = (typeof requestReasons)[number];
export const requestReasonLabels: Record<RequestReason, string> = {
  surgery: 'Surgery',
  'accident-trauma': 'Accident or trauma',
  childbirth: 'Childbirth',
  thalassemia: 'Thalassemia',
  cancer: 'Cancer',
  dengue: 'Dengue',
  anaemia: 'Anaemia',
  other: 'Other',
};

export const relationships = [
  'self',
  'family',
  'friend',
  'hospital-staff',
  'volunteer',
  'other',
] as const;
export type Relationship = (typeof relationships)[number];
export const relationshipLabels: Record<Relationship, string> = {
  self: 'Patient',
  family: 'Family',
  friend: 'Friend',
  'hospital-staff': 'Hospital staff',
  volunteer: 'Volunteer',
  other: 'Other',
};

export const requestStatuses = ['open', 'fulfilled', 'cancelled'] as const;
export type RequestStatus = (typeof requestStatuses)[number];
export const requestStatusLabels: Record<RequestStatus, string> = {
  open: 'Open',
  fulfilled: 'Fulfilled',
  cancelled: 'Cancelled',
};

export const cancelReasons = [
  'arranged-elsewhere',
  'no-longer-needed',
  'created-by-mistake',
  'patient-condition-changed',
  'other',
] as const;
export type CancelReason = (typeof cancelReasons)[number];
export const cancelReasonLabels: Record<CancelReason, string> = {
  'arranged-elsewhere': 'Blood arranged elsewhere',
  'no-longer-needed': 'No longer needed',
  'created-by-mistake': 'Created by mistake',
  'patient-condition-changed': 'Patient’s condition changed',
  other: 'Other',
};

/** What happened when an admin contacted a donor about a request. */
export const responseStatuses = ['no-answer', 'declined', 'agreed', 'donated'] as const;
export type ResponseStatus = (typeof responseStatuses)[number];
export const responseStatusLabels: Record<ResponseStatus, string> = {
  'no-answer': 'No answer',
  declined: 'Declined',
  agreed: 'Agreed',
  donated: 'Donated',
};

const optionalText = (max: number) =>
  z.string().trim().max(max, `Use at most ${max} characters`).nullable();

export const requestInput = z
  .object({
    patientName: z
      .string()
      .trim()
      .min(2, 'Enter the patient’s name')
      .max(100, 'Use at most 100 characters'),
    bloodGroup: z.enum(bloodGroups, 'Choose a blood group'),
    component: z.enum(components, 'Choose a component'),
    unitsRequired: z
      .number('Enter the number of units')
      .int('Enter a whole number')
      .min(1, 'Enter at least 1')
      .max(maxUnits, `Enter at most ${maxUnits}`),
    urgency: z.enum(urgencies, 'Choose the urgency'),
    requiredOn: z.iso.date('Enter the date the blood is needed'),
    hospitalName: z
      .string()
      .trim()
      .min(3, 'Enter the hospital’s name')
      .max(150, 'Use at most 150 characters'),
    hospitalAddress: optionalText(250),
    ward: optionalText(50),
    divisionId: z.string(),
    districtId: z.string(),
    upazilaId: z.string(),
    reason: z.enum(requestReasons).nullable(),
    contactName: z
      .string()
      .trim()
      .min(2, 'Enter the contact person’s name')
      .max(100, 'Use at most 100 characters'),
    contactPhone: bangladeshMobile,
    relationship: z.enum(relationships, 'Choose the relationship to the patient'),
    notes: optionalText(500),
  })
  .refine(isValidLocation, {
    message: 'Choose the hospital’s division, district and upazila',
    path: ['upazilaId'],
  })
  .refine((request) => request.requiredOn >= bangladeshDate(new Date()), {
    message: 'The date cannot be in the past',
    path: ['requiredOn'],
  })
  .refine((request) => request.requiredOn <= addDays(bangladeshDate(new Date()), maxDaysAhead), {
    message: `Choose a date within ${maxDaysAhead} days`,
    path: ['requiredOn'],
  });

export type RequestInput = z.infer<typeof requestInput>;

export const cancelInput = z.object({
  reason: z.enum(cancelReasons, 'Choose a reason'),
  note: optionalText(200),
});
export type CancelInput = z.infer<typeof cancelInput>;

/** Responses an admin records by hand; `donated` is recorded through its own action. */
export const responseInput = z.object({
  status: z.enum(['no-answer', 'declined', 'agreed'], 'Choose a response'),
});
export type ResponseInput = z.infer<typeof responseInput>;

export type RequestCounts = {
  /** Donors who agreed and have not donated yet. */
  agreed: number;
  donated: number;
};

export type BloodRequestSummary = RequestInput &
  RequestCounts & {
    id: string;
    code: string;
    status: RequestStatus;
    createdAt: string;
  };

/** The donor fields an admin needs to contact and choose a donor. */
export type DonorContact = {
  id: string;
  name: string;
  phone: string;
  bloodGroup: BloodGroup;
  divisionId: string;
  districtId: string;
  upazilaId: string;
  available: boolean;
  donationCount: number;
  lastDonatedAt: string | null;
};

export type DonorResponse = {
  status: ResponseStatus;
  updatedAt: string;
  donor: DonorContact;
};

export type BloodRequest = BloodRequestSummary & {
  cancelReason: CancelReason | null;
  cancelNote: string | null;
  closedAt: string | null;
  updatedAt: string;
  responses: DonorResponse[];
};

export type RequestPage = {
  requests: BloodRequestSummary[];
  total: number;
  page: number;
  pageSize: number;
};

/** How close a donor lives to the hospital (SRS §4.3): 1 = same upazila … 4 = another division. */
export type Tier = 1 | 2 | 3 | 4;

export type DonorSuggestion = { donor: DonorContact; tier: Tier; age: number };

export type SuggestionResult = {
  suggestions: DonorSuggestion[];
  /** Matching donors before the display limit. */
  total: number;
  /** The date eligibility is checked on: the needed-by date, or today once it has passed. */
  checkedOn: string;
  /** Donors of the right blood group in the searched area who were left out, by reason. */
  excluded: {
    unavailable: number;
    recentlyDonated: number;
    outsideAgeRange: number;
    committedElsewhere: number;
    isContactPerson: number;
  };
};
