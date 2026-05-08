import unittest
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from matchbeter.matcher import (
    analyze_matchability,
    calculate_lay_metrics,
    match_back_bet_to_lay_quote,
    normalize_event_name,
    normalize_market_name,
)
from matchbeter.models import BetfairLayQuote, BookmakerBackBet


class MatcherTests(unittest.TestCase):
    def test_normalize_event_and_market_names(self) -> None:
        self.assertEqual(normalize_event_name("Arsenal vs Chelsea"), "Arsenal v Chelsea")
        self.assertEqual(normalize_market_name("BTTS"), "Both Teams To Score")
        self.assertEqual(normalize_market_name("Over / Under 2.5 Goals"), "Over/Under 2.5 Goals")

    def test_exact_football_match_odds_is_supported(self) -> None:
        analysis = analyze_matchability(
            BookmakerBackBet(
                bookmaker="Coral",
                sport="football",
                event_name="Arsenal v Chelsea",
                market_name="Match Odds",
                selection_name="Arsenal",
                back_odds=2.3,
                back_stake=10.0,
                event_start_iso="2026-05-07T19:45:00Z",
            )
        )

        self.assertEqual(analysis.match_quality, "exact")
        self.assertEqual(analysis.normalized_market_name, "Match Odds")

    def test_ambiguous_when_selection_is_not_clear(self) -> None:
        analysis = analyze_matchability(
            BookmakerBackBet(
                bookmaker="Coral",
                sport="football",
                event_name="Arsenal v Chelsea",
                market_name="Match Odds",
                selection_name="Team to Win",
                back_odds=2.3,
                back_stake=10.0,
                event_start_iso="2026-05-07T19:45:00Z",
            )
        )

        self.assertEqual(analysis.match_quality, "ambiguous")
        self.assertTrue(any("selection" in warning.lower() for warning in analysis.warnings))

    def test_unsupported_market_is_rejected(self) -> None:
        analysis = analyze_matchability(
            BookmakerBackBet(
                bookmaker="Coral",
                sport="football",
                event_name="Arsenal v Chelsea",
                market_name="Draw No Bet",
                selection_name="Arsenal",
                back_odds=2.3,
                back_stake=10.0,
                event_start_iso="2026-05-07T19:45:00Z",
            )
        )

        self.assertEqual(analysis.match_quality, "ambiguous")
        self.assertTrue(any("unsupported" in warning.lower() for warning in analysis.warnings))

    def test_lay_metrics_are_calculated(self) -> None:
        metrics = calculate_lay_metrics(2.3, 10.0, 2.34, 0.0)

        self.assertAlmostEqual(metrics.lay_stake, 9.83, places=2)
        self.assertAlmostEqual(metrics.liability, 13.17, places=2)

    def test_free_bet_not_returned_uses_profit_only_formula(self) -> None:
        metrics = calculate_lay_metrics(3.8, 10.0, 4.1, 0.0, "free_bet_stake_not_returned")

        self.assertAlmostEqual(metrics.lay_stake, 6.83, places=2)
        self.assertAlmostEqual(metrics.liability, 21.17, places=2)

    def test_match_result_includes_quote_warning(self) -> None:
        result = match_back_bet_to_lay_quote(
            BookmakerBackBet(
                bookmaker="Coral",
                sport="football",
                event_name="Arsenal v Chelsea",
                market_name="Match Odds",
                selection_name="Arsenal",
                back_odds=2.3,
                back_stake=10.0,
                event_start_iso="2026-05-07T19:45:00Z",
            ),
            lay_quote=BetfairLayQuote(
                market_id="1.234567890",
                market_name="Match Odds",
                selection_id=12345,
                selection_name="Arsenal",
                best_lay_price=2.34,
                best_lay_size=57.12,
                delayed_data=True,
                match_quality="exact",
            ),
        )

        self.assertEqual(result["match_quality"], "exact")
        self.assertIsNotNone(result["calculation"])
        self.assertTrue(any("delayed" in warning.lower() for warning in result["warnings"]))
        self.assertTrue(any("stake" in warning.lower() for warning in result["warnings"]))


if __name__ == "__main__":
    unittest.main()
