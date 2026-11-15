import { z } from 'zod';
import { bangladeshDate, shiftYears } from './bangladesh-time.ts';
import { minDonorAge } from './eligibility.ts';
import { isValidDistrict } from './locations.ts';

export const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;
export type BloodGroup = (typeof bloodGroups)[number];

// Gender is optional, so "not given" is a null rather than an option.
export const genders = ['male', 'female', 'other'] as const;
export type Gender = (typeof genders)[number];

export const genderLabels: Record<Gender, string> = {
  male: 'Male',
  female: 'Female',
  other: 'Other',
};

// SRS Table 3.2-A: a donation needs the donor to have been at least 16.
const minDonationAge = 16;
const maxAge = 100;

export const bangladeshMobile = z
  .string()
  .trim()
  .regex(/^01[3-9]\d{8}$/, 'Enter an 11-digit mobile number, e.g. 01712345678');

/** The location may stop at any level: a division, a district in it, or an area in that. */
export const optionalLocation = {
  divisionId: z.string().nullable(),
  districtId: z.string().nullable(),
  areaId: z.string().nullable(),
};

/** A district needs its division, and an area its district. The server checks the area itself. */
export function checkLocation(
  location: { divisionId: string | null; districtId: string | null; areaId: string | null },
  context: z.RefinementCtx,
) {
  const { divisionId, districtId, areaId } = location;
  if (districtId !== null && divisionId === null) {
    context.addIssue({
      code: 'custom',
      message: 'Choose the division first',
      path: ['divisionId'],
    });
  }
  if (districtId !== null && divisionId !== null && !isValidDistrict({ divisionId, districtId })) {
    context.addIssue({
      code: 'custom',
      message: 'Choose a district in this division',
      path: ['districtId'],
    });
  }
  if (areaId !== null && districtId === null) {
    context.addIssue({
      code: 'custom',
      message: 'Choose the district first',
      path: ['districtId'],
    });
  }
}

const optionalText = (max: number) =>
  z.string().trim().max(max, `Use at most ${max} characters`).nullable();

/**
 * Only the name, mobile number and blood group are required, so a donor can be registered in
 * seconds. Everything else is optional (null), but checked when it is given.
 */
export const donorInput = z
  .object({
    name: z.string().trim().min(1, 'Enter the donor’s name').max(100, 'Use at most 100 characters'),
    phone: bangladeshMobile,
    bloodGroup: z.enum(bloodGroups, 'Choose a blood group'),
    email: z
      .email('Enter a valid email address, e.g. name@example.com')
      .max(254, 'Use at most 254 characters')
      .nullable(),
    dateOfBirth: z.iso.date('Enter a valid date').nullable(),
    gender: z.enum(genders).nullable(),
    nidNumber: z
      .string()
      .trim()
      .regex(/^(\d{10}|\d{13}|\d{17})$/, 'Enter a 10, 13 or 17-digit NID number')
      .nullable(),
    ...optionalLocation,
    presentAddress: optionalText(250),
    permanentAddress: optionalText(250),
    available: z.boolean(),
    donationCount: z
      .number('Enter the number of donations')
      .int('Enter a whole number')
      .min(0, 'Enter 0 or more')
      .max(300, 'Enter at most 300'),
    lastDonatedAt: z.iso.date('Enter a valid date').nullable(),
  })
  .superRefine(checkLocation)
  .refine(
    (donor) =>
      !donor.dateOfBirth ||
      donor.dateOfBirth <= shiftYears(bangladeshDate(new Date()), -minDonorAge),
    { message: `The donor must be at least ${minDonorAge} years old`, path: ['dateOfBirth'] },
  )
  .refine(
    (donor) =>
      !donor.dateOfBirth || donor.dateOfBirth >= shiftYears(bangladeshDate(new Date()), -maxAge),
    { message: 'Check the year of birth', path: ['dateOfBirth'] },
  )
  .refine((donor) => donor.donationCount === 0 || donor.lastDonatedAt !== null, {
    message: 'Enter the date of the last donation',
    path: ['lastDonatedAt'],
  })
  .refine((donor) => donor.donationCount > 0 || donor.lastDonatedAt === null, {
    message: 'Leave this empty for a donor who has not donated yet',
    path: ['lastDonatedAt'],
  })
  .refine((donor) => !donor.lastDonatedAt || donor.lastDonatedAt <= bangladeshDate(new Date()), {
    message: 'The date cannot be in the future',
    path: ['lastDonatedAt'],
  })
  .refine(
    (donor) =>
      !donor.lastDonatedAt ||
      !donor.dateOfBirth ||
      donor.lastDonatedAt >= shiftYears(donor.dateOfBirth, minDonationAge),
    {
      message: `The donor must have been at least ${minDonationAge} at the last donation`,
      path: ['lastDonatedAt'],
    },
  );

export type DonorInput = z.infer<typeof donorInput>;

export const availabilityInput = z.object({ available: z.boolean() });

export type Donor = DonorInput & {
  id: string;
  /** The day an automatically unavailable donor becomes available again; null otherwise. */
  availableAgainOn: string | null;
  /** Null when no area is recorded. */
  areaName: string | null;
  createdAt: string;
  updatedAt: string;
};

/** Orders for the donor list; `name` is the default. */
export const donorSorts = ['name', 'newest', 'lastDonation', 'availability'] as const;
export type DonorSort = (typeof donorSorts)[number];

export type DonorPage = { donors: Donor[]; total: number; page: number; pageSize: number };

export type ApiErrorBody = { error: string; fields?: Record<string, string> };
