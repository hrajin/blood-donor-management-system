# Blood Donor Management System (BDMS)

A mobile-first, bilingual (Bangla/English) platform that connects voluntary blood donors with people who need blood. It also helps an operating organization verify requests, coordinate donations and keep accurate donation records.

**Primary goal:** reduce the time needed to find a willing, suitable blood donor.

## Phase 0 app — admin donor register

The first working piece is a simple, admin-only donor register, built ahead of the full plan. The admin signs in with an email and password set in `.env` (no OTP), then adds and edits donors (personal details, contact, location and address, blood group, availability and donation history), and filters the donor list by zone, blood group, availability, name or phone. A dashboard, the first page after signing in, shows donor totals, availability, donors by blood group (blood groups with no available donor are marked in red), by division and in the top 10 districts, the 10 donors with the most donations, and new donors in each of the last 6 months. There is no public sign-up, SMS or file storage yet.

Stack: MongoDB, Express 5, React and Node.js, in TypeScript. Node.js runs the server's TypeScript directly, Vite builds the client, and admin sessions are stored in MongoDB.

### Set up

1. Install Node.js 24 or later and pnpm.
2. Install the dependencies: `pnpm install`.
3. Start MongoDB 8. Either use your own server, or put the [official MongoDB download](https://www.mongodb.com/try/download/community) in `.local/mongodb/` and run `pnpm db:start` (port 27027).
4. Create `.env` in the project root:

   ```bash
   MONGODB_URI=mongodb://127.0.0.1:27027/bdms
   SESSION_SECRET=<at least 32 random characters>
   ADMIN_EMAIL=admin@example.com
   ADMIN_PASSWORD=<at least 6 characters>
   ```

5. Run `pnpm dev` (API on port 3000) and `pnpm dev:client` (web app on http://localhost:5173) in two terminals.

### Commands

| Command | What it does |
|---|---|
| `pnpm dev` | Runs the API with `.env` and restarts it when a file changes |
| `pnpm dev:client` | Runs the web app with hot reload; `/api` is forwarded to http://localhost:3000 |
| `pnpm build` | Builds the web app into `client/dist` |
| `pnpm start` | Runs in production mode: the API also serves `client/dist` |
| `pnpm db:start` / `pnpm db:stop` | Starts or stops the local MongoDB in `.local/` (port 27027, data in `.local/mongo-data`) |
| `pnpm db:seed [count]` | Adds `count` (default 500, at most 5000) sample donors with random names, locations, blood groups, availability and donation history to the database in `MONGODB_URI`. It only adds donors; run it on a development database, not on real data |
| `pnpm locations:import` | Rebuilds `shared/locations.json` from the raw files in `data/locations/` |
| `pnpm format` | Formats the code (Biome) |
| `pnpm lint` | Checks formatting and lint rules (Biome) |
| `pnpm typecheck` | Type-checks the server and the client |
| `pnpm test` | Runs the critical-path tests against MongoDB; the test database is wiped first |

### Environment variables

The API refuses to start if a required variable is missing or invalid.

| Variable | Required | Default | What it does |
|---|---|---|---|
| `MONGODB_URI` | Yes | — | MongoDB connection string for donors and admin sessions |
| `SESSION_SECRET` | Yes | — | Signs the session cookie; at least 32 characters. Changing it signs the admin out |
| `ADMIN_EMAIL` | Yes | — | Email address of the only admin account (compared without regard to case) |
| `ADMIN_PASSWORD` | Yes | — | Password of the admin account; at least 6 characters |
| `PORT` | No | `3000` | Port the API listens on. If you change it, change the proxy target in `vite.config.ts` too |
| `NODE_ENV` | No | `development` | `development`, `production` or `test`. `production` serves `client/dist` and sends the session cookie over HTTPS only; `pnpm start` sets it |
| `TEST_MONGODB_URI` | No | `mongodb://127.0.0.1:27027/bdms_test` | Database used by `pnpm test`; it is wiped at the start of every run |

Admin sessions last 8 hours.

### API

All routes are under `/api`. Every route except signing in needs the admin session cookie. Errors return `{ "error": "…", "fields": { "<field>": "…" } }`; `fields` is present only for validation errors.

| Method and path | What it does |
|---|---|
| `POST /session` | Signs in with `{ email, password }`; 204, or 401 for wrong details |
| `GET /session` | Returns `{ email }` of the signed-in admin; 401 if not signed in |
| `DELETE /session` | Signs out |
| `GET /donors` | Lists donors, 21 per page. Optional query: `divisionId`, `districtId`, `upazilaId`, `bloodGroup`, `available` (`true`/`false`), `search` (part of a name or phone), `sort`, `page`. `sort` is `name` (A–Z, the default), `newest` (newest registered first), `lastDonation` (most recent donation first; donors who have not donated come last) or `availability` (available first, then by name) |
| `POST /donors` | Adds a donor: `{ name, phone, email, dateOfBirth, gender, nidNumber, bloodGroup, divisionId, districtId, upazilaId, presentAddress, permanentAddress, available, donationCount, lastDonatedAt }`; 409 if the phone number or NID number is already registered, with the clashing field in `fields` |
| `GET /donors/:id` | Returns one donor |
| `PUT /donors/:id` | Replaces a donor's details (same body as `POST`) |
| `PATCH /donors/:id/availability` | Sets availability: `{ available }` |
| `GET /dashboard` | Donor statistics for the dashboard: totals (registered, available, unavailable, new in the last 30 days), counts by blood group and by division (every one listed, even at 0), the 10 districts with the most donors, the 10 donors with the most donations (`name`, `bloodGroup`, `districtId`, `donationCount`, `lastDonatedAt`; donors with no donations are left out), and new donors per month for the last 6 months, counted in Bangladesh time (`Asia/Dhaka`) |

Donor fields:

| Field | Required | Rules |
|---|---|---|
| `name` | Yes | 1–100 characters |
| `phone` | Yes | 11-digit Bangladeshi mobile number (`01[3-9]` followed by 8 digits); unique |
| `email` | No (`null`) | A valid email address, at most 254 characters |
| `dateOfBirth` | Yes | `YYYY-MM-DD`; the donor must be 18 or older today (Bangladesh time) and at most 100 |
| `gender` | Yes | `male`, `female`, `other` or `prefer-not-to-say` |
| `nidNumber` | Yes | National ID number of 10, 13 or 17 digits; unique |
| `divisionId`, `districtId`, `upazilaId` | Yes | The upazila must belong to the district, and the district to the division |
| `presentAddress`, `permanentAddress` | Yes | 1–250 characters each |
| `available` | Yes | `true` or `false` |
| `donationCount` | Yes | Whole number from 0 to 300 |
| `lastDonatedAt` | If `donationCount` > 0 | `YYYY-MM-DD`, not in the future and on or after the donor's 16th birthday; must be `null` when `donationCount` is 0 |

NID numbers, dates of birth and addresses are shown only on the donor's details and edit pages, not in the donor list or on the dashboard.

### Location data

`shared/locations.json` holds all 8 divisions, 64 districts and 495 upazilas. The server uses it to check donor locations, and the web app uses it for the location pickers. It is generated by `pnpm locations:import`; do not edit it by hand.

- **Source:** `data/locations/` holds `divisions.json`, `districts.json` and `upazilas.json` from the [bangladesh-geocode](https://github.com/nuhil/bangladesh-geocode) dataset, unchanged. To update, download newer copies of the three files from the repository's `divisions/`, `districts/` and `upazilas/` folders, then run `pnpm locations:import`.
- **IDs:** each zone is identified by its official BBS geocode (for example `BD30` Dhaka division, `BD2019` Cumilla district), and donors store these codes. The codes stay the same across dataset releases.
- **Checks:** the import fails if a file is malformed, a code is duplicated, or a district or upazila points to a missing parent.

## Documents

| # | Document | Audience | What it answers |
|---|---|---|---|
| 1 | [Business Requirements Document (BRD)](docs/01-BRD.md) | Sponsor, management, partners, legal/medical advisors | **Why** are we building this? What problem, objectives, KPIs, scope, stakeholders, business rules, risks, costs and compliance? |
| 2 | [Product Requirements Document (PRD)](docs/02-PRD.md) | Product, design, engineering leads, operations | **What** are we building, and for whom? Personas, journeys, 7 modules with user stories and acceptance criteria, lifecycle, notifications, UX, analytics, release plan. |
| 3 | [Software Requirements Specification (SRS)](docs/03-SRS.md) | Developers, QA, DevOps | **How exactly** must it behave? Detailed functional requirements, algorithms, state machines, MongoDB data model, API, NFRs, configuration, test scenarios, traceability. |
| 4 | [Technical Design Document (TDD) — MERN](docs/04-TDD-MERN.md) | Developers, DevOps, QA | **How do we build it with MERN?** Dependency shortlist (awaiting approval), architecture, repository layout, MongoDB models and indexes, transactions, BullMQ jobs, React apps and design system, security, environment variables, CI/CD, testing. |
| 5 | [Build plan](docs/05-BUILD-PLAN.md) | Everyone building the product | **What do we do, and in what order?** Decision gates, definition of done, and 57 tasks in 8 sprints, each tied to SRS requirements and acceptance tests. |

How the IDs link up: **BR-xx** (BRD) → **F x.y** (PRD) → **FR-AREA-nn** (SRS). See the [traceability matrix](docs/03-SRS.md#13-traceability-matrix).

## Start building

1. Read [AGENTS.md](AGENTS.md) — the rules every contributor and agent follows.
2. Open the [build plan](docs/05-BUILD-PLAN.md) and close gate G-1: verify and approve the dependency shortlist (task S0-01).
3. Work through the tasks in order. Give your agent one task ID at a time, e.g. *"Do task S0-02 in docs/05-BUILD-PLAN.md"*.

## Technology and design

- **Stack — MERN:** MongoDB (replica set), Express 5, React 19 and Node.js, all in TypeScript. Supporting services: Redis (BullMQ queues, rate limits) and S3-compatible storage. See [SRS §2.8](docs/03-SRS.md#28-reference-architecture-mern) and the [TDD](docs/04-TDD-MERN.md).
- **Colours:** three primary colours — red `#C8102E`, black `#111111`, white `#FFFFFF` — plus greys and red tints only. Red is reserved for primary actions, emergencies and errors. All pairs are checked against WCAG AA. See [PRD §10.6](docs/02-PRD.md#106-visual-design-and-colour-palette).
- **Look and feel:** follows the design reference [destimax.com](https://destimax.com/) — **pending review** ([PRD §10.7](docs/02-PRD.md#107-design-reference)). Typography, corner radius, spacing and motion are provisional tokens until it is captured.

## Key design decisions (changes from the initial concept)

| # | Decision | Why |
|---|---|---|
| 1 | **Availability ≠ eligibility.** The donor sets availability (Available / Unavailable / Temporarily Deferred). The system calculates eligibility from configurable, medically approved interval rules (previous → next donation type). | Donors keep control, and the system never invites a donor too soon after their last donation. |
| 2 | **One account can be both donor and requester**, plus a **Super Admin** role for configuration. | Less friction; separation of duties. |
| 3 | **Wave-based invitations** that widen from upazila → district → division, with weekly caps and quiet hours (22:00–07:00). | Speed without spamming the whole registry; lower SMS cost; less donor fatigue. |
| 4 | **Privacy in both directions.** Donor numbers are never public; a donor's number is shared only with consent after they accept. The requester's number is also shown only to donors who accepted. | Protects donors (especially women) and requesters from harassment and brokers. |
| 5 | **Anonymised search.** Requesters can only invite donors from search if they have their own *verified* request. | Search can't bypass verification or be used to scrape contacts. |
| 6 | **Verification with SLAs**: emergency 15 min, normal 2 h. Escalation, trusted requesters, hotline-assisted requests; auto-publishing unverified emergencies is a flag that is **off** by default. | Fraud prevention without blocking emergencies. |
| 7 | **Pledge ≠ donation.** Donations are confirmed by the requester or an admin. Self-reported donations update eligibility immediately (safety first) but count towards fulfilment only once confirmed. | Accurate fulfilment data and donor safety. |
| 8 | **Self-check before acceptance** and an apheresis-willingness flag. | Fewer wasted trips; better platelet matching. |
| 9 | **Trust and safety built in:** "asked for payment" reports pause a request automatically, plus a block list, disclaimers and declarations. | Keeps donation voluntary and unpaid. |
| 10 | **Cold-start tools:** bulk import with SMS consent confirmation, and shareable request links with self-nomination. | Grows the donor base quickly and lawfully. |
| 11 | **Data lifecycle:** consent records, contact visibility window, anonymisation, account deletion, append-only audit log. | Compliance and trust. |
| 12 | **MERN implementation:** MongoDB transactions with conditional updates (no double bookings), donor profile embedded in `users`, transactional outbox for notifications, BullMQ jobs, TTL-based retention, append-only audit database. | Correctness under concurrency without row locks; no lost SMS; automatic data retention. |
| 13 | **Locked palette in code:** the Tailwind theme contains only red, black, white, greys and red tints, and CI rejects colour literals. | The brand stays consistent and accessible as the UI grows. |

## Items that need sign-off before launch

These are tracked as decision gates in the [build plan](docs/05-BUILD-PLAN.md#3-decision-gates).

- ⚕ **Medical Advisor:** age and weight limits, donation-interval rules (the defaults are conservative *placeholders*: WB→WB 120 d, WB→Apheresis 120 d, Apheresis→Apheresis 14 d, Apheresis→WB 28 d), self-check text, disclaimers.
- ⚖ **Legal:** Terms of Service, Privacy Policy, consent texts, retention periods, hosting/data residency.
- 🏢 **Sponsor / Operations:** pilot area, verification coverage hours, SMS provider and budget.
- 🎨 **Design:** screenshots or a saved copy of destimax.com, so that the design reference (PRD §10.7) can be captured.

See [BRD §16 Open business decisions](docs/01-BRD.md#16-open-business-decisions) and [SRS Appendix C](docs/03-SRS.md#appendix-c--open-issues-tbd).
