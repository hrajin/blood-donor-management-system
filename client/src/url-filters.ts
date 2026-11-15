import { useEffect, useState } from 'react';
import type { SetURLSearchParams } from 'react-router';

const searchDelayMs = 300;

/** `params` with `changes` applied; any filter change goes back to the first page. */
export function withFilters(
  params: URLSearchParams,
  changes: Record<string, string>,
): URLSearchParams {
  const next = new URLSearchParams(params);
  for (const [key, value] of Object.entries(changes)) {
    if (value) next.set(key, value);
    else next.delete(key);
  }
  if (!('page' in changes)) next.delete('page');
  return next;
}

/**
 * The text of a search box kept in step with the `search` URL parameter: typing updates the
 * URL a moment after typing stops, and back/forward update the box.
 */
export function useSearchInput(
  searchParams: URLSearchParams,
  setSearchParams: SetURLSearchParams,
): [string, (value: string) => void] {
  const searchParam = searchParams.get('search') ?? '';
  const [search, setSearch] = useState(searchParam);

  useEffect(() => {
    setSearch((current) => (current.trim() === searchParam ? current : searchParam));
  }, [searchParam]);

  useEffect(() => {
    const trimmed = search.trim();
    if (trimmed === searchParam) return;
    const timer = setTimeout(
      () => setSearchParams((current) => withFilters(current, { search: trimmed })),
      searchDelayMs,
    );
    return () => clearTimeout(timer);
  }, [search, searchParam, setSearchParams]);

  return [search, setSearch];
}
