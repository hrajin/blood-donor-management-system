import { useEffect, useId, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import {
  bloodGroups,
  type Donor,
  type DonorPage,
  type DonorSort,
  donorSorts,
} from '../../shared/donor.ts';
import { placeName, zoneName } from '../../shared/locations.ts';
import { AvailabilitySwitch } from './AvailabilitySwitch.tsx';
import { ApiError, listDonors, setAvailability } from './api.ts';
import { Breadcrumbs } from './Breadcrumbs.tsx';
import { formatDay } from './calendar-format.ts';
import { initials } from './donor-initials.ts';
import { LocationSelect } from './LocationSelect.tsx';
import { SearchBox } from './SearchBox.tsx';
import { optionsOf, SearchSelect } from './SearchSelect.tsx';
import { useToast } from './Toaster.tsx';
import { useSearchInput, withFilters } from './url-filters.ts';
import { DonorCardsSkeleton } from './Skeleton.tsx';
import { getCached, setCached } from './page-cache.ts';

type ListState =
  | { status: 'loading'; previous: DonorPage | null }
  | { status: 'failed'; message: string }
  | { status: 'loaded'; page: DonorPage };

const filterKeys = ['divisionId', 'districtId', 'areaId', 'bloodGroup', 'available', 'search'];

const sortLabels: Record<DonorSort, string> = {
  name: 'Name (A–Z)',
  newest: 'Newest registered',
  lastDonation: 'Recent donation',
  availability: 'Available first',
};

const availabilityOptions = [
  { value: '', label: 'All' },
  { value: 'true', label: 'Available' },
  { value: 'false', label: 'Unavailable' },
];

export function DonorListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [state, setState] = useState<ListState>({ status: 'loading', previous: null });
  const [search, setSearch] = useSearchInput(searchParams, setSearchParams);
  const [rowError, setRowError] = useState('');
  const showToast = useToast();
  const sortId = useId();
  const [pendingIds, setPendingIds] = useState<ReadonlySet<string>>(new Set());

  useEffect(() => {
    const key = `donors:${searchParams.toString()}`;
    const cached = getCached<DonorPage>(key);
    const controller = new AbortController();
    // Show cached data instantly; fall back to keeping the previous page while loading.
    if (cached) {
      setState({ status: 'loaded', page: cached });
    } else {
      setState((current) => ({
        status: 'loading',
        previous: current.status === 'loaded' ? current.page : null,
      }));
    }
    listDonors(searchParams, controller.signal)
      .then((page) => {
        setCached(key, page);
        setState({ status: 'loaded', page });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        console.error(error);
        const message = error instanceof ApiError ? error.message : 'Could not load donors.';
        setState({ status: 'failed', message });
      });
    return () => controller.abort();
  }, [searchParams]);

  function setFilters(changes: Record<string, string>) {
    setSearchParams((current) => withFilters(current, changes));
  }

  // Clearing filters keeps the chosen order.
  function clearFilters() {
    setSearch('');
    const sort = searchParams.get('sort');
    setSearchParams(new URLSearchParams(sort ? { sort } : {}));
  }

  const shown =
    state.status === 'loaded' ? state.page : state.status === 'loading' ? state.previous : null;

  const activeFilters = filterKeys.filter((key) => searchParams.get(key)).length;

  async function toggleAvailability(donor: Donor) {
    setRowError('');
    setPendingIds((current) => new Set(current).add(donor.id));
    try {
      const updated = await setAvailability(donor.id, !donor.available);
      showToast(`${updated.name} marked ${updated.available ? 'available' : 'unavailable'}`);
      setState((current) =>
        current.status === 'loaded'
          ? {
              status: 'loaded',
              page: {
                ...current.page,
                donors: current.page.donors.map((d) => (d.id === updated.id ? updated : d)),
              },
            }
          : current,
      );
    } catch (error) {
      if (!(error instanceof ApiError)) throw error;
      setRowError(`${donor.name}: ${error.message}`);
    } finally {
      setPendingIds((current) => {
        const next = new Set(current);
        next.delete(donor.id);
        return next;
      });
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <Breadcrumbs crumbs={[{ label: 'Dashboard', to: '/' }, { label: 'Donors' }]} />
          <h1>Donors</h1>
          <p className="page-subtitle">Find donors by name, phone, blood group or area.</p>
        </div>
        <Link to="/donors/new" className="button primary">
          Add donor
        </Link>
      </div>

      <section className="toolbar" aria-label="Search and filters">
        <SearchBox label="Search by name or phone number" value={search} onChange={setSearch} />

        <fieldset className="filter-group">
          <legend className="filter-label">Blood group</legend>
          <div className="chips">
            {['', ...bloodGroups].map((group) => {
              const selected = (searchParams.get('bloodGroup') ?? '') === group;
              return (
                <button
                  key={group || 'all'}
                  type="button"
                  className={selected ? 'chip selected' : 'chip'}
                  aria-pressed={selected}
                  onClick={() => setFilters({ bloodGroup: group })}
                >
                  {group || 'All'}
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="filter-bottom">
          <LocationSelect
            mode="filter"
            value={{
              divisionId: searchParams.get('divisionId') ?? '',
              districtId: searchParams.get('districtId') ?? '',
              areaId: searchParams.get('areaId') ?? '',
            }}
            onChange={(location) => setFilters(location)}
          />
          <fieldset className="filter-group">
            <legend className="filter-label">Availability</legend>
            <div className="segmented">
              {availabilityOptions.map((option) => {
                const selected = (searchParams.get('available') ?? '') === option.value;
                return (
                  <button
                    key={option.label}
                    type="button"
                    className={selected ? 'selected' : undefined}
                    aria-pressed={selected}
                    onClick={() => setFilters({ available: option.value })}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </fieldset>
        </div>

        {activeFilters > 0 && (
          <div className="toolbar-foot">
            <span className="muted">
              {activeFilters} {activeFilters === 1 ? 'filter' : 'filters'} on
            </span>
            <button type="button" className="link-button" onClick={clearFilters}>
              Clear filters
            </button>
          </div>
        )}
      </section>

      <div className="results-bar">
        <p className="result-count">{shown && shown.total > 0 && <ResultCount page={shown} />}</p>
        <div className="sort-select">
          <label htmlFor={sortId}>Sort by</label>
          <SearchSelect
            inputId={sortId}
            searchable={false}
            options={optionsOf(donorSorts, sortLabels)}
            value={searchParams.get('sort') ?? 'name'}
            placeholder="Name (A–Z)"
            onChange={(sort) => setFilters({ sort: sort === 'name' ? '' : sort })}
          />
        </div>
      </div>

      {rowError && (
        <p className="form-error" role="alert">
          {rowError}
        </p>
      )}
      <DonorCards
        state={state}
        hasFilters={activeFilters > 0}
        onClearFilters={clearFilters}
        pendingIds={pendingIds}
        onToggle={toggleAvailability}
        onPage={(page) => setFilters({ page: String(page) })}
      />
    </>
  );
}

type CardsProps = {
  state: ListState;
  pendingIds: ReadonlySet<string>;
  hasFilters: boolean;
  onClearFilters: () => void;
  onToggle: (donor: Donor) => void;
  onPage: (page: number) => void;
};

function DonorCards({
  state,
  pendingIds,
  hasFilters,
  onClearFilters,
  onToggle,
  onPage,
}: CardsProps) {
  switch (state.status) {
    case 'loading':
      if (!state.previous) return <DonorCardsSkeleton />;
      return (
        <DonorGrid
          page={state.previous}
          busy
          pendingIds={pendingIds}
          onToggle={onToggle}
          onPage={onPage}
        />
      );
    case 'failed':
      return (
        <p className="form-error" role="alert">
          {state.message}
        </p>
      );
    case 'loaded':
      if (state.page.total === 0) {
        return (
          <section className="card empty-state">
            <h2>No donors found</h2>
            <p>
              {hasFilters
                ? 'No donor matches these filters. Try fewer filters or another search.'
                : 'No donors yet. Add the first one to get started.'}
            </p>
            {hasFilters ? (
              <button type="button" className="secondary" onClick={onClearFilters}>
                Clear filters
              </button>
            ) : (
              <Link to="/donors/new" className="button primary">
                Add donor
              </Link>
            )}
          </section>
        );
      }
      return (
        <DonorGrid
          page={state.page}
          busy={false}
          pendingIds={pendingIds}
          onToggle={onToggle}
          onPage={onPage}
        />
      );
    default: {
      const unhandled: never = state;
      throw new Error(`Unhandled list state: ${JSON.stringify(unhandled)}`);
    }
  }
}

type GridProps = {
  page: DonorPage;
  busy: boolean;
  pendingIds: ReadonlySet<string>;
  onToggle: (donor: Donor) => void;
  onPage: (page: number) => void;
};

function DonorGrid({ page: result, busy, pendingIds, onToggle, onPage }: GridProps) {
  const { donors, total, page, pageSize } = result;
  const lastPage = Math.ceil(total / pageSize);

  return (
    <div className={busy ? 'results busy' : 'results'} aria-busy={busy}>
      <ul className="donor-cards">
        {donors.map((donor) => (
          <li key={donor.id} className="donor-card">
            <div className="donor-card-head">
              <span className="donor-avatar" aria-hidden="true">
                {initials(donor.name)}
              </span>
              <div className="donor-identity">
                <h2>
                  <Link to={`/donors/${donor.id}`} className="donor-name">
                    {donor.name}
                  </Link>
                </h2>
                <a href={`tel:${donor.phone}`} className="donor-phone">
                  {donor.phone}
                </a>
              </div>
              <span className="blood-badge" title="Blood group">
                {donor.bloodGroup}
              </span>
            </div>

            <dl className="donor-facts">
              <div>
                <dt>Location</dt>
                <dd>
                  {donor.districtId ? (
                    <>
                      {placeName(donor)}
                      {donor.divisionId && (
                        <span className="muted"> · {zoneName(donor.divisionId)}</span>
                      )}
                    </>
                  ) : (
                    <span className="muted">{placeName(donor)}</span>
                  )}
                </dd>
              </div>
              <div>
                <dt>Donations</dt>
                <dd>
                  {donor.donationCount === 0 || !donor.lastDonatedAt ? (
                    <span className="muted">Not donated yet</span>
                  ) : (
                    <>
                      <strong>{donor.donationCount}</strong>
                      <span className="muted"> · last {formatDay(donor.lastDonatedAt)}</span>
                    </>
                  )}
                </dd>
              </div>
            </dl>

            <div className="donor-card-foot">
              <AvailabilitySwitch
                available={donor.available}
                pending={pendingIds.has(donor.id)}
                donorName={donor.name}
                onToggle={() => onToggle(donor)}
              />
              <Link
                to={`/donors/${donor.id}/edit`}
                className="icon-button"
                aria-label={`Edit ${donor.name}`}
                title="Edit donor"
              >
                <PencilIcon />
              </Link>
            </div>
          </li>
        ))}
      </ul>

      {lastPage > 1 && (
        <nav className="pager" aria-label="Pages">
          <button
            type="button"
            className="secondary"
            disabled={page <= 1}
            onClick={() => onPage(page - 1)}
          >
            ← Previous
          </button>
          <span>
            Page {page} of {lastPage}
          </span>
          <button
            type="button"
            className="secondary"
            disabled={page >= lastPage}
            onClick={() => onPage(page + 1)}
          >
            Next →
          </button>
        </nav>
      )}
    </div>
  );
}

function ResultCount({ page: result }: { page: DonorPage }) {
  const first = (result.page - 1) * result.pageSize + 1;
  const last = first + result.donors.length - 1;
  return (
    <>
      Showing{' '}
      <strong>
        {first}–{last}
      </strong>{' '}
      of <strong>{result.total}</strong> {result.total === 1 ? 'donor' : 'donors'}
    </>
  );
}

function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4Z" />
      <path d="m13.5 6.5 4 4" />
    </svg>
  );
}
