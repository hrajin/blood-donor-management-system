import { useNavigate, useParams } from 'react-router';
import type { Donor } from '../../shared/donor.ts';
import { Breadcrumbs } from './Breadcrumbs.tsx';
import { DonorForm } from './DonorForm.tsx';
import { useToast } from './Toaster.tsx';

export function DonorFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  // After editing, go back to the donor; after adding, to the list.
  const back = () => navigate(id ? `/donors/${id}` : '/donors');
  const showToast = useToast();

  function saved(donor: Donor) {
    showToast(id ? 'Changes saved' : `${donor.name} added`);
    back();
  }

  return (
    <div className="donor-page">
      <div className="page-head">
        <div>
          <Breadcrumbs
            crumbs={[
              { label: 'Dashboard', to: '/' },
              { label: 'Donors', to: '/donors' },
              ...(id ? [{ label: 'Donor', to: `/donors/${id}` }] : []),
              { label: id ? 'Edit donor' : 'Add donor' },
            ]}
          />
          <h1>{id ? 'Edit donor' : 'Add donor'}</h1>
          <p className="page-subtitle">
            {id
              ? 'Update the donor’s details and donation history.'
              : 'Register a voluntary blood donor. Every field is required unless marked optional.'}
          </p>
        </div>
      </div>
      {/* Keyed so that moving between add and edit starts from a fresh form. */}
      <DonorForm key={id ?? 'new'} donorId={id} onSaved={saved} onCancel={back} />
    </div>
  );
}
