"""Matcher logic for bookmaker back bets."""

from __future__ import annotations

import re
from dataclasses import asdict, dataclass
from decimal import Decimal, ROUND_HALF_UP
from typing import Any, Optional, Literal

from .models import BetfairLayQuote, BookmakerBackBet, MatchedBetCalculation

StakeModel = Literal["cash", "free_bet_stake_not_returned", "free_bet_stake_returned"]

_TEAM_SEPARATORS = re.compile(r"\s+(?:v(?:s)?\.?|versus|-|@)\s+", re.IGNORECASE)
_WHITESPACE = re.compile(r"\s+")

_WORKER_RISK_WARNINGS = [
    "Confirm whether this is a cash bet or a free bet token before calculating the lay.",
    "If it is a free bet, confirm whether the stake is returned or not returned.",
    "Do not trust a price until the exchange order is filled.",
    "Delayed Betfair data is for logic validation, not time-sensitive execution.",
]


@dataclass(frozen=True)
class NormalizedBackBet:
    bookmaker: str
    sport: str
    event_name: str
    market_name: str
    selection_name: str
    back_odds: Decimal
    back_stake: Decimal
    event_start_iso: Optional[str]
    stake_model: StakeModel


@dataclass(frozen=True)
class MatchAnalysis:
    match_quality: str
    warnings: list[str]
    normalized_market_name: str
    market_family: str
    normalized_selection_name: str


def _d(value: Any) -> Decimal:
    if isinstance(value, Decimal):
        return value
    return Decimal(str(value))


def _round_money(value: Decimal) -> Decimal:
    return value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def _round_price(value: Decimal) -> Decimal:
    return value.quantize(Decimal("0.0001"), rounding=ROUND_HALF_UP)


def normalize_whitespace(value: str) -> str:
    return _WHITESPACE.sub(" ", value).strip()


def normalize_event_name(event_name: str) -> str:
    cleaned = normalize_whitespace(event_name)
    cleaned = _TEAM_SEPARATORS.sub(" v ", cleaned)
    cleaned = re.sub(r"\bvs\.?\b", "v", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\s+v\s+", " v ", cleaned, flags=re.IGNORECASE)
    return normalize_whitespace(cleaned)


def normalize_market_name(market_name: str) -> str:
    cleaned = normalize_whitespace(market_name).lower()

    if cleaned in {"match result", "result", "match odds", "90 minutes result", "full time result"}:
        return "Match Odds"

    if cleaned in {"both teams to score", "btts"}:
        return "Both Teams To Score"

    ou_match = re.search(r"(over|under)\s*/?\s*(?:under\s*)?(\d+(?:\.\d+)?)\s*goals?", cleaned)
    if ou_match:
        return f"Over/Under {ou_match.group(2)} Goals"

    if "over/under" in cleaned and "goals" in cleaned:
        number = re.search(r"(\d+(?:\.\d+)?)", cleaned)
        if number:
            return f"Over/Under {number.group(1)} Goals"

    if "match odds" in cleaned:
        return "Match Odds"

    if "to qualify" in cleaned:
        return "To Qualify"

    if "draw no bet" in cleaned:
        return "Draw No Bet"

    if "half time" in cleaned or cleaned == "ht":
        return "Half Time"

    if "each way" in cleaned or "place" in cleaned:
        return "Place/Each Way"

    return normalize_whitespace(market_name)


def normalize_selection_name(selection_name: str) -> str:
    cleaned = normalize_whitespace(selection_name)
    lowered = cleaned.lower()
    if lowered in {"yes", "no"}:
        return lowered.title()
    if lowered in {"home", "away", "draw"}:
        return lowered.title()
    return cleaned


def normalize_stake_model(stake_model: Optional[str]) -> StakeModel:
    if not stake_model:
        return "cash"

    cleaned = normalize_whitespace(stake_model).lower().replace("-", "_")
    aliases = {
        "cash": "cash",
        "cash_bet": "cash",
        "free_bet": "free_bet_stake_not_returned",
        "free_stake_not_returned": "free_bet_stake_not_returned",
        "free_bet_stake_not_returned": "free_bet_stake_not_returned",
        "free_stake_returned": "free_bet_stake_returned",
        "free_bet_stake_returned": "free_bet_stake_returned",
    }
    return aliases.get(cleaned, "cash")


def normalize_back_bet(back_bet: BookmakerBackBet) -> NormalizedBackBet:
    return NormalizedBackBet(
        bookmaker=normalize_whitespace(back_bet.bookmaker),
        sport=normalize_whitespace(back_bet.sport).lower(),
        event_name=normalize_event_name(back_bet.event_name),
        market_name=normalize_market_name(back_bet.market_name),
        selection_name=normalize_selection_name(back_bet.selection_name),
        back_odds=_d(back_bet.back_odds),
        back_stake=_d(back_bet.back_stake),
        event_start_iso=back_bet.event_start_iso,
        stake_model=normalize_stake_model(back_bet.stake_model),
    )


def _event_participants(event_name: str) -> list[str]:
    parts = [normalize_whitespace(part) for part in re.split(r"\s+v\s+", event_name, flags=re.IGNORECASE)]
    return [part for part in parts if part]


def _supports_market(sport: str, market_name: str) -> tuple[bool, str]:
    if sport == "football":
        if market_name in {"Match Odds", "Both Teams To Score"}:
            return True, "football"
        if market_name.startswith("Over/Under") and market_name.endswith("Goals"):
            return True, "football"
        if market_name in {"Draw No Bet", "To Qualify", "Half Time", "Place/Each Way"}:
            return False, "unsafe"
        return False, "unknown"

    if sport == "tennis":
        if market_name == "Match Odds":
            return True, "tennis"
        return False, "unknown"

    return False, "unsupported_sport"


def _classify_selection(normalized: NormalizedBackBet) -> tuple[str, list[str]]:
    warnings: list[str] = []
    market_name = normalized.market_name
    selection = normalized.selection_name.lower()
    participants = _event_participants(normalized.event_name)

    if market_name == "Match Odds":
        if normalized.sport == "football":
            if selection in {"draw", "home", "away"}:
                return selection, warnings
            if len(participants) == 2 and selection in {participants[0].lower(), participants[1].lower()}:
                return "runner", warnings
            warnings.append("Match Odds selection does not clearly map to home/away/draw.")
            return "unknown", warnings
        if normalized.sport == "tennis":
            if selection:
                return "runner", warnings
            warnings.append("Tennis Match Odds requires a clear runner selection.")
            return "unknown", warnings

    if market_name == "Both Teams To Score":
        if selection in {"yes", "no"}:
            return selection, warnings
        warnings.append("BTTS requires Yes/No selection.")
        return "unknown", warnings

    if market_name.startswith("Over/Under") and market_name.endswith("Goals"):
        if selection.startswith("over ") or selection.startswith("under "):
            return "runner", warnings
        warnings.append("Over/Under goals market needs Over or Under selection.")
        return "unknown", warnings

    warnings.append("Selection could not be classified.")
    return "unknown", warnings


def analyze_matchability(back_bet: BookmakerBackBet | NormalizedBackBet) -> MatchAnalysis:
    normalized = back_bet if isinstance(back_bet, NormalizedBackBet) else normalize_back_bet(back_bet)
    warnings: list[str] = []

    if normalized.stake_model == "cash":
        warnings.append("Assuming cash-bet economics.")
    elif normalized.stake_model == "free_bet_stake_not_returned":
        warnings.append("Using free-bet stake-not-returned economics.")
    elif normalized.stake_model == "free_bet_stake_returned":
        warnings.append("Using free-bet stake-returned economics.")

    supported, support_reason = _supports_market(normalized.sport, normalized.market_name)
    if not supported:
        if support_reason == "unsafe":
            warnings.append(f"Unsupported market type: {normalized.market_name}.")
            return MatchAnalysis("ambiguous", warnings, normalized.market_name, support_reason, normalized.selection_name)
        warnings.append(f"Unsupported sport/market combination: {normalized.sport} / {normalized.market_name}.")
        return MatchAnalysis("no_match", warnings, normalized.market_name, support_reason, normalized.selection_name)

    selection_bucket, selection_warnings = _classify_selection(normalized)
    warnings.extend(selection_warnings)

    if normalized.market_name == "Match Odds":
        if selection_bucket == "unknown":
            return MatchAnalysis("ambiguous", warnings, normalized.market_name, support_reason, normalized.selection_name)
        if normalized.event_start_iso is None:
            warnings.append("Missing event start time lowers confidence.")
            return MatchAnalysis("strong", warnings, normalized.market_name, support_reason, normalized.selection_name)
        return MatchAnalysis("exact", warnings, normalized.market_name, support_reason, normalized.selection_name)

    if normalized.market_name == "Both Teams To Score":
        if selection_bucket == "unknown":
            return MatchAnalysis("ambiguous", warnings, normalized.market_name, support_reason, normalized.selection_name)
        if normalized.event_start_iso is None:
            warnings.append("Missing event start time lowers confidence.")
            return MatchAnalysis("strong", warnings, normalized.market_name, support_reason, normalized.selection_name)
        return MatchAnalysis("exact", warnings, normalized.market_name, support_reason, normalized.selection_name)

    if normalized.market_name.startswith("Over/Under") and normalized.market_name.endswith("Goals"):
        if selection_bucket == "unknown":
            return MatchAnalysis("ambiguous", warnings, normalized.market_name, support_reason, normalized.selection_name)
        if normalized.event_start_iso is None:
            warnings.append("Missing event start time lowers confidence.")
            return MatchAnalysis("strong", warnings, normalized.market_name, support_reason, normalized.selection_name)
        return MatchAnalysis("exact", warnings, normalized.market_name, support_reason, normalized.selection_name)

    warnings.append("Market is not supported by v1 matcher rules.")
    return MatchAnalysis("no_match", warnings, normalized.market_name, support_reason, normalized.selection_name)


def calculate_lay_metrics(
    back_odds: Decimal | float,
    back_stake: Decimal | float,
    lay_odds: Decimal | float,
    exchange_commission: Decimal | float = Decimal("0"),
    stake_model: StakeModel = "cash",
) -> MatchedBetCalculation:
    back_odds_d = _d(back_odds)
    back_stake_d = _d(back_stake)
    lay_odds_d = _d(lay_odds)
    commission_d = _d(exchange_commission)

    if lay_odds_d <= commission_d:
        raise ValueError("Lay odds must be greater than exchange commission.")

    if stake_model == "free_bet_stake_not_returned":
        numerator = back_stake_d * (back_odds_d - Decimal("1"))
        expected_outcome_note = "Free bet, stake not returned."
    else:
        numerator = back_stake_d * back_odds_d
        expected_outcome_note = "Cash bet or free bet with stake returned."

    lay_stake = numerator / (lay_odds_d - commission_d)
    liability = lay_stake * (lay_odds_d - Decimal("1"))

    return MatchedBetCalculation(
        lay_stake=float(_round_money(lay_stake)),
        liability=float(_round_money(liability)),
        exchange_commission=float(_round_price(commission_d)),
        expected_outcome_note=expected_outcome_note,
    )


def _lay_quote_to_dict(lay_quote: BetfairLayQuote) -> dict[str, Any]:
    return asdict(lay_quote)


def match_back_bet_to_lay_quote(
    back_bet: BookmakerBackBet,
    betfair_match: Optional[dict[str, Any]] = None,
    lay_quote: Optional[BetfairLayQuote] = None,
) -> dict[str, Any]:
    """Match a bookmaker back bet to a Betfair lay quote."""

    normalized = normalize_back_bet(back_bet)
    analysis = analyze_matchability(normalized)
    warnings = list(analysis.warnings)
    result: dict[str, Any] = {
        "input": asdict(back_bet),
        "normalized_input": asdict(normalized),
        "betfair_match": betfair_match,
        "lay_quote": None,
        "calculation": None,
        "match_quality": analysis.match_quality,
        "warnings": warnings + list(_WORKER_RISK_WARNINGS),
    }

    if betfair_match is not None:
        market_name = normalize_market_name(str(betfair_match.get("market_name", normalized.market_name)))
        if market_name != normalized.market_name:
            warnings.append(f"Betfair market name differs: {market_name} vs {normalized.market_name}.")
            result["match_quality"] = "ambiguous"

    if lay_quote is not None:
        result["lay_quote"] = _lay_quote_to_dict(lay_quote)
        if lay_quote.delayed_data:
            warnings.append("Delayed Betfair data: not suitable for time-sensitive execution.")
        if result["match_quality"] == "exact" and not warnings:
            result["match_quality"] = lay_quote.match_quality if lay_quote.match_quality != "unknown" else "strong"
        if lay_quote.best_lay_price > 0:
            result["calculation"] = asdict(
                calculate_lay_metrics(
                    normalized.back_odds,
                    normalized.back_stake,
                    _d(lay_quote.best_lay_price),
                    Decimal("0"),
                    normalized.stake_model,
                )
            )
        else:
            warnings.append("No meaningful lay quote available.")
            result["match_quality"] = "no_match"
    else:
        if result["match_quality"] == "exact":
            warnings.append("Betfair quote not supplied yet.")

    result["warnings"] = warnings + [warning for warning in _WORKER_RISK_WARNINGS if warning not in warnings]
    if lay_quote is not None and lay_quote.delayed_data and not any("delayed betfair data" in warning.lower() for warning in result["warnings"]):
        result["warnings"].append("Delayed Betfair data: not suitable for time-sensitive execution.")

    return result
