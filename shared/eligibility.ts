import { addDays } from './bangladesh-time.ts';

// SRS §4.2 and §8.1 ⚕: conservative placeholders until the Medical Advisor approves real values.
// Donation types are not recorded yet, so every past donation counts as whole blood, and
// whole blood → any next donation needs 120 days.
export const minDonorAge = 18;
export const maxMatchingAge = 60;
export const donationIntervalDays = 120;

/** The first day the donor may give blood again; null if they have not donated. */
export function nextEligibleDate(lastDonatedAt: string | null): string | null {
  return lastDonatedAt ? addDays(lastDonatedAt, donationIntervalDays) : null;
}
