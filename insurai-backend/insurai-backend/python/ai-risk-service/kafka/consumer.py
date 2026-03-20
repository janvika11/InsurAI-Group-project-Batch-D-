import asyncio
import json
from aiokafka import AIOKafkaConsumer

from config import settings
from kafka.producer import publish_risk_result, close_producer
from services.risk_service import score_risk
from schemas.risk import RiskScoreRequest, KafkaRiskResult
from datetime import datetime, timezone


async def _process_message(msg_value: dict) -> None:
    try:
        req = RiskScoreRequest(
            policy_id=msg_value["policy_id"],
            policy_number=msg_value.get("policy_number"),
            policy_type=msg_value["policy_type"],
            features=msg_value["features"],
        )
        result = await score_risk(req)
        kafka_result = KafkaRiskResult(
            request_id=msg_value.get("request_id", ""),
            policy_id=result.policy_id,
            risk_score=result.risk_score,
            label=result.label,
            recommendation=result.recommendation,
            factors=result.factors,
            model_version=result.model_version,
            scored_at=result.scored_at,
        )
        await publish_risk_result(kafka_result.model_dump(mode="json"))
    except Exception as e:
        # Publish error result for request_id if available
        err_result = {
            "request_id": msg_value.get("request_id", ""),
            "policy_id": msg_value.get("policy_id", ""),
            "error": str(e),
            "scored_at": datetime.now(timezone.utc).isoformat(),
        }
        await publish_risk_result(err_result)


async def start_consumer() -> None:
    consumer = AIOKafkaConsumer(
        "risk-evaluation-requests",
        bootstrap_servers=settings.kafka_bootstrap_servers.split(","),
        value_deserializer=lambda m: json.loads(m.decode("utf-8")) if m else {},
        auto_offset_reset="earliest",
    )
    await consumer.start()
    try:
        async for msg in consumer:
            if msg.value:
                await _process_message(msg.value)
    except asyncio.CancelledError:
        pass
    finally:
        await consumer.stop()
        await close_producer()
