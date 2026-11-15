type Props = {
  available: boolean;
  /** True while the change is being saved; the switch is locked meanwhile. */
  pending: boolean;
  donorName: string;
  onToggle: () => void;
};

export function AvailabilitySwitch({ available, pending, donorName, onToggle }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={available}
      aria-label={`Available to donate: ${donorName}`}
      className="availability-switch"
      disabled={pending}
      title={available ? 'Turn off to mark as unavailable' : 'Turn on to mark as available'}
      onClick={onToggle}
    >
      <span className="switch-track" aria-hidden="true" />
      <span className="availability-text">
        {pending ? 'Saving…' : available ? 'Available' : 'Unavailable'}
      </span>
    </button>
  );
}
