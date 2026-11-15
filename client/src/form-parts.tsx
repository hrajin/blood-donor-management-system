import { type ReactNode, useId } from 'react';

type FieldProps = { label: string; error?: string; children: (id: string) => ReactNode };

export function Field({ label, error, children }: FieldProps) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
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
  options: { value: string; label: string }[];
  value: string;
  error?: string | undefined;
  className?: string;
  onChange: (value: string) => void;
};

export function ChoiceGroup({
  legend,
  options,
  value,
  error,
  className,
  onChange,
}: ChoiceGroupProps) {
  const name = useId();
  return (
    <fieldset className={className ? `choice-group ${className}` : 'choice-group'}>
      <legend className="choice-legend">{legend}</legend>
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
