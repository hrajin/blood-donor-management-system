import { districtsOf, divisions, type Location, upazilasOf } from '../../shared/locations.ts';

type Props = {
  value: Location;
  onChange: (value: Location) => void;
  emptyLabel: string;
  required?: boolean;
  error?: string | undefined;
};

export function LocationSelect({ value, onChange, emptyLabel, required = false, error }: Props) {
  return (
    <fieldset className="location">
      <legend>Location</legend>
      <label>
        Division
        <select
          value={value.divisionId}
          required={required}
          onChange={(event) =>
            onChange({ divisionId: event.target.value, districtId: '', upazilaId: '' })
          }
        >
          <option value="">{emptyLabel}</option>
          {divisions.map((division) => (
            <option key={division.id} value={division.id}>
              {division.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        District
        <select
          value={value.districtId}
          required={required}
          disabled={!value.divisionId}
          onChange={(event) =>
            onChange({ ...value, districtId: event.target.value, upazilaId: '' })
          }
        >
          <option value="">{emptyLabel}</option>
          {districtsOf(value.divisionId).map((district) => (
            <option key={district.id} value={district.id}>
              {district.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Upazila
        <select
          value={value.upazilaId}
          required={required}
          disabled={!value.districtId}
          aria-invalid={error ? true : undefined}
          onChange={(event) => onChange({ ...value, upazilaId: event.target.value })}
        >
          <option value="">{emptyLabel}</option>
          {upazilasOf(value.districtId).map((upazila) => (
            <option key={upazila.id} value={upazila.id}>
              {upazila.name}
            </option>
          ))}
        </select>
      </label>
      {error && <p className="field-error">{error}</p>}
    </fieldset>
  );
}
