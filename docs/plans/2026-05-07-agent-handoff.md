# Agent Handoff

## Context

This repo started as a Python skeleton for a bookmaker back-bet to exchange lay-bet matcher.

The product direction is now broader:
- personal-use matched betting web app
- offer workflow tracking
- manual back bet entry
- worker-backed lay matching
- scraping-assisted offer ingestion

The user is comfortable with `Next.js`.
Scraping is important.
This is not intended to be a multi-user SaaS.

## Approved Product Decisions

These were explicitly agreed with the user:

- core workflow is `Offer`-first, not `Bet`-first
- support both `welcome` and `reload` offers
- standard step flow is:
  `qualifying bet` -> `qualifying lay` -> `bonus received` -> `bonus bet` -> `bonus lay` -> `settlement`
- first UI target is a web app
- database-backed system is required
- a VPS agent / worker will be used for background sync
- scraping matters enough that Python should stay in the architecture
- ingestion should support both:
  - fixed bookmaker scrapers for the user's main sites
  - generic input via pasted promo URL or raw terms text

## Approved Architecture

Use:

- `Next.js` for the web app
- `PostgreSQL` for persistence
- `Python worker` for scraping, parsing, and lay matching

This is the chosen boundary:

### Web app

- dashboard
- offer CRUD
- offer step tracking
- bet recording
- matcher input form
- job creation and result display

### Python worker

- scrape bookmaker offers
- parse promo URL / terms text
- normalize offer terms
- run Betfair matching
- calculate lay stake and liability

## Existing Design Docs

Read these first:

- [2026-05-07-matched-betting-app-design.md](C:/Coding/NextJs/matchedBetting/matchBeter/docs/plans/2026-05-07-matched-betting-app-design.md)
- [2026-05-07-matched-betting-app-implementation-plan.md](C:/Coding/NextJs/matchedBetting/matchBeter/docs/plans/2026-05-07-matched-betting-app-implementation-plan.md)

The design doc captures product scope and boundaries.
The implementation plan captures repo shape, phases, and first build order.

## Current Repo State

Current repo still contains mainly:
- Python package skeleton in [`src/matchbeter`](C:/Coding/NextJs/matchedBetting/matchBeter/src/matchbeter)
- matcher placeholder in [`matcher.py`](C:/Coding/NextJs/matchedBetting/matchBeter/src/matchbeter/matcher.py)
- example inputs in [`examples`](C:/Coding/NextJs/matchedBetting/matchBeter/examples)

Important note:
[`matcher.py`](C:/Coding/NextJs/matchedBetting/matchBeter/src/matchbeter/matcher.py) is only a placeholder interface right now. It does not perform real matching.

## Recommended Next Step

Start Phase 1 of the implementation plan.

Specifically:

1. scaffold `apps/web` with `Next.js` App Router + TypeScript
2. add Prisma
3. define the first `schema.prisma`
4. create the initial routes:
   - `/offers`
   - `/offers/new`
   - `/offers/[offerId]`

Do not start with scraping.
Do not start with Betfair integration.
Get the workflow visible first.

## Minimum First Sprint

The next agent should aim to finish:

- web scaffold
- DB wiring
- core Prisma entities
- template-based offer creation
- automatic standard step generation
- basic dashboard and offer detail

That is the first useful slice.

## Proposed Core Prisma Models

The approved V1 entities are:

- `Bookmaker`
- `Offer`
- `OfferStep`
- `Bet`
- `LayMatch`
- `SyncJob`

Use the design doc for field guidance.

## Non-Goals For The Next Agent

Do not expand scope into:

- auto-betting
- full bookmaker account sync
- mobile app work
- broad scraping abstraction
- advanced offer types
- premature multi-service deployment complexity

## Open Decisions Still Not Locked

The user has not yet explicitly locked these:

1. package manager
2. web hosting target
3. PostgreSQL provider
4. whether V1 needs any auth gate
5. first 2-3 bookmaker templates to seed

If needed, ask these only when they block actual implementation.

## Git / Workspace Notes

At handoff time:
- design and planning docs exist under `docs/plans/`
- those docs are uncommitted
- no app scaffold has been created yet

## Execution Advice

Bias toward a clean monorepo-ish structure without overengineering:

```text
apps/web
workers/automation
packages/shared
```

Keep the Python code usable as a sandbox until the worker takes over.

The main trap here is trying to solve scraping and matching before the product workflow exists.
Do not do that.
