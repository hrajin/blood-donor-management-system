import { useId } from 'react';
import { districtsOf, divisions, type Location } from '../../shared/locations.ts';
import { AreaPicker } from './AreaPicker.tsx';
import { SearchSelect } from './SearchSelect.tsx';

type Props = {
  value: Location;
  onChange: (value: Location) => void;
  /**
   * `filter`: "All …" choices, no adding. `optional`: each level can be left empty or removed
   * with its clear button (donors, requests). Forms let the admin add areas.
   */
  mode: 'filter' | 'optional';
  error?: string | undefined;
};

export function LocationSelect({ value, onChange, mode, error }: Props) {
  const divisionId = useId();
  const districtId = useId();
  const areaId = useId();
  const filter = mode === 'filter';
  const invalid = Boolean(error);
  const emptyLabel = (all: string) => (filter ? all : undefined);
  const clearable = mode === 'optional';

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
          clearable={clearable}
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
          clearable={clearable}
          disabled={!value.divisionId}
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
          clearable={clearable}
          invalid={invalid}
          onChange={(id) => onChange({ ...value, areaId: id })}
        />
      </div>
      {error && <p className="field-error">{error}</p>}
    </fieldset>
  );
}
