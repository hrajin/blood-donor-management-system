import { type KeyboardEvent, useId, useState } from 'react';
import { areaNameKey } from '../../shared/locations.ts';

export type SearchOption = { id: string; name: string };

/** Options for a fixed list of values and their labels, in the list's order. */
export function optionsOf<T extends string>(
  values: readonly T[],
  labels: Record<T, string>,
): SearchOption[] {
  return values.map((value) => ({ id: value, name: labels[value] }));
}

type CreateOption = {
  /** The text of the "add" option for a typed name, e.g. `+ Add “Banasree”`. */
  label: (name: string) => string;
  /** Adds the typed name; resolves to an error message, or null once added and chosen. */
  onCreate: (name: string) => Promise<string | null>;
};

type Props = {
  options: SearchOption[];
  value: string;
  onChange: (id: string) => void;
  /** Shown while nothing is chosen, e.g. "Choose a district". */
  placeholder: string;
  /** The empty choice, e.g. "All districts" in filters; without it, there is none. */
  emptyLabel?: string | undefined;
  /** Shows a button that removes the chosen value, for fields that may stay empty. */
  clearable?: boolean;
  /** Without it, names that are not in the list cannot be added. */
  create?: CreateOption | undefined;
  /** Short lists turn typing off and only open the list; it looks and works the same otherwise. */
  searchable?: boolean;
  disabled?: boolean;
  invalid?: boolean;
  inputId?: string;
};

type Choice =
  | { kind: 'option'; option: SearchOption }
  | { kind: 'empty'; label: string }
  | { kind: 'create'; name: string };

/** Names that start with the text first, then names that only contain it. */
function matching(options: SearchOption[], query: string): SearchOption[] {
  const key = areaNameKey(query);
  if (!key) return options;
  const starts = options.filter((option) => areaNameKey(option.name).startsWith(key));
  const contains = options.filter(
    (option) => !areaNameKey(option.name).startsWith(key) && areaNameKey(option.name).includes(key),
  );
  return [...starts, ...contains];
}

/** A text box that filters a list below it (the ARIA combobox pattern). */
export function SearchSelect({
  options,
  value,
  onChange,
  placeholder,
  emptyLabel,
  clearable = false,
  create,
  searchable = true,
  disabled = false,
  invalid,
  inputId,
}: Props) {
  const listId = useId();
  const optionId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const selected = options.find((option) => option.id === value);

  function choicesFor(text: string): Choice[] {
    const typed = text.trim();
    const exact = options.some((option) => areaNameKey(option.name) === areaNameKey(typed));
    return [
      ...(emptyLabel && !typed ? [{ kind: 'empty', label: emptyLabel } as const] : []),
      ...matching(options, text).map((option): Choice => ({ kind: 'option', option })),
      ...(create && typed.length >= 2 && !exact ? [{ kind: 'create', name: typed } as const] : []),
    ];
  }

  const isCurrent = (choice: Choice) =>
    choice.kind === 'option' ? choice.option.id === value : choice.kind === 'empty' && !value;

  const choices = choicesFor(query);

  function openList() {
    setQuery('');
    // Opens on the current choice, as a native select does.
    setActive(
      Math.max(
        0,
        choicesFor('').findIndex((choice) => isCurrent(choice)),
      ),
    );
    setCreateError('');
    setOpen(true);
  }

  async function choose(choice: Choice) {
    switch (choice.kind) {
      case 'option':
        onChange(choice.option.id);
        setOpen(false);
        return;
      case 'empty':
        onChange('');
        setOpen(false);
        return;
      case 'create': {
        if (!create) return;
        setCreating(true);
        setCreateError('');
        const error = await create.onCreate(choice.name);
        setCreating(false);
        if (error) setCreateError(error);
        else setOpen(false);
        return;
      }
      default: {
        const unhandled: never = choice;
        throw new Error(`Unhandled choice: ${JSON.stringify(unhandled)}`);
      }
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!open && (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      openList();
      return;
    }
    if (!open) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((index) => Math.min(index + 1, choices.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((index) => Math.max(index - 1, 0));
    } else if (event.key === 'Enter' || (!searchable && event.key === ' ')) {
      event.preventDefault();
      const choice = choices[active];
      if (choice) void choose(choice);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
    }
  }

  const showClear = clearable && Boolean(selected) && !disabled;

  return (
    <div className="combobox">
      <input
        className={`${searchable ? 'combobox-search' : 'combobox-plain'}${showClear ? ' has-clear' : ''}`}
        id={inputId}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete={searchable ? 'list' : 'none'}
        readOnly={!searchable}
        aria-activedescendant={open && choices[active] ? `${optionId}-${active}` : undefined}
        aria-invalid={invalid ? true : undefined}
        autoComplete="off"
        disabled={disabled}
        placeholder={selected?.name ?? emptyLabel ?? placeholder}
        value={open && searchable ? query : (selected?.name ?? '')}
        onFocus={openList}
        onClick={() => !open && openList()}
        onBlur={() => setOpen(false)}
        onChange={(event) => {
          setQuery(event.target.value);
          setActive(0);
          setOpen(true);
        }}
        onKeyDown={onKeyDown}
      />
      {showClear && (
        <button
          type="button"
          className="combobox-clear"
          aria-label="Remove the chosen value"
          // Mouse down, not click, so the input's blur does not reopen or move anything first.
          onMouseDown={(event) => {
            event.preventDefault();
            onChange('');
            setOpen(false);
          }}
        />
      )}
      {open && (
        <div className="combobox-list" id={listId} role="listbox">
          {choices.map((choice, index) => (
            <div
              key={choice.kind === 'option' ? choice.option.id : choice.kind}
              id={`${optionId}-${index}`}
              role="option"
              // Focus stays in the input; the active option is announced via aria-activedescendant.
              tabIndex={-1}
              aria-selected={isCurrent(choice)}
              className={`combobox-option option-${choice.kind}${index === active ? ' active' : ''}`}
              // Mouse down, not click: choosing must happen before the input's blur closes the list.
              onMouseDown={(event) => {
                event.preventDefault();
                void choose(choice);
              }}
              onMouseEnter={() => setActive(index)}
            >
              {choice.kind === 'option' && choice.option.name}
              {choice.kind === 'empty' && choice.label}
              {choice.kind === 'create' && (creating ? 'Adding…' : create?.label(choice.name))}
            </div>
          ))}
          {choices.length === 0 && <p className="combobox-empty">Nothing matches “{query}”</p>}
          {createError && <p className="combobox-empty field-error">{createError}</p>}
        </div>
      )}
    </div>
  );
}
