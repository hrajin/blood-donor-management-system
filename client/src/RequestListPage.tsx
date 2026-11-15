import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { bangladeshDate } from '../../shared/bangladesh-time.ts';
import {
  type BloodRequestSummary,
  componentLabels,
  type RequestPage,
  type RequestStatus,
  requestStatuses,
  requestStatusLabels,
} from '../../shared/blood-request.ts';
import { zoneName } from '../../shared/locations.ts';
import { ApiError, listRequests } from './api.ts';
import { Breadcrumbs } from './Breadcrumbs.tsx';
import { formatDay, relativeDay } from './calendar-format.ts';
import { SearchBox } from './SearchBox.tsx';
import { UnitsProgress } from './UnitsProgress.tsx';
import { useSearchInput, withFilters } from './url-filters.ts';

type ListState =
  | { status: 'loading'; previous: RequestPage | null }
  | { status: 'failed'; message: string }
  | { status: 'loaded'; page: RequestPage };

const statusTabs: { value: RequestStatus | 'all'; label: string }[] = [
  ...requestStatuses.map((status) => ({ value: status, label: requestStatusLabels[status] })),
  { value: 'all', label: 'All' },
];

export function RequestListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [state, setState] = useState<ListState>({ status: 'loading', previous: null });
  const [search, setSearch] = useSearchInput(searchParams, setSearchParams);
  const status = searchParams.get('status') ?? 'open';

  useEffect(() => {
    const controller = new AbortController();
    setState((current) => ({
      status: 'loading',
      previous: current.status === 'loaded' ? current.page : null,
    }));
    listRequests(searchParams, controller.signal)
      .then((page) => setState({ status: 'loaded', page }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        console.error(error);
        const message = error instanceof ApiError ? error.message : 'Could not load requests.';
        setState({ status: 'failed', message });
      });
    return () => controller.abort();
  }, [searchParams]);

  function setFilters(changes: Record<string, string>) {
    setSearchParams((current) => withFilters(current, changes));
  }

  return (
    <>
      <div className="page-head">
        <div>
          <Breadcrumbs crumbs={[{ label: 'Dashboard', to: '/' }, { label: 'Requests' }]} />
          <h1>Blood requests</h1>
          <p className="page-subtitle">Open requests show emergencies first, then the soonest.</p>
        </div>
        <Link to="/requests/new" className="button primary">
          New request
        </Link>
      </div>

      <section className="toolbar request-toolbar" aria-label="Search and filters">
        <div className="segmented">
          {statusTabs.map((tab) => (
            <button
              key={tab.value}
              type="button"
              className={status === tab.value ? 'selected' : undefined}
              aria-pressed={status === tab.value}
              onClick={() => setFilters({ status: tab.value === 'open' ? '' : tab.value })}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="request-search">
          <SearchBox
            label="Search by code, patient or contact phone"
            value={search}
            onChange={setSearch}
          />
        </div>
      </section>

      <RequestResults state={state} onPage={(page) => setFilters({ page: String(page) })} />
    </>
  );
}

function RequestResults({ state, onPage }: { state: ListState; onPage: (page: number) => void }) {
  switch (state.status) {
    case 'loading':
      if (!state.previous) return <p className="page-status">Loading requests…</p>;
      return <RequestList page={state.previous} busy onPage={onPage} />;
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
            <h2>No requests here</h2>
            <p>When a patient needs blood, create a request to find donors near the hospital.</p>
            <Link to="/requests/new" className="button primary">
              New request
            </Link>
          </section>
        );
      }
      return <RequestList page={state.page} busy={false} onPage={onPage} />;
    default: {
      const unhandled: never = state;
      throw new Error(`Unhandled list state: ${JSON.stringify(unhandled)}`);
    }
  }
}

function RequestList({
  page: result,
  busy,
  onPage,
}: {
  page: RequestPage;
  busy: boolean;
  onPage: (page: number) => void;
}) {
  const { requests, total, page, pageSize } = result;
  const lastPage = Math.ceil(total / pageSize);
  const today = bangladeshDate(new Date());

  return (
    <div className={busy ? 'results busy' : 'results'} aria-busy={busy}>
      <p className="result-count">
        <strong>{total}</strong> {total === 1 ? 'request' : 'requests'}
      </p>
      <ul className="request-list">
        {requests.map((request) => (
          <RequestRow key={request.id} request={request} today={today} />
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

function RequestRow({ request, today }: { request: BloodRequestSummary; today: string }) {
  const overdue = request.status === 'open' && request.requiredOn < today;
  return (
    <li className={request.urgency === 'emergency' ? 'request-row emergency' : 'request-row'}>
      <span className="request-blood" title="Blood group">
        {request.bloodGroup}
      </span>
      <div className="request-main">
        <div className="request-title">
          <Link to={`/requests/${request.id}`} className="request-link">
            {request.patientName}
          </Link>
          {request.urgency === 'emergency' && <span className="badge emergency">Emergency</span>}
          <span className={`badge status-${request.status}`}>
            {requestStatusLabels[request.status]}
          </span>
        </div>
        <p className="muted">
          {request.code} · {componentLabels[request.component]} · {request.hospitalName},{' '}
          {zoneName(request.districtId)}
        </p>
      </div>
      <div className="request-when">
        <strong className={overdue ? 'overdue' : undefined}>
          {relativeDay(request.requiredOn, today)}
        </strong>
        <span className="muted">{formatDay(request.requiredOn)}</span>
      </div>
      <UnitsProgress request={request} />
    </li>
  );
}
