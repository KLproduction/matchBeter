from __future__ import annotations

import uuid
from decimal import Decimal
from typing import Any, Optional

import psycopg
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb

from .jobs.match_lay import run as run_match_lay


CLAIM_NEXT_JOB_SQL = """
WITH next_job AS (
  SELECT id
  FROM "SyncJob"
  WHERE status = 'queued'
  ORDER BY "createdAt" ASC
  FOR UPDATE SKIP LOCKED
  LIMIT 1
)
UPDATE "SyncJob" job
SET status = 'running',
    "runAt" = COALESCE("runAt", NOW()),
    "updatedAt" = NOW()
FROM next_job
WHERE job.id = next_job.id
RETURNING job.id, job."jobType", job."payloadJson"
"""


def claim_next_job(conn: psycopg.Connection) -> Optional[dict[str, Any]]:
    with conn.transaction():
        row = conn.execute(CLAIM_NEXT_JOB_SQL).fetchone()
        return dict(row) if row else None


def complete_job(conn: psycopg.Connection, job_id: str, result: dict[str, Any]) -> None:
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
    conn.commit()


def fail_job(conn: psycopg.Connection, job_id: str, error: str) -> None:
    conn.execute(
        """
        UPDATE "SyncJob"
        SET status = 'failed',
            "errorMessage" = %s,
            "finishedAt" = NOW(),
            "updatedAt" = NOW()
        WHERE id = %s
        """,
        (error, job_id),
    )
    conn.commit()


def process_job(conn: psycopg.Connection, job: dict[str, Any]) -> dict[str, Any]:
    job_type = str(job.get("jobType", ""))
    payload = job.get("payloadJson") or {}

    if job_type == "match_lay":
        return process_match_lay_job(conn, payload)

    return {
        "status": "ignored",
        "message": f"Unsupported job type: {job_type}",
    }


def _to_jsonb(value: Any) -> Jsonb:
    return Jsonb(value)


def _json_safe(value: Any) -> Any:
    if isinstance(value, dict):
        return {str(key): _json_safe(item) for key, item in value.items()}
    if isinstance(value, list):
        return [_json_safe(item) for item in value]
    if isinstance(value, tuple):
        return [_json_safe(item) for item in value]
    if isinstance(value, Decimal):
        return str(value)
    return value


def process_match_lay_job(conn: psycopg.Connection, payload: dict[str, Any]) -> dict[str, Any]:
    result = run_match_lay(payload)
    job_context = result.get("job_context", {})
    bet_id = str(job_context.get("betId") or payload.get("betId") or "")
    offer_id = str(job_context.get("offerId") or payload.get("offerId") or "")

    if not bet_id:
        raise RuntimeError("match_lay payload missing betId")

    lay_quote = result.get("lay_quote") or {}
    calculation = result.get("calculation") or {}

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
            _to_jsonb(result.get("warnings", [])),
            _to_jsonb(_json_safe(result)),
        ),
    )

    conn.commit()
    return {
        **result,
        "job_context": {
            **job_context,
            "offerId": offer_id,
            "betId": bet_id,
        },
    }
