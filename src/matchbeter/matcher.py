"""Matcher implementation placeholder."""

from .models import BookmakerBackBet, BetfairLayQuote, MatchedBetCalculation


def match_back_bet_to_lay_quote(back_bet: BookmakerBackBet) -> dict:
    """Placeholder interface for the future matcher.

    Returns a structured dict so the CLI and tests can be designed before
    the Betfair client implementation exists.
    """
    return {
        "input": back_bet,
        "betfair_match": None,
        "lay_quote": None,
        "calculation": None,
        "match_quality": "unimplemented",
        "warnings": [
            "Matcher not implemented yet"
        ],
    }
