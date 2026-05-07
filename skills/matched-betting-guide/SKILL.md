---
name: matched-betting-guide
description: Operational matched betting playbook based on the Matched Betting Blog guide hub, covering offer triage, execution SOPs, calculators, bankroll control, and advanced exchange workflows.
version: 1.1.0
author: Hermes Agent
license: CC-BY-4.0
metadata:
  hermes:
    tags:
      - finance
      - betting
      - arbitrage
      - matched-betting
      - bankroll
      - horse-racing
      - operations
    homepage: https://matchedbettingblog.com/guides/
prerequisites:
  - Basic understanding of decimal odds
  - Access to at least one sportsbook and one betting exchange
  - Ability to track stakes, returns, liabilities, and notes in a spreadsheet
---

# Matched Betting Guide

## Purpose

Use this skill as an operational manual for matched betting based on the structure of the Matched Betting Blog guide hub.

This skill is intentionally practical:
- how to classify an offer
- what calculator to use
- what order to place bets in
- what to record
- when to avoid an offer

It is a concise synthesis, not a copy of every source guide. Always verify live terms, exchange commission, market liquidity, and settlement rules before placing bets.

## Responsible gambling warning

Matched betting uses gambling products and still carries real risk:
- offers can change or disappear
- mistakes can create real losses
- balances can be tied up for days
- some users may find the activity triggering or compulsive

Do not use money you cannot afford to lose through operational error. Stop if the process becomes emotional, rushed, or compulsive. If gambling is causing harm, do not continue.

## Fast orientation

Matched betting is not prediction. It is process.

You normally:
1. identify the bookmaker promotion
2. classify the promotion type
3. choose a market with good liquidity
4. calculate the hedge
5. place the bookmaker back bet
6. place the exchange lay bet
7. record everything
8. settle and extract the promo value

Main concepts:
- Back bet = bookmaker bet on an outcome to happen
- Lay bet = exchange bet against that outcome happening
- Liability = amount at risk on the exchange if the lay loses
- Qualifying loss = small planned loss used to unlock an offer
- Free-bet conversion = percentage of bonus value turned into cash
- Commission = exchange fee that must be included in all calculations

Formula reminder:
- Liability = lay stake × (lay odds - 1)

## Recommended learning order

### Stage 1: Basics only
Learn first:
- decimal odds
- back vs lay
- exchange commission
- liability
- qualifying loss
- SNR vs SR free bets

Only move on when you can explain exactly what happens if the selection wins and if it loses.

### Stage 2: Simple beginner offers
Start with:
- bet X get Y offers
- one qualifying bet
- one free-bet conversion
- major football / major tennis / liquid horse-racing markets

Avoid at first:
- accumulators
- in-play betting
- each-way offers
- extra-place offers
- boosts with awkward caps
- promotions with vague refund wording

### Stage 3: Conditional refund offers
Then learn:
- money-back-if-loses
- refund-as-free-bet
- risk-free style offers
- simple dutching

### Stage 4: Racing and exchange depth
Only after clean execution on simpler offers:
- extra-place offers
- each-way matched betting
- each-way arbing
- sequential laying
- dutching in multi-runner fields

### Stage 5: Optimization
Last stage:
- stake scaling
- bankroll allocation across multiple unsettled offers
- account longevity
- advanced workflow efficiency

## Offer classification SOP

Before calculating anything, classify the offer.

### Type A: Qualifying-bet-led offers
Examples:
- Bet £10, get £5 free bet
- Bet X, get Y on settlement

Primary goal:
- minimize qualifying loss while meeting the terms

Calculator:
- qualifying bet calculator

### Type B: Free bet conversion
Examples:
- free bet credited after qualifying
- goodwill / retention free bet

Primary goal:
- maximize conversion without taking on execution risk you do not understand

Calculator:
- SNR free-bet calculator if stake not returned
- SR free-bet calculator if stake returned

### Type C: Conditional refund / risk-free / money-back
Examples:
- money back if your first bet loses
- refund as free bet if second place
- risk-free first bet

Primary goal:
- evaluate the full outcome tree, not just the initial qualifying loss

Calculator:
- refund / risk-free workflow sheet or calculator

### Type D: Racing structure offers
Examples:
- extra place
- each-way arb
- enhanced place terms

Primary goal:
- exploit differences between bookmaker place terms and exchange place markets

Calculator:
- each-way calculator
- extra-place calculator
- dutching / racing worksheet

### Type E: Multi-leg / liquidity-constrained execution
Examples:
- sequential lays
- multi-runner dutching
- partial hedges due to thin markets

Primary goal:
- complete the hedge accurately despite imperfect market conditions

Calculator:
- sequential lay worksheet
- dutching calculator

## Universal pre-bet checklist

Do not place anything until all boxes are clear.

1. Terms checked
- minimum odds
- minimum stake
- qualifying market restrictions
- settlement deadline
- sport exclusions
- cash-out restrictions
- whether voids count

2. Market checked
- bookmaker market and exchange market are exactly the same
- event start time is correct
- enough exchange liquidity exists
- the market is not about to suspend unexpectedly

3. Calculator checked
- correct calculator type selected
- exchange commission entered correctly
- back stake and lay stake copied exactly
- liability affordable from current balance

4. Recordkeeping ready
- spreadsheet row created before or immediately after bet placement
- promo expiry captured
- notes field ready for quirks and restrictions

5. Mental check
- you can state the win outcome and lose outcome in plain language
- you are not rushing
- you are not guessing any number

## Standard operating procedure: qualifying bet

Use for standard bet-and-get offers.

1. Read all offer terms.
2. Find a high-liquidity event with close back and lay odds.
3. Enter:
- back odds
- lay odds
- stake
- commission
4. Calculate lay stake and expected qualifying loss.
5. Place bookmaker back bet.
6. Immediately place exchange lay bet.
7. Record:
- bookmaker
- exchange
- event
- market
- back stake and odds
- lay stake and odds
- liability
- expected qualifying loss
- offer unlocked

Execution rule:
- simplicity beats chasing a tiny extra edge

## Standard operating procedure: free bet

1. Confirm whether the free bet is:
- SNR = stake not returned
- SR = stake returned
2. Find a liquid market with good conversion.
3. Use the correct calculator.
4. Place the free bet at the bookmaker.
5. Place the lay immediately.
6. Record expected and actual profit.

Operational notes:
- most bookmaker free bets are SNR
- SNR free bets often convert better at moderately higher odds than qualifying bets
- never assume SR and SNR are interchangeable

## Standard operating procedure: risk-free / money-back / refund offers

1. Read the trigger carefully:
- does the back bet have to lose?
- is the refund cash or free bet?
- is there a cap?
- are partial outcomes excluded?
- do voids kill the offer?
2. Map both branches:
- branch 1 = original bet wins
- branch 2 = original bet loses and refund triggers
3. Estimate total expected value across both branches.
4. Choose the selection only after understanding the branch economics.
5. Place and record both the initial hedge and the refund handling plan.

Trap to avoid:
- treating refund-as-free-bet offers as if they were ordinary free bets

## Standard operating procedure: extra-place offers

1. Check bookmaker each-way place terms.
2. Check exchange win market and exchange place market terms.
3. Confirm the bookmaker is paying more places than the exchange structure implies.
4. Use an each-way / extra-place calculator.
5. Place the each-way bookmaker bet.
6. Place:
- win lay
- place lay
7. Check all finish buckets before confirming:
- wins
- standard places
- extra-place-only finish
- unplaced

Do not treat this as beginner workflow.

## Standard operating procedure: dutching

1. Define the exact outcomes to cover.
2. Input odds into a dutching calculator.
3. Set target equalized return if appropriate.
4. Check for uncovered outcomes.
5. Check stake limits and payout caps.
6. Place all legs promptly.
7. Record all legs as one grouped position.

Use cases:
- multi-runner fields
- smoothing payout across selected outcomes
- supporting racing and refund structures

## Standard operating procedure: sequential laying

Use only when a full lay is not available at one price.

1. Calculate the ideal total lay for a fully matched hedge.
2. Check exchange depth.
3. Match part of the lay.
4. Recalculate using the already matched portion.
5. Continue until hedge is complete or market conditions deteriorate.
6. Record weighted average lay odds and actual total liability.

Hard rule:
- never estimate the remainder by feel

## Standard operating procedure: each-way arbing

1. Confirm:
- number of places
- each-way fraction
- market type
- non-runner rules
- dead-heat rules
2. Compare bookmaker terms vs exchange place assumptions.
3. Use an each-way arb calculator.
4. Map returns across:
- win
- standard place
- extra-place-only outcome if relevant
- unplaced
5. Place the win and place lays exactly as calculated.
6. Record the expected profit band.

## Calculator selection guide

If the user asks “which calculator?”, use this table.

- standard bet-and-get offer -> qualifying bet calculator
- ordinary free bet -> SNR or SR free-bet calculator
- refund-if-loses / money-back offer -> refund workflow sheet / risk-free calculator
- each-way offer -> each-way calculator
- extra-place offer -> extra-place calculator
- multiple selections covered -> dutching calculator
- incomplete lay liquidity -> sequential lay worksheet

## Bankroll operations

Treat this like working capital management.

### Structure
Split bankroll into:
- bookmaker balances
- exchange balance
- liability reserve
- new-offer float
- safety buffer

### Rules
- start with low stakes until execution is clean
- do not commit all cash to unsettled positions
- keep spare exchange balance for re-lays and market movement
- avoid high-liability racing methods if bankroll is tight
- scale stakes only when process accuracy is consistent

### Minimum discipline
Before increasing stake size, confirm:
- no recent input mistakes
- you understand the settlement logic
- the market is liquid enough for your size
- account limitations are not forcing bad prices

## Account hygiene

### Do
- read every offer every time
- keep records of which offers were completed
- place normal-looking qualifying bets where possible
- diversify sports and timings naturally when appropriate
- keep notes on bookmaker quirks, restrictions, and promo patterns

### Avoid
- repeatedly taking only obvious boosts and nothing else
- ignoring minimum odds clauses
- forcing offers through poor-liquidity markets
- rushing just before kickoff / off-time
- using cash-out where forbidden or strategically counterproductive

### Operational watchlist
Always watch for:
- non-runners
- rule 4 deductions
- dead-heats
- palpable error clauses
- market mismatches
- delayed free-bet crediting
- offer settlement delays

## Spreadsheet fields

Minimum columns to track:
- date
- bookmaker
- exchange
- offer name
- offer type
- event
- market
- back stake
- back odds
- lay stake
- lay odds
- commission
- liability
- expected qualifying loss or expected profit
- actual profit
- settlement status
- notes

Recommended extra columns:
- promo expiry
- time placed
- account restriction notes
- link or screenshot reference

## Abort conditions

Tell the user to stop and reassess if:
- they cannot explain both outcome branches
- the exchange market does not clearly match the bookmaker market
- the lay side has poor liquidity and they do not know sequential laying
- the offer terms are ambiguous
- the liability is too large for available balance
- they are trying to combine multiple advanced methods at once

## Common mistakes

- wrong calculator type
- wrong commission setting
- wrong market matched on exchange
- forgetting minimum odds requirements
- assuming a free bet is SR when it is SNR
- ignoring liquidity and then guessing a lay stake
- misunderstanding each-way place terms
- failing to recalculate after partial fills
- overextending bankroll across too many open bets

## How Hermes should use this skill

When helping a user, default to this sequence:
1. classify the offer
2. identify the calculator needed
3. state the operational steps in order
4. state the main risk checks
5. remind the user what to record
6. warn clearly if the offer is beyond beginner level

Prefer concise, checklist-style answers over theory dumps.

## Source hub and guide families

Primary hub:
- https://matchedbettingblog.com/guides/

Guide families covered by the hub include:
- beginner foundations
- exchanges and lay betting
- qualifying bets and free bets
- money-back / risk-free offers
- extra place and each-way methods
- dutching and sequential laying
- account care and bankroll discipline

## Note on scope

This skill is a reusable operating manual derived from the Matched Betting Blog guide hub structure. It summarizes the workflows and decision logic so Hermes can help with triage, explanation, and process discipline without reproducing the full source text.
