# Matched Betting App V1 Implementation Plan

## Goal

Turn the approved product design into a buildable V1 with:
- a `Next.js` web app
- a `PostgreSQL` database
- a `Python` worker for scraping, parsing, and lay matching

The plan prioritizes a usable personal workflow first, then automation depth.

## Delivery Principle

Ship the workflow before the intelligence.

That means:
1. get `Offer`, `OfferStep`, and `Bet` management working
2. make the workflow visible in the UI
3. add job-backed lay matching
4. add URL/text parsing
5. add direct scraping for the highest-value bookmakers

If the app cannot track the lifecycle cleanly, better matching will not save it.

## Target Repo Shape

Recommended near-term repo structure:

```text
matchBeter/
  docs/
  apps/
    web/
  workers/
    automation/
  packages/
    shared/
  src/
    matchbeter/
```

### Why this shape

- `apps/web` keeps the `Next.js` product isolated
- `workers/automation` gives the Python worker a clean home
- `packages/shared` can hold shared schemas, constants, and example payloads
- existing `src/matchbeter` can remain as the current Python matcher sandbox until the worker is wired up

This does not require a full monorepo toolchain on day one. It is just a clean directory boundary.

## Phase Plan

## Phase 1: Web App Scaffold

### Outcome

A running `Next.js` app with database connectivity and a sane project layout.

### Work

- create `apps/web` with `Next.js` App Router and TypeScript
- add linting, formatting, and environment loading
- choose UI primitives early, likely `shadcn/ui` or simple custom components
- connect to PostgreSQL with Prisma
- add a minimal homepage and health check

### Decisions to lock

- `Next.js` version
- package manager
- Prisma as ORM
- whether auth is needed in V1 or if a simple single-user gate is enough

### Files expected

- `apps/web/package.json`
- `apps/web/next.config.*`
- `apps/web/src/app/layout.tsx`
- `apps/web/src/app/page.tsx`
- `apps/web/prisma/schema.prisma`
- `apps/web/.env.example`

## Phase 2: Data Model and Database

### Outcome

Core persistence for offers, steps, bets, lay matches, and jobs.

### Work

- encode `Bookmaker`, `Offer`, `OfferStep`, `Bet`, `LayMatch`, `SyncJob` in Prisma
- define enums for offer status, step type, bet type, job type, and match quality
- create first migration
- seed a few bookmaker templates for testing

### Important implementation choices

- store parsed rule structures in JSON columns for V1
- keep raw source text and raw worker outputs for debugging
- allow `OfferStep` to exist before any `Bet` is attached
- model `LayMatch` as a separate entity, not embedded in `Bet`

### Files expected

- `apps/web/prisma/schema.prisma`
- `apps/web/prisma/seed.ts`
- `apps/web/src/lib/db.ts`

## Phase 3: Offer Workflow UI

### Outcome

The app becomes useful even before matching is implemented.

### Work

- build `Offers Dashboard`
- build `Create Offer`
- build `Offer Detail`
- implement automatic creation of standard steps
- support template-based offer creation first
- show status, expiry, and current blocking step

### Route suggestion

```text
/offers
/offers/new
/offers/[offerId]
```

### Component suggestion

- `OfferTable`
- `OfferStatusBadge`
- `OfferStepTimeline`
- `OfferSummaryCard`
- `CreateOfferForm`

### Minimum usable state

The user should be able to:
- create an offer from a template
- see the generated workflow steps
- update step status
- record notes and expected outcome

## Phase 4: Bet Recording and Manual Matcher Input

### Outcome

The app can now capture real execution data.

### Work

- add `Bet` CRUD inside offer detail
- support linking a bet to a specific step
- add a matcher form for manual back bet input
- let the user submit a match request as a `SyncJob`

### Route suggestion

Either:
- embed matcher in `/offers/[offerId]`

Or:
- add `/matcher`

Recommendation:
start embedded inside `Offer Detail`, because that matches the real workflow.

### UI requirements

The matcher form should collect:
- sport
- event name
- market name
- selection name
- back odds
- stake
- event start time if known

## Phase 5: Python Worker Foundation

### Outcome

Background automation can run independently of user-facing requests.

### Work

- create `workers/automation`
- define worker config and database connection
- implement a polling loop or queue consumer for `SyncJob`
- support job transitions: `queued` -> `running` -> `completed` or `failed`
- persist structured error output

### Initial job handlers

- `match_lay`
- `parse_terms`

Direct scraping can wait until Phase 7.

### Files expected

- `workers/automation/pyproject.toml`
- `workers/automation/src/worker/main.py`
- `workers/automation/src/worker/jobs/match_lay.py`
- `workers/automation/src/worker/jobs/parse_terms.py`

## Phase 6: Lay Matcher Integration

### Outcome

A submitted back bet returns a stored lay match result.

### Work

- port the current matcher spec into worker code
- implement input normalization
- define a stable payload contract between web app and worker
- persist `LayMatch` rows back to PostgreSQL
- surface warning and ambiguity states in the UI

### Important constraint

The first version does not need perfect matching breadth.
It does need trustworthy failure states.

If the worker is not confident, it should say so explicitly.

### Suggested contract

Web app writes a `SyncJob` payload like:

```json
{
  "offerId": "uuid",
  "offerStepId": "uuid",
  "backBetId": "uuid",
  "input": {
    "sport": "football",
    "eventName": "Arsenal v Chelsea",
    "marketName": "Match Odds",
    "selectionName": "Arsenal",
    "backOdds": 2.3,
    "stake": 10.0,
    "eventStartIso": "2026-05-07T19:45:00Z"
  }
}
```

Worker writes result payload containing:
- matched event
- matched market
- matched selection
- lay price
- lay size
- lay stake
- liability
- warnings
- match quality

## Phase 7: Generic Offer Parsing

### Outcome

The app can turn pasted URL or raw terms text into reviewable offer drafts.

### Work

- let `Create Offer` accept `sourceUrl` and `rawTerms`
- create `parse_terms` jobs from the web app
- implement worker-side parser output format
- add a review screen or review block inside `Offer Detail`
- require user confirmation before activating parsed fields

### Parsing output should include

- bookmaker
- offer type
- expiry
- qualifying rules
- bonus rules
- notable restrictions

## Phase 8: Direct Bookmaker Scrapers

### Outcome

The user's highest-value bookmakers can be ingested with less manual work.

### Work

- pick the top 2-3 bookmaker targets
- add one scraper at a time
- store raw fetched content for debugging
- map scraped data into the same parse output contract used by generic ingestion

### Rule

Do not invent a generic abstraction too early.
Each bookmaker is allowed to be ugly.
The common contract should be at the parsed output level, not the fetch logic level.

## API and App Boundaries

## Web app responsibilities

- create and edit offers
- create and edit offer steps
- create and edit bets
- queue jobs
- read and display job and match results

## Worker responsibilities

- parse and normalize source data
- fetch external data
- run matching logic
- calculate lay economics
- record structured results

## Shared contract surface

Keep the boundary small:
- job payload shape
- match result shape
- parsing result shape

These shapes should be documented and, where practical, validated in both runtimes.

## Testing Plan

## Web app

- unit test workflow helpers
- integration test offer creation and step generation
- integration test bet creation and matcher job submission

## Worker

- unit test normalization helpers
- unit test lay calculation formulas
- fixture-based tests for matching scenarios
- fixture-based tests for parsing promo text

## End-to-end

One happy-path test should cover:
1. create template-based offer
2. generate steps
3. enter back bet
4. run `match_lay`
5. persist `LayMatch`
6. surface result in `Offer Detail`

## Deployment Model

### Web

- deploy `apps/web` to a platform suited to `Next.js`
- connect to hosted PostgreSQL

### Worker

- run `workers/automation` on the VPS
- give it DB access and any external credentials it needs

### Configuration classes

- database URL
- Betfair credentials
- scraping credentials or cookies when needed
- job polling interval

## Implementation Order Recommendation

Build in this exact order:

1. scaffold `apps/web`
2. add Prisma schema and migrations
3. build template-based offers and steps
4. build offer detail and bet recording
5. scaffold worker and `SyncJob` executor
6. wire manual matcher submission
7. implement lay match persistence and UI rendering
8. add URL/text parsing
9. add direct bookmaker scrapers

This order gets a useful product early and keeps the risky automation work boxed in.

## First Coding Sprint

The first implementation sprint should aim to finish:
- Phase 1
- Phase 2
- Phase 3

That would already give you:
- a running `Next.js` app
- persistent offers
- generated workflow steps
- a usable dashboard and detail page

No scraping yet. No matching yet. Still useful.

## Open Decisions Before Coding

These should be answered before scaffolding:

1. `Next.js` app name and package manager
2. hosting target for the web app
3. PostgreSQL provider
4. whether V1 needs any auth at all
5. the first 2-3 bookmaker templates to include

## Decision

Proceed with a phased build where the first shipped slice is:

`template-based offer workflow in Next.js backed by PostgreSQL`

Then layer on:

`Python worker-backed matching and parsing`
