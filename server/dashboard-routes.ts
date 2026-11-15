import { Router } from 'express';
import type mongoose from 'mongoose';
import { bangladeshDate, bangladeshTimeZone } from '../shared/bangladesh-time.ts';
import type { DashboardStats, TopDonor } from '../shared/dashboard.ts';
import { bloodGroups } from '../shared/donor.ts';
import { divisions } from '../shared/locations.ts';
import { DonorModel } from './donor-model.ts';

const monthsShown = 6;
const topDistrictCount = 10;
const topDonorCount = 10;
const dayMs = 24 * 60 * 60 * 1000;

type GroupCount = { _id: string; total: number; available: number };

type FacetResult = {
  totals: { registered: number; available: number; newLast30Days: number }[];
  byBloodGroup: GroupCount[];
  byDivision: GroupCount[];
  topDistricts: GroupCount[];
  byMonth: { _id: string; count: number }[];
  topDonors: (Omit<TopDonor, 'id'> & { _id: mongoose.Types.ObjectId })[];
};

const countAvailability = {
  total: { $sum: 1 },
  available: { $sum: { $cond: ['$available', 1, 0] } },
};

/** `YYYY-MM` keys for the last `count` months in Bangladesh, oldest first. */
function recentMonths(now: Date, count: number): string[] {
  const [year, month] = bangladeshDate(now).split('-').map(Number);
  if (year === undefined || month === undefined) throw new Error('Could not read the month');

  return Array.from({ length: count }, (_, index) => {
    const monthsBack = count - 1 - index;
    const date = new Date(Date.UTC(year, month - 1 - monthsBack, 1));
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
  });
}

function toAvailability(count: GroupCount | undefined) {
  const total = count?.total ?? 0;
  const available = count?.available ?? 0;
  return { available, unavailable: total - available };
}

async function dashboardStats(now: Date): Promise<DashboardStats> {
  const months = recentMonths(now, monthsShown);
  // A little over 6 months back; the exact month boundaries are applied by the month keys.
  const monthsSince = new Date(now.getTime() - (monthsShown + 1) * 31 * dayMs);

  const [result] = await DonorModel.aggregate<FacetResult>([
    {
      $facet: {
        totals: [
          {
            $group: {
              _id: null,
              registered: { $sum: 1 },
              available: countAvailability.available,
              newLast30Days: {
                $sum: {
                  $cond: [{ $gte: ['$createdAt', new Date(now.getTime() - 30 * dayMs)] }, 1, 0],
                },
              },
            },
          },
        ],
        byBloodGroup: [{ $group: { _id: '$bloodGroup', ...countAvailability } }],
        byDivision: [{ $group: { _id: '$divisionId', ...countAvailability } }],
        topDistricts: [
          { $group: { _id: '$districtId', ...countAvailability } },
          { $sort: { total: -1, _id: 1 } },
          { $limit: topDistrictCount },
        ],
        topDonors: [
          { $match: { donationCount: { $gt: 0 } } },
          { $sort: { donationCount: -1, lastDonatedAt: -1, name: 1, _id: 1 } },
          { $limit: topDonorCount },
          {
            $project: {
              name: 1,
              bloodGroup: 1,
              districtId: 1,
              donationCount: 1,
              lastDonatedAt: 1,
            },
          },
        ],
        byMonth: [
          { $match: { createdAt: { $gte: monthsSince } } },
          {
            $group: {
              _id: {
                $dateToString: {
                  format: '%Y-%m',
                  date: '$createdAt',
                  timezone: bangladeshTimeZone,
                },
              },
              count: { $sum: 1 },
            },
          },
        ],
      },
    },
  ]);
  if (!result) throw new Error('The dashboard aggregation returned no result');

  const totals = result.totals[0] ?? { registered: 0, available: 0, newLast30Days: 0 };
  const byBloodGroup = new Map(result.byBloodGroup.map((count) => [count._id, count]));
  const byDivision = new Map(result.byDivision.map((count) => [count._id, count]));
  const byMonth = new Map(result.byMonth.map((count) => [count._id, count.count]));

  return {
    totals: {
      registered: totals.registered,
      available: totals.available,
      unavailable: totals.registered - totals.available,
      newLast30Days: totals.newLast30Days,
    },
    byBloodGroup: bloodGroups.map((bloodGroup) => ({
      bloodGroup,
      ...toAvailability(byBloodGroup.get(bloodGroup)),
    })),
    byDivision: divisions.map((division) => ({
      divisionId: division.id,
      ...toAvailability(byDivision.get(division.id)),
    })),
    topDistricts: result.topDistricts.map((count) => ({
      districtId: count._id,
      ...toAvailability(count),
    })),
    topDonors: result.topDonors.map(({ _id, ...donor }) => ({ id: _id.toString(), ...donor })),
    registrationsByMonth: months.map((month) => ({ month, count: byMonth.get(month) ?? 0 })),
  };
}

export function dashboardRoutes(): Router {
  const router = Router();

  router.get('/', async (_req, res) => {
    res.json(await dashboardStats(new Date()));
  });

  return router;
}
