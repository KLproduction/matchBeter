from __future__ import annotations

import json
import os
import uuid
from datetime import date, datetime
from decimal import Decimal
from pathlib import Path
from typing import Any

import psycopg
from mcp.server.fastmcp import FastMCP
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb

from matchbeter.matcher import match_back_bet_to_lay_quote
from matchbeter.models import BookmakerBackBet


mcp = FastMCP("matchBeter", json_response=True)


def _connect() -> psycopg.Connection:
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise RuntimeError("DATABASE_URL is required")
    return psycopg.connect(database_url, row_factory=dict_row)


def _json_safe(value: Any) -> Any:
    if isinstance(value, dict):
        return {str(key): _json_safe(item) for key, item in value.items()}
    if isinstance(value, list):
        return [_json_safe(item) for item in value]
    if isinstance(value, tuple):
        return [_json_safe(item) for item in value]
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, Decimal):
        return str(value)
    if isinstance(value, uuid.UUID):
        return str(value)
    return value


def _pick_first_offer_id(conn: psycopg.Connection) -> str | None:
    row = conn.execute(
        """
        SELECT id
        FROM "Offer"
        ORDER BY "createdAt" ASC
        LIMIT 1
        """,
    ).fetchone()
    return str(row["id"]) if row else None


def _pick_first_offer_step_id(conn: psycopg.Connection, offer_id: str) -> str | None:
    row = conn.execute(
        """
        SELECT id
        FROM "OfferStep"
        WHERE "offerId" = %s
        ORDER BY "sortOrder" ASC
        LIMIT 1
        """,
        (offer_id,),
    ).fetchone()
    return str(row["id"]) if row else None


def _get_offer_row(conn: psycopg.Connection, offer_id: str) -> dict[str, Any] | None:
    row = conn.execute(
        """
        SELECT
            o.*,
            b.name AS bookmaker_name,
            b.region AS bookmaker_region
        FROM "Offer" o
        JOIN "Bookmaker" b ON b.id = o."bookmakerId"
        WHERE o.id = %s
        """,
        (offer_id,),
    ).fetchone()
    return _json_safe(dict(row)) if row else None


def _get_offer_steps(conn: psycopg.Connection, offer_id: str) -> list[dict[str, Any]]:
    rows = conn.execute(
        """
        SELECT *
        FROM "OfferStep"
        WHERE "offerId" = %s
        ORDER BY "sortOrder" ASC
        """,
        (offer_id,),
    ).fetchall()
    return [_json_safe(dict(row)) for row in rows]


def _get_offer_bets(conn: psycopg.Connection, offer_id: str) -> list[dict[str, Any]]:
    rows = conn.execute(
        """
        SELECT
            b.*,
            lm.id AS lay_match_id,
            lm."matchQuality" AS lay_match_quality,
            lm."bestLayPrice" AS lay_match_best_lay_price,
            lm."bestLaySize" AS lay_match_best_lay_size,
            lm."layStake" AS lay_match_lay_stake,
            lm.liability AS lay_match_liability,
            lm."delayedData" AS lay_match_delayed_data
        FROM "Bet" b
        LEFT JOIN "LayMatch" lm ON lm."backBetId" = b.id
        WHERE b."offerId" = %s
        ORDER BY b."createdAt" ASC
        """,
        (offer_id,),
    ).fetchall()
    return [_json_safe(dict(row)) for row in rows]


def _insert_smoke_bet_and_job(
    conn: psycopg.Connection,
    example_payload: dict[str, Any],
    offer_id: str,
    offer_step_id: str | None,
    stake_model_override: str | None,
) -> tuple[str, str]:
    bet_id = uuid.uuid4().hex
    job_id = uuid.uuid4().hex
    stake_model = stake_model_override or str(example_payload.get("stake_model") or "cash")

    with conn.transaction():
        conn.execute(
            """
            INSERT INTO "Bet" (
                id,
                "offerId",
                "offerStepId",
                "betType",
                sport,
                "eventName",
                "marketName",
                "selectionName",
                odds,
                stake,
                "exchangeCommission",
                result,
                "placedAt",
                "externalRef",
                notes,
                "createdAt",
                "updatedAt"
            ) VALUES (
                %s, %s, %s, 'back', %s, %s, %s, %s, %s, %s, 0.00, 'pending', NOW(), NULL, %s, NOW(), NOW()
            )
            """,
            (
                bet_id,
                offer_id,
                offer_step_id,
                str(example_payload.get("sport", "football")),
                str(example_payload.get("event_name", "")),
                str(example_payload.get("market_name", "")),
                str(example_payload.get("selection_name", "")),
                float(example_payload.get("back_odds", 0)),
                float(example_payload.get("back_stake", 0)),
                "mcp smoke example",
            ),
        )

        payload = {
            "offerId": offer_id,
            "betId": bet_id,
            "stake_model": stake_model,
            "input": example_payload,
        }

        conn.execute(
            """
            INSERT INTO "SyncJob" (
                id,
                "jobType",
                status,
                "payloadJson",
                "createdAt",
                "updatedAt"
            ) VALUES (
                %s,
                'match_lay',
                'queued',
                %s,
                NOW(),
                NOW()
            )
            """,
            (job_id, Jsonb(payload)),
        )

    return bet_id, job_id


def _match_smoke_job(example_payload: dict[str, Any], offer_id: str, bet_id: str, stake_model: str) -> dict[str, Any]:
    back_bet = BookmakerBackBet(
        bookmaker=str(example_payload.get("bookmaker", "")),
        sport=str(example_payload.get("sport", "")),
        event_name=str(example_payload.get("event_name", "")),
        market_name=str(example_payload.get("market_name", "")),
        selection_name=str(example_payload.get("selection_name", "")),
        back_odds=float(example_payload.get("back_odds", 0)),
        back_stake=float(example_payload.get("back_stake", 0)),
        event_start_iso=example_payload.get("event_start_iso"),
        stake_model=stake_model,
    )
    result = match_back_bet_to_lay_quote(back_bet)
    result["job_context"] = {
        "offerId": offer_id,
        "betId": bet_id,
        "stake_model": stake_model,
    }
    return result


def _write_lay_match(conn: psycopg.Connection, bet_id: str, result: dict[str, Any]) -> None:
    lay_quote = result.get("lay_quote") or {}
    calculation = result.get("calculation") or {}
    with conn.transaction():
        conn.execute(
            """
            INSERT INTO "LayMatch" (
                id,
                "backBetId",
                "matchQuality",
                "matchedEventName",
                "matchedMarketName",
                "matchedSelectionName",
                "bestLayPrice",
                "bestLaySize",
                "layStake",
                "liability",
                "delayedData",
                "warningsJson",
                "rawResponseJson",
                "createdAt",
                "updatedAt"
            ) VALUES (
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                NOW(),
                NOW()
            )
            ON CONFLICT ("backBetId")
            DO UPDATE SET
                "matchQuality" = EXCLUDED."matchQuality",
                "matchedEventName" = EXCLUDED."matchedEventName",
                "matchedMarketName" = EXCLUDED."matchedMarketName",
                "matchedSelectionName" = EXCLUDED."matchedSelectionName",
                "bestLayPrice" = EXCLUDED."bestLayPrice",
                "bestLaySize" = EXCLUDED."bestLaySize",
                "layStake" = EXCLUDED."layStake",
                "liability" = EXCLUDED."liability",
                "delayedData" = EXCLUDED."delayedData",
                "warningsJson" = EXCLUDED."warningsJson",
                "rawResponseJson" = EXCLUDED."rawResponseJson",
                "updatedAt" = NOW()
            """,
            (
                uuid.uuid4().hex,
                bet_id,
                str(result.get("match_quality", "unknown")),
                lay_quote.get("matchedEventName") or lay_quote.get("event_name") or result.get("normalized_input", {}).get("event_name"),
                lay_quote.get("market_name") or result.get("normalized_input", {}).get("market_name"),
                lay_quote.get("selection_name") or result.get("normalized_input", {}).get("selection_name"),
                lay_quote.get("best_lay_price"),
                lay_quote.get("best_lay_size"),
                calculation.get("lay_stake"),
                calculation.get("liability"),
                bool(lay_quote.get("delayed_data", True)) if lay_quote else True,
                Jsonb(_json_safe(result.get("warnings", []))),
                Jsonb(_json_safe(result)),
            ),
        )


def _queue_and_process_smoke(
    conn: psycopg.Connection,
    example_path: Path,
    offer_id: str | None,
    stake_model_override: str | None,
) -> dict[str, Any]:
    example_payload = json.loads(example_path.read_text(encoding="utf-8"))
    selected_offer_id = offer_id or _pick_first_offer_id(conn)
    if not selected_offer_id:
        raise RuntimeError("No offer found")

    selected_offer_step_id = _pick_first_offer_step_id(conn, selected_offer_id)
    bet_id, job_id = _insert_smoke_bet_and_job(
        conn,
        example_payload,
        selected_offer_id,
        selected_offer_step_id,
        stake_model_override,
    )
    result = _match_smoke_job(
        example_payload,
        selected_offer_id,
        bet_id,
        stake_model_override or str(example_payload.get("stake_model") or "cash"),
    )
    _write_lay_match(conn, bet_id, result)

    with conn.transaction():
        conn.execute(
            """
            UPDATE "SyncJob"
            SET status = 'completed',
                "resultJson" = %s,
                "errorMessage" = NULL,
                "finishedAt" = NOW(),
                "updatedAt" = NOW()
            WHERE id = %s
            """,
            (Jsonb(_json_safe(result)), job_id),
        )

    return {
        "offer_id": selected_offer_id,
        "offer_step_id": selected_offer_step_id,
        "bet_id": bet_id,
        "job_id": job_id,
        "result": _json_safe(result),
    }


@mcp.resource("matchbeter://offers/{offer_id}")
def offer_resource(offer_id: str) -> dict[str, Any]:
    with _connect() as conn:
        offer = _get_offer_row(conn, offer_id)
        if not offer:
            raise RuntimeError(f"Offer not found: {offer_id}")
        return {
            "offer": offer,
            "steps": _get_offer_steps(conn, offer_id),
            "bets": _get_offer_bets(conn, offer_id),
        }


@mcp.resource("matchbeter://bets/{bet_id}")
def bet_resource(bet_id: str) -> dict[str, Any]:
    with _connect() as conn:
        row = conn.execute(
            """
            SELECT
                b.*,
                o.title AS offer_title,
                lm.id AS lay_match_id,
                lm."matchQuality" AS lay_match_quality,
                lm."bestLayPrice" AS lay_match_best_lay_price,
                lm."bestLaySize" AS lay_match_best_lay_size,
                lm."layStake" AS lay_match_lay_stake,
                lm.liability AS lay_match_liability,
                lm."delayedData" AS lay_match_delayed_data
            FROM "Bet" b
            JOIN "Offer" o ON o.id = b."offerId"
            LEFT JOIN "LayMatch" lm ON lm."backBetId" = b.id
            WHERE b.id = %s
            """,
            (bet_id,),
        ).fetchone()
        if not row:
            raise RuntimeError(f"Bet not found: {bet_id}")
        return _json_safe(dict(row))


@mcp.resource("matchbeter://jobs/{job_id}")
def job_resource(job_id: str) -> dict[str, Any]:
    with _connect() as conn:
        row = conn.execute(
            """
            SELECT *
            FROM "SyncJob"
            WHERE id = %s
            """,
            (job_id,),
        ).fetchone()
        if not row:
            raise RuntimeError(f"Job not found: {job_id}")
        return _json_safe(dict(row))


@mcp.tool()
def list_offers(status: str | None = None, limit: int = 20) -> dict[str, Any]:
    """List offers with bookmaker and progress summary."""
    limit = max(1, min(limit, 100))
    with _connect() as conn:
        if status:
            rows = conn.execute(
                """
                SELECT
                    o.id,
                    o.title,
                    o.status,
                    o."offerType",
                    o."sourceType",
                    o."expiresAt",
                    o."expectedProfit",
                    o."actualProfit",
                    b.name AS bookmaker_name,
                    COUNT(DISTINCT s.id) AS step_count,
                    COUNT(DISTINCT bt.id) AS bet_count
                FROM "Offer" o
                JOIN "Bookmaker" b ON b.id = o."bookmakerId"
                LEFT JOIN "OfferStep" s ON s."offerId" = o.id
                LEFT JOIN "Bet" bt ON bt."offerId" = o.id
                WHERE o.status = %s
                GROUP BY o.id, b.name
                ORDER BY o."createdAt" DESC
                LIMIT %s
                """,
                (status, limit),
            ).fetchall()
        else:
            rows = conn.execute(
                """
                SELECT
                    o.id,
                    o.title,
                    o.status,
                    o."offerType",
                    o."sourceType",
                    o."expiresAt",
                    o."expectedProfit",
                    o."actualProfit",
                    b.name AS bookmaker_name,
                    COUNT(DISTINCT s.id) AS step_count,
                    COUNT(DISTINCT bt.id) AS bet_count
                FROM "Offer" o
                JOIN "Bookmaker" b ON b.id = o."bookmakerId"
                LEFT JOIN "OfferStep" s ON s."offerId" = o.id
                LEFT JOIN "Bet" bt ON bt."offerId" = o.id
                GROUP BY o.id, b.name
                ORDER BY o."createdAt" DESC
                LIMIT %s
                """,
                (limit,),
            ).fetchall()
    return {"offers": [_json_safe(dict(row)) for row in rows], "count": len(rows)}


@mcp.tool()
def get_offer(offer_id: str) -> dict[str, Any]:
    """Get an offer plus its steps and bets."""
    with _connect() as conn:
        offer = _get_offer_row(conn, offer_id)
        if not offer:
            raise RuntimeError(f"Offer not found: {offer_id}")
        return {
            "offer": offer,
            "steps": _get_offer_steps(conn, offer_id),
            "bets": _get_offer_bets(conn, offer_id),
        }


@mcp.tool()
def list_bets(offer_id: str | None = None, limit: int = 50) -> dict[str, Any]:
    """List bets, optionally filtered to an offer."""
    limit = max(1, min(limit, 100))
    with _connect() as conn:
        if offer_id:
            rows = conn.execute(
                """
                SELECT
                    b.*,
                    lm.id AS lay_match_id,
                    lm."matchQuality" AS lay_match_quality,
                    lm."bestLayPrice" AS lay_match_best_lay_price,
                    lm."bestLaySize" AS lay_match_best_lay_size,
                    lm."layStake" AS lay_match_lay_stake,
                    lm.liability AS lay_match_liability,
                    lm."delayedData" AS lay_match_delayed_data
                FROM "Bet" b
                LEFT JOIN "LayMatch" lm ON lm."backBetId" = b.id
                WHERE b."offerId" = %s
                ORDER BY b."createdAt" DESC
                LIMIT %s
                """,
                (offer_id, limit),
            ).fetchall()
        else:
            rows = conn.execute(
                """
                SELECT
                    b.*,
                    lm.id AS lay_match_id,
                    lm."matchQuality" AS lay_match_quality,
                    lm."bestLayPrice" AS lay_match_best_lay_price,
                    lm."bestLaySize" AS lay_match_best_lay_size,
                    lm."layStake" AS lay_match_lay_stake,
                    lm.liability AS lay_match_liability,
                    lm."delayedData" AS lay_match_delayed_data
                FROM "Bet" b
                LEFT JOIN "LayMatch" lm ON lm."backBetId" = b.id
                ORDER BY b."createdAt" DESC
                LIMIT %s
                """,
                (limit,),
            ).fetchall()
    return {"bets": [_json_safe(dict(row)) for row in rows], "count": len(rows)}


@mcp.tool()
def get_bet(bet_id: str) -> dict[str, Any]:
    """Get a single bet plus its lay match."""
    with _connect() as conn:
        row = conn.execute(
            """
            SELECT
                b.*,
                o.title AS offer_title,
                lm.id AS lay_match_id,
                lm."matchQuality" AS lay_match_quality,
                lm."bestLayPrice" AS lay_match_best_lay_price,
                lm."bestLaySize" AS lay_match_best_lay_size,
                lm."layStake" AS lay_match_lay_stake,
                lm.liability AS lay_match_liability,
                lm."delayedData" AS lay_match_delayed_data
            FROM "Bet" b
            JOIN "Offer" o ON o.id = b."offerId"
            LEFT JOIN "LayMatch" lm ON lm."backBetId" = b.id
            WHERE b.id = %s
            """,
            (bet_id,),
        ).fetchone()
        if not row:
            raise RuntimeError(f"Bet not found: {bet_id}")
        return _json_safe(dict(row))


@mcp.tool()
def list_sync_jobs(status: str | None = None, job_type: str | None = None, limit: int = 50) -> dict[str, Any]:
    """List sync jobs from the automation queue."""
    limit = max(1, min(limit, 100))
    clauses: list[str] = []
    params: list[Any] = []
    if status:
        clauses.append('status = %s')
        params.append(status)
    if job_type:
        clauses.append('"jobType" = %s')
        params.append(job_type)
    where_sql = f"WHERE {' AND '.join(clauses)}" if clauses else ""

    with _connect() as conn:
        rows = conn.execute(
            f"""
            SELECT *
            FROM "SyncJob"
            {where_sql}
            ORDER BY "createdAt" DESC
            LIMIT %s
            """,
            (*params, limit),
        ).fetchall()
    return {"jobs": [_json_safe(dict(row)) for row in rows], "count": len(rows)}


@mcp.tool()
def get_sync_job(job_id: str) -> dict[str, Any]:
    """Get a sync job."""
    with _connect() as conn:
        row = conn.execute(
            """
            SELECT *
            FROM "SyncJob"
            WHERE id = %s
            """,
            (job_id,),
        ).fetchone()
        if not row:
            raise RuntimeError(f"Job not found: {job_id}")
        return _json_safe(dict(row))


@mcp.tool()
def smoke_match_lay(example_path: str, offer_id: str | None = None, stake_model: str | None = None) -> dict[str, Any]:
    """Insert a smoke bet, queue a match_lay job, run the matcher, and persist the lay match."""
    path = Path(example_path).expanduser()
    if not path.is_absolute():
        path = Path.cwd() / path
    if not path.exists():
        raise RuntimeError(f"Example file not found: {path}")

    with _connect() as conn:
        example_payload = json.loads(path.read_text(encoding="utf-8"))
        selected_offer_id = offer_id or _pick_first_offer_id(conn)
        if not selected_offer_id:
            raise RuntimeError("No offer found")
        selected_offer_step_id = _pick_first_offer_step_id(conn, selected_offer_id)
        bet_id, job_id = _insert_smoke_bet_and_job(
            conn,
            example_payload,
            selected_offer_id,
            selected_offer_step_id,
            stake_model,
        )
        result = _match_smoke_job(
            example_payload,
            selected_offer_id,
            bet_id,
            stake_model or str(example_payload.get("stake_model") or "cash"),
        )
        _write_lay_match(conn, bet_id, result)
        with conn.transaction():
            conn.execute(
                """
                UPDATE "SyncJob"
                SET status = 'completed',
                    "resultJson" = %s,
                    "errorMessage" = NULL,
                    "finishedAt" = NOW(),
                    "updatedAt" = NOW()
                WHERE id = %s
                """,
                (Jsonb(_json_safe(result)), job_id),
            )

    return {
        "offer_id": selected_offer_id,
        "offer_step_id": selected_offer_step_id,
        "bet_id": bet_id,
        "job_id": job_id,
        "result": _json_safe(result),
    }


def main() -> None:
    mcp.run()
