import { useEffect, useState } from 'react';
import { Link, Navigate, NavLink, Outlet, useNavigate } from 'react-router';
import { getSession, signOut } from './api.ts';
import { ToastProvider } from './Toaster.tsx';

type SessionState =
  | { status: 'loading' }
  | { status: 'failed' }
  | { status: 'signed-out' }
  | { status: 'signed-in'; email: string };

export function AdminLayout() {
  const navigate = useNavigate();
  const [session, setSession] = useState<SessionState>({ status: 'loading' });

  useEffect(() => {
    getSession()
      .then((current) =>
        setSession(
          current ? { status: 'signed-in', email: current.email } : { status: 'signed-out' },
        ),
      )
      .catch((error: unknown) => {
        console.error(error);
        setSession({ status: 'failed' });
      });
  }, []);

  async function handleSignOut() {
    await signOut();
    navigate('/login', { replace: true });
  }

  switch (session.status) {
    case 'loading':
      return <p className="page-status">Loading…</p>;
    case 'failed':
      return (
        <p className="page-status" role="alert">
          Could not reach the server. Reload the page to try again.
        </p>
      );
    case 'signed-out':
      return <Navigate to="/login" replace />;
    case 'signed-in':
      return (
        <ToastProvider>
          <div className="admin">
            <aside className="sidebar">
              <Link to="/" className="brand">
                <span className="brand-mark" aria-hidden="true">
                  ●
                </span>{' '}
                BDMS <span className="brand-tag">Admin</span>
              </Link>
              <nav className="sidebar-nav" aria-label="Main">
                <NavLink to="/" end>
                  <DashboardIcon /> Dashboard
                </NavLink>
                <NavLink to="/donors" end>
                  <DonorsIcon /> Donors
                </NavLink>
                <NavLink to="/donors/new">
                  <AddIcon /> Add donor
                </NavLink>
              </nav>
              <div className="sidebar-account">
                <span className="sidebar-email">{session.email}</span>
                <button type="button" className="sign-out" onClick={handleSignOut}>
                  Sign out
                </button>
              </div>
            </aside>
            <main className="content">
              <Outlet />
            </main>
          </div>
        </ToastProvider>
      );
    default: {
      const unhandled: never = session;
      throw new Error(`Unhandled session state: ${JSON.stringify(unhandled)}`);
    }
  }
}

function DashboardIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  );
}

function DonorsIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
      <path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14c2.2.6 3.5 2.8 3.5 6" />
    </svg>
  );
}

function AddIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  );
}
