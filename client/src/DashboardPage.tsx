import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import type { AvailabilityCount, DashboardStats, TopDonor } from '../../shared/dashboard.ts';
import { zoneName } from '../../shared/locations.ts';
import { ApiError, getDashboard } from './api.ts';
import { Breadcrumbs } from './Breadcrumbs.tsx';
import { formatDay, formatMonth } from './calendar-format.ts';
import { AvailabilityDonut, BarList, type ChartValue, ColumnChart } from './DashboardCharts.tsx';

type DashboardState =
  | { status: 'loading' }
  | { status: 'failed'; message: string }
  | { status: 'loaded'; stats: DashboardStats };

function availabilityValue(key: string, label: string, count: AvailabilityCount): ChartValue {
  const total = count.available + count.unavailable;
  return {
    key,
    label,
    value: total,
    part: count.available,
    description: `${label}: ${total} donors, ${count.available} available`,
  };
}

export function DashboardPage() {
  const [state, setState] = useState<DashboardState>({ status: 'loading' });

  useEffect(() => {
    const controller = new AbortController();
    getDashboard(controller.signal)
      .then((stats) => setState({ status: 'loaded', stats }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        console.error(error);
        const message = error instanceof ApiError ? error.message : 'Could not load the dashboard.';
        setState({ status: 'failed', message });
      });
    return () => controller.abort();
  }, []);

  return (
    <>
      <div className="page-head">
        <div>
          <Breadcrumbs crumbs={[{ label: 'Dashboard' }]} />
          <h1>Dashboard</h1>
          <p className="page-subtitle">Donors in the register right now.</p>
        </div>
        <Link to="/donors/new" className="button primary">
          Add donor
        </Link>
      </div>
      <DashboardBody state={state} />
    </>
  );
}

function DashboardBody({ state }: { state: DashboardState }) {
  switch (state.status) {
    case 'loading':
      return <p className="page-status">Loading the dashboard…</p>;
    case 'failed':
      return (
        <p className="form-error" role="alert">
          {state.message}
        </p>
      );
    case 'loaded':
      return <DashboardCharts stats={state.stats} />;
    default: {
      const unhandled: never = state;
      throw new Error(`Unhandled dashboard state: ${JSON.stringify(unhandled)}`);
    }
  }
}

function DashboardCharts({ stats }: { stats: DashboardStats }) {
  const { totals } = stats;
  if (totals.registered === 0) {
    return (
      <section className="card empty-state">
        <h2>No donors yet</h2>
        <p>Add the first donor to see the numbers here.</p>
        <Link to="/donors/new" className="button primary">
          Add donor
        </Link>
      </section>
    );
  }

  const bloodGroups = stats.byBloodGroup.map((count) => ({
    ...availabilityValue(count.bloodGroup, count.bloodGroup, count),
    critical: count.available === 0,
  }));
  const shortages = stats.byBloodGroup.filter((count) => count.available === 0);

  return (
    <div className="dashboard">
      <ul className="kpis" aria-label="Key numbers">
        <li className="card">
          <span>Registered donors</span>
          <strong>{totals.registered}</strong>
        </li>
        <li className="card">
          <span>Available now</span>
          <strong>{totals.available}</strong>
        </li>
        <li className="card">
          <span>Unavailable</span>
          <strong>{totals.unavailable}</strong>
        </li>
        <li className="card">
          <span>New in the last 30 days</span>
          <strong>{totals.newLast30Days}</strong>
        </li>
      </ul>

      <section className="card chart-card availability-card">
        <h2>Availability</h2>
        <AvailabilityDonut available={totals.available} total={totals.registered} />
        <ul className="legend">
          <li>
            <span className="swatch available" aria-hidden="true" /> Available{' '}
            <strong>{totals.available}</strong>
          </li>
          <li>
            <span className="swatch unavailable" aria-hidden="true" /> Unavailable{' '}
            <strong>{totals.unavailable}</strong>
          </li>
        </ul>
      </section>

      <section className="card chart-card blood-group-card">
        <div className="chart-head">
          <h2>Donors by blood group</h2>
          <ChartLegend />
        </div>
        <ColumnChart columns={bloodGroups} label="Donors by blood group" />
        {shortages.length > 0 && (
          <p className="shortage">
            No available donors: {shortages.map((count) => count.bloodGroup).join(', ')}
          </p>
        )}
      </section>

      <section className="card chart-card top-donors-card">
        <h2>Top donors</h2>
        <TopDonors donors={stats.topDonors} />
      </section>

      <section className="card chart-card">
        <div className="chart-head">
          <h2>Donors by division</h2>
          <ChartLegend />
        </div>
        <BarList
          label="Donors by division"
          rows={stats.byDivision.map((count) =>
            availabilityValue(count.divisionId, zoneName(count.divisionId), count),
          )}
        />
      </section>

      <section className="card chart-card">
        <div className="chart-head">
          <h2>Top districts</h2>
          <ChartLegend />
        </div>
        <BarList
          label="Districts with the most donors"
          rows={stats.topDistricts.map((count) =>
            availabilityValue(count.districtId, zoneName(count.districtId), count),
          )}
        />
      </section>

      <section className="card chart-card registrations-card">
        <h2>New donors per month</h2>
        <ColumnChart
          label="New donors per month"
          columns={stats.registrationsByMonth.map(({ month, count }) => ({
            key: month,
            label: formatMonth(month),
            value: count,
            part: count,
            description: `${formatMonth(month)}: ${count} new donors`,
          }))}
        />
      </section>
    </div>
  );
}

function ChartLegend() {
  return (
    <ul className="legend" aria-hidden="true">
      <li>
        <span className="swatch available" /> Available
      </li>
      <li>
        <span className="swatch unavailable" /> Unavailable
      </li>
    </ul>
  );
}

function TopDonors({ donors }: { donors: TopDonor[] }) {
  if (donors.length === 0) return <p className="page-status">No donations recorded yet.</p>;
  return (
    <ol className="top-donors">
      {donors.map((donor, index) => (
        <li key={donor.id}>
          <span className={index < 3 ? 'rank podium' : 'rank'}>{index + 1}</span>
          <span className="top-donor-name">
            <Link to={`/donors/${donor.id}`}>{donor.name}</Link>
            <span className="muted">
              {zoneName(donor.districtId)} · last {formatDay(donor.lastDonatedAt)}
            </span>
          </span>
          <span className="blood-group">{donor.bloodGroup}</span>
          <span className="top-donor-count">
            <strong>{donor.donationCount}</strong>{' '}
            {donor.donationCount === 1 ? 'donation' : 'donations'}
          </span>
        </li>
      ))}
    </ol>
  );
}
