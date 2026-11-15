import type { BloodRequestSummary } from '../../shared/blood-request.ts';

/** Units donated (black) and agreed (grey) out of the units needed. */
export function UnitsProgress({ request }: { request: BloodRequestSummary }) {
  const { unitsRequired, donated, agreed } = request;
  const share = (count: number) => `${Math.min(count / unitsRequired, 1) * 100}%`;
  return (
    <div className="units">
      <span className="units-text">
        <strong>
          {donated}/{unitsRequired}
        </strong>{' '}
        donated{agreed > 0 && <span className="muted"> · {agreed} agreed</span>}
      </span>
      <span className="units-bar" aria-hidden="true">
        <span className="units-donated" style={{ width: share(donated) }} />
        <span
          className="units-agreed"
          style={{ width: share(Math.max(0, Math.min(agreed, unitsRequired - donated))) }}
        />
      </span>
    </div>
  );
}
