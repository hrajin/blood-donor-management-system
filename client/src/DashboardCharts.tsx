export type ChartValue = {
  key: string;
  label: string;
  /** Total length of the bar. */
  value: number;
  /** The highlighted share of `value` (red bars, black columns); the rest is drawn grey. */
  part: number;
  /** Marks a shortage: drawn hatched with a red outline. */
  critical?: boolean;
  description: string;
};

function share(value: number, max: number): string {
  return max <= 0 ? '0%' : `${(value / max) * 100}%`;
}

export function AvailabilityDonut({ available, total }: { available: number; total: number }) {
  // A radius of 100 / 2π makes the circumference 100, so dash lengths are percentages.
  const radius = 15.9155;
  const percent = total === 0 ? 0 : Math.round((available / total) * 100);
  return (
    <figure className="donut">
      <svg viewBox="0 0 42 42" role="img" aria-label={`${percent}% of donors are available`}>
        <circle className="donut-track" cx="21" cy="21" r={radius} />
        <circle
          className="donut-value"
          cx="21"
          cy="21"
          r={radius}
          strokeDasharray={`${total === 0 ? 0 : (available / total) * 100} 100`}
        />
      </svg>
      <figcaption>
        <strong>{percent}%</strong>
        <span>available</span>
      </figcaption>
    </figure>
  );
}

export function ColumnChart({ columns, label }: { columns: ChartValue[]; label: string }) {
  const max = Math.max(...columns.map((column) => column.value));
  return (
    <ul className="column-chart" aria-label={label}>
      {columns.map((column) => (
        <li key={column.key} className={column.critical ? 'critical' : undefined}>
          <span className="column-value" aria-hidden="true">
            {column.value}
          </span>
          <span className="column-track" aria-hidden="true">
            <span className="column-bar" style={{ height: share(column.value, max) }}>
              <span className="column-part" style={{ height: share(column.part, column.value) }} />
            </span>
          </span>
          <span className="column-label" aria-hidden="true">
            {column.label}
          </span>
          <span className="visually-hidden">{column.description}</span>
        </li>
      ))}
    </ul>
  );
}

export function BarList({ rows, label }: { rows: ChartValue[]; label: string }) {
  const max = Math.max(...rows.map((row) => row.value));
  return (
    <ul className="bar-list" aria-label={label}>
      {rows.map((row) => (
        <li key={row.key}>
          <span className="bar-label" aria-hidden="true">
            {row.label}
          </span>
          <span className="bar-track" aria-hidden="true">
            <span className="bar" style={{ width: share(row.value, max) }}>
              <span className="bar-part" style={{ width: share(row.part, row.value) }} />
            </span>
          </span>
          <span className="bar-value" aria-hidden="true">
            {row.value}
          </span>
          <span className="visually-hidden">{row.description}</span>
        </li>
      ))}
    </ul>
  );
}
