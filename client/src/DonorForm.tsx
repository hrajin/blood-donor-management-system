import { type FormEvent, useEffect, useState } from 'react';
import { bangladeshDate } from '../../shared/bangladesh-time.ts';
import { bloodGroups, type Donor, donorInput, genderLabels, genders } from '../../shared/donor.ts';
import { fieldErrors } from '../../shared/field-errors.ts';
import { ApiError, createDonor, getDonor, updateDonor } from './api.ts';
import { ChoiceGroup, Field, FormSection } from './form-parts.tsx';
import { LocationSelect } from './LocationSelect.tsx';

type FormValues = {
  name: string;
  dateOfBirth: string;
  gender: string;
  nidNumber: string;
  phone: string;
  email: string;
  bloodGroup: string;
  divisionId: string;
  districtId: string;
  upazilaId: string;
  presentAddress: string;
  permanentAddress: string;
  sameAddress: boolean;
  available: boolean;
  donationCount: string;
  lastDonatedAt: string;
};

const emptyForm: FormValues = {
  name: '',
  dateOfBirth: '',
  gender: '',
  nidNumber: '',
  phone: '',
  email: '',
  bloodGroup: '',
  divisionId: '',
  districtId: '',
  upazilaId: '',
  presentAddress: '',
  permanentAddress: '',
  sameAddress: false,
  available: true,
  donationCount: '0',
  lastDonatedAt: '',
};

function toFormValues(donor: Donor): FormValues {
  return {
    ...donor,
    email: donor.email ?? '',
    sameAddress: donor.presentAddress === donor.permanentAddress,
    donationCount: String(donor.donationCount),
    lastDonatedAt: donor.lastDonatedAt ?? '',
  };
}

function toInput({ sameAddress, ...values }: FormValues) {
  return {
    ...values,
    email: values.email.trim() || null,
    permanentAddress: sameAddress ? values.presentAddress : values.permanentAddress,
    // An empty field must fail validation, not become 0.
    donationCount: values.donationCount === '' ? Number.NaN : Number(values.donationCount),
    lastDonatedAt: values.lastDonatedAt || null,
  };
}

type DonorFormProps = {
  /** The donor to edit; a new donor is added when absent. */
  donorId?: string | undefined;
  onSaved: (donor: Donor) => void;
  onCancel: () => void;
};

export function DonorForm({ donorId: id, onSaved, onCancel }: DonorFormProps) {
  const [values, setValues] = useState<FormValues>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(id !== undefined);
  const [saving, setSaving] = useState(false);
  const today = bangladeshDate(new Date());

  useEffect(() => {
    if (!id) return;
    getDonor(id)
      .then((donor) => {
        setValues(toFormValues(donor));
        setLoading(false);
      })
      .catch((error: unknown) => {
        console.error(error);
        setFormError(error instanceof ApiError ? error.message : 'Could not load the donor.');
        setLoading(false);
      });
  }, [id]);

  function change(changes: Partial<FormValues>) {
    setValues((current) => ({ ...current, ...changes }));
  }

  const invalid = (field: string) => (errors[field] ? true : undefined);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setFormError('');
    const parsed = donorInput.safeParse(toInput(values));
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      setFormError('Check the highlighted fields');
      return;
    }

    setErrors({});
    setSaving(true);
    try {
      onSaved(await (id ? updateDonor(id, parsed.data) : createDonor(parsed.data)));
    } catch (error) {
      if (!(error instanceof ApiError)) throw error;
      setSaving(false);
      setErrors(error.fields);
      setFormError(error.message);
    }
  }

  if (loading) return <p className="page-status">Loading donor…</p>;

  return (
    <form className="donor-form" onSubmit={submit} noValidate>
      {formError && (
        <p className="form-error" role="alert">
          {formError}
        </p>
      )}

      <FormSection number={1} title="Personal details" hint="As written on the national ID card.">
        <Field label="Full name" error={errors.name}>
          {(fieldId) => (
            <input
              id={fieldId}
              autoComplete="off"
              placeholder="e.g. Fatema Akter"
              value={values.name}
              aria-invalid={invalid('name')}
              onChange={(event) => change({ name: event.target.value })}
            />
          )}
        </Field>
        <div className="form-row">
          <Field label="Date of birth" error={errors.dateOfBirth}>
            {(fieldId) => (
              <input
                id={fieldId}
                type="date"
                max={today}
                value={values.dateOfBirth}
                aria-invalid={invalid('dateOfBirth')}
                onChange={(event) => change({ dateOfBirth: event.target.value })}
              />
            )}
          </Field>
          <Field label="NID number" error={errors.nidNumber}>
            {(fieldId) => (
              <input
                id={fieldId}
                inputMode="numeric"
                autoComplete="off"
                placeholder="10, 13 or 17 digits"
                value={values.nidNumber}
                aria-invalid={invalid('nidNumber')}
                onChange={(event) => change({ nidNumber: event.target.value })}
              />
            )}
          </Field>
        </div>
        <ChoiceGroup
          legend="Gender"
          options={genders.map((gender) => ({ value: gender, label: genderLabels[gender] }))}
          value={values.gender}
          error={errors.gender}
          onChange={(gender) => change({ gender })}
        />
      </FormSection>

      <FormSection number={2} title="Contact" hint="Used by admins to reach the donor.">
        <div className="form-row">
          <Field label="Mobile number" error={errors.phone}>
            {(fieldId) => (
              <input
                id={fieldId}
                type="tel"
                inputMode="numeric"
                placeholder="01712345678"
                value={values.phone}
                aria-invalid={invalid('phone')}
                onChange={(event) => change({ phone: event.target.value })}
              />
            )}
          </Field>
          <Field label="Email (optional)" error={errors.email}>
            {(fieldId) => (
              <input
                id={fieldId}
                type="email"
                placeholder="name@example.com"
                value={values.email}
                aria-invalid={invalid('email')}
                onChange={(event) => change({ email: event.target.value })}
              />
            )}
          </Field>
        </div>
      </FormSection>

      <FormSection
        number={3}
        title="Location and address"
        hint="Where the donor lives now, used to find donors by area."
      >
        <LocationSelect
          emptyLabel="Choose…"
          required
          value={values}
          error={errors.upazilaId}
          onChange={(location) => change(location)}
        />
        <Field label="Present address" error={errors.presentAddress}>
          {(fieldId) => (
            <textarea
              id={fieldId}
              rows={2}
              placeholder="House, road, area"
              value={values.presentAddress}
              aria-invalid={invalid('presentAddress')}
              onChange={(event) => change({ presentAddress: event.target.value })}
            />
          )}
        </Field>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={values.sameAddress}
            onChange={(event) => change({ sameAddress: event.target.checked })}
          />
          Permanent address is the same as present address
        </label>
        {!values.sameAddress && (
          <Field label="Permanent address" error={errors.permanentAddress}>
            {(fieldId) => (
              <textarea
                id={fieldId}
                rows={2}
                placeholder="Village or house, post office, upazila, district"
                value={values.permanentAddress}
                aria-invalid={invalid('permanentAddress')}
                onChange={(event) => change({ permanentAddress: event.target.value })}
              />
            )}
          </Field>
        )}
      </FormSection>

      <FormSection
        number={4}
        title="Blood and donations"
        hint="Leave the last donation empty for a first-time donor."
      >
        <ChoiceGroup
          legend="Blood group"
          className="blood-choices"
          options={bloodGroups.map((group) => ({ value: group, label: group }))}
          value={values.bloodGroup}
          error={errors.bloodGroup}
          onChange={(bloodGroup) => change({ bloodGroup })}
        />
        <div className="form-row">
          <Field label="Donations so far" error={errors.donationCount}>
            {(fieldId) => (
              <input
                id={fieldId}
                type="number"
                inputMode="numeric"
                min="0"
                step="1"
                value={values.donationCount}
                aria-invalid={invalid('donationCount')}
                onChange={(event) => change({ donationCount: event.target.value })}
              />
            )}
          </Field>
          <Field label="Last donation" error={errors.lastDonatedAt}>
            {(fieldId) => (
              <input
                id={fieldId}
                type="date"
                max={today}
                value={values.lastDonatedAt}
                aria-invalid={invalid('lastDonatedAt')}
                onChange={(event) => change({ lastDonatedAt: event.target.value })}
              />
            )}
          </Field>
        </div>
        <label className="switch">
          <input
            type="checkbox"
            checked={values.available}
            onChange={(event) => change({ available: event.target.checked })}
          />
          <span className="switch-track" aria-hidden="true" />
          <span className="switch-text">
            Available to donate
            <small>Turn off while the donor is ill, travelling or recently donated.</small>
          </span>
        </label>
      </FormSection>

      <div className="form-actions">
        <button type="button" className="secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="primary" disabled={saving}>
          {saving ? 'Saving…' : id ? 'Save changes' : 'Add donor'}
        </button>
      </div>
    </form>
  );
}
