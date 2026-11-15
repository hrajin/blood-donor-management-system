import type mongoose from 'mongoose';
import { completedYears, shiftYears } from '../shared/bangladesh-time.ts';
import type { DonorContact, SuggestionResult, Tier } from '../shared/blood-request.ts';
import { maxMatchingAge, minDonorAge, nextEligibleDate } from '../shared/eligibility.ts';
import { type BloodRequestDocument, BloodRequestModel } from './blood-request-model.ts';
import { contactProjection, DonorModel, toDonorContact } from './donor-model.ts';

const maxSuggestions = 50;

type SuggestionOptions = {
  /** Also search other divisions (SRS tier 4); off by default, as `matching.max_auto_tier` is 3. */
  wider: boolean;
  today: string;
};

function tierOf(donor: DonorContact, request: BloodRequestDocument): Tier {
  if (request.areaId !== null && donor.areaId === request.areaId) return 1;
  if (request.districtId !== null && donor.districtId === request.districtId) return 2;
  if (request.divisionId !== null && donor.divisionId === request.divisionId) return 3;
  // Without a recorded division on either side, nobody can be called near or far.
  return donor.divisionId === null || request.divisionId === null ? 5 : 4;
}

/** Donor IDs that agreed to give for another open request and have not donated yet (SRS C8). */
async function committedElsewhere(requestId: mongoose.Types.ObjectId): Promise<Set<string>> {
  const others = await BloodRequestModel.find(
    { _id: { $ne: requestId }, status: 'open', 'responses.status': 'agreed' },
    { responses: 1 },
  ).lean();
  return new Set(
    others.flatMap((other) =>
      other.responses
        .filter((response) => response.status === 'agreed')
        .map((response) => response.donorId.toString()),
    ),
  );
}

/**
 * Donors who could give blood for `request`, closest and longest-rested first (SRS §4.3 C1, C4–C8).
 * Donors already contacted for this request are left out; they are listed with their responses.
 */
export async function suggestDonors(
  request: BloodRequestDocument,
  { wider, today }: SuggestionOptions,
): Promise<SuggestionResult> {
  // Eligibility is checked on the day the blood is needed, or today once that day has passed.
  const checkedOn = request.requiredOn > today ? request.requiredOn : today;
  const youngestBirthDate = shiftYears(checkedOn, -minDonorAge);
  const oldestBirthDate = shiftYears(checkedOn, -(maxMatchingAge + 1));
  const contacted = new Set(request.responses.map((response) => response.donorId.toString()));
  const committed = await committedElsewhere(request._id);

  const candidates = await DonorModel.find(
    {
      bloodGroup: request.bloodGroup,
      // Donors without a recorded location are always included: they may live nearby.
      // A request without a division has no area to search, so every donor is included.
      ...(wider || !request.divisionId ? {} : { divisionId: { $in: [request.divisionId, null] } }),
    },
    { ...contactProjection, dateOfBirth: 1 },
  ).lean();

  const excluded = {
    unavailable: 0,
    recentlyDonated: 0,
    outsideAgeRange: 0,
    committedElsewhere: 0,
    isContactPerson: 0,
  };
  const suggestions: SuggestionResult['suggestions'] = [];

  for (const candidate of candidates) {
    const id = candidate._id.toString();
    if (contacted.has(id)) continue;

    const donor = toDonorContact(candidate);
    const eligibleFrom = nextEligibleDate(donor.lastDonatedAt);
    // Checked in this order, so each donor is counted under the first reason that applies.
    if (candidate.phone === request.contactPhone) excluded.isContactPerson++;
    else if (!candidate.available) excluded.unavailable++;
    // Without a date of birth the age is unknown; they stay in, shown as "age not recorded",
    // because the hospital screens every donor anyway.
    else if (
      candidate.dateOfBirth &&
      (candidate.dateOfBirth > youngestBirthDate || candidate.dateOfBirth <= oldestBirthDate)
    )
      excluded.outsideAgeRange++;
    else if (eligibleFrom && eligibleFrom > checkedOn) excluded.recentlyDonated++;
    else if (committed.has(id)) excluded.committedElsewhere++;
    else {
      suggestions.push({
        donor,
        tier: tierOf(donor, request),
        age: candidate.dateOfBirth ? completedYears(candidate.dateOfBirth, checkedOn) : null,
      });
    }
  }

  // Closest first; then the longest since the last donation (never donated counts as longest).
  suggestions.sort(
    (a, b) =>
      a.tier - b.tier ||
      (a.donor.lastDonatedAt ?? '').localeCompare(b.donor.lastDonatedAt ?? '') ||
      a.donor.name.localeCompare(b.donor.name) ||
      a.donor.id.localeCompare(b.donor.id),
  );

  return {
    suggestions: suggestions.slice(0, maxSuggestions),
    total: suggestions.length,
    checkedOn,
    excluded,
  };
}
