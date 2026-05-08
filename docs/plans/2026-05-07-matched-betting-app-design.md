# Matched Betting App V1 Design

## Summary

Build a self-serve web app for managing matched betting offers from start to settlement.

The app should do three things well:
- track `welcome` and `reload` offers as workflows
- record the bets executed for each offer step
- take a manual back bet input and return a safe matched lay result

This is a personal-use product, not a multi-user SaaS.

## Product Goal

The user needs one system that combines:
- offer tracking
- execution tracking
- lay matching
- scraping-assisted offer ingestion

The core unit is an `Offer`, not a standalone bet.

Each offer should move through a standard lifecycle:
`qualifying bet` -> `qualifying lay` -> `bonus received` -> `bonus bet` -> `bonus lay` -> `settlement`

## Why This Shape

Matched betting is not just odds calculation.

The real day-to-day problem is knowing:
- which offers are still active
- which step is blocked
- which back bet belongs to which offer
- whether the lay match is safe enough to use
- what the final profit looks like across the full offer

That means the product should be workflow-first, with matching as a tool inside the workflow.

## V1 Scope

### In scope

- web app for offer and bet management
- PostgreSQL-backed persistent state
- manual creation of offers from templates
- offer creation from pasted promo URL
- offer creation from pasted raw terms text
- background parsing of raw terms into structured offer fields
- standard offer steps generated automatically
- manual back bet entry
- matched lay lookup from a back bet input
- lay stake and liability calculation
- warnings for ambiguous or unsafe matches
- background job execution on a VPS worker

### Out of scope

- auto-bet placement
- support for every bookmaker
- fully automatic sync of all bookmaker account history
- team collaboration or multiple users
- native mobile apps
- high-frequency quote refresh
- advanced offer types such as bet builders, each-way, accas, cashback trees
- zero-review terms parsing with no human confirmation

## Architecture

### Recommended stack

- `Next.js` for the web application
- `PostgreSQL` as the system of record
- `Python worker` for scraping, parsing, and matching jobs

### Boundary

#### Next.js app responsibilities

- render dashboard and detail pages
- manage CRUD for offers, offer steps, bets, and match results
- accept user input for templates, URLs, terms text, and back bets
- create background jobs
- display job status, warnings, and ambiguous-match states

#### Python worker responsibilities

- scrape bookmaker promo pages
- parse raw terms text into structured fields
- normalize bookmaker offer data
- run Betfair market matching
- fetch lay quotes
- calculate lay stake and liability
- retry failed or delayed background jobs

#### PostgreSQL responsibilities

- store canonical offer state
- store raw and parsed scraping inputs
- store bets and lay-match outputs
- store job queue state and execution logs

## Data Model

### `Bookmaker`

Represents a bookmaker source.

Suggested fields:
- `id`
- `name`
- `region`
- `supportsDirectScrape`
- `scrapeConfigJson`
- `createdAt`
- `updatedAt`

### `Offer`

The main business object.

Suggested fields:
- `id`
- `bookmakerId`
- `title`
- `offerType` (`welcome`, `reload`)
- `sourceType` (`template`, `url`, `text`)
- `sourceUrl`
- `rawTerms`
- `summary`
- `status` (`draft`, `active`, `completed`, `expired`, `cancelled`)
- `expiresAt`
- `qualifyingRulesJson`
- `bonusRulesJson`
- `extractedTermsJson`
- `createdAt`
- `updatedAt`

### `OfferStep`

Tracks the lifecycle of an offer.

Suggested fields:
- `id`
- `offerId`
- `stepType` (`qualifying_bet`, `qualifying_lay`, `bonus_received`, `bonus_bet`, `bonus_lay`, `settlement`)
- `status` (`pending`, `in_progress`, `completed`, `skipped`)
- `sortOrder`
- `notes`
- `dueAt`
- `completedAt`
- `createdAt`
- `updatedAt`

### `Bet`

Stores an executed back or lay bet linked to an offer step.

Suggested fields:
- `id`
- `offerId`
- `offerStepId`
- `betType` (`back`, `lay`)
- `sport`
- `eventName`
- `marketName`
- `selectionName`
- `odds`
- `stake`
- `exchangeCommission`
- `result` (`won`, `lost`, `void`, `pending`)
- `placedAt`
- `externalRef`
- `notes`
- `createdAt`
- `updatedAt`

### `LayMatch`

Stores the result returned by the matcher for a back bet.

Suggested fields:
- `id`
- `backBetId`
- `matchQuality` (`exact`, `strong`, `ambiguous`, `no_match`)
- `matchedEventName`
- `matchedMarketName`
- `matchedSelectionName`
- `bestLayPrice`
- `bestLaySize`
- `layStake`
- `liability`
- `delayedData`
- `warningsJson`
- `rawResponseJson`
- `createdAt`
- `updatedAt`

### `SyncJob`

Tracks background work executed by the worker.

Suggested fields:
- `id`
- `jobType` (`scrape_offer`, `parse_terms`, `match_lay`, `refresh_quote`)
- `status` (`queued`, `running`, `completed`, `failed`)
- `payloadJson`
- `resultJson`
- `errorMessage`
- `runAt`
- `finishedAt`
- `createdAt`
- `updatedAt`

## Main Screens

### 1. Offers Dashboard

Purpose:
- show active offers
- highlight offers close to expiry
- surface the current blocking step

Key columns:
- bookmaker
- offer title
- offer type
- status
- expiry
- current step
- expected profit
- actual profit

### 2. Create Offer

Creation modes:
- bookmaker template
- paste promo URL
- paste raw terms text

Template mode should create a draft offer with default steps immediately.

URL and text modes should store raw input first, then queue a parsing job, then let the user review the extracted fields.

### 3. Offer Detail

This is the main working screen.

It should show:
- offer summary
- bookmaker
- expiry and important restrictions
- step timeline
- all recorded bets
- latest lay-match output
- warnings and unresolved ambiguity

Most daily user actions should happen here.

### 4. Back Bet Matcher

This can be a dedicated page or a panel inside `Offer Detail`.

User inputs:
- sport
- event name
- market name
- selection name
- back odds
- stake
- event time if known

Matcher output:
- matched event
- matched market
- matched selection
- best lay price
- best lay size
- lay stake
- liability
- warnings
- match quality

The result should be attachable to a specific offer step.

## User Workflow

### Offer creation flow

1. User creates an offer from template, URL, or pasted terms.
2. The app stores the offer in `draft` or `active`.
3. If the source is URL or text, a worker job parses the terms.
4. The user reviews and confirms the extracted fields.
5. The app generates standard steps for the offer.

### Execution flow

1. User opens an offer detail page.
2. User moves to the current step.
3. User enters a back bet.
4. The app queues a lay matching job.
5. The worker returns a lay match result.
6. The user reviews the result and records the executed lay if appropriate.
7. The step is marked complete and the workflow advances.

## Matching Requirements

The matcher should:
- accept manual bookmaker back bet input
- normalize event, market, and selection labels
- find the best corresponding Betfair lay market
- calculate lay stake and liability
- return explicit warnings when the match is uncertain

The matcher must not pretend certainty where none exists.

Unsafe or mismatched cases should return warning or ambiguity states, especially for:
- match odds vs draw no bet
- match odds vs to qualify
- full-time vs half-time markets
- tennis match vs set or game markets
- markets with vague selection semantics

## Scraping Requirements

Because offer ingestion matters a lot for this product, the scraping system should support two paths.

### Path 1: fixed bookmaker scrapers

For the 2-3 bookmakers the user relies on most, provide direct scraping support.

This should prioritize reliability over breadth.

### Path 2: generic ingestion

For unsupported bookmakers or one-off offers, allow:
- pasted promo URL
- pasted terms text

The worker should parse these inputs into:
- bookmaker
- offer type
- qualifying rules
- bonus rules
- expiry
- notable restrictions

The parsed result should always be user-reviewable before the offer becomes trusted operational data.

## Operational Model

The system is designed for personal use with a VPS-based worker.

That means:
- auth can stay simple
- there is no need for per-user tenancy
- job visibility matters more than enterprise controls
- retryability matters because scraping and matching are failure-prone

The app should preserve all raw source material and match outputs for later inspection.

## Risks

### 1. Scraping fragility

Bookmaker sites change often. Fixed-source support should start narrow.

### 2. False confidence in lay matching

A wrong market match is worse than no match. Ambiguity handling is part of the product, not an edge case.

### 3. Overbuilding v1

If v1 tries to automate every bookmaker and every bet type, it will stall. Start with the workflow and the highest-value sources.

## Recommended V1 Delivery Order

1. build the data model and CRUD screens
2. build template-based offer creation
3. build offer detail and step progression
4. build manual back bet entry
5. build Python worker job model
6. implement lay matching against the existing matcher spec
7. implement URL/text parsing flow
8. add direct scraping for the most-used bookmakers

## Decision

Proceed with a workflow-first matched betting app built as:

`Next.js app + PostgreSQL + Python worker`

This keeps the user-facing product fast to build in a familiar stack while preserving Python where scraping and matching carry the most weight.
