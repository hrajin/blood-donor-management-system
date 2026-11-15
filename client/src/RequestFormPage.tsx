import { type FormEvent, useState } from 'react';
import { useNavigate } from 'react-router';
import { addDays, bangladeshDate } from '../../shared/bangladesh-time.ts';
import {
  componentLabels,
  components,
  maxDaysAhead,
  maxUnits,
  relationshipLabels,
  relationships,
  requestInput,
  requestReasonLabels,
  requestReasons,
  urgencies,
  urgencyLabels,
} from '../../shared/blood-request.ts';
import { bloodGroups } from '../../shared/donor.ts';
import { fieldErrors } from '../../shared/field-errors.ts';
import { ApiError, createRequest } from './api.ts';
import { Breadcrumbs } from './Breadcrumbs.tsx';
import { ChoiceGroup, Field, FormSection } from './form-parts.tsx';
import { HospitalPicker } from './HospitalPicker.tsx';
import { LocationSelect } from './LocationSelect.tsx';
import { optionsOf, SearchSelect } from './SearchSelect.tsx';
import { useToast } from './Toaster.tsx';

type FormValues = {
  patientName: string;
  bloodGroup: string;
  component: string;
  unitsRequired: string;
  urgency: string;
  requiredOn: string;
  hospitalName: string;
  /** The ID of the hospital picked from the list; empty for a typed name. */
  hospitalId: string;
  hospitalAddress: string;
  ward: string;
  divisionId: string;
  districtId: string;
  areaId: string;
  reason: string;
  contactName: string;
  contactPhone: string;
  relationship: string;
  notes: string;
};

function emptyForm(today: string): FormValues {
  return {
    patientName: '',
    bloodGroup: '',
    component: 'whole-blood',
    unitsRequired: '1',
    urgency: 'normal',
    requiredOn: today,
    hospitalName: '',
    hospitalId: '',
    hospitalAddress: '',
    ward: '',
    divisionId: '',
    districtId: '',
    areaId: '',
    reason: '',
    contactName: '',
    contactPhone: '',
    relationship: '',
    notes: '',
  };
}

const orNull = (value: string) => value.trim() || null;

function toInput(values: FormValues) {
  return {
    ...values,
    hospitalName: orNull(values.hospitalName),
    divisionId: orNull(values.divisionId),
    districtId: orNull(values.districtId),
    areaId: orNull(values.areaId),
    relationship: orNull(values.relationship),
    // An empty field must fail validation, not become 0.
    unitsRequired: values.unitsRequired === '' ? Number.NaN : Number(values.unitsRequired),
    hospitalAddress: orNull(values.hospitalAddress),
    ward: orNull(values.ward),
    reason: orNull(values.reason),
    notes: orNull(values.notes),
  };
}

export function RequestFormPage() {
  const navigate = useNavigate();
  const showToast = useToast();
  const today = bangladeshDate(new Date());
  const [values, setValues] = useState<FormValues>(() => emptyForm(today));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  function change(changes: Partial<FormValues>) {
    setValues((current) => ({ ...current, ...changes }));
  }

  const invalid = (field: string) => (errors[field] ? true : undefined);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setFormError('');
    const parsed = requestInput.safeParse(toInput(values));
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      setFormError('Check the highlighted fields');
      return;
    }

    setErrors({});
    setSaving(true);
    try {
      const created = await createRequest(parsed.data);
      showToast(`Request ${created.code} created`);
      navigate(`/requests/${created.id}`);
    } catch (error) {
      if (!(error instanceof ApiError)) throw error;
      setSaving(false);
      setErrors(error.fields);
      setFormError(error.message);
    }
  }

  return (
    <div className="donor-page">
      <div className="page-head">
        <div>
          <Breadcrumbs
            crumbs={[
              { label: 'Dashboard', to: '/' },
              { label: 'Requests', to: '/requests' },
              { label: 'New request' },
            ]}
          />
          <h1>New blood request</h1>
          <p className="page-subtitle">
            After saving, you will see donors who match the blood group and are near the hospital.
          </p>
        </div>
      </div>

      <form className="donor-form" onSubmit={submit} noValidate>
        {formError && (
          <p className="form-error" role="alert">
            {formError}
          </p>
        )}

        <FormSection
          number={1}
          title="Patient and blood"
          hint="The patient’s name and the blood group are all you need here. The rest can be filled in later."
        >
          <Field label="Patient’s name" required error={errors.patientName}>
            {(id) => (
              <input
                id={id}
                autoComplete="off"
                value={values.patientName}
                aria-invalid={invalid('patientName')}
                onChange={(event) => change({ patientName: event.target.value })}
              />
            )}
          </Field>
          <ChoiceGroup
            legend="Blood group"
            required
            className="blood-choices"
            options={bloodGroups.map((group) => ({ value: group, label: group }))}
            value={values.bloodGroup}
            error={errors.bloodGroup}
            onChange={(bloodGroup) => change({ bloodGroup })}
          />
          <div className="form-row">
            <Field label="Component" error={errors.component}>
              {(id) => (
                <SearchSelect
                  inputId={id}
                  searchable={false}
                  options={optionsOf(components, componentLabels)}
                  value={values.component}
                  placeholder="Choose…"
                  invalid={Boolean(errors.component)}
                  onChange={(component) => change({ component })}
                />
              )}
            </Field>
            <Field label="Units needed" error={errors.unitsRequired}>
              {(id) => (
                <input
                  id={id}
                  type="number"
                  inputMode="numeric"
                  min="1"
                  max={maxUnits}
                  step="1"
                  value={values.unitsRequired}
                  aria-invalid={invalid('unitsRequired')}
                  onChange={(event) => change({ unitsRequired: event.target.value })}
                />
              )}
            </Field>
          </div>
          <div className="form-row">
            <ChoiceGroup
              legend="Urgency"
              options={urgencies.map((urgency) => ({
                value: urgency,
                label: urgencyLabels[urgency],
              }))}
              value={values.urgency}
              error={errors.urgency}
              onChange={(urgency) => change({ urgency })}
            />
            <Field label="Needed on" error={errors.requiredOn}>
              {(id) => (
                <input
                  id={id}
                  type="date"
                  min={today}
                  max={addDays(today, maxDaysAhead)}
                  value={values.requiredOn}
                  aria-invalid={invalid('requiredOn')}
                  onChange={(event) => change({ requiredOn: event.target.value })}
                />
              )}
            </Field>
          </div>
          <Field label="Reason" error={errors.reason}>
            {(id) => (
              <SearchSelect
                inputId={id}
                searchable={false}
                options={optionsOf(requestReasons, requestReasonLabels)}
                value={values.reason}
                placeholder="Choose…"
                clearable
                onChange={(reason) => change({ reason })}
              />
            )}
          </Field>
        </FormSection>

        <FormSection
          number={2}
          title="Hospital"
          hint="Choosing a hospital fills in its location; a hospital that is not in the list can be added. The more of the location you give, the closer the suggested donors."
        >
          <Field label="Hospital name" error={errors.hospitalName}>
            {(id) => (
              <HospitalPicker
                inputId={id}
                hospitalId={values.hospitalId}
                location={values}
                onChange={change}
              />
            )}
          </Field>
          <LocationSelect
            mode="optional"
            value={values}
            error={errors.areaId ?? errors.districtId ?? errors.divisionId}
            onChange={(location) => change(location)}
          />
          <div className="form-row">
            <Field label="Address" error={errors.hospitalAddress}>
              {(id) => (
                <input
                  id={id}
                  value={values.hospitalAddress}
                  aria-invalid={invalid('hospitalAddress')}
                  onChange={(event) => change({ hospitalAddress: event.target.value })}
                />
              )}
            </Field>
            <Field label="Ward, bed or cabin" error={errors.ward}>
              {(id) => (
                <input
                  id={id}
                  value={values.ward}
                  aria-invalid={invalid('ward')}
                  onChange={(event) => change({ ward: event.target.value })}
                />
              )}
            </Field>
          </div>
        </FormSection>

        <FormSection
          number={3}
          title="Contact person"
          hint="Who donors and admins should call about this request. The name and mobile number are required."
        >
          <div className="form-row">
            <Field label="Name" required error={errors.contactName}>
              {(id) => (
                <input
                  id={id}
                  value={values.contactName}
                  aria-invalid={invalid('contactName')}
                  onChange={(event) => change({ contactName: event.target.value })}
                />
              )}
            </Field>
            <Field label="Mobile number" required error={errors.contactPhone}>
              {(id) => (
                <input
                  id={id}
                  type="tel"
                  inputMode="numeric"
                  placeholder="01712345678"
                  value={values.contactPhone}
                  aria-invalid={invalid('contactPhone')}
                  onChange={(event) => change({ contactPhone: event.target.value })}
                />
              )}
            </Field>
          </div>
          <Field label="Relationship to the patient" error={errors.relationship}>
            {(id) => (
              <SearchSelect
                inputId={id}
                searchable={false}
                options={optionsOf(relationships, relationshipLabels)}
                value={values.relationship}
                placeholder="Choose…"
                clearable
                invalid={Boolean(errors.relationship)}
                onChange={(relationship) => change({ relationship })}
              />
            )}
          </Field>
          <Field label="Notes" error={errors.notes}>
            {(id) => (
              <textarea
                id={id}
                rows={3}
                placeholder="Anything donors or admins should know"
                value={values.notes}
                aria-invalid={invalid('notes')}
                onChange={(event) => change({ notes: event.target.value })}
              />
            )}
          </Field>
        </FormSection>

        <div className="form-actions">
          <button type="button" className="secondary" onClick={() => navigate('/requests')}>
            Cancel
          </button>
          <button type="submit" className="primary" disabled={saving}>
            {saving ? 'Saving…' : 'Create request'}
          </button>
        </div>
      </form>
    </div>
  );
}
