import data from './hospitals.json' with { type: 'json' };
import { areaNameKey } from './locations.ts';

/**
 * A hospital and the place it is in. Built-in hospitals always have a division and district;
 * ones an admin added have only the part of the location chosen at the time.
 */
export type Hospital = {
  id: string;
  name: string;
  divisionId: string | null;
  districtId: string | null;
  areaId: string | null;
};

/** The built-in hospitals; hospitals added by admins are stored in the database. */
export const builtInHospitals: Hospital[] = data;

/** Hospital names compare without regard to case or extra spaces. */
export const hospitalNameKey = areaNameKey;
