from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable


@dataclass(frozen=True)
class CatalogueCandidate:
    market_id: str
    event_name: str
    market_name: str
    runner_name: str
    score: float


def score_candidate(event_name: str, market_name: str, runner_name: str, target_event: str, target_market: str, target_runner: str) -> float:
    score = 0.0
    if event_name.lower() == target_event.lower():
        score += 0.5
    if market_name.lower() == target_market.lower():
        score += 0.3
    if runner_name.lower() == target_runner.lower():
        score += 0.2
    return score


def pick_best_candidate(candidates: Iterable[CatalogueCandidate]) -> CatalogueCandidate | None:
    ordered = sorted(candidates, key=lambda candidate: candidate.score, reverse=True)
    if not ordered:
        return None
    if len(ordered) > 1 and abs(ordered[0].score - ordered[1].score) < 0.1:
        return None
    return ordered[0]
