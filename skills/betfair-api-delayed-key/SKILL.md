---
name: betfair-api-delayed-key
description: Use Betfair Exchange API with a delayed application key — authentication, session handling, request limits, read-only market discovery, delayed price retrieval, and safe Hermes workflows.
version: 1.0.0
author: Hermes Agent
license: CC-BY-4.0
metadata:
  hermes:
    tags:
      - finance
      - betfair
      - exchange
      - api
      - delayed-key
      - market-data
      - trading
    homepage: https://betfair-developer-docs.atlassian.net/wiki/spaces/1smk3cen4v3lu3yomq5qye0ni/overview
prerequisites:
  - A Betfair account with an assigned delayed application key
  - Betfair username and password
  - Comfort sending HTTPS POST requests and storing session tokens securely
---

# Betfair API Delayed Key

## Purpose

Use this skill when working with the Betfair Exchange API using a delayed application key.

This skill is optimized for:
- initial development
- functional testing
- market discovery
- delayed price inspection
- simulation / dry-run workflows
- safe Hermes integrations before live trading access exists

It is not a substitute for full live-key trading documentation. Treat delayed-key mode as a development and validation environment running against the live exchange with delayed data.

## What a delayed key is

Betfair assigns two application keys to one account:
- one live app key
- one delayed app key

Key facts from the docs:
- the delayed key runs against the live production exchange, not a separate sandbox
- the delayed key is intended for development and functional testing
- delayed price data is variable and can be 1–180 seconds behind
- with delayed key usage, `listMarketBook` does not return:
  - `totalMatched`
  - `EX_ALL_OFFERS`
- the delayed key should also be used in simulation/practice applications where betting into live markets is not available

## Core operating rule

Design Hermes integrations in two modes:

### Mode A: delayed-key mode
Use for:
- login and session handling
- market search
- market catalogue retrieval
- delayed price retrieval
- account and app-key checks
- dry-run / simulation workflows
- request shaping and rate-limit testing

### Mode B: live-key mode
Use later for:
- actual trading execution workflows
- production order placement / replacement / cancellation
- lower-latency price consumption
- operational automation beyond testing scope

Do not assume delayed-key mode is equivalent to live execution capability.

## Most important headers

Every Betfair API request should normally include:
- `X-Application: <APP_KEY>`
- `X-Authentication: <SESSION_TOKEN>` after login
- `Accept: application/json`

Interactive login also requires:
- `Content-Type: application/x-www-form-urlencoded`

## Authentication strategy

## Preferred first implementation: Interactive Login API endpoint

Use this first if you want the simplest Hermes integration.

Global login endpoint:
- `https://identitysso.betfair.com/api/login`

Other jurisdictions have different SSO domains.

### Request
Method:
- POST

Headers:
- `Accept: application/json`
- `X-Application: <APP_KEY>`
- `Content-Type: application/x-www-form-urlencoded`

Body:
- `username=<username>&password=<password>`

If the account uses strong authentication, Betfair docs say the 2FA code should be appended to the password string.

### Expected response
Typical response shape:
```json
{
  "token": "SESSION_TOKEN",
  "product": "APP_KEY",
  "status": "SUCCESS",
  "error": ""
}
```

Possible status values include:
- `SUCCESS`
- `LIMITED_ACCESS`
- `LOGIN_RESTRICTED`
- `FAIL`

### Login request limits
Successful login requests are limited to:
- 100 per minute

If breached:
- new login sessions are blocked for 20 minutes
- existing sessions remain valid
- documented error: `TEMPORARY_BAN_TOO_MANY_REQUESTS`

### Hermes rule
Never log in on every request.
Reuse a session token until invalid or expired.

## Session handling

A single session can and should be reused across multiple API calls and threads.

### Keep Alive
Use:
- `https://identitysso.betfair.com/api/keepAlive`

Headers:
- `Accept: application/json`
- `X-Authentication: <SESSION_TOKEN>`
- optional `X-Application: <APP_KEY>`

Notes from the docs:
- UK & Ireland session expiry can be up to 24 hours
- session expiry is not extended automatically by normal API activity
- you must call Keep Alive before timeout if you want to preserve the session

### Logout
Use:
- `https://identitysso.betfair.com/api/logout`

Headers:
- `Accept: application/json`
- `X-Authentication: <SESSION_TOKEN>`
- optional `X-Application: <APP_KEY>`

### Mandatory error handling
Always handle:
- `INVALID_SESSION_TOKEN`
- `NO_SESSION`
- login ban / temporary restriction scenarios

## Recommended first-skill scope

For a delayed-key Hermes skill, prioritize these APIs first.

### Read first and support first
Betting API:
- `listEventTypes`
- `listEvents`
- `listMarketCatalogue`
- `listMarketBook`
- `listRunnerBook`
- `listCurrentOrders`
- `listClearedOrders`
- `listMarketProfitAndLoss`

Accounts API:
- `getDeveloperAppKeys`
- `getAccountFunds`
- `getAccountDetails`

These are enough to build:
- market scanners
- event/market lookup tools
- delayed odds snapshots
- account status checks
- dry-run trading helpers

### Defer to later phase
- `placeOrders`
- `replaceOrders`
- `cancelOrders`
- `updateOrders`
- full stream-driven execution logic
- non-interactive certificate login

## Request limit discipline

Betfair documents market-data request weighting limits.

For these endpoints:
- `listMarketBook`
- `listRunnerBook`
- `listMarketCatalogue`
- `listMarketProfitAndLoss`

The rule is:
- `sum(weight) * number_of_marketIds <= 200`

If you exceed that, Betfair may return:
- `TOO_MUCH_DATA`

## Important weights

### listMarketCatalogue
Selected `MarketProjection` weights include:
- `MARKET_DESCRIPTION` = 1
- `RUNNER_METADATA` = 1
- `RUNNER_DESCRIPTION` = 0
- `EVENT` = 0
- `EVENT_TYPE` = 0
- `COMPETITION` = 0
- `MARKET_START_TIME` = 0

### listMarketBook / listRunnerBook
Selected `PriceProjection` weights include:
- no `PriceProjection` = 2
- `SP_AVAILABLE` = 3
- `EX_BEST_OFFERS` = 5
- `SP_TRADED` = 7
- `EX_ALL_OFFERS` = 17
- `EX_TRADED` = 17

Special documented combinations:
- `EX_BEST_OFFERS + EX_TRADED` = 20
- `EX_ALL_OFFERS + EX_TRADED` = 32

If `exBestOffersOverrides` is used:
- weight becomes `weight * (requestedDepth / 3)`

## Hermes rule for request shaping

When building tools or scripts:
1. request the smallest projection that answers the question
2. batch marketIds conservatively
3. prefer catalogue first, then price call second
4. avoid pulling heavy price projections unnecessarily
5. expect delayed-key mode to be for testing logic, not depth-heavy production polling

## Best-practice rules for Hermes integrations

From Betfair best-practice docs, use these rules by default.

### Development and testing
- use delayed key for initial development and functional testing
- only apply for live-key access when ready for real exchange transacting

### Session reuse
- one session should be shared across requests/threads
- do not create a new login per API call

### Compression
Send:
- `Accept-Encoding: gzip, deflate`

Reason:
- lower bandwidth
- lower latency
- better throughput

### Persistent HTTP connections
Send:
- `Connection: keep-alive`

Notes:
- idle keep-alive connections may be closed after 3 minutes
- reconnection logic is still mandatory

### Polling vs streaming
- use polling for simpler delayed-key read-only tools
- use Stream API instead of polling wherever possible in high-frequency designs

### Transaction hygiene
Even in future live mode:
- minimize unnecessary transactions / changes
- prefer leaving orders in place rather than cancelling and re-placing without reason

### Logging
Log enough detail to debug:
- request type
- market ids
- projections used
- response status
- session-token lifecycle events
- stream connection id if later using stream API

### API health checks
Before blaming your code, check:
- `http://status.developer.betfair.com/`

## Safe first workflows

## Workflow 1: verify auth and app key
Goal:
- prove your credentials, delayed key, and session lifecycle all work

Steps:
1. perform interactive login
2. store returned session token securely
3. call keepAlive
4. call `getDeveloperAppKeys`
5. verify the delayed key appears as delayed-version key in account data
6. optionally call logout at end of test

## Workflow 2: discover sports and events
Goal:
- find event types and candidate events without heavy price payloads

Steps:
1. call `listEventTypes`
2. choose desired sport
3. call `listEvents` with a tight filter
4. record event ids for later market queries

## Workflow 3: discover markets cheaply
Goal:
- find relevant markets while staying under weighting limits

Steps:
1. call `listMarketCatalogue`
2. request only the minimum useful projections
3. capture:
- market id
- market name
- start time
- event info
- runner names
4. avoid unnecessary metadata in first pass

## Workflow 4: retrieve delayed prices
Goal:
- fetch delayed best-offer snapshots for validation or simulation

Steps:
1. call `listMarketBook`
2. start with a light `PriceProjection`, usually `EX_BEST_OFFERS`
3. confirm response structure and delay behavior
4. remember delayed-key limitations:
- no `totalMatched`
- no `EX_ALL_OFFERS`
5. do not interpret delayed snapshots as tradable real-time execution signals

## Workflow 5: dry-run trade preparation
Goal:
- prepare order logic without sending real orders

Steps:
1. discover candidate market
2. pull delayed best offers
3. compute hypothetical stake/price logic outside Betfair
4. store simulated intended order
5. compare future snapshots to validate logic
6. keep all execution paths disabled until live-key workflow exists

## Common pitfalls

### Pitfall 1: treating delayed key as sandbox
It is not a sandbox.
It uses the live exchange, but with delayed data and documented restrictions.

### Pitfall 2: over-logging in
If you log in repeatedly instead of reusing sessions, you can hit the login ban.

### Pitfall 3: oversized requests
If you ask for too many marketIds with heavy projections, you can trigger `TOO_MUCH_DATA`.

### Pitfall 4: assuming session extends itself
Normal API activity does not extend session life.
Use keepAlive intentionally.

### Pitfall 5: designing around unavailable delayed data
Do not assume delayed-key `listMarketBook` gives you:
- `totalMatched`
- `EX_ALL_OFFERS`

### Pitfall 6: building high-frequency polling first
For first versions, keep things simple and low-frequency.
Move to streaming later only if truly needed.

## Non-interactive bot login
This is valuable later, but not required for first delayed-key skill use.

The docs state non-interactive login requires:
- a self-signed certificate
- certificate upload/linking to your Betfair account
- 2048-bit RSA certificate

Use this when you are moving from interactive personal tooling to autonomous bot workflows.

## Stream API
The Exchange Stream API is documented separately and is high value for later work.
It is most relevant when you need:
- lower latency market updates
- order stream updates
- efficient subscriptions instead of polling
- reconnection / heartbeat / conflation logic

For a first delayed-key Hermes skill, treat Stream API as a second-phase extension.

## Bookmaker back-bet to Betfair lay-bet workflow

This is the main matched-betting use case for a delayed-key Betfair integration:
- you already found a bookmaker back bet elsewhere
- you want Betfair API to help locate the matching exchange lay bet

### Inputs you usually already have
- event or match name
- market type
- selection / runner name
- back odds
- back stake
- bookmaker name
- event start time if available

### Goal
Use Betfair to find the exact corresponding market and runner, then retrieve the best delayed lay prices for the same selection.

### Recommended lookup sequence
1. Use `listEventTypes` only if the sport is unknown.
2. Use `listEvents` or directly `listMarketCatalogue` with a tight filter.
3. In `listMarketCatalogue`, match on:
- event name
- market type
- start time
- runner names
4. Confirm the Betfair market is exactly the same market as the bookmaker market.
5. Use `listMarketBook` with a light `PriceProjection`, usually `EX_BEST_OFFERS`.
6. Extract the best available lay price and size for the target runner.
7. Only after exact market confirmation, calculate lay stake and liability outside the API.

### Exact-match checks
For matched betting, Hermes should explicitly verify:
- same sport
- same event
- same scheduled start time
- same market type
- same runner / selection
- no hidden mismatch such as:
  - Draw No Bet vs Match Odds
  - Team to Win vs To Lift Trophy
  - Win market vs Set market
  - each-way bookmaker market vs win-only exchange market

### Important delayed-key caveat
With a delayed Betfair key, this workflow is still useful for:
- building the matcher
- validating market identification logic
- testing parser and calculator logic
- dry-run matched-betting automation

But it is not reliable for real-time execution because price data is delayed and some market-depth fields are unavailable.

### What Hermes should return in this workflow
When asked to find a lay bet matching a bookmaker back bet, return:
- matched event name
- matched market id
- matched market name
- runner / selection id and name
- best delayed lay price
- best delayed lay available size
- warning that prices are delayed if using delayed key
- whether the market match looks exact or ambiguous

### Concrete API shape for this workflow

#### Step 1: find candidate markets with `listMarketCatalogue`
Typical filters to build from bookmaker input:
- event / text query
- event type id if known
- market type code if known
- time window around the scheduled start

Useful projections for first pass:
- `EVENT`
- `MARKET_START_TIME`
- `RUNNER_DESCRIPTION`
- optionally `MARKET_DESCRIPTION`

Typical first-pass objective:
- reduce many Betfair markets down to one exact candidate market

#### Step 2: fetch lay prices with `listMarketBook`
Once the market id is known, request a light price view.

Recommended first `PriceProjection`:
- `EX_BEST_OFFERS`

Reason:
- enough to read best lay price and available size
- lighter than deeper projections
- more suitable for delayed-key development work

#### Step 3: compute lay stake outside Betfair
After retrieving the best delayed lay quote:
- calculate lay stake
- calculate liability
- calculate qualifying loss or free-bet conversion outcome

Do not rely on Betfair to calculate matched-betting outputs for you.

### Minimal payload examples

#### `listMarketCatalogue` example shape
```json
{
  "filter": {
    "textQuery": "Arsenal v Chelsea",
    "marketStartTime": {
      "from": "2026-05-07T18:00:00Z",
      "to": "2026-05-07T22:00:00Z"
    }
  },
  "marketProjection": [
    "EVENT",
    "MARKET_START_TIME",
    "RUNNER_DESCRIPTION"
  ],
  "maxResults": "20"
}
```

#### `listMarketBook` example shape
```json
{
  "marketIds": ["1.234567890"],
  "priceProjection": {
    "priceData": ["EX_BEST_OFFERS"]
  }
}
```

### Matching logic Hermes should apply

#### Event-level matching
Compare bookmaker input against Betfair on:
- normalized home/away names
- scheduled start time within a small tolerance
- sport and competition if known

#### Market-level matching
Map bookmaker market naming to exchange market naming, for example:
- bookmaker "Match Odds" -> Betfair Match Odds market
- bookmaker "Over/Under 2.5 Goals" -> Betfair goals total line market
- bookmaker "Both Teams To Score" -> Betfair BTTS market

#### Selection-level matching
Examples:
- home team -> runner named home team
- away team -> runner named away team
- draw -> runner named Draw
- over 2.5 -> runner named Over 2.5 Goals

### Output schema suggestion
For a reusable matcher tool, structure output roughly as:
```json
{
  "input": {
    "event": "Arsenal v Chelsea",
    "market": "Match Odds",
    "selection": "Arsenal",
    "back_odds": 2.3,
    "back_stake": 10.0
  },
  "betfair_match": {
    "event_name": "Arsenal v Chelsea",
    "market_id": "1.234567890",
    "market_name": "Match Odds",
    "selection_id": 12345,
    "selection_name": "Arsenal"
  },
  "lay_quote": {
    "best_lay_price": 2.34,
    "best_lay_size": 57.12,
    "delayed_data": true
  },
  "match_quality": "exact"
}
```

### If the user wants production-grade matching
To use this workflow for actual time-sensitive lay matching, plan to upgrade later to:
- live app key
- stronger liquidity / price validation
- optional Stream API for faster updates

## Suggested Hermes outputs

When using this skill, prefer these answer patterns:

### For setup questions
Return:
- required headers
- endpoint URL
- request method
- minimal curl example
- session-token handling note

### For market-data questions
Return:
- which endpoint to use
- smallest safe projection
- weighting considerations
- delayed-key caveat if price data is involved

### For architecture questions
Return:
- delayed-key mode recommendation
- live-key mode recommendation
- whether polling or stream is more appropriate

## Minimal curl templates

### Interactive login
```bash
curl -sS -k \
  -H 'Accept: application/json' \
  -H 'X-Application: YOUR_APP_KEY' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -X POST \
  -d 'username=YOUR_USERNAME&password=YOUR_PASSWORD' \
  https://identitysso.betfair.com/api/login
```

### Keep alive
```bash
curl -sS -k \
  -H 'Accept: application/json' \
  -H 'X-Application: YOUR_APP_KEY' \
  -H 'X-Authentication: YOUR_SESSION_TOKEN' \
  https://identitysso.betfair.com/api/keepAlive
```

### Logout
```bash
curl -sS -k \
  -H 'Accept: application/json' \
  -H 'X-Application: YOUR_APP_KEY' \
  -H 'X-Authentication: YOUR_SESSION_TOKEN' \
  https://identitysso.betfair.com/api/logout
```

## What to read next

Read in this order if you are extending the skill:
1. Application Keys
2. Login & Session Management
3. Interactive Login - API Endpoint
4. Reference Guide
5. Market Data Request Limits
6. Best Practice
7. Sample Code, Client Libraries & Tutorials
8. Non-Interactive (bot) login
9. Exchange Stream API
10. Interface Definition Documents

## Source pages used for this skill
- Betfair API Docs overview
- Application Keys
- Login & Session Management
- Interactive Login - API Endpoint
- Non-Interactive (bot) login
- Best Practice
- Market Data Request Limits
- Reference Guide
- Sample Code, Client Libraries & Tutorials
- Interface Definition Documents

## Scope note

This skill is intentionally biased toward safe delayed-key development. It helps Hermes explain the API, authenticate cleanly, respect request limits, and build read-first workflows before any live-key trading automation is attempted.
