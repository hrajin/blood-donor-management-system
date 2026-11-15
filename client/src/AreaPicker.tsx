import { useEffect, useState } from 'react';
import { type Area, zoneName } from '../../shared/locations.ts';
import { ApiError, addArea, listAreas } from './api.ts';
import { SearchSelect } from './SearchSelect.tsx';
import { useToast } from './Toaster.tsx';

type Props = {
  districtId: string;
  value: string;
  onChange: (areaId: string) => void;
  /** Lets the admin add a typed name that is not in the list. */
  allowCreate?: boolean;
  /** Shows a button that removes the chosen area. */
  clearable?: boolean;
  /** The empty choice, e.g. "All areas" in filters; without it, there is none. */
  emptyLabel?: string | undefined;
  invalid?: boolean;
  inputId?: string;
};

type AreasState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'failed'; message: string }
  | { status: 'loaded'; areas: Area[] };

/** The searchable list of a district's areas, loaded from the server with the added ones. */
export function AreaPicker({
  districtId,
  value,
  onChange,
  allowCreate = false,
  clearable = false,
  emptyLabel,
  invalid,
  inputId,
}: Props) {
  const showToast = useToast();
  const [state, setState] = useState<AreasState>({ status: 'idle' });

  useEffect(() => {
    if (!districtId) {
      setState({ status: 'idle' });
      return;
    }
    const controller = new AbortController();
    setState({ status: 'loading' });
    listAreas(districtId, controller.signal)
      .then((areas) => setState({ status: 'loaded', areas }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        console.error(error);
        const message = error instanceof ApiError ? error.message : 'Could not load the areas.';
        setState({ status: 'failed', message });
      });
    return () => controller.abort();
  }, [districtId]);

  async function create(name: string): Promise<string | null> {
    try {
      const area = await addArea(districtId, name);
      setState((current) =>
        current.status === 'loaded' && !current.areas.some((a) => a.id === area.id)
          ? {
              status: 'loaded',
              areas: [...current.areas, area].sort((a, b) => a.name.localeCompare(b.name)),
            }
          : current,
      );
      onChange(area.id);
      showToast(`${area.name} added to ${zoneName(districtId)}`);
      return null;
    } catch (error) {
      if (!(error instanceof ApiError)) throw error;
      return error.fields.name ?? error.message;
    }
  }

  const placeholder = !districtId
    ? 'Choose a district first'
    : state.status === 'loading'
      ? 'Loading areas…'
      : state.status === 'failed'
        ? state.message
        : 'Search or choose an area';

  return (
    <SearchSelect
      inputId={inputId}
      options={state.status === 'loaded' ? state.areas : []}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      emptyLabel={state.status === 'loaded' ? emptyLabel : undefined}
      clearable={clearable}
      disabled={state.status !== 'loaded'}
      invalid={invalid}
      create={
        allowCreate
          ? {
              label: (name) => `+ Add “${name}” as a new area in ${zoneName(districtId)}`,
              onCreate: create,
            }
          : undefined
      }
    />
  );
}
