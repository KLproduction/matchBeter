from __future__ import annotations

import argparse
import json
import uuid
from contextlib import closing
from pathlib import Path

import psycopg
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb

from .settings import get_database_url
from .worker import claim_next_job, complete_job, fail_job, process_job


def run_smoke_example(
    conn: psycopg.Connection,
    example_path: Path,
    offer_id: str | None,
    stake_model_override: str | None,
) -> None:
    example_payload = json.loads(example_path.read_text(encoding="utf-8"))
    selected_offer_id = offer_id or _pick_smoke_offer_id(conn)
    if not selected_offer_id:
        raise RuntimeError("No offer found for smoke example")
    selected_offer_step_id = _pick_smoke_offer_step_id(conn, selected_offer_id)

    with conn.transaction():
        bet_id = uuid.uuid4().hex
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
                selected_offer_id,
                selected_offer_step_id,
                str(example_payload.get("sport", "football")),
                str(example_payload.get("event_name", "")),
                str(example_payload.get("market_name", "")),
                str(example_payload.get("selection_name", "")),
                float(example_payload.get("back_odds", 0)),
                float(example_payload.get("back_stake", 0)),
                "smoke example",
            ),
        )

        payload = {
            "offerId": selected_offer_id,
            "betId": bet_id,
            "stake_model": stake_model_override or example_payload.get("stake_model", "cash"),
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
            (uuid.uuid4().hex, Jsonb(payload)),
        )


def _pick_smoke_offer_id(conn: psycopg.Connection) -> str | None:
    row = conn.execute(
        """
        SELECT id
        FROM "Offer"
        ORDER BY "createdAt" ASC
        LIMIT 1
        """,
    ).fetchone()
    return str(row["id"]) if row else None


def _pick_smoke_offer_step_id(conn: psycopg.Connection, offer_id: str) -> str | None:
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


def main() -> int:
    parser = argparse.ArgumentParser(description="Matched betting automation worker")
    parser.add_argument("--once", action="store_true", help="Process a single job and exit")
    parser.add_argument("--smoke-example", type=Path, help="Create a bet and queue a match_lay job from an example JSON file")
    parser.add_argument("--offer-id", type=str, help="Offer id to attach to the example job")
    parser.add_argument("--stake-model", type=str, help="Override the example stake model")
    args = parser.parse_args()

    database_url = get_database_url()

    with closing(psycopg.connect(database_url, row_factory=dict_row)) as conn:
        if args.smoke_example:
            run_smoke_example(conn, args.smoke_example, args.offer_id, args.stake_model)
            print("Smoke example job enqueued.")
            job = claim_next_job(conn)
            if not job:
                raise RuntimeError("Failed to claim smoke job")
            result = process_job(conn, job)
            complete_job(conn, job["id"], result)
            print(result)
            return 0

        if args.once:
            job = claim_next_job(conn)
            if not job:
                print("No queued jobs.")
                return 0

            try:
                result = process_job(conn, job)
                complete_job(conn, job["id"], result)
                print(result)
            except Exception as exc:  # noqa: BLE001
                fail_job(conn, job["id"], str(exc))
                raise
            return 0

        while True:
            job = claim_next_job(conn)
            if not job:
                print("No queued jobs. Sleeping not implemented in scaffold.")
                return 0

            try:
                result = process_job(conn, job)
                complete_job(conn, job["id"], result)
                print(result)
            except Exception as exc:  # noqa: BLE001
                fail_job(conn, job["id"], str(exc))
                raise


if __name__ == "__main__":
    raise SystemExit(main())
