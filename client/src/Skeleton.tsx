import type { CSSProperties } from 'react';

function Bar({ style }: { style?: CSSProperties }) {
  return <div className="skeleton-bar" style={style} />;
}

export function DashboardSkeleton() {
  return (
    <div className="dashboard" aria-hidden="true">
      <ul className="kpis">
        {[0, 1, 2, 3].map((i) => (
          <li key={i} className="card">
            <Bar style={{ width: '58%', height: '13px' }} />
            <Bar style={{ width: '42%', height: '32px', marginTop: '8px' }} />
          </li>
        ))}
      </ul>
      <section className="card chart-card" style={{ gridColumn: 'span 1' }}>
        <Bar style={{ width: '110px', height: '16px' }} />
        <Bar style={{ height: '220px', marginTop: '12px' }} />
      </section>
      <section className="card chart-card" style={{ gridColumn: 'span 2' }}>
        <Bar style={{ width: '170px', height: '16px' }} />
        <Bar style={{ height: '220px', marginTop: '12px' }} />
      </section>
      <section className="card chart-card">
        <Bar style={{ width: '100px', height: '16px' }} />
        <Bar style={{ height: '200px', marginTop: '12px' }} />
      </section>
      <section className="card chart-card">
        <Bar style={{ width: '120px', height: '16px' }} />
        <Bar style={{ height: '200px', marginTop: '12px' }} />
      </section>
      <section className="card chart-card" style={{ gridColumn: 'span 2' }}>
        <Bar style={{ width: '170px', height: '16px' }} />
        <Bar style={{ height: '200px', marginTop: '12px' }} />
      </section>
    </div>
  );
}

export function DonorCardsSkeleton() {
  return (
    <ul className="donor-cards" aria-hidden="true">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <li key={i} className="donor-card">
          <div className="donor-card-head">
            <Bar style={{ width: '44px', height: '44px', borderRadius: '50%', flexShrink: 0 }} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '7px' }}>
              <Bar style={{ width: '65%', height: '14px' }} />
              <Bar style={{ width: '48%', height: '12px' }} />
            </div>
            <Bar style={{ width: '48px', height: '36px', borderRadius: '10px', flexShrink: 0 }} />
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              paddingTop: '14px',
              borderTop: '1px solid var(--grey-200)',
            }}
          >
            {[0, 1, 2].map((j) => (
              <div
                key={j}
                style={{ display: 'grid', gridTemplateColumns: '84px 1fr', gap: '8px' }}
              >
                <Bar style={{ height: '12px' }} />
                <Bar style={{ height: '12px', width: '75%' }} />
              </div>
            ))}
          </div>
        </li>
      ))}
    </ul>
  );
}

export function DonorDetailsSkeleton() {
  return (
    <>
      <div
        className="profile-card"
        aria-hidden="true"
        style={{ marginTop: '8px', marginBottom: '20px' }}
      >
        <Bar style={{ width: '72px', height: '72px', borderRadius: '50%', flexShrink: 0 }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <Bar style={{ width: '210px', height: '24px' }} />
          <Bar style={{ width: '160px', height: '14px' }} />
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
            <Bar style={{ width: '110px', height: '36px', borderRadius: '999px' }} />
            <Bar style={{ width: '90px', height: '36px', borderRadius: '999px' }} />
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: '10px',
            flexShrink: 0,
          }}
        >
          <Bar style={{ width: '64px', height: '52px', borderRadius: '14px' }} />
          <Bar style={{ width: '104px', height: '34px', borderRadius: '999px' }} />
        </div>
      </div>
      <div className="details-grid" aria-hidden="true">
        {[4, 2, 4, 5].map((rows, i) => (
          <div key={i} className="details-card">
            <Bar style={{ width: '130px', height: '16px', marginBottom: '16px' }} />
            {Array.from({ length: rows }).map((_, j) => (
              <div
                key={j}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '9rem 1fr',
                  gap: '12px',
                  padding: '10px 0',
                  borderTop: '1px solid var(--grey-200)',
                }}
              >
                <Bar style={{ height: '12px', width: '75%' }} />
                <Bar style={{ height: '12px', width: '55%' }} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  );
}

// 4 form sections with realistic field counts matching the real DonorForm.
const formSections = [
  { title: 190, hint: 280, fields: 4 },
  { title: 140, hint: 240, fields: 5 },
  { title: 160, hint: 260, fields: 3 },
  { title: 150, hint: 220, fields: 2 },
];

export function DonorFormSkeleton() {
  return (
    <div className="donor-form" aria-hidden="true">
      {formSections.map((s, i) => (
        <section key={i} className="form-card">
          <header className="form-card-head">
            <Bar style={{ width: '30px', height: '30px', borderRadius: '50%', flexShrink: 0 }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
              <Bar style={{ width: `${s.title}px`, height: '16px' }} />
              <Bar style={{ width: `${s.hint}px`, height: '12px' }} />
            </div>
          </header>
          <div className="form-card-body">
            {Array.from({ length: s.fields }).map((_, j) => (
              <div key={j} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <Bar style={{ width: '100px', height: '12px' }} />
                <Bar style={{ height: '42px', borderRadius: '12px' }} />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export function RequestDetailsSkeleton() {
  return (
    <div aria-hidden="true">
      {/* hero card */}
      <div
        className="card"
        style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', marginBottom: '16px' }}
      >
        <Bar style={{ width: '64px', height: '72px', borderRadius: '12px', flexShrink: 0 }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <Bar style={{ width: '220px', height: '20px' }} />
          <Bar style={{ width: '300px', height: '14px' }} />
          <Bar style={{ width: '260px', height: '14px' }} />
        </div>
        <Bar style={{ width: '100px', height: '32px', borderRadius: '999px', flexShrink: 0 }} />
      </div>
      {/* two detail cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
        {[4, 4].map((rows, i) => (
          <div key={i} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
            <Bar style={{ width: '130px', height: '16px', marginBottom: '12px' }} />
            {Array.from({ length: rows }).map((_, j) => (
              <div
                key={j}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '9rem 1fr',
                  gap: '12px',
                  padding: '10px 0',
                  borderTop: '1px solid var(--grey-200)',
                }}
              >
                <Bar style={{ height: '12px', width: '75%' }} />
                <Bar style={{ height: '12px', width: '55%' }} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function RequestListSkeleton() {
  return (
    <ul className="request-list" aria-hidden="true">
      {[0, 1, 2, 3, 4].map((i) => (
        <li key={i} className="request-row">
          <Bar style={{ width: '52px', height: '52px', borderRadius: '12px' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
            <Bar style={{ width: '180px', height: '14px' }} />
            <Bar style={{ width: '260px', height: '12px' }} />
          </div>
          <Bar style={{ width: '90px', height: '26px', borderRadius: '999px' }} />
          <Bar style={{ height: '8px', borderRadius: '4px' }} />
        </li>
      ))}
    </ul>
  );
}
