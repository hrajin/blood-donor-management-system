# Build Plan

## Blood Donor Management System (BDMS) — MVP

| Item | Detail |
|---|---|
| Document | Build plan |
| Version | 1.0 |
| Date | 14 November 2026 |
| Owner | [Product Owner / Technical Lead] |
| Status | Ready to start — gate G-1 open |
| Related documents | [BRD](01-BRD.md) · [PRD](02-PRD.md) · [SRS](03-SRS.md) · [TDD](04-TDD-MERN.md) · [AGENTS.md](../AGENTS.md) |

---

## Table of contents

1. [How to use this plan](#1-how-to-use-this-plan)
2. [Before you start](#2-before-you-start)
3. [Decision gates](#3-decision-gates)
4. [Definition of done](#4-definition-of-done)
5. [Timeline](#5-timeline)
6. [Sprint 0 — Foundations](#6-sprint-0--foundations-weeks-23)
7. [Sprint 1 — Accounts and donor profiles](#7-sprint-1--accounts-and-donor-profiles-weeks-45)
8. [Sprint 2 — Requests, verification and invitations](#8-sprint-2--requests-verification-and-invitations-weeks-67)
9. [Sprint 3 — Tracking, admin tools and staging](#9-sprint-3--tracking-admin-tools-and-staging-weeks-89--m1-alpha)
10. [Sprint 4 — Matching, SMS and donations](#10-sprint-4--matching-sms-and-donations-weeks-1011)
11. [Sprint 5 — Operations, safety and privacy](#11-sprint-5--operations-safety-and-privacy-weeks-1213--m2-beta)
12. [Sprint 6 — Should-have features](#12-sprint-6--should-have-features-weeks-1415)
13. [Sprint 7 — Launch readiness](#13-sprint-7--launch-readiness-week-16--m3-public-pilot)
14. [Requirement coverage](#14-requirement-coverage)
15. [Risks to the plan](#15-risks-to-the-plan)

---

## 1. How to use this plan

- **One task at a time.** Each task is a vertical slice — API, screens, critical tests and docs together — so every piece of code has a consumer when it lands (AGENTS.md).
- **The SRS is the specification.** Each task lists the requirement IDs it implements. The PRD user stories give the user's view, and the TDD explains how to build it.
- **With an AI agent:** give it one task ID, for example *"Do task S1-04 in docs/05-BUILD-PLAN.md"*. The agent follows AGENTS.md:
  - it reads the referenced sections first;
  - it stays inside the task;
  - it runs the checks;
  - it reports what changed, what it ran, what failed and what it skipped.
- **Tracking:** when a task meets the definition of done (§4), change its ☐ to ☑ in the same change as the work. Note anything deliberately deferred under the task.
- **Sizes** assume one developer: `S` ≤ 1 day, `M` = 2–3 days, `L` = 4–5 days. The whole plan is about 175 developer-days — roughly 16 weeks for a team of 2–3, or about 8 months for one developer.
- **Weeks** count from project kickoff, as in BRD §15 and PRD §14.

**Phase 0 (built ahead of S0).** A simple admin-only donor register comes first; see the [README](../README.md#phase-0-app--admin-donor-register). It is deliberately smaller than the design:

- one admin account with an email and password set in `.env`, instead of OTP sign-in (FR-AUTH);
- admin sessions with `express-session` and `connect-mongo`, instead of `jose` tokens (TDD §2.2);
- no file storage;
- a flat `server/`, `client/` and `shared/` layout, instead of the monorepo in TDD §4;
- approved packages: `express`, `mongoose`, `express-session`, `connect-mongo`, `helmet`, `zod`, `react`, `react-dom`, `react-router`, `vite`, `@vitejs/plugin-react`, `typescript` and `@biomejs/biome`, plus their type definitions.

Task S0-02 decides whether to move Phase 0 into the monorepo layout or build on it as it is.

## 2. Before you start

**On your machine:** Node.js current LTS (v24 or later), pnpm, Docker Desktop and Git. Create a GitHub repository for this folder. You make the commits; agents do not commit, push or rewrite history unless you ask (AGENTS.md).

**Day 1**

1. Run the registry check for the dependency shortlist (TDD §2.6) and approve the list — task S0-01, gate G-1. Nothing can be installed before this.
2. Send screenshots or a saved copy of destimax.com (gate G-2) for the design reference (task S0-08).
3. Start choosing the SMS gateway and applying for the sender ID (gate G-4); approval can take weeks.
4. Begin task S0-02.

## 3. Decision gates

Gates are decisions only you (or the named owner) can make. Each has a default, so development is not blocked — except G-1.

| Gate | Decision | Needed by | Owner | Default until decided | Status |
|---|---|---|---|---|---|
| G-1 | Approve the dependency shortlist after registry verification (TDD §2) | S0-02 (week 2) | You | None — blocks all installation | ☐ Open |
| G-2 | Design reference: screenshots or a saved copy of destimax.com (PRD §10.7) | S0-08 (week 3) | You | Provisional tokens (TDD §7.2) | ☐ Open |
| G-3 | Hosting and data residency: MongoDB Atlas region or self-hosted; container host; KMS (OD-05) | S3-06 (week 8) | Sponsor, Technical Lead | — | ☐ Open |
| G-4 | SMS gateway(s) and approved sender ID (OD-07, D-01) | S4-02 (week 10) | Sponsor, Operations | Console adapter (no real SMS) | ☐ Open |
| G-5 | Medical parameters: age and weight limits, interval rules, self-check text, disclaimers (OD-04, D-03) | Beta (week 13); required for launch | Medical Advisor | Conservative placeholders (SRS §4.2, §8.1), marked ⚕ | ☐ Open |
| G-6 | Legal texts — Terms, Privacy Policy, consents (D-04) — and retention periods (OD-08) | S7-05 (week 16) | Legal | Draft texts, never shown in production | ☐ Open |
| G-7 | Pilot area and hospital list (OD-02, D-05) | S5-08 (week 12) | Sponsor, Operations | Sample data for one district | ☐ Open |
| G-8 | Verification coverage hours; publish unverified emergencies? (OD-03) | S5-07 (week 13) | Sponsor, Operations | Auto-publish off | ☐ Open |
| G-9 | Product name and logo (OD-01) | S7-05 (week 16) | Sponsor | "BDMS" working name; text logo | ☐ Open |
| G-10 | Product questions PQ-01 to PQ-06 (PRD §17) | When the related screen is built | Product Owner | Proposed defaults in PRD §17 | ☐ Open |
| G-11 | May requesters see anonymised donor search results? (OD-06) | S2-05 (week 6) | Product Owner, Legal | Yes, rate-limited | ☐ Open |
| G-12 | Is the requisition slip mandatory? (OD-09) | S6-04 (week 14) | Operations | Optional | ☐ Open |

## 4. Definition of done

A task is done when all of these are true:

1. Only the task's scope changed. Problems noticed elsewhere are reported, not fixed (AGENTS.md).
2. The formatter, linter and type checker pass, and the task's critical tests pass (SRS NFR-MNT-02).
3. Bangla and English text is complete (NFR-L10N-01), and only palette tokens are used (UI-13).
4. Personal-data rules hold: responses are filtered by role (API-09), and no personal data reaches the logs (FR-PRV-06).
5. If behaviour, configuration, environment variables, commands or public APIs changed, the docs were updated in the same change. Configuration docs list every option, its default and what it does.
6. The task is ticked here, with a short report: what changed, what was run, what failed and what was skipped.

## 5. Timeline

| Sprint | Weeks | Theme | Milestone | Gates |
|---|---|---|---|---|
| S0 | 2–3 | Foundations | M0 — design ready | G-1, G-2 |
| S1 | 4–5 | Accounts and donor profiles | — | — |
| S2 | 6–7 | Requests, verification and invitations | — | G-11 |
| S3 | 8–9 | Tracking, admin tools and staging | **M1 — Alpha** | G-3 |
| S4 | 10–11 | Matching, SMS and donations | — | G-4 |
| S5 | 12–13 | Operations, safety and privacy | **M2 — Beta** | G-5, G-7, G-8 |
| S6 | 14–15 | Should-have features | — | G-12 |
| S7 | 16 | Launch readiness | **M3 — public pilot** | G-5, G-6, G-9 |

---

## 6. Sprint 0 — Foundations (weeks 2–3)

Goal: infrastructure, configuration, the API and web shells, and CI. No feature code yet.

#### S0-01 Verify and approve dependencies
`S` · owner: you · depends on: — · ☐
- **Scope:** gate G-1; TDD §2; DC-09; NFR-SEC-09.
- **Do:**
  - Run the registry check in TDD §2.6 for every recommended package.
  - Choose the alternative wherever you prefer it.
  - Record the approved packages and versions in ADR-010 (TDD §1.1).
- **Done when:** ADR-010 lists every approved package with its verified version. Nothing is installed before this.

#### S0-02 Repository and tooling
`M` · depends on: S0-01 · ☐
- **Scope:** TDD §4, §14; NFR-MNT-01.
- **Build:**
  - pnpm workspace configuration;
  - TypeScript strict base configuration (erasable syntax only);
  - formatter and linter configuration;
  - root scripts `format`, `lint`, `typecheck` and `test`;
  - `.nvmrc` pinned to the Node.js LTS version;
  - a "Development" section in README.md with the commands.

  Each package is created by the first task that needs it, so there are no empty packages.
- **Done when:** `pnpm install`, `pnpm lint` and `pnpm typecheck` run clean, and README.md lists the commands.

#### S0-03 Local infrastructure
`S` · depends on: S0-02 · ☐
- **Scope:** DC-04; TDD §9.3; NFR-MNT-04.
- **Build:** `infra/docker-compose.yml` with MongoDB 8 (single-node replica set), Redis 7 (AOF, `noeviction`) and MinIO; scripts `infra:up` and `infra:down`.
- **Done when:** all three services report healthy, and `rs.status()` shows a PRIMARY.

#### S0-04 Configuration loading
`S` · depends on: S0-02 · ☐
- **Scope:** TDD §9.2; NFR-SEC-05; NFR-L10N-02.
- **Build:** environment schema (Zod) checked at start-up; `.env.example` with development values only (descriptions stay in TDD §9.2); loading with `node --env-file`; the `TZ=UTC` check.
- **Done when:** a missing or invalid variable stops start-up with a message that names it.

#### S0-05 API skeleton
`M` · depends on: S0-03, S0-04 · ☐
- **Scope:** API-01, API-03, API-06, API-07; NFR-SEC-01, NFR-SEC-06, NFR-SEC-07; NFR-OBS-01; FR-PRV-06; TDD §5.1, §5.2, §5.5, §5.13.
- **Build:**
  - `apps/api`, and `packages/shared` with the error codes from SRS §11;
  - Express 5 with the middleware pipeline: request ID, pino with redaction, helmet, JSON size limit, Zod validation, and an error handler in the SRS API-03 format;
  - `/healthz`.
- **Tests:** an unexpected error returns `INTERNAL_ERROR` with a correlation ID and no stack trace; a body containing a `$`-prefixed key is rejected.
- **Done when:** the API serves `/healthz` and both tests pass.

#### S0-06 Database layer and migrations
`M` · depends on: S0-05 · ☐
- **Scope:** DC-04; NFR-MNT-03; TDD §5.6, §6.3, §6.7.
- **Build:**
  - `packages/core` with the Mongoose connection;
  - a start-up check that refuses a standalone server;
  - the `withTransaction` helper;
  - `migrate-mongo` with `db:migrate` and `db:status` scripts;
  - `autoIndex` off outside development;
  - MongoDB added to `/readyz`.
- **Done when:** `pnpm db:migrate` runs against the local replica set, and the API refuses to start against a standalone `mongod`.

#### S0-07 Web app shell and design system
`L` · depends on: S0-02 · ☐
- **Scope:** UI-01, UI-02, UI-10, UI-13; NFR-L10N-01; NFR-COMP-01, NFR-COMP-02; TDD §7.1–7.3, §7.6, §7.7.
- **Build:**
  - `apps/web` and `packages/ui`: Vite, React, TypeScript, router, TanStack Query, and a fetch wrapper that understands the SRS error format;
  - i18next with `bn` and `en` resources and a language switch;
  - the Tailwind theme with the locked palette (TDD §7.2), and fonts;
  - PWA manifest and offline page;
  - the public landing page.
- **Done when:** the web app runs locally, the landing page switches between Bangla and English, and no colour outside the palette is used.

#### S0-08 Design reference
`S`–`M` · depends on: S0-07, G-2 · ☐
- **Scope:** UI-14; PRD §10.7; TDD §7.2.
- **Do:** from the destimax.com screenshots or saved copy, record typography, layout, shapes, imagery and motion in PRD §10.7, and replace the provisional tokens in `theme.css`.
- **Done when:** PRD §10.7 is marked reviewed and the landing page uses the final tokens. If G-2 is still open, keep the provisional tokens and carry this task forward.

#### S0-09 Prototype and first usability test
`M` · owner: designer · depends on: S0-07 · ☐
- **Scope:** PRD §10.1–10.3; NFR-USE-01 (first round).
- **Do:**
  - Build a clickable prototype of donor registration, the request form, an invitation and request tracking, in both languages.
  - Test it with 5 target users, including users with low literacy and users aged 45+.
  - Feed accepted changes back into the PRD.
- **Done when:** findings are recorded and accepted changes are in PRD §10 — **milestone M0**.

#### S0-10 CI pipeline
`M` · depends on: S0-05, S0-07 · ☐
- **Scope:** NFR-MNT-03, NFR-SEC-09, NFR-PERF-04 (bundle budget), UI-13 (colour check); TDD §10.
- **Build:** a GitHub Actions workflow with these steps:
  1. install;
  2. format check, lint and type check;
  3. critical-path tests, with MongoDB and Redis from docker compose;
  4. build;
  5. gzip budget check (initial JavaScript ≤ 200 KB);
  6. colour-literal check;
  7. dependency audit.
- **Done when:** a pull request shows every check green.

---

## 7. Sprint 1 — Accounts and donor profiles (weeks 4–5)

Goal: people sign up with an OTP, create a donor profile and see when they can donate.

#### S1-01 Locations
`M` · depends on: S0-06, S0-07 · ☐
- **Scope:** FR-ADM-09 (seed data only; the screen is in S5-06); NFR-L10N-03; SRS §5.6; gate G-7 (sample data until decided).
- **Build:** `locations` collection with indexes and a seed migration from the official geocodes; `GET /locations`; a division → district → upazila picker in `packages/ui`.
- **Done when:** the picker shows Bangla and English names in the active language.

#### S1-02 Settings store
`S` · depends on: S0-06 · ☐
- **Scope:** FR-CFG-01, FR-CFG-04; SRS §8.
- **Build:** `settings` collection seeded with every SRS §8 key and its default; a typed reader with a Zod schema per key; an in-memory cache invalidated through Redis pub/sub.
- **Done when:** services read settings only through the typed reader, and every instance picks up a changed value within 60 seconds.

#### S1-03 Notification outbox and worker
`L` · depends on: S1-02 · ☐
- **Scope:** FR-NTF-01, FR-NTF-02, FR-NTF-09; NFR-AVL-02, NFR-AVL-04; TDD §5.8, §5.9.
- **Build:**
  - `apps/worker` with graceful shutdown;
  - BullMQ queues `sms-critical` and `sms`;
  - the `notifications` collection and indexes, and the outbox helper used inside transactions;
  - the console SMS adapter;
  - the outbox-sweeper schedule;
  - template rendering from the shared i18n resources;
  - Redis added to `/readyz`.
- **Tests:** a notification written in a transaction is sent exactly once, even if the first worker stops before finishing.
- **Done when:** an OTP notification created by the API appears exactly once in the console adapter's output.

#### S1-04 OTP sign-up and login
`L` · depends on: S1-03 · ☐
- **Scope:** FR-AUTH-01..08, FR-AUTH-10, FR-AUTH-13..16; FR-ABU-05 (block-list check on OTP); FR-PRV-01 (Terms and Privacy consents); NFR-SEC-04 (phone encryption), NFR-SEC-08; TDD §5.3, §6.5.
- **Build:**
  - field-encryption set-up: key vault, data-key migration, and a local master key in development;
  - `users`, `sessions`, `otp_challenges`, `consents` and `blocked_phones` collections;
  - OTP request and verification, with rate limits;
  - access and refresh tokens, with rotation and reuse detection;
  - logout and logout-all; `/me`;
  - screens for phone entry, the OTP (WebOTP autofill) and onboarding (name, language, consents);
  - draft Terms and Privacy texts (G-6).
- **Tests:** AT-01; AT-24; reusing a rotated refresh token revokes the session family; a blocked number gets `AUTH_BLOCKED` and no SMS is sent.
- **Done when:** a new user signs up with the OTP from the console adapter, accepts the terms and reaches the home screen.

#### S1-05 Admin console and sign-in
`M` · depends on: S1-04 · ☐
- **Scope:** FR-AUTH-09; NFR-SEC-11; TDD §3.3, §5.3.
- **Build:**
  - `apps/admin` (Vite, React, shared `packages/ui`);
  - the admin host and `aud: admin` tokens;
  - OTP plus password (Argon2id), with lockout;
  - a script that creates the first Super Admin;
  - the sign-in screen and console frame.
- **Tests:** an app-audience token is rejected on admin routes; five wrong passwords lock password sign-in for 15 minutes.
- **Done when:** the first Super Admin signs in to the admin console.

#### S1-06 Donor profile and eligibility
`L` · depends on: S1-01, S1-04 · ☐
- **Scope:** FR-PRF-01..04, FR-PRF-10; FR-DON-11 (donor-derived fields); FR-ABU-07 (disclaimer at donor registration); SRS §4.1, §4.2; gate G-5 (placeholder interval rules ⚕).
- **Build:**
  - eligibility functions (§4.2) and the component mapping (§4.1) in `packages/domain`;
  - the `interval_rules` seed;
  - the `donorProfile` schema and validation (SRS Table 3.2-A);
  - the last-donation answer stored as an OFF_PLATFORM donation;
  - derived eligibility fields;
  - the 5-step donor wizard.
- **Tests:** an eligibility table — the §4.2 worked example, sex-specific rules and the conservative fallback, and the missing-rule fail-safe; AT-02.
- **Done when:** a donor completes the wizard in either language and sees "Eligible now" or "Eligible from {date}".

#### S1-07 Availability and consent
`M` · depends on: S1-06 · ☐
- **Scope:** FR-PRF-06..08; FR-PRF-11 (profile side; the effect on invitations is in S2-07); SRS §4.7 (availability-restore and deferral-check jobs).
- **Build:** availability control with an optional end date and deferral reasons; consent withdrawal and re-activation; the two scheduled jobs.
- **Tests:** AT-04.
- **Done when:** a donor marked unavailable until yesterday is available again after the 00:05 job, and is notified.

#### S1-08 Donation history and past donations
`M` · depends on: S1-06 · ☐
- **Scope:** FR-DON-08 (donor entries), FR-DON-09, FR-DON-12.
- **Build:**
  - the history screen, with Confirmed and Unconfirmed labels and a "Not counted" section;
  - adding, editing and deleting your own off-platform donations;
  - derived fields recalculated in the same transaction.
- **Tests:** a donor entry within the minimum interval of another donation is rejected with `DON_INTERVAL_CONFLICT`.
- **Done when:** adding a past donation changes the next eligible date immediately.

#### S1-09 Home and settings screens
`M` · depends on: S1-07 · ☐
- **Scope:** FR-PRF-05, FR-PRF-12; UI-03, UI-04, UI-05, UI-06, UI-09.
- **Build:**
  - the home screen with the donor card (availability, eligibility, last donation);
  - settings for language, notification preferences and contact sharing;
  - "log out of all devices".
- **Done when:** every preference saves and takes effect, in both languages.

---

## 8. Sprint 2 — Requests, verification and invitations (weeks 6–7)

Goal: a request can be submitted, verified by an admin and answered by donors who were invited manually.

#### S2-01 Audit log
`M` · depends on: S0-06 · ☐
- **Scope:** FR-AUD-01..04; TDD §5.12.
- **Build:**
  - the `bdms_audit` database with the append-only role (compose init script; the Atlas custom role is described in TDD §5.12);
  - `audit.record()`, used inside transactions;
  - merging of repeated CONTACT_REVEALED events.
- **Tests:** the application's database user cannot update or delete audit records.
- **Done when:** audit records are written inside business transactions. The first consumers are S2-04 and S2-07.

#### S2-02 Submit a blood request
`L` · depends on: S1-04 · ☐
- **Scope:** FR-REQ-01..08; FR-ADM-08 (hospital seed data); FR-ABU-06, FR-ABU-07 (declarations and disclaimer).
- **Build:**
  - the `hospitals` collection, seed and type-ahead endpoint;
  - the `blood_requests` collection, indexes and daily request-code counter;
  - the request form (SRS Table 3.4-A), with unlisted hospital, ASAP and declarations;
  - the active-request limit, the duplicate warning and `Idempotency-Key` handling;
  - the confirmation screen.
- **Tests:** a repeated `Idempotency-Key` creates exactly one request; a fourth active request returns `REQ_LIMIT_REACHED`.
- **Done when:** a logged-in user submits a request in about a minute and sees its code and status.

#### S2-03 In-app notifications
`M` · depends on: S1-03, S2-02 · ☐
- **Scope:** FR-NTF-03, FR-NTF-04; SRS §9 templates.
- **Build:**
  - a notification centre with unread badge and mark-as-read;
  - IN_APP rendering in the user's language;
  - template files for the events used so far;
  - a CI check of SMS template length.
- **Done when:** REQUEST_SUBMITTED appears in the requester's inbox in their language.

#### S2-04 Verification queue
`L` · depends on: S1-05, S2-01, S2-03 · ☐
- **Scope:** FR-VER-01..06, FR-VER-08, FR-VER-10; UI-13 (SLA styles); NFR-USE-04.
- **Build:**
  - an admin queue with SLA timers (On track / At risk / Overdue);
  - a review lock, with takeover;
  - approve (with checklist), reject (with reason), request information, and edit with audit;
  - ADMIN_NEW_EMERGENCY and the escalation job.
- **Done when:** an admin verifies a pending emergency in under a minute of interaction, and the requester is notified.

#### S2-05 Candidate selection and donor search
`L` · depends on: S1-06, S2-02, G-11 · ☐
- **Scope:** FR-SRC-01..08, FR-SRC-11; SRS §4.3 (stages 1 and 2, shared with matching in S4-01).
- **Build:**
  - the candidate-selection module in `packages/core`: filters C1–C12, tiers and ranking;
  - the partial matching indexes;
  - anonymised donor search for users;
  - admin search with masked phone numbers and audited reveal;
  - search rate limit and logging.
- **Tests:** AT-21; a ranking table (tier, never-donated first, recently active, tie-breaker).
- **Done when:** a requester finds anonymised, eligible donors near a hospital, and an admin's phone reveal creates an audit record.

#### S2-06 Manual invitations and response links
`M` · depends on: S2-04, S2-05 · ☐
- **Scope:** FR-MAT-10..13 (manual invitations, expiry, notification, unique index), FR-SRC-09, FR-INV-01, FR-INV-02; SRS §4.7 (invitation-expiry job).
- **Build:**
  - the `invitations` collection and indexes;
  - invitations from admin search and from requester search, with caps;
  - response tokens and the `/i/:token` landing page;
  - the invitation view, without patient details;
  - INVITATION_NEW and the expiry job.
- **Done when:** an invited donor opens the link from the console SMS and sees the invitation without logging in.

#### S2-07 Accept, decline and withdraw
`L` · depends on: S2-06 · ☐
- **Scope:** FR-INV-03..09, FR-INV-11, FR-INV-14; FR-PRF-09 and the invitation side of FR-PRF-11; FR-PRV-05; FR-AUD-03; SRS §4.6 (concurrency rules).
- **Build:**
  - acceptance in one transaction, with the conditional updates (request counters, donor `activeCommitment`), the self-check and contact-sharing consent;
  - decline and withdraw, with reasons;
  - responses recorded on a donor's behalf by admins;
  - contact exchange with audited reveals and the visibility window;
  - requester notifications.
- **Tests:** AT-08, AT-09, AT-10.
- **Done when:** two donors racing for the last bag never both succeed, and contact details appear only to the right people.

---

## 9. Sprint 3 — Tracking, admin tools and staging (weeks 8–9) → M1 Alpha

Goal: the requester can follow a request from start to finish, admins have their core tools, and the system runs on staging.

#### S3-01 Request tracking, edit and cancel
`L` · depends on: S2-07 · ☐
- **Scope:** FR-REQ-09..12, FR-REQ-16; SRS §4.5.1 (transitions).
- **Build:**
  - "My requests" and the tracking page: status, timeline, units, invitation counts, and committed donors with call buttons;
  - edits as in SRS Table 3.4-B, including material changes;
  - cancel, with reason and donor notifications;
  - status history.
- **Tests:** AT-15.
- **Done when:** accepted donors appear on the tracking page within 15 seconds, and cancelling notifies them.

#### S3-02 Expiry and extension
`M` · depends on: S3-01 · ☐
- **Scope:** FR-REQ-13..15; SRS §4.7 (request-expiry and expiry-warning jobs).
- **Build:** the expiry warning; extension limits; automatic expiry, with invitation cancellation and notifications.
- **Tests:** AT-16 (expiry part; late recording follows in S4-03).
- **Done when:** an overdue request expires on schedule, and committed donors are told they are no longer needed.

#### S3-03 Admin: donors, users and moderation
`L` · depends on: S2-05 · ☐
- **Scope:** FR-ADM-05, FR-ADM-10, FR-ADM-12, FR-ADM-15; FR-AUTH-11.
- **Build:**
  - donor list and detail: edit, verify blood group, set deferral, deactivate, notes;
  - admin user management, with the on-duty flag;
  - suspend, block, unblock and trusted-requester actions, with their effects and audit;
  - session revocation within 60 seconds.
- **Done when:** a blocked user is signed out within a minute, their requests are cancelled, and the block list stops their OTPs.

#### S3-04 Admin: requests and hotline
`L` · depends on: S3-01 · ☐
- **Scope:** FR-ADM-02..04, FR-MAT-14.
- **Build:**
  - the request list, with filters and search;
  - admin request detail: timeline, invitations, donations and the actions available so far;
  - pause and resume matching;
  - assisted request creation for hotline callers.
- **Done when:** an admin creates a request for a caller, and the caller receives the request code by SMS (console adapter).

#### S3-05 Hospitals master data
`M` · depends on: S2-02 · ☐
- **Scope:** FR-ADM-08.
- **Build:**
  - create, edit and deactivate hospitals, with bilingual and short names;
  - a warning for similar names;
  - mapping of unlisted hospitals from requests.
- **Done when:** an unlisted hospital from a request can be mapped to a new master entry.

#### S3-06 Staging environment
`M` · depends on: S3-01, G-3 · ☐
- **Scope:** NFR-SEC-01, NFR-AVL-01, NFR-OBS-03, NFR-OBS-04, NFR-BAK-01, NFR-BAK-02; TDD §3.2, §9.
- **Build:**
  - staging deployment of the API, worker, web app and admin console;
  - managed MongoDB replica set and Redis; storage buckets; secrets;
  - HTTPS on both hosts, with migrations as a release step;
  - uptime checks, error tracking and backups;
  - the chosen KMS variables added to TDD §9.2.
- **Done when:** staging runs the latest `main`, and a restore point exists.

#### S3-07 Alpha acceptance
`M` · depends on: S3-02, S3-03, S3-04, S3-05, S3-06 · ☐
- **Scope:** PRD milestone M1.
- **Build:** the Playwright end-to-end journey with a manual invitation, in Bangla and English; an internal test round on staging; fixes.
- **Done when:** the journey passes on staging and the M1 scope in PRD §14.1 works — **milestone M1**.

---

## 10. Sprint 4 — Matching, SMS and donations (weeks 10–11)

Goal: donors are invited automatically by SMS, and recorded donations close requests.

#### S4-01 Automatic matching and waves
`L` · depends on: S2-07 · ☐
- **Scope:** FR-MAT-01..09, FR-MAT-15, FR-MAT-16, and the lease in FR-MAT-13; SRS §4.4; the wave-dispatcher schedule.
- **Build:**
  - `dispatchWave`, using the S2-05 candidate selection;
  - triggers MT-1 to MT-7;
  - wave sizing, tier expansion, quiet hours and exhaustion handling;
  - the per-request lease and job de-duplication;
  - the pledge buffer.
- **Tests:** AT-03, AT-05, AT-06, AT-07, AT-14, AT-22; a wave-size table.
- **Done when:** approving a request invites the first wave within 30 seconds, and later waves follow the rules.

#### S4-02 SMS gateway and delivery
`L` · depends on: S1-03, G-4 · ☐
- **Scope:** FR-NTF-05..08, FR-NTF-10, FR-NTF-13; SMS-01 to SMS-06; NFR-AVL-03.
- **Build:**
  - an adapter for the chosen gateway (and the secondary, if any);
  - encoding and segment counting;
  - retries and failover;
  - the delivery-report webhook, with secret and IP allow-list;
  - quiet-hours scheduling and preference-based suppression;
  - short response links;
  - the gateway credentials added to TDD §9.2.
- **Tests:** AT-23; AT-24 with the real template.
- **Done when:** an emergency invitation reaches a real phone on staging, and its delivery report updates the status.

#### S4-03 Donations and fulfilment
`L` · depends on: S3-01 · ☐
- **Scope:** FR-DON-01..06, FR-DON-08 (requester and admin entries), FR-DON-10, FR-DON-11, FR-DON-16, FR-DON-17; SRS §4.6; the counter-reconciliation schedule.
- **Build:**
  - outcome recording (donated / did not donate), including late recording;
  - donor self-report, with confirmation and rejection;
  - admin donation entry;
  - fulfilment, with release of the remaining donors;
  - reopen;
  - nightly counter reconciliation.
- **Tests:** AT-11, AT-12, AT-13, AT-16 (late recording); a status-derivation table.
- **Done when:** marking the last needed donor as donated fulfils the request and releases the others by SMS.

#### S4-04 Interval rules administration
`M` · depends on: S1-06, S2-01 · ☐
- **Scope:** FR-DON-13, FR-CFG-02; SRS §4.7 (eligibility-recompute and rank-salt-refresh schedules).
- **Build:**
  - a Super Admin screen for interval rules, with the Medical Advisor's approval reference;
  - versioning and audit;
  - background recalculation of stored eligibility dates;
  - the nightly rank-salt refresh.
- **Tests:** AT-19.
- **Done when:** a rule change with an approval reference updates every donor's eligibility within 15 minutes.

#### S4-05 Reminders and follow-ups for commitments
`M` · depends on: S4-03 · ☐
- **Scope:** FR-INV-10, FR-INV-12, FR-INV-13.
- **Build:**
  - the reminder before the needed-by time;
  - outcome follow-ups at +6 h and +24 h, and the "Outcome pending" queue;
  - late acceptance of expired invitations.
- **Done when:** a committed donor gets the reminder two hours before the needed-by time, and outcomes still unrecorded after 48 hours reach the admin queue.

---

## 11. Sprint 5 — Operations, safety and privacy (weeks 12–13) → M2 Beta

Goal: admins can run the service day to day, personal data is protected throughout its life, and the closed pilot starts.

#### S5-01 Dashboard and work queues
`L` · depends on: S4-03 · ☐
- **Scope:** FR-ADM-01, FR-ADM-17; NFR-PERF-05.
- **Build:** the KPI dashboard (SRS Table 3.10-A), with filters and 5-minute caching; every work queue, with its size and the age of its oldest item.
- **Done when:** the dashboard loads in under 3 seconds with staging data.

#### S5-02 Donor reminders
`M` · depends on: S4-02 · ☐
- **Scope:** FR-DON-14, FR-DON-15, FR-PRF-13, FR-PRF-14.
- **Build:** the eligibility reminder, thank-you message, 180-day profile review and age-out handling, each as a scheduled job.
- **Done when:** a donor who becomes eligible today gets one reminder at 10:00, and no second one in the same cycle.

#### S5-03 CSV exports
`M` · depends on: S5-01 · ☐
- **Scope:** FR-RPT-01..07.
- **Build:**
  - the export screen and background export job;
  - streamed CSV with BOM and formula guard;
  - presigned download links;
  - contact columns only for Super Admins, with a reason;
  - audit.
- **Tests:** AT-18.
- **Done when:** a donor export with Bangla names opens correctly in Excel.

#### S5-04 Trust and safety
`L` · depends on: S3-03 · ☐
- **Scope:** FR-ABU-01..04, FR-ABU-05 (contact-phone check and matching exclusion), FR-ADM-11.
- **Build:**
  - report buttons on the invitation, request and share pages;
  - the abuse queue, with actions;
  - automatic pause on a payment report or on repeated reports;
  - admin alerts.
- **Tests:** AT-17.
- **Done when:** a payment report pauses the request at once and alerts the on-duty admins.

#### S5-05 Privacy and retention
`L` · depends on: S4-03 · ☐
- **Scope:** FR-PRV-02, FR-PRV-04; NFR-PRIV-01..05; SRS §5.5.
- **Build:**
  - account deletion, with its effects;
  - TTL indexes, created by migration;
  - the daily retention job: anonymisation, attachment deletion and SMS-body masking;
  - a review of logs and API responses for personal data.
- **Tests:** AT-20.
- **Done when:** a deleted account is anonymised within 24 hours, and the retention job anonymises old requests.

#### S5-06 Settings, audit and SMS log screens
`L` · depends on: S4-04 · ☐
- **Scope:** FR-ADM-09, FR-ADM-13, FR-ADM-14, FR-ADM-16, FR-CFG-03.
- **Build:**
  - the Super Admin settings screen, with validation, versioning, and approval references for medical keys;
  - location management;
  - the audit log viewer, with export;
  - the SMS log, with usage and cost.
- **Done when:** a setting change takes effect within a minute and appears in the audit log.

#### S5-07 Post-verification review
`S` · depends on: S2-04, G-8 · ☐
- **Scope:** FR-VER-07; FR-VER-09 only if G-8 says yes — otherwise the flag stays off and that code is not written.
- **Build:** the "Post-verification review" list for auto-verified requests.
- **Done when:** auto-verified requests stay in the list until an admin marks them reviewed.

#### S5-08 Beta release and usability round
`M` · depends on: S5-01, S5-02, S5-03, S5-04, S5-05, S5-06, S5-07, G-7 · ☐
- **Scope:** PRD milestone M2; NFR-USE-01..04; gates G-5 (if decided) and G-7.
- **Build:**
  - the pilot hospital list and the medical parameters (or the flagged placeholders) loaded;
  - the end-to-end journey with automatic matching, in both languages;
  - a closed pilot with partner volunteers;
  - a usability test with target users.
- **Done when:** the M2 scope in PRD §14.1 works on staging, and the usability results meet NFR-USE-01 — **milestone M2**.

---

## 12. Sprint 6 — Should-have features (weeks 14–15)

Goal: the Should-have features that make the pilot easier to grow.

#### S6-01 Share page and self-nomination
`M` · depends on: S4-01 · ☐
- **Scope:** FR-REQ-17, FR-REQ-18; TDD §7.10.
- **Build:** the server-rendered share-page shell with Open Graph tags; the public request view; "I can donate", with eligibility checks.
- **Done when:** a shared link shows a correct preview on social media, and a matching donor can volunteer from it.

#### S6-02 Admin-created donors and bulk import
`L` · depends on: S5-03 · ☐
- **Scope:** FR-ADM-06, FR-ADM-07.
- **Build:**
  - admin donor creation, with SMS consent confirmation;
  - CSV import, with a validation report and throttled consent SMS;
  - expiry of unconfirmed profiles.
- **Done when:** an imported donor is matched only after confirming consent.

#### S6-03 Web push and SMS budget
`M` · depends on: S4-02 · ☐
- **Scope:** FR-NTF-11, FR-NTF-12.
- **Build:** the push subscription flow and service-worker handlers; a daily SMS segment budget, with alerts and suppression of non-critical SMS.
- **Done when:** at 100% of the cap, normal SMS are suppressed while critical SMS still go out.

#### S6-04 Attachments and repeat requests
`M` · depends on: S3-01, G-12 · ☐
- **Scope:** FR-REQ-19, FR-REQ-20.
- **Build:**
  - requisition-slip upload: type check, re-encoding, and scanning if kept (G-3);
  - viewing through presigned links, for admins only;
  - "repeat a previous request".
- **Done when:** an admin views an attachment through a 5-minute link, and the view is audited.

#### S6-05 Account extras
`L` · depends on: S5-05 · ☐
- **Scope:** FR-AUTH-12, FR-PRV-03, FR-DON-07, FR-SRC-10 (Could — only if wanted).
- **Build:**
  - phone-number change;
  - personal data download;
  - donation disputes, with admin resolution;
  - public availability counts, if kept.
- **Done when:** each feature works end to end in both languages.

#### S6-06 Performance and accessibility pass
`M` · depends on: S6-01, S6-02, S6-03, S6-04, S6-05 · ☐
- **Scope:** NFR-PERF-04, NFR-ACC-01, NFR-ACC-02, NFR-COMP-01, NFR-COMP-02, NFR-USE-02, NFR-USE-03.
- **Do:** Lighthouse and manual accessibility audits of the key screens, in both languages; a TalkBack check of the critical flows; fixes.
- **Done when:** LCP is ≤ 2.5 s on simulated 4G, and no serious accessibility issue remains.

---

## 13. Sprint 7 — Launch readiness (week 16) → M3 public pilot

Goal: prove the system is fast, secure and recoverable, then launch.

#### S7-01 API documentation and runbooks
`M` · depends on: S6-06 · ☐
- **Scope:** API-01 (generated OpenAPI), NFR-MNT-05.
- **Build:**
  - OpenAPI documentation generated from the shared Zod schemas;
  - runbooks: deploy and rollback, restore, SMS provider switch, queue backlog, key rotation and incidents.
- **Done when:** the penetration tester can work from the generated API documentation.

#### S7-02 Load test
`M` · depends on: S6-06 · ☐
- **Scope:** NFR-PERF-01..03, NFR-CAP-01..03.
- **Do:**
  1. Seed 200,000 donors on staging.
  2. Run k6 against search, matching, acceptance and the dashboard at twice the expected pilot peak.
  3. Fix what fails.
- **Done when:** the NFR-PERF targets are met and the results are recorded.

#### S7-03 Security review and penetration test
`L` · depends on: S7-01 · ☐
- **Scope:** NFR-SEC-02, NFR-SEC-03, NFR-SEC-10, NFR-SEC-12.
- **Do:**
  - Work through the ASVS Level 2 checklist.
  - Add IDOR tests on the routes that return personal data.
  - Run the independent penetration test, then fix and retest.
  - Write the incident response plan.
- **Done when:** no critical or high finding remains open.

#### S7-04 Restore drill
`S` · depends on: S3-06 · ☐
- **Scope:** NFR-BAK-03.
- **Do:** restore staging to a point in time from backup, and time it.
- **Done when:** the restore completes within 4 hours, and the runbook is updated.

#### S7-05 Launch
`M` · depends on: S7-02, S7-03, S7-04, G-5, G-6, G-9 · ☐
- **Scope:** PRD §15 launch checklist; NFR-LEG-01..03; NFR-OBS-02; BRD §3.3 go/no-go criteria.
- **Do:**
  - Collect the sign-offs: medical, legal, name and logo.
  - Deploy to production.
  - Set up alerts and the on-call rota.
  - Train the admins.
  - Put the hotline live.
- **Done when:** every item in PRD §15 is ticked — **milestone M3, public pilot**.

---

## 14. Requirement coverage

Every SRS functional and non-functional requirement belongs to at least one task, and each acceptance test (AT-01 to AT-24) belongs to the task that makes it pass. When a requirement changes, update the task that owns it in the same change.

| SRS area | Tasks |
|---|---|
| AUTH — authentication and account | S1-04, S1-05, S3-03, S6-05 |
| PRF — donor profile | S1-06, S1-07, S1-09, S2-07, S5-02 |
| SRC — search | S2-05, S2-06, S6-05 |
| REQ — requests | S2-02, S3-01, S3-02, S6-01, S6-04 |
| VER — verification | S2-04, S5-07 |
| MAT — matching | S2-06, S3-04, S4-01 |
| INV — invitations | S2-06, S2-07, S4-05 |
| DON — donations | S1-06, S1-08, S4-03, S4-04, S5-02, S6-05 |
| NTF — notifications | S1-03, S2-03, S4-02, S6-03 |
| ADM — admin | S1-01, S2-02, S3-03, S3-04, S3-05, S5-01, S5-04, S5-06, S6-02 |
| RPT — exports | S5-03 |
| ABU — trust and safety | S1-04, S1-06, S2-02, S5-04 |
| PRV — privacy | S0-05, S1-04, S2-07, S5-05, S6-05 |
| CFG — configuration | S1-02, S4-04, S5-06 |
| AUD — audit | S2-01, S2-07 |
| Non-functional requirements | S0-01 to S0-10, S1-03 to S1-05, S2-04, S3-06, S4-02, S5-01, S5-05, S5-08, S6-06, S7-01 to S7-05 |

## 15. Risks to the plan

| Risk | Effect | Response |
|---|---|---|
| G-1 is not approved | Nothing can be installed | Approve on day 1 |
| One developer instead of 2–3 | About 8 months instead of 16 weeks | Ship the Musts (S0–S5, S7) first; move S6 after the pilot |
| SMS sender-ID approval is slow | No real SMS for Beta | Start G-4 in week 2; the console adapter covers development |
| Medical or legal sign-off is late | Launch is blocked (development is not) | Placeholders are flagged (⚕ / draft); chase sign-offs from week 4 |
| Design reference not available | The visual style is not final | Provisional tokens live in one file, so restyling later is cheap |
| The agent's environment has no internet | Registry checks and installs fail | Run G-1 and installs on a machine with access |
