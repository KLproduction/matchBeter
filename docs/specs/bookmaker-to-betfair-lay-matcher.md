# Bookmaker Back Bet -> Betfair Lay Matcher Spec

## Goal

Build a tool that takes a bookmaker back bet as input and returns the best matching Betfair exchange lay quote, plus matched-betting calculation fields.

This first version is designed around Betfair delayed-key mode.

## Primary user story

As a matched bettor,
when I already have a bookmaker back bet,
I want the system to find the equivalent Betfair exchange market and runner,
so I can quickly inspect the lay price and calculate the lay side safely.

## Non-goals for v1

Do not include in v1:
- auto-bet placement
- live-key execution workflows
- stream API integration
- each-way matching
- bet builder matching
- racing place-term interpretation
- arbitrarily fuzzy market matching without explicit warnings

## V1 supported markets

Priority order:
1. Football Match Odds
2. Football Over/Under goals
3. Football Both Teams To Score
4. Tennis Match Odds

## Input schema

```json
{
  "bookmaker": "Coral",
  "sport": "football",
  "event_name": "Arsenal v Chelsea",
  "market_name": "Match Odds",
  "selection_name": "Arsenal",
  "back_odds": 2.3,
  "back_stake": 10.0,
  "event_start_iso": "2026-05-07T19:45:00Z"
}
```

## Output schema

```json
{
  "input": {
    "bookmaker": "Coral",
    "sport": "football",
    "event_name": "Arsenal v Chelsea",
    "market_name": "Match Odds",
    "selection_name": "Arsenal",
    "back_odds": 2.3,
    "back_stake": 10.0,
    "event_start_iso": "2026-05-07T19:45:00Z"
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
  "calculation": {
    "lay_stake": 9.83,
    "liability": 13.11,
    "exchange_commission": 0.0
  },
  "match_quality": "exact",
  "warnings": [
    "Delayed Betfair data: not suitable for time-sensitive execution"
  ]
}
```

## Functional pipeline

### Step 1: normalize bookmaker input

Normalize:
- team separators: `v`, `vs`, `-`
- whitespace
- case
- market aliases
- selection aliases

Examples:
- `Arsenal vs Chelsea` -> `Arsenal v Chelsea`
- `Match Result` -> `Match Odds` if bookmaker meaning matches exchange semantics
- `Home` -> actual home team name if available from parsed event

### Step 2: map sport and market type

The matcher should maintain a mapping table from bookmaker market labels to expected Betfair market types.

Examples:
- `Match Odds` -> Betfair Match Odds
- `Over/Under 2.5 Goals` -> Betfair Over/Under 2.5 Goals
- `BTTS` / `Both Teams To Score` -> Betfair Both Teams To Score

If no trusted mapping exists:
- return `match_quality = ambiguous`
- do not fabricate a match

### Step 3: query Betfair market catalogue

Use `listMarketCatalogue` to narrow candidates.

Recommended first-pass filter fields:
- text query from event name
- event start time window around known kickoff
- optional event type if the sport is known

Recommended first-pass projections:
- `EVENT`
- `MARKET_START_TIME`
- `RUNNER_DESCRIPTION`
- optionally `MARKET_DESCRIPTION`

Objective:
- produce a shortlist of candidate Betfair markets

### Step 4: score candidate markets

Each candidate market should be scored on:
- event name similarity
- start time closeness
- market type similarity
- runner/selection name availability

Suggested quality buckets:
- `exact`
- `strong`
- `ambiguous`
- `no_match`

Only `exact` and possibly `strong` should flow into quote retrieval by default.

### Step 5: identify target runner

Within the selected market, map bookmaker selection to Betfair runner.

Examples:
- home team -> home team runner
- away team -> away team runner
- draw -> `Draw`
- over 2.5 -> `Over 2.5 Goals`

If multiple runners could match:
- mark as ambiguous
- return warning

### Step 6: fetch lay quote

Use `listMarketBook` with a light price projection.

Recommended first projection:
- `EX_BEST_OFFERS`

Extract:
- best available lay price
- best available lay size

V1 should avoid heavy projections unless debugging.

### Step 7: calculate matched-betting numbers

Given:
- back odds
- back stake
- best lay price
- exchange commission

Return at least:
- lay stake
- liability

Support 0% commission because the user currently has a promotional 0% Smarkets period and may compare exchange economics.

## Matching safety rules

The matcher must reject or warn when these mismatches appear likely:
- Match Odds vs Draw No Bet
- Match Odds vs To Qualify
- Team to Win vs To Lift Trophy
- full match market vs half-time market
- game/set tennis market vs match market
- win-only market vs each-way / place market

## Error handling requirements

Return explicit states for:
- login/session failure
- no matching market found
- multiple candidate markets found
- no runner match found
- market found but no meaningful lay quote available
- request too heavy / `TOO_MUCH_DATA`
- delayed data warning

## Betfair delayed-key caveats

V1 runs in delayed-key mode, so the system must always remember:
- price data is delayed
- `listMarketBook` does not provide `totalMatched`
- delayed mode is for development and logic validation, not real-time execution

Every returned quote in delayed mode should carry a warning.

## Suggested module split

- `src/matchbeter/models.py`
  - typed input/output models
- `src/matchbeter/normalizers.py`
  - event/market/selection normalization
- `src/matchbeter/betfair_auth.py`
  - login / keepAlive / logout / session reuse
- `src/matchbeter/betfair_catalogue.py`
  - catalogue lookups
- `src/matchbeter/betfair_prices.py`
  - market book / lay extraction
- `src/matchbeter/matcher.py`
  - candidate scoring and exact-match logic
- `src/matchbeter/calculator.py`
  - lay stake / liability calculations

## First implementation milestone

A successful milestone-1 CLI should:
1. accept a JSON input back bet
2. authenticate to Betfair
3. search candidate markets
4. return the best matching runner
5. return the best delayed lay quote
6. compute lay stake and liability
7. print a structured JSON result with warnings

## Example success criteria

For a clearly mappable football Match Odds back bet:
- the tool returns one exact market
- runner identification is correct
- lay quote fields are populated
- calculation fields are populated
- delayed warning is included

## Example ambiguity criteria

For a vague market such as `Team to Win` without more context:
- the tool should not pretend certainty
- it should return `ambiguous`
- it should list why the match is unsafe
