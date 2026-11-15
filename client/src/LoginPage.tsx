import { type FormEvent, useId, useState } from 'react';
import { useNavigate } from 'react-router';
import { builtInAreas, districts, divisions } from '../../shared/locations.ts';
import { ApiError, signIn } from './api.ts';
import { DonationIllustration } from './DonationIllustration.tsx';

const coverage = [
  { value: divisions.length, label: 'Divisions' },
  { value: districts.length, label: 'Districts' },
  { value: builtInAreas.length, label: 'Areas' },
];

export function LoginPage() {
  const navigate = useNavigate();
  const emailId = useId();
  const passwordId = useId();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await signIn(email, password);
      navigate('/', { replace: true });
    } catch (caught) {
      if (!(caught instanceof ApiError)) throw caught;
      setError(caught.message);
      setSubmitting(false);
    }
  }

  return (
    <main className="login">
      <div className="login-panel">
        <section className="login-intro">
          <p className="login-logo">
            <span className="brand-mark" aria-hidden="true">
              ●
            </span>{' '}
            BDMS
          </p>
          <DonationIllustration />
          <div>
            <p className="login-pill login-pill-dark">Admin portal</p>
            <h2>Find a willing donor, fast.</h2>
            <p className="login-lead">
              Keep the donor register up to date: add donors, mark who is available and find the
              right blood group in the right area.
            </p>
          </div>
          <ul className="login-stats">
            {coverage.map((zone) => (
              <li key={zone.label}>
                <strong>{zone.value}</strong>
                <span>{zone.label}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="login-form-side">
          <form onSubmit={submit}>
            <p className="login-pill">Welcome back</p>
            <h1>Sign in to BDMS admin</h1>
            <p className="login-subtitle">Enter the admin email and password for this register.</p>

            <div className="login-field">
              <label htmlFor={emailId}>Email</label>
              <div className="login-input">
                <UserIcon />
                <input
                  id={emailId}
                  type="email"
                  autoComplete="username"
                  placeholder="admin@example.com"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>
            </div>

            <div className="login-field">
              <label htmlFor={passwordId}>Password</label>
              <div className="login-input">
                <LockIcon />
                <input
                  id={passwordId}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
                <button
                  type="button"
                  className="login-reveal"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  <EyeIcon />
                </button>
              </div>
            </div>

            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}

            <button type="submit" className="login-submit" disabled={submitting}>
              {submitting ? 'Signing in…' : 'Sign in'}
              {!submitting && <span aria-hidden="true">→</span>}
            </button>

            <p className="login-note">
              <LockIcon /> Secured, session-based sign-in
            </p>
            <p className="login-footer">BDMS · Blood Donor Management System</p>
          </form>
        </section>
      </div>
    </main>
  );
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
