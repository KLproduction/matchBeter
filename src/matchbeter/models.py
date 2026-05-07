from dataclasses import dataclass
from typing import Optional


@dataclass
class BookmakerBackBet:
    bookmaker: str
    sport: str
    event_name: str
    market_name: str
    selection_name: str
    back_odds: float
    back_stake: float
    event_start_iso: Optional[str] = None


@dataclass
class BetfairLayQuote:
    market_id: str
    market_name: str
    selection_id: int
    selection_name: str
    best_lay_price: float
    best_lay_size: float
    delayed_data: bool = True
    match_quality: str = "unknown"


@dataclass
class MatchedBetCalculation:
    lay_stake: float
    liability: float
    exchange_commission: float
    expected_outcome_note: str
