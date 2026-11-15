import { useId } from 'react';
import { districtsOf, divisions, type Location } from '../../shared/locations.ts';
import { AreaPicker } from './AreaPicker.tsx';
import { SearchSelect } from './SearchSelect.tsx';

type Props = {
  value: Location;
  onChange: (value: Location) => void;
  /**
   * `filter`: "All …" choices, no adding. `required`: every level must be chosen (requests).
   * `optional`: each level can be left as "Not given" (donors). Forms let the admin add areas.
   */
  mode: 'filter' | 'required' | 'optional';
  error?: string | undefined;
};

export function LocationSelect({ value, onChange, mode, error }: Props) {
  const divisionId = useId();
  const districtId = useId();
  const areaId = useId();
  const filter = mode === 'filter';
  const invalid = Boolean(error);
  const emptyLabel = (all: string) =>
    mode === 'filter' ? all : mode === 'optional' ? 'Not given' : undefined;

  return (
    <fieldset className="location">
      <legend>Location</legend>
      <div className="field">
        <label htmlFor={divisionId}>Division</label>
        <SearchSelect
          inputId={divisionId}
          options={divisions}
          value={value.divisionId}
          placeholder="Search or choose a division"
          emptyLabel={emptyLabel('All divisions')}
          invalid={invalid && mode === 'required' && !value.divisionId}
          onChange={(id) => onChange({ divisionId: id, districtId: '', areaId: '' })}
        />
      </div>
      <div className="field">
        <label htmlFor={districtId}>District</label>
        <SearchSelect
          inputId={districtId}
          options={districtsOf(value.divisionId)}
          value={value.districtId}
          placeholder={value.divisionId ? 'Search or choose a district' : 'Choose a division first'}
          emptyLabel={value.divisionId ? emptyLabel('All districts') : undefined}
          disabled={!value.divisionId}
          invalid={invalid && mode === 'required' && !value.districtId}
          onChange={(id) => onChange({ ...value, districtId: id, areaId: '' })}
        />
      </div>
      <div className="field">
        <label htmlFor={areaId}>Area / City</label>
        <AreaPicker
          inputId={areaId}
          districtId={value.districtId}
          value={value.areaId}
          allowCreate={!filter}
          emptyLabel={emptyLabel('All areas')}
          invalid={invalid}
          onChange={(id) => onChange({ ...value, areaId: id })}
        />
      </div>
      {error && <p className="field-error">{error}</p>}
    </fieldset>
  );
}
