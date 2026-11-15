import { type ReactNode, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { bangladeshDate, completedYears } from '../../shared/bangladesh-time.ts';
import { type Donor, genderLabels } from '../../shared/donor.ts';
import { placeName, zoneName } from '../../shared/locations.ts';
import { AvailabilitySwitch } from './AvailabilitySwitch.tsx';
import { ApiError, getDonor, setAvailability } from './api.ts';
import { Breadcrumbs } from './Breadcrumbs.tsx';
import { formatDay, formatInstant, relativeDay } from './calendar-format.ts';
import { initials } from './donor-initials.ts';
import { NotGiven } from './NotGiven.tsx';
import { DonorDetailsSkeleton } from './Skeleton.tsx';
import { useToast } from './Toaster.tsx';

type DetailsState =
  | { status: 'loading' }
  | { status: 'failed'; message: string }
  | { status: 'loaded'; donor: Donor };

export function DonorDetailsPage() {
  const { id } = useParams();
  const [state, setState] = useState<DetailsState>({ status: 'loading' });

  useEffect(() => {
    if (!id) return;
    getDonor(id)
      .then((donor) => setState({ status: 'loaded', donor }))
      .catch((error: unknown) => {
        console.error(error);
        const message = error instanceof ApiError ? error.message : 'Could not load the donor.';
        setState({ status: 'failed', message });
      });
  }, [id]);

  const crumbs = [
    { label: 'Dashboard', to: '/' },
    { label: 'Donors', to: '/donors' },
    { label: state.status === 'loaded' ? state.donor.name : 'Donor' },
  ];

  return (
    <div className="donor-page">
      <Breadcrumbs crumbs={crumbs} />
      <DetailsBody state={state} onChange={(donor) => setState({ status: 'loaded', donor })} />
    </div>
  );
}

function DetailsBody({
  state,
  onChange,
}: {
  state: DetailsState;
  onChange: (donor: Donor) => void;
}) {
  switch (state.status) {
    case 'loading':
      return <DonorDetailsSkeleton />;
    case 'failed':
      return (
        <p className="form-error" role="alert">
          {state.message}
        </p>
      );
    case 'loaded':
      return <DonorDetails donor={state.donor} onChange={onChange} />;
    default: {
      const unhandled: never = state;
      throw new Error(`Unhandled details state: ${JSON.stringify(unhandled)}`);
    }
  }
}

function DonorDetails({ donor, onChange }: { donor: Donor; onChange: (donor: Donor) => void }) {
  const [toggleError, setToggleError] = useState('');
  const [toggling, setToggling] = useState(false);
  const showToast = useToast();
  const today = bangladeshDate(new Date());
  const sameAddress =
    donor.presentAddress !== null && donor.presentAddress === donor.permanentAddress;

  async function toggleAvailability() {
    setToggleError('');
    setToggling(true);
    try {
      const updated = await setAvailability(donor.id, !donor.available);
      onChange(updated);
      showToast(`${updated.name} marked ${updated.available ? 'available' : 'unavailable'}`);
    } catch (error) {
      if (!(error instanceof ApiError)) throw error;
      setToggleError(error.message);
    } finally {
      setToggling(false);
    }
  }

  return (
    <>
      <section className="profile-card">
        <span className="profile-avatar" aria-hidden="true">
          {initials(donor.name)}
        </span>
        <div className="profile-main">
          <h1>{donor.name}</h1>
          <p className="muted">
            {[
              donor.gender && genderLabels[donor.gender],
              donor.dateOfBirth && `${completedYears(donor.dateOfBirth, today)} years`,
              placeName(donor),
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
          <div className="profile-actions">
            <a href={`tel:${donor.phone}`} className="button secondary">
              Call {donor.phone}
            </a>
            {donor.email && (
              <a href={`mailto:${donor.email}`} className="button secondary">
                Email
              </a>
            )}
            <Link to={`/donors/${donor.id}/edit`} className="button primary">
              Edit donor
            </Link>
          </div>
        </div>
        <div className="profile-side">
          <span className="profile-blood" title="Blood group">
            {donor.bloodGroup}
          </span>
          <AvailabilitySwitch
            available={donor.available}
            pending={toggling}
            donorName={donor.name}
            onToggle={toggleAvailability}
          />
        </div>
      </section>

      {toggleError && (
        <p className="form-error" role="alert">
          {toggleError}
        </p>
      )}

      <div className="details-grid">
        <DetailsCard title="Personal details">
          <Detail label="Full name">{donor.name}</Detail>
          <Detail label="Date of birth">
            {donor.dateOfBirth ? (
              <>
                {formatDay(donor.dateOfBirth)}{' '}
                <span className="muted">({completedYears(donor.dateOfBirth, today)} years)</span>
              </>
            ) : (
              <NotGiven />
            )}
          </Detail>
          <Detail label="Gender">{donor.gender ? genderLabels[donor.gender] : <NotGiven />}</Detail>
          <Detail label="NID number">{donor.nidNumber ?? <NotGiven />}</Detail>
        </DetailsCard>

        <DetailsCard title="Contact">
          <Detail label="Mobile number">
            <a href={`tel:${donor.phone}`}>{donor.phone}</a>
          </Detail>
          <Detail label="Email">
            {donor.email ? (
              <a href={`mailto:${donor.email}`}>{donor.email}</a>
            ) : (
              <span className="muted">Not given</span>
            )}
          </Detail>
        </DetailsCard>

        <DetailsCard title="Blood and donations">
          <Detail label="Blood group">
            <span className="blood-group">{donor.bloodGroup}</span>
          </Detail>
          <Detail label="Donations">{donor.donationCount}</Detail>
          <Detail label="Last donation">
            {donor.lastDonatedAt ? (
              <>
                {formatDay(donor.lastDonatedAt)}{' '}
                <span className="muted">
                  ({relativeDay(donor.lastDonatedAt, today).toLowerCase()})
                </span>
              </>
            ) : (
              <span className="muted">Not donated yet</span>
            )}
          </Detail>
          <Detail label="Availability">
            {donor.available ? 'Available' : 'Unavailable'}
            {donor.availableAgainOn && (
              <span className="muted">
                {' '}
                · available again on {formatDay(donor.availableAgainOn)}
              </span>
            )}
          </Detail>
        </DetailsCard>

        <DetailsCard title="Location and address">
          <Detail label="Division">
            {donor.divisionId ? zoneName(donor.divisionId) : <NotGiven />}
          </Detail>
          <Detail label="District">
            {donor.districtId ? zoneName(donor.districtId) : <NotGiven />}
          </Detail>
          <Detail label="Area / City">{donor.areaName ?? <NotGiven />}</Detail>
          <Detail label="Present address">{donor.presentAddress ?? <NotGiven />}</Detail>
          <Detail label="Permanent address">
            {sameAddress ? (
              <span className="muted">Same as present address</span>
            ) : (
              (donor.permanentAddress ?? <NotGiven />)
            )}
          </Detail>
        </DetailsCard>
      </div>

      <p className="record-dates muted">
        Registered {formatInstant(donor.createdAt)} · Last updated {formatInstant(donor.updatedAt)}
      </p>
    </>
  );
}

function DetailsCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="details-card">
      <h2>{title}</h2>
      <dl>{children}</dl>
    </section>
  );
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}
