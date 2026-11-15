import { type FormEvent, useEffect, useState } from 'react';
import { bangladeshDate } from '../../shared/bangladesh-time.ts';
import { bloodGroups, type Donor, donorInput, genderLabels, genders } from '../../shared/donor.ts';
import { fieldErrors } from '../../shared/field-errors.ts';
import { ApiError, createDonor, getDonor, updateDonor } from './api.ts';
import { ChoiceGroup, Field, FormSection } from './form-parts.tsx';
import { DonorFormSkeleton } from './Skeleton.tsx';
import { getCached, setCached } from './page-cache.ts';
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
  areaId: string;
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
  areaId: '',
  presentAddress: '',
  permanentAddress: '',
  sameAddress: false,
  available: true,
  donationCount: '0',
  lastDonatedAt: '',
};

function toFormValues(donor: Donor): FormValues {
  return {
    name: donor.name,
    phone: donor.phone,
    bloodGroup: donor.bloodGroup,
    email: donor.email ?? '',
    dateOfBirth: donor.dateOfBirth ?? '',
    gender: donor.gender ?? '',
    nidNumber: donor.nidNumber ?? '',
    divisionId: donor.divisionId ?? '',
    districtId: donor.districtId ?? '',
    areaId: donor.areaId ?? '',
    presentAddress: donor.presentAddress ?? '',
    permanentAddress: donor.permanentAddress ?? '',
    sameAddress: donor.presentAddress !== null && donor.presentAddress === donor.permanentAddress,
    available: donor.available,
    donationCount: String(donor.donationCount),
    lastDonatedAt: donor.lastDonatedAt ?? '',
  };
}

/** Empty optional fields are sent as null, "not recorded". */
const orNull = (value: string) => value.trim() || null;

function toInput({ sameAddress, ...values }: FormValues) {
  return {
    ...values,
    email: orNull(values.email),
    dateOfBirth: orNull(values.dateOfBirth),
    gender: orNull(values.gender),
    nidNumber: orNull(values.nidNumber),
    divisionId: orNull(values.divisionId),
    districtId: orNull(values.districtId),
    areaId: orNull(values.areaId),
    presentAddress: orNull(values.presentAddress),
    permanentAddress: orNull(sameAddress ? values.presentAddress : values.permanentAddress),
    // An empty field must fail validation, not become 0.
    donationCount: values.donationCount === '' ? Number.NaN : Number(values.donationCount),
    lastDonatedAt: orNull(values.lastDonatedAt),
  };
}

type DonorFormProps = {
  /** The donor to edit; a new donor is added when absent. */
  donorId?: string | undefined;
  onSaved: (donor: Donor) => void;
  onCancel: () => void;
};

export function DonorForm({ donorId: id, onSaved, onCancel }: DonorFormProps) {
  const cachedDonor = id ? getCached<Donor>(`donor:${id}`) : undefined;
  const [values, setValues] = useState<FormValues>(cachedDonor ? toFormValues(cachedDonor) : emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(id !== undefined && !cachedDonor);
  const [saving, setSaving] = useState(false);
  const today = bangladeshDate(new Date());

  useEffect(() => {
    if (!id) return;
    getDonor(id)
      .then((donor) => {
        setCached(`donor:${id}`, donor);
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

  if (loading) return <DonorFormSkeleton />;

  return (
    <form className="donor-form" onSubmit={submit} noValidate>
      {formError && (
        <p className="form-error" role="alert">
          {formError}
        </p>
      )}

      <FormSection
        number={1}
        title="Basic details"
        hint="All you need to add a donor. Everything below is optional and can be filled in later."
      >
        <div className="form-row">
          <Field label="Full name" required error={errors.name}>
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
          <Field label="Mobile number" required error={errors.phone}>
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
        </div>
        <ChoiceGroup
          legend="Blood group"
          required
          className="blood-choices"
          options={bloodGroups.map((group) => ({ value: group, label: group }))}
          value={values.bloodGroup}
          error={errors.bloodGroup}
          onChange={(bloodGroup) => change({ bloodGroup })}
        />
      </FormSection>

      <FormSection
        number={2}
        title="Personal details"
        hint="Optional. With a date of birth, donors outside ages 18–60 are not suggested."
      >
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
        <div className="form-row">
          <ChoiceGroup
            legend="Gender"
            options={[
              ...genders.map((gender) => ({ value: gender, label: genderLabels[gender] })),
              { value: '', label: 'Not given' },
            ]}
            value={values.gender}
            error={errors.gender}
            onChange={(gender) => change({ gender })}
          />
          <Field label="Email" error={errors.email}>
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
        hint="Optional, but the area / city is how nearby donors are found for a request."
      >
        <LocationSelect
          mode="optional"
          value={values}
          error={errors.areaId ?? errors.districtId ?? errors.divisionId}
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
                placeholder="Village or house, post office, area, district"
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
        title="Donations and availability"
        hint="A new donor starts with no donations and available; change it if you know more."
      >
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
