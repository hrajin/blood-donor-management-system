import type { BloodGroup } from './donor.ts';

export type AvailabilityCount = { available: number; unavailable: number };

export type TopDonor = {
  id: string;
  name: string;
  bloodGroup: BloodGroup;
  districtId: string;
  donationCount: number;
  lastDonatedAt: string;
};

export type DashboardStats = {
  totals: AvailabilityCount & { registered: number; newLast30Days: number };
  /** Every blood group, in the order of `bloodGroups`. */
  byBloodGroup: (AvailabilityCount & { bloodGroup: BloodGroup })[];
  /** Every division, in the order of `divisions`. */
  byDivision: (AvailabilityCount & { divisionId: string })[];
  /** The 10 districts with the most donors, most first. */
  topDistricts: (AvailabilityCount & { districtId: string })[];
  /** The 10 donors with the most donations, most first; donors who never donated are left out. */
  topDonors: TopDonor[];
  /** The last 6 months in Bangladesh time, oldest first; `month` is `YYYY-MM`. */
  registrationsByMonth: { month: string; count: number }[];
};
