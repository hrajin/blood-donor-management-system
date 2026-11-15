import { useEffect, useState } from 'react';
import { builtInHospitals, type Hospital } from '../../shared/hospitals.ts';
import { type Location, zoneName } from '../../shared/locations.ts';
import { ApiError, addHospital, listHospitals } from './api.ts';
import { SearchSelect } from './SearchSelect.tsx';
import { useToast } from './Toaster.tsx';

type HospitalChange = { hospitalId: string; hospitalName: string } & Partial<Location>;

type Props = {
  inputId: string;
  hospitalId: string;
  /** Narrows the list to the chosen district, or division, when there is one. */
  location: Location;
  onChange: (change: HospitalChange) => void;
};

const labelOf = (hospital: Hospital) =>
  hospital.districtId ? `${hospital.name} · ${zoneName(hospital.districtId)}` : hospital.name;

/** Hospitals added without a location are offered everywhere. */
function isNear(hospital: Hospital, location: Location): boolean {
  if (location.districtId)
    return !hospital.districtId || hospital.districtId === location.districtId;
  if (location.divisionId)
    return !hospital.divisionId || hospital.divisionId === location.divisionId;
  return true;
}

const orNull = (value: string) => value || null;

/** Search the hospital list, add a hospital that is not in it, or remove the chosen one. */
export function HospitalPicker({ inputId, hospitalId, location, onChange }: Props) {
  const showToast = useToast();
  const [added, setAdded] = useState<Hospital[]>([]);

  useEffect(() => {
    listHospitals()
      .then(setAdded)
      .catch((error: unknown) => {
        console.error(error);
        showToast('Could not load the hospitals that were added earlier');
      });
  }, [showToast]);

  const all = [...builtInHospitals, ...added];
  const chosen = all.find((hospital) => hospital.id === hospitalId);
  const nearby = all.filter((hospital) => isNear(hospital, location));
  // The chosen hospital stays in the list even if the location was changed afterwards.
  const listed = chosen && !nearby.includes(chosen) ? [chosen, ...nearby] : nearby;

  function choose(hospital: Hospital) {
    onChange({
      hospitalId: hospital.id,
      hospitalName: hospital.name,
      // A hospital added without a location leaves the location as it is.
      ...(hospital.districtId && {
        divisionId: hospital.divisionId ?? '',
        districtId: hospital.districtId,
        areaId: hospital.areaId ?? '',
      }),
    });
  }

  async function create(name: string): Promise<string | null> {
    try {
      const hospital = await addHospital({
        name,
        divisionId: orNull(location.divisionId),
        districtId: orNull(location.districtId),
        areaId: orNull(location.areaId),
      });
      setAdded((current) =>
        current.some((other) => other.id === hospital.id) ? current : [...current, hospital],
      );
      choose(hospital);
      showToast(`${hospital.name} added to the hospital list`);
      return null;
    } catch (error) {
      if (!(error instanceof ApiError)) throw error;
      return error.fields.name ?? error.message;
    }
  }

  return (
    <SearchSelect
      inputId={inputId}
      options={listed.map((hospital) => ({ id: hospital.id, name: labelOf(hospital) }))}
      value={chosen?.id ?? ''}
      placeholder="Search or choose a hospital"
      clearable
      create={{
        label: (name) => `+ Add “${name}” as a new hospital`,
        onCreate: create,
      }}
      onChange={(id) => {
        if (id === '') {
          onChange({ hospitalId: '', hospitalName: '' });
          return;
        }
        const hospital = all.find((other) => other.id === id);
        if (!hospital) throw new Error(`Unknown hospital ${id}`);
        choose(hospital);
      }}
    />
  );
}
