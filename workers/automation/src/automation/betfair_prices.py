from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class LayPrice:
    market_id: str
    market_name: str
    selection_id: int
    selection_name: str
    best_lay_price: float
    best_lay_size: float
    delayed_data: bool = True


def extract_best_lay_quote(market_book: dict[str, Any], selection_name: str) -> LayPrice | None:
    runners = market_book.get("runners", [])
    for runner in runners:
        if str(runner.get("selectionName", "")).lower() != selection_name.lower():
            continue

        offers = runner.get("ex", {}).get("availableToLay", [])
        if not offers:
            return None

        best_offer = offers[0]
        return LayPrice(
            market_id=str(market_book.get("marketId", "")),
            market_name=str(market_book.get("marketName", "")),
            selection_id=int(runner.get("selectionId", 0)),
            selection_name=str(runner.get("selectionName", "")),
            best_lay_price=float(best_offer.get("price", 0)),
            best_lay_size=float(best_offer.get("size", 0)),
            delayed_data=bool(market_book.get("isDelayed", True)),
        )

    return None
