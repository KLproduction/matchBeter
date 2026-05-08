from __future__ import annotations

from typing import Any

from matchbeter.matcher import match_back_bet_to_lay_quote
from matchbeter.models import BookmakerBackBet


def build_back_bet(payload: dict[str, Any]) -> BookmakerBackBet:
    input_payload = payload.get("input", {})
    return BookmakerBackBet(
        bookmaker=str(input_payload.get("bookmaker", "")),
        sport=str(input_payload.get("sport", "")),
        event_name=str(input_payload.get("event_name", "")),
        market_name=str(input_payload.get("market_name", "")),
        selection_name=str(input_payload.get("selection_name", "")),
        back_odds=float(input_payload.get("back_odds", 0)),
        back_stake=float(input_payload.get("back_stake", 0)),
        event_start_iso=input_payload.get("event_start_iso"),
        stake_model=str(payload.get("stake_model") or input_payload.get("stake_model") or "cash"),
    )


def run(payload: dict[str, Any]) -> dict[str, Any]:
    back_bet = build_back_bet(payload)
    result = match_back_bet_to_lay_quote(back_bet)
    result["job_context"] = {
        "offerId": payload.get("offerId"),
        "betId": payload.get("betId"),
        "stake_model": payload.get("stake_model", "cash"),
    }
    return result
