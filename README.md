# Blood Donor Management System (BDMS)

A mobile-first, bilingual (Bangla/English) platform that connects voluntary blood donors with people who need blood. It also helps an operating organization verify requests, coordinate donations and keep accurate donation records.

**Primary goal:** reduce the time needed to find a willing, suitable blood donor.

## Phase 0 app — admin donor register

The first working piece is a simple, admin-only donor register, built ahead of the full plan. The admin signs in with an email and password set in `.env` (no OTP), then adds and edits donors (personal details, contact, location and address, blood group, availability and donation history), and filters the donor list by zone, blood group, availability, name or phone. A dashboard, the first page after signing in, shows donor totals, availability, donors by blood group (blood groups with no available donor are marked in red), by division and in the top 10 districts, the 10 donors with the most donations, and new donors in each of the last 6 months. Admins can also record blood requests: each request suggests matching donors near the hospital, and the admin records each donor's response and donation until the request is fulfilled (see [Blood requests](#blood-requests)). There is no public sign-up, SMS or file storage yet.

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
| `pnpm locations:import` | Rebuilds `shared/locations.json` (divisions, districts and built-in areas) from the files in `data/locations/` |
| `pnpm hospitals:import <file>` | Rebuilds `shared/hospitals.json` (the hospital list) from a downloaded `health_facilities.geojson`; see [Hospital data](#hospital-data) |
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
| `GET /donors` | Lists donors, 21 per page. Optional query: `divisionId`, `districtId`, `areaId`, `bloodGroup`, `available` (`true`/`false`), `search` (part of a name or phone), `sort`, `page`. `sort` is `name` (A–Z, the default), `newest` (newest registered first), `lastDonation` (most recent donation first; donors who have not donated come last) or `availability` (available first, then by name) |
| `POST /donors` | Adds a donor: `{ name, phone, email, dateOfBirth, gender, nidNumber, bloodGroup, divisionId, districtId, areaId, presentAddress, permanentAddress, available, donationCount, lastDonatedAt }`; 409 if the phone number or NID number is already registered, with the clashing field in `fields` |
| `GET /donors/:id` | Returns one donor |
| `PUT /donors/:id` | Replaces a donor's details (same body as `POST`) |
| `PATCH /donors/:id/availability` | Sets availability: `{ available }`. Turning it on also cancels an automatic rest |
| `GET /dashboard` | Donor statistics for the dashboard: totals (registered, available, unavailable, new in the last 30 days), counts by blood group and by division (every one listed, even at 0), the 10 districts with the most donors, the 10 donors with the most donations (`name`, `bloodGroup`, `districtId`, `donationCount`, `lastDonatedAt`; donors with no donations are left out), and new donors per month for the last 6 months, counted in Bangladesh time (`Asia/Dhaka`) |
| `GET /areas?districtId=…` | Every area / city in the district, built-in and added, sorted by name: `[{ id, districtId, name }]` |
| `GET /hospitals` | The hospitals admins added (the built-in list is in the web app): `[{ id, name, divisionId, districtId, areaId }]` |
| `POST /hospitals` | Adds a hospital: `{ name, divisionId, districtId, areaId }` (name 3–150 characters; the location is optional, with the same rules as for donors); 201 with the new hospital. If the district already has a hospital with that name (ignoring case and extra spaces), or a built-in one does, returns it with 200 instead |
| `POST /areas` | Adds an area: `{ districtId, name }` (2–60 characters); 201 with the new area. If the district already has an area with that name (ignoring case and extra spaces), returns it with 200 instead |
| `GET /requests` | Lists blood requests, 20 per page. Query: `status` (`open`, the default; `fulfilled`, `cancelled` or `all`), `search` (part of the code, patient name or contact phone), `page`. Open requests are sorted emergencies first, then by the day needed; others newest first. Each has the counts `agreed` and `donated` |
| `POST /requests` | Creates a request (see the fields below); it starts open and gets a code such as `RQ-261115-0001` |
| `GET /requests/:id` | Returns one request with `responses`: each contacted donor, their `status` and when it was recorded |
| `GET /requests/:id/suggestions` | Suggested donors (see [Blood requests](#blood-requests)), at most 50, with `total`, `checkedOn` and `excluded` counts. Query: `wider=true` also searches other divisions |
| `PUT /requests/:id/responses/:donorId` | Records a donor's response: `{ status }`, one of `no-answer`, `declined` or `agreed`; 409 if the request is closed or the donor's donation is already recorded |
| `POST /requests/:id/responses/:donorId/donation` | Records that the donor gave blood: the response becomes `donated`, the donor's `donationCount` goes up by 1 and `lastDonatedAt` becomes today. When the donations reach `unitsRequired`, the request becomes `fulfilled` |
| `POST /requests/:id/cancel` | Cancels an open request: `{ reason, note }`; `reason` is `arranged-elsewhere`, `no-longer-needed`, `created-by-mistake`, `patient-condition-changed` or `other`; 409 if it is already closed |

Donor fields:

| Field | Required | Rules |
|---|---|---|
| `name` | Yes | 1–100 characters |
| `phone` | Yes | 11-digit Bangladeshi mobile number (`01[3-9]` followed by 8 digits); unique |
| `email` | No (`null`) | A valid email address, at most 254 characters |
| `dateOfBirth` | No (`null`) | `YYYY-MM-DD`; the donor must be 16 or older today (Bangladesh time) and at most 100 |
| `gender` | No (`null`) | `male`, `female` or `other` |
| `nidNumber` | No (`null`) | National ID number of 10, 13 or 17 digits; unique when given |
| `divisionId`, `districtId`, `areaId` | No (`null`) | The location may stop at any level. A district needs its division, an area needs its district, and the district must belong to the division. Areas are listed under [Location data](#location-data); responses also include `areaName` |
| `presentAddress`, `permanentAddress` | No (`null`) | 1–250 characters each |
| `available` | Yes | `true` or `false`. Recording a donation sets it to `false` and `availableAgainOn` (in responses; not sent) to 3 months later; the API sets it back to `true` on that day, checked at start-up and then every hour. Marking the donor available by hand cancels the rest |
| `donationCount` | Yes | Whole number from 0 to 300 |
| `lastDonatedAt` | If `donationCount` > 0 | `YYYY-MM-DD`, not in the future and on or after the donor's 16th birthday; must be `null` when `donationCount` is 0 |

NID numbers, dates of birth and addresses are shown only on the donor's details and edit pages, not in the donor list or on the dashboard.

### Blood requests

An admin creates a request when a patient needs blood. Only the patient's name, the blood group and the contact person's name and mobile number have to be given; the other fields are optional. Requests are open until enough units are donated (then fulfilled) or an admin cancels them with a reason.

| Field | Required | Rules |
|---|---|---|
| `patientName` | Yes | 2–100 characters |
| `bloodGroup` | Yes | One of the 8 groups |
| `component` | Yes (the form starts at `whole-blood`) | `whole-blood`, `red-cells`, `platelets-random`, `platelets-apheresis`, `plasma` or `not-sure` |
| `unitsRequired` | Yes (the form starts at 1) | Whole number from 1 to 10 |
| `urgency` | Yes (the form starts at `normal`) | `emergency` or `normal` |
| `requiredOn` | Yes (the form starts at today) | `YYYY-MM-DD`, from today to 30 days ahead (Bangladesh time) |
| `hospitalName` | No (`null`) | 3–150 characters. The form lets the admin pick it from the [hospital list](#hospital-data), which also fills in the location, or type a name that is not in the list |
| `divisionId`, `districtId`, `areaId` | No (`null`) | The hospital's location; matching starts from its most precise level. Same rules as for donors |
| `hospitalAddress`, `ward` | No (`null`) | At most 250 and 50 characters |
| `reason` | No (`null`) | `surgery`, `accident-trauma`, `childbirth`, `thalassemia`, `cancer`, `dengue`, `anaemia` or `other` |
| `contactName` | Yes | 2–100 characters |
| `contactPhone` | Yes | 11-digit Bangladeshi mobile number |
| `relationship` | No (`null`) | `self`, `family`, `friend`, `hospital-staff`, `volunteer` or `other` |
| `notes` | No (`null`) | At most 500 characters |

**Suggested donors** follow SRS §4.3, limited to the data the register has. Eligibility is checked on the day the blood is needed (or today, once that day has passed). A donor is suggested only if all of these hold:

- the same blood group as the request (exact match; the hospital decides compatibility);
- marked available;
- aged 18–60 on that day;
- their last donation was at least 120 days before that day, or they have not donated. Donation types are not recorded yet, so every donation counts as whole blood; 120 days is the SRS placeholder that the Medical Advisor must confirm;
- not the request's contact person (same phone number);
- not agreed to give for another open request without having donated yet;
- not already contacted for this request (they are listed with their response instead).

They are grouped by distance from the hospital: same area / city, same district, same division and, with `wider=true`, other divisions. Donors whose division is not recorded come last. When the request has no division, every donor of the blood group is suggested, all in that last group. Within each group, the donor who donated longest ago (or never) comes first. The response also counts the donors of that blood group in the searched area who were left out, by reason.

Recording a donation updates the request and then the donor in two separate writes, because the local MongoDB runs as a single server without transactions. If the second write fails, the error is shown and the donor's count must be corrected on the donor's edit page.

### Hospital data

The new-request form searches a list of hospitals, shown with their district. Choosing one fills in the hospital's division, district and (when known) area / city; the list narrows to the district or division already chosen. The list has two parts:

- **Built-in:** about 1,750 hospitals in `shared/hospitals.json`, from OpenStreetMap plus our own list of well-known hospitals (`data/hospitals/common-hospitals.json`, by district name; add names there and run the import again).
- **Added by admins:** when a hospital is not in the list, the picker offers to add the typed name, with the location chosen on the form at that time (any part of it may be empty). Added hospitals are stored in the database (`hospitals` collection) and are offered to everyone from then on. Names are unique within a district, ignoring case and extra spaces, so adding an existing name returns the existing hospital.

- **Source:** the OpenStreetMap health-facility export for Bangladesh from the [Humanitarian OpenStreetMap Team](https://data.humdata.org/dataset/hotosm_bgd_health_facilities), under the [Open Database Licence](https://opendatacommons.org/licenses/odbl/). Contains information © OpenStreetMap contributors.
- **Quality:** OpenStreetMap is edited by volunteers, so the list is not an official register and some hospitals are missing or have imperfect names. The import keeps only features tagged as hospitals, with an English name that looks like a hospital's, and drops pharmacies, dental clinics, community clinics and test entries.
- **Updating the built-in list:** download and unzip `hotosm_bgd_health_facilities_osm_geojson.zip` from that page, then run `pnpm hospitals:import path/to/health_facilities.geojson`. `shared/hospitals.json` is generated; do not edit it by hand.

### Location data

A place is a division, a district and an **area / city** in that district. Areas come from three sources, and the area picker searches all of them:

- **Upazilas:** all 495 official upazilas.
- **Popular areas:** well-known city areas that are not upazilas, such as Uttara, Gulshan or Dhanmondi in Dhaka, Agrabad in Chattogram or Zindabazar in Sylhet. They are listed by district in `data/locations/popular-areas.json`, which we maintain; add names there and run `pnpm locations:import`.
- **Added by admins:** when an area is not in the list, the picker offers to add it to the district. Added areas are stored in the database (`areas` collection) and are available to everyone from then on. Names are unique within a district, ignoring case and extra spaces, so adding an existing name returns the existing area.

`shared/locations.json` holds the 8 divisions, 64 districts and the built-in areas (upazilas and popular areas). The server uses it to check locations, and the web app uses it for the pickers. It is generated by `pnpm locations:import`; do not edit it by hand.

- **Source:** `data/locations/` holds `divisions.json`, `districts.json` and `upazilas.json` from the [bangladesh-geocode](https://github.com/nuhil/bangladesh-geocode) dataset, unchanged, and our `popular-areas.json`. To update the official files, download newer copies from the repository's `divisions/`, `districts/` and `upazilas/` folders, then run `pnpm locations:import`.
- **IDs:** divisions, districts and upazila areas use their official BBS geocode (for example `BD30` Dhaka division, `BD2019` Cumilla district), which stays the same across dataset releases. Popular areas use the district code and the name, e.g. `BD3026-uttara`; added areas use a database ID. Donors and requests store the area ID together with its name.
- **Checks:** the import fails if a file is malformed, a code is duplicated, a district or upazila points to a missing parent, `popular-areas.json` names an unknown district, or an area name appears twice in a district.

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
