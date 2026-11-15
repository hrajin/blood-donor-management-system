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
import { LocationSelect } from './LocationSelect.tsx';
import { useToast } from './Toaster.tsx';

type FormValues = {
  patientName: string;
  bloodGroup: string;
  component: string;
  unitsRequired: string;
  urgency: string;
  requiredOn: string;
  hospitalName: string;
  hospitalAddress: string;
  ward: string;
  divisionId: string;
  districtId: string;
  upazilaId: string;
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
    hospitalAddress: '',
    ward: '',
    divisionId: '',
    districtId: '',
    upazilaId: '',
    reason: '',
    contactName: '',
    contactPhone: '',
    relationship: '',
    notes: '',
  };
}

function toInput(values: FormValues) {
  return {
    ...values,
    // An empty field must fail validation, not become 0.
    unitsRequired: values.unitsRequired === '' ? Number.NaN : Number(values.unitsRequired),
    hospitalAddress: values.hospitalAddress.trim() || null,
    ward: values.ward.trim() || null,
    reason: values.reason || null,
    notes: values.notes.trim() || null,
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

        <FormSection number={1} title="Patient and blood" hint="What the hospital has asked for.">
          <Field label="Patient’s name" error={errors.patientName}>
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
            className="blood-choices"
            options={bloodGroups.map((group) => ({ value: group, label: group }))}
            value={values.bloodGroup}
            error={errors.bloodGroup}
            onChange={(bloodGroup) => change({ bloodGroup })}
          />
          <div className="form-row">
            <Field label="Component" error={errors.component}>
              {(id) => (
                <select
                  id={id}
                  value={values.component}
                  aria-invalid={invalid('component')}
                  onChange={(event) => change({ component: event.target.value })}
                >
                  {components.map((component) => (
                    <option key={component} value={component}>
                      {componentLabels[component]}
                    </option>
                  ))}
                </select>
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
          <Field label="Reason (optional)" error={errors.reason}>
            {(id) => (
              <select
                id={id}
                value={values.reason}
                onChange={(event) => change({ reason: event.target.value })}
              >
                <option value="">Not given</option>
                {requestReasons.map((reason) => (
                  <option key={reason} value={reason}>
                    {requestReasonLabels[reason]}
                  </option>
                ))}
              </select>
            )}
          </Field>
        </FormSection>

        <FormSection
          number={2}
          title="Hospital"
          hint="Its upazila is where the search for donors starts."
        >
          <Field label="Hospital name" error={errors.hospitalName}>
            {(id) => (
              <input
                id={id}
                placeholder="e.g. Dhaka Medical College Hospital"
                value={values.hospitalName}
                aria-invalid={invalid('hospitalName')}
                onChange={(event) => change({ hospitalName: event.target.value })}
              />
            )}
          </Field>
          <LocationSelect
            emptyLabel="Choose…"
            required
            value={values}
            error={errors.upazilaId}
            onChange={(location) => change(location)}
          />
          <div className="form-row">
            <Field label="Address (optional)" error={errors.hospitalAddress}>
              {(id) => (
                <input
                  id={id}
                  value={values.hospitalAddress}
                  aria-invalid={invalid('hospitalAddress')}
                  onChange={(event) => change({ hospitalAddress: event.target.value })}
                />
              )}
            </Field>
            <Field label="Ward, bed or cabin (optional)" error={errors.ward}>
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
          hint="Who donors and admins should call about this request."
        >
          <div className="form-row">
            <Field label="Name" error={errors.contactName}>
              {(id) => (
                <input
                  id={id}
                  value={values.contactName}
                  aria-invalid={invalid('contactName')}
                  onChange={(event) => change({ contactName: event.target.value })}
                />
              )}
            </Field>
            <Field label="Mobile number" error={errors.contactPhone}>
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
              <select
                id={id}
                value={values.relationship}
                aria-invalid={invalid('relationship')}
                onChange={(event) => change({ relationship: event.target.value })}
              >
                <option value="">Choose…</option>
                {relationships.map((relationship) => (
                  <option key={relationship} value={relationship}>
                    {relationshipLabels[relationship]}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field label="Notes (optional)" error={errors.notes}>
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
