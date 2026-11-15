import { type ReactNode, useId } from 'react';

type FieldProps = {
  label: string;
  required?: boolean;
  error?: string;
  children: (id: string) => ReactNode;
};

/** A red star for required fields; screen readers get the requirement from the field itself. */
function RequiredMark() {
  return (
    <span className="required-mark" aria-hidden="true">
      *
    </span>
  );
}

export function Field({ label, required, error, children }: FieldProps) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>
        {label}
        {required && <RequiredMark />}
      </label>
      {children(id)}
      {error && <span className="field-error">{error}</span>}
    </div>
  );
}

type FormSectionProps = { number: number; title: string; hint: string; children: ReactNode };

export function FormSection({ number, title, hint, children }: FormSectionProps) {
  const titleId = useId();
  return (
    <section className="form-card" aria-labelledby={titleId}>
      <header className="form-card-head">
        <span className="step" aria-hidden="true">
          {number}
        </span>
        <div>
          <h2 id={titleId}>{title}</h2>
          <p>{hint}</p>
        </div>
      </header>
      <div className="form-card-body">{children}</div>
    </section>
  );
}

type ChoiceGroupProps = {
  legend: string;
  required?: boolean;
  options: { value: string; label: string }[];
  value: string;
  error?: string | undefined;
  className?: string;
  onChange: (value: string) => void;
};

export function ChoiceGroup({
  legend,
  required,
  options,
  value,
  error,
  className,
  onChange,
}: ChoiceGroupProps) {
  const name = useId();
  return (
    <fieldset className={className ? `choice-group ${className}` : 'choice-group'}>
      <legend className="choice-legend">
        {legend}
        {required && <RequiredMark />}
      </legend>
      <div className="choices">
        {options.map((option) => (
          <label key={option.value} className="choice">
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
            />
            <span className="choice-label">{option.label}</span>
          </label>
        ))}
      </div>
      {error && <span className="field-error">{error}</span>}
    </fieldset>
  );
}
