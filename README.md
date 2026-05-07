# matchBeter

matchBeter is a repo for building a bookmaker-back-bet to exchange-lay-bet matcher, starting with Betfair API support in delayed-key mode.

Current goal:
- input a bookmaker back bet
- find the corresponding exchange market and selection
- fetch the best available lay quote
- calculate lay stake and liability
- flag ambiguous or unsafe matches before any bet is placed

Initial focus:
- football match odds
- football over/under goals
- both teams to score
- tennis match odds

Repo layout:
- `skills/` copied working Hermes skills used as source material
- `docs/specs/` product and implementation specs
- `src/matchbeter/` future Python package
- `examples/` example bookmaker inputs and expected matcher outputs
- `tests/` future tests

Included skills:
- `skills/betfair-api-delayed-key/`
- `skills/matched-betting-guide/`

Important note:
- the current Betfair integration design assumes a delayed app key
- delayed key is useful for building the matcher and validating logic
- delayed data is not suitable for time-sensitive production execution

Next build targets:
1. define a normalized input schema for bookmaker bets
2. define market/selection matching rules
3. implement Betfair login/session client
4. implement `listMarketCatalogue` matcher
5. implement `listMarketBook` lay quote fetcher
6. implement lay stake/liability calculator
7. add confidence and ambiguity scoring
