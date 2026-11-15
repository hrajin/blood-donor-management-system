import { type FormEvent, type ReactNode, useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { bangladeshDate } from '../../shared/bangladesh-time.ts';
import {
  type BloodRequest,
  cancelInput,
  cancelReasonLabels,
  cancelReasons,
  componentLabels,
  type DonorContact,
  type DonorSuggestion,
  hospitalPlace,
  type ResponseInput,
  type ResponseStatus,
  relationshipLabels,
  requestReasonLabels,
  requestStatusLabels,
  responseStatusLabels,
  type SuggestionResult,
  type Tier,
} from '../../shared/blood-request.ts';
import { donationIntervalDays, maxMatchingAge, minDonorAge } from '../../shared/eligibility.ts';
import { placeName, zoneName } from '../../shared/locations.ts';
import {
  ApiError,
  cancelRequest,
  getRequest,
  getSuggestions,
  recordDonation,
  recordResponse,
} from './api.ts';
import { Breadcrumbs } from './Breadcrumbs.tsx';
import { formatDay, formatInstant, relativeDay } from './calendar-format.ts';
import { Field } from './form-parts.tsx';
import { NotGiven } from './NotGiven.tsx';
import { optionsOf, SearchSelect } from './SearchSelect.tsx';
import { useToast } from './Toaster.tsx';
import { UnitsProgress } from './UnitsProgress.tsx';
import { RequestDetailsSkeleton } from './Skeleton.tsx';

type RequestState =
  | { status: 'loading' }
  | { status: 'failed'; message: string }
  | { status: 'loaded'; request: BloodRequest };

export function RequestDetailsPage() {
  const { id } = useParams();
  const [state, setState] = useState<RequestState>({ status: 'loading' });

  useEffect(() => {
    if (!id) return;
    getRequest(id)
      .then((request) => setState({ status: 'loaded', request }))
      .catch((error: unknown) => {
        console.error(error);
        const message = error instanceof ApiError ? error.message : 'Could not load the request.';
        setState({ status: 'failed', message });
      });
  }, [id]);

  const crumbs = [
    { label: 'Dashboard', to: '/' },
    { label: 'Requests', to: '/requests' },
    { label: state.status === 'loaded' ? state.request.code : 'Request' },
  ];

  return (
    <div className="request-page">
      <Breadcrumbs crumbs={crumbs} />
      <RequestBody state={state} onChange={(request) => setState({ status: 'loaded', request })} />
    </div>
  );
}

function RequestBody({
  state,
  onChange,
}: {
  state: RequestState;
  onChange: (request: BloodRequest) => void;
}) {
  switch (state.status) {
    case 'loading':
      return <RequestDetailsSkeleton />;
    case 'failed':
      return (
        <p className="form-error" role="alert">
          {state.message}
        </p>
      );
    case 'loaded':
      return <RequestDetails request={state.request} onChange={onChange} />;
    default: {
      const unhandled: never = state;
      throw new Error(`Unhandled request state: ${JSON.stringify(unhandled)}`);
    }
  }
}

function RequestDetails({
  request,
  onChange,
}: {
  request: BloodRequest;
  onChange: (request: BloodRequest) => void;
}) {
  const showToast = useToast();
  const [pendingIds, setPendingIds] = useState<ReadonlySet<string>>(new Set());
  const [actionError, setActionError] = useState('');
  // Goes up after every recorded response, so the suggestions reload without that donor.
  const [suggestionsVersion, setSuggestionsVersion] = useState(0);
  const open = request.status === 'open';

  const act = useCallback(
    async (donor: DonorContact, action: () => Promise<BloodRequest>, message: string) => {
      setActionError('');
      setPendingIds((current) => new Set(current).add(donor.id));
      try {
        const updated = await action();
        onChange(updated);
        setSuggestionsVersion((version) => version + 1);
        showToast(updated.status === 'fulfilled' ? `${message} · request fulfilled` : message);
      } catch (error) {
        if (!(error instanceof ApiError)) throw error;
        setActionError(`${donor.name}: ${error.message}`);
      } finally {
        setPendingIds((current) => {
          const next = new Set(current);
          next.delete(donor.id);
          return next;
        });
      }
    },
    [onChange, showToast],
  );

  const respond = (donor: DonorContact, status: ResponseInput['status']) =>
    act(
      donor,
      () => recordResponse(request.id, donor.id, { status }),
      `${donor.name}: ${responseStatusLabels[status].toLowerCase()}`,
    );
  const donate = (donor: DonorContact) =>
    act(donor, () => recordDonation(request.id, donor.id), `Donation by ${donor.name} recorded`);

  return (
    <>
      <RequestHeader request={request} onChange={onChange} />

      {actionError && (
        <p className="form-error" role="alert">
          {actionError}
        </p>
      )}

      <ContactedDonors
        request={request}
        pendingIds={pendingIds}
        onRespond={respond}
        onDonate={donate}
      />

      {open && (
        <SuggestedDonors
          request={request}
          version={suggestionsVersion}
          pendingIds={pendingIds}
          onRespond={respond}
        />
      )}

      <RequestFacts request={request} />
    </>
  );
}

function RequestHeader({
  request,
  onChange,
}: {
  request: BloodRequest;
  onChange: (request: BloodRequest) => void;
}) {
  const [cancelling, setCancelling] = useState(false);
  const today = bangladeshDate(new Date());
  const overdue = request.status === 'open' && request.requiredOn < today;
  const stillNeeded = Math.max(0, request.unitsRequired - request.donated);

  return (
    <section
      className={request.urgency === 'emergency' ? 'request-hero emergency' : 'request-hero'}
    >
      <div className="request-hero-top">
        <span className="profile-blood" title="Blood group">
          {request.bloodGroup}
        </span>
        <div className="request-hero-main">
          <div className="request-title">
            <h1>{request.patientName}</h1>
            {request.urgency === 'emergency' && <span className="badge emergency">Emergency</span>}
            <span className={`badge status-${request.status}`}>
              {requestStatusLabels[request.status]}
            </span>
          </div>
          <p className="muted">
            {[request.code, componentLabels[request.component], hospitalPlace(request)].join(' · ')}
          </p>
        </div>
        <div className="request-when">
          <strong className={overdue ? 'overdue' : undefined}>
            {relativeDay(request.requiredOn, today)}
          </strong>
          <span className="muted">Needed {formatDay(request.requiredOn)}</span>
        </div>
      </div>

      <div className="request-hero-bottom">
        <div className="request-progress">
          <UnitsProgress request={request} />
          {request.status === 'open' && (
            <span className="muted">
              {stillNeeded} {stillNeeded === 1 ? 'unit' : 'units'} still needed
            </span>
          )}
        </div>
        <div className="profile-actions">
          <a href={`tel:${request.contactPhone}`} className="button secondary">
            Call {request.contactName}
          </a>
          {request.status === 'open' && !cancelling && (
            <button type="button" className="danger" onClick={() => setCancelling(true)}>
              Cancel request
            </button>
          )}
        </div>
      </div>

      {request.status === 'cancelled' && request.cancelReason && (
        <p className="closed-note">
          Cancelled: {cancelReasonLabels[request.cancelReason]}
          {request.cancelNote && ` — ${request.cancelNote}`}
          {request.closedAt && ` · ${formatInstant(request.closedAt)}`}
        </p>
      )}
      {request.status === 'fulfilled' && request.closedAt && (
        <p className="closed-note">Fulfilled {formatInstant(request.closedAt)}</p>
      )}

      {cancelling && (
        <CancelForm
          request={request}
          onDone={(updated) => {
            setCancelling(false);
            onChange(updated);
          }}
          onClose={() => setCancelling(false)}
        />
      )}
    </section>
  );
}

function CancelForm({
  request,
  onDone,
  onClose,
}: {
  request: BloodRequest;
  onDone: (request: BloodRequest) => void;
  onClose: () => void;
}) {
  const showToast = useToast();
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const parsed = cancelInput.safeParse({ reason, note: note.trim() || null });
    if (!parsed.success) {
      setError('Choose a reason');
      return;
    }
    setSaving(true);
    try {
      const updated = await cancelRequest(request.id, parsed.data);
      showToast(`Request ${updated.code} cancelled`);
      onDone(updated);
    } catch (caught) {
      if (!(caught instanceof ApiError)) throw caught;
      setError(caught.message);
      setSaving(false);
    }
  }

  return (
    <form className="cancel-form" onSubmit={submit} noValidate>
      <Field label="Why is this request being cancelled?">
        {(id) => (
          <SearchSelect
            inputId={id}
            searchable={false}
            options={optionsOf(cancelReasons, cancelReasonLabels)}
            value={reason}
            placeholder="Choose…"
            invalid={Boolean(error)}
            onChange={setReason}
          />
        )}
      </Field>
      <label>
        Note (optional)
        <input value={note} maxLength={200} onChange={(event) => setNote(event.target.value)} />
      </label>
      {error && <span className="field-error span-all">{error}</span>}
      <div className="form-buttons span-all">
        <button type="button" className="secondary" onClick={onClose}>
          Keep request
        </button>
        <button type="submit" className="danger" disabled={saving}>
          {saving ? 'Cancelling…' : 'Cancel request'}
        </button>
      </div>
    </form>
  );
}

type RespondProps = {
  pendingIds: ReadonlySet<string>;
  onRespond: (donor: DonorContact, status: ResponseInput['status']) => void;
};

function ContactedDonors({
  request,
  pendingIds,
  onRespond,
  onDonate,
}: RespondProps & { request: BloodRequest; onDonate: (donor: DonorContact) => void }) {
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const open = request.status === 'open';

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Contacted donors</h2>
        <span className="muted">{request.responses.length}</span>
      </div>
      {request.responses.length === 0 ? (
        <p className="panel-empty muted">
          No one yet. Call a suggested donor below and record what they said.
        </p>
      ) : (
        <ul className="donor-rows">
          {request.responses.map(({ donor, status, updatedAt }) => (
            <li key={donor.id} className="donor-row">
              <DonorLine donor={donor} />
              <span className={`response-badge response-${status}`}>
                {responseStatusLabels[status]}
              </span>
              <span className="muted response-time">{formatInstant(updatedAt)}</span>
              {open && status !== 'donated' && (
                <div className="row-actions">
                  {confirmingId === donor.id ? (
                    <>
                      <span className="confirm-text">Donation done?</span>
                      <button
                        type="button"
                        className="primary small"
                        disabled={pendingIds.has(donor.id)}
                        onClick={() => {
                          setConfirmingId(null);
                          onDonate(donor);
                        }}
                      >
                        Yes, record it
                      </button>
                      <button
                        type="button"
                        className="secondary small"
                        onClick={() => setConfirmingId(null)}
                      >
                        No
                      </button>
                    </>
                  ) : (
                    <>
                      <ResponseButtons
                        donor={donor}
                        current={status}
                        pending={pendingIds.has(donor.id)}
                        onRespond={onRespond}
                      />
                      <button
                        type="button"
                        className="primary small"
                        disabled={pendingIds.has(donor.id)}
                        onClick={() => setConfirmingId(donor.id)}
                      >
                        Mark donated
                      </button>
                    </>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// Tiers 1–3 only occur when the request has that level, so the zone names are there.
const tierTitles: Record<Tier, (request: BloodRequest) => string> = {
  1: (request) => `Same area · ${request.areaName}`,
  2: (request) => `Same district · ${zoneName(request.districtId ?? '')}`,
  3: (request) => `Same division · ${zoneName(request.divisionId ?? '')}`,
  4: () => 'Other divisions',
  5: (request) => (request.divisionId ? 'Location not recorded' : 'Hospital location not recorded'),
};

type SuggestionState =
  | { status: 'loading' }
  | { status: 'failed'; message: string }
  | { status: 'loaded'; result: SuggestionResult };

function SuggestedDonors({
  request,
  version,
  pendingIds,
  onRespond,
}: RespondProps & { request: BloodRequest; version: number }) {
  const [wider, setWider] = useState(false);

  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h2>Suggested donors</h2>
          <p className="muted panel-hint">
            {request.bloodGroup} donors who are available, aged {minDonorAge}–{maxMatchingAge} and
            have not donated in the {donationIntervalDays} days before the day it is needed. Nearest
            to the hospital first, then the longest since their last donation.
          </p>
        </div>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={wider}
            onChange={(event) => setWider(event.target.checked)}
          />
          Include other divisions
        </label>
      </div>
      {/* Keyed on `version`, which goes up after every response, so the list reloads. */}
      <SuggestionList
        key={version}
        request={request}
        wider={wider}
        pendingIds={pendingIds}
        onRespond={onRespond}
      />
    </section>
  );
}

function SuggestionList({
  request,
  wider,
  pendingIds,
  onRespond,
}: RespondProps & { request: BloodRequest; wider: boolean }) {
  const [state, setState] = useState<SuggestionState>({ status: 'loading' });

  useEffect(() => {
    const controller = new AbortController();
    getSuggestions(request.id, wider, controller.signal)
      .then((result) => setState({ status: 'loaded', result }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        console.error(error);
        const message =
          error instanceof ApiError ? error.message : 'Could not load suggested donors.';
        setState({ status: 'failed', message });
      });
    return () => controller.abort();
  }, [request.id, wider]);

  return (
    <SuggestionBody state={state} request={request} pendingIds={pendingIds} onRespond={onRespond} />
  );
}

function SuggestionBody({
  state,
  request,
  pendingIds,
  onRespond,
}: RespondProps & { state: SuggestionState; request: BloodRequest }) {
  switch (state.status) {
    case 'loading':
      return <p className="panel-empty muted">Finding donors…</p>;
    case 'failed':
      return (
        <p className="form-error" role="alert">
          {state.message}
        </p>
      );
    case 'loaded': {
      const { suggestions, total, excluded, checkedOn } = state.result;
      const tiers = ([1, 2, 3, 4, 5] as const)
        .map((tier) => ({ tier, donors: suggestions.filter((s) => s.tier === tier) }))
        .filter((group) => group.donors.length > 0);
      return (
        <>
          <p className="excluded muted">
            Eligibility checked for {formatDay(checkedOn)}. <ExcludedSummary excluded={excluded} />
          </p>
          {total === 0 && (
            <p className="panel-empty muted">
              No matching donor right now. Try including other divisions, or check back when more
              donors become eligible.
            </p>
          )}
          {tiers.map(({ tier, donors }) => (
            <div key={tier} className="tier">
              <h3>
                {tierTitles[tier](request)} <span className="muted">{donors.length}</span>
              </h3>
              <ul className="donor-rows">
                {donors.map((suggestion) => (
                  <SuggestionRow
                    key={suggestion.donor.id}
                    suggestion={suggestion}
                    pending={pendingIds.has(suggestion.donor.id)}
                    onRespond={onRespond}
                  />
                ))}
              </ul>
            </div>
          ))}
          {total > suggestions.length && (
            <p className="panel-empty muted">
              Showing the best {suggestions.length} of {total}. Record responses to see more.
            </p>
          )}
        </>
      );
    }
    default: {
      const unhandled: never = state;
      throw new Error(`Unhandled suggestion state: ${JSON.stringify(unhandled)}`);
    }
  }
}

function ExcludedSummary({ excluded }: { excluded: SuggestionResult['excluded'] }) {
  const reasons = [
    [excluded.unavailable, 'unavailable'],
    [excluded.recentlyDonated, `donated in the last ${donationIntervalDays} days`],
    [excluded.outsideAgeRange, `outside ages ${minDonorAge}–${maxMatchingAge}`],
    [excluded.committedElsewhere, 'agreed for another request'],
    [excluded.isContactPerson, 'the contact person'],
  ] as const;
  const shown = reasons.filter(([count]) => count > 0);
  if (shown.length === 0) return null;
  return <>Not suggested: {shown.map(([count, label]) => `${count} ${label}`).join(' · ')}</>;
}

function SuggestionRow({
  suggestion,
  pending,
  onRespond,
}: {
  suggestion: DonorSuggestion;
  pending: boolean;
  onRespond: RespondProps['onRespond'];
}) {
  const { donor, age } = suggestion;
  return (
    <li className="donor-row">
      <DonorLine donor={donor} age={age} />
      <div className="row-actions">
        <a href={`tel:${donor.phone}`} className="button secondary small">
          Call
        </a>
        <ResponseButtons donor={donor} current={null} pending={pending} onRespond={onRespond} />
      </div>
    </li>
  );
}

/** `age` is null when the date of birth is not recorded, and left out where it does not matter. */
function DonorLine({ donor, age }: { donor: DonorContact; age?: number | null }) {
  return (
    <div className="donor-line">
      <Link to={`/donors/${donor.id}`} className="donor-name">
        {donor.name}
      </Link>
      <span className="muted">
        {donor.phone}
        {age !== undefined && ` · ${age === null ? 'age not recorded' : `${age} yrs`}`} ·{' '}
        {placeName(donor)} ·{' '}
        {donor.lastDonatedAt
          ? `last gave ${formatDay(donor.lastDonatedAt)} (${donor.donationCount}×)`
          : 'never donated'}
      </span>
    </div>
  );
}

const manualResponses: ResponseInput['status'][] = ['agreed', 'declined', 'no-answer'];

function ResponseButtons({
  donor,
  current,
  pending,
  onRespond,
}: {
  donor: DonorContact;
  current: ResponseStatus | null;
  pending: boolean;
  onRespond: RespondProps['onRespond'];
}) {
  return (
    <>
      {manualResponses
        .filter((status) => status !== current)
        .map((status) => (
          <button
            key={status}
            type="button"
            className={status === 'agreed' ? 'secondary small agree' : 'secondary small'}
            disabled={pending}
            onClick={() => onRespond(donor, status)}
          >
            {responseStatusLabels[status]}
          </button>
        ))}
    </>
  );
}

function RequestFacts({ request }: { request: BloodRequest }) {
  return (
    <div className="details-grid">
      <section className="details-card">
        <h2>Patient and blood</h2>
        <dl>
          <Fact label="Patient">{request.patientName}</Fact>
          <Fact label="Blood group">
            <span className="blood-group">{request.bloodGroup}</span>
          </Fact>
          <Fact label="Component">{componentLabels[request.component]}</Fact>
          <Fact label="Units">{request.unitsRequired}</Fact>
          <Fact label="Reason">
            {request.reason ? requestReasonLabels[request.reason] : <NotGiven />}
          </Fact>
        </dl>
      </section>
      <section className="details-card">
        <h2>Hospital and contact</h2>
        <dl>
          <Fact label="Hospital">{request.hospitalName ?? <NotGiven />}</Fact>
          <Fact label="Location">{request.divisionId ? placeName(request) : <NotGiven />}</Fact>
          {request.hospitalAddress && <Fact label="Address">{request.hospitalAddress}</Fact>}
          {request.ward && <Fact label="Ward / bed">{request.ward}</Fact>}
          <Fact label="Contact">
            {request.contactName}
            {request.relationship && ` (${relationshipLabels[request.relationship]})`} ·{' '}
            <a href={`tel:${request.contactPhone}`}>{request.contactPhone}</a>
          </Fact>
          {request.notes && <Fact label="Notes">{request.notes}</Fact>}
          <Fact label="Created">{formatInstant(request.createdAt)}</Fact>
        </dl>
      </section>
    </div>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}
