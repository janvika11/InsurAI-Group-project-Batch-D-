import asyncio
import json
from aiokafka import AIOKafkaConsumer

from config import settings
from kafka.producer import publish_fraud_result, close_producer
from services.fraud_service import detect_fraud
from schemas.fraud import FraudCheckRequest, KafkaFraudResult
from datetime import datetime, timezone


async def _process_message(msg_value: dict) -> None:
    try:
        req = FraudCheckRequest(
            claim_id=msg_value["claim_id"],
            claim_number=msg_value.get("claim_number"),
            policy_id=msg_value["policy_id"],
            holder_id=msg_value["holder_id"],
            claim_type=msg_value["claim_type"],
            claimed_amount=msg_value["claimed_amount"],
            incident_date=msg_value["incident_date"],
            holder_claim_history=msg_value.get("holder_claim_history"),
        )
        result = await detect_fraud(req)
        kafka_result = KafkaFraudResult(
            request_id=msg_value.get("request_id", ""),
            claim_id=result.claim_id,
            fraud_score=result.fraud_score,
            verdict=result.verdict,
            anomalies=result.anomalies,
            model_version=result.model_version,
            checked_at=result.checked_at,
        )
        await publish_fraud_result(kafka_result.model_dump(mode="json"))
    except Exception as e:
        err_result = {
            "request_id": msg_value.get("request_id", ""),
            "claim_id": msg_value.get("claim_id", ""),
            "error": str(e),
            "checked_at": datetime.now(timezone.utc).isoformat(),
        }
        await publish_fraud_result(err_result)


async def start_consumer() -> None:
    consumer = AIOKafkaConsumer(
        "fraud-check-requests",
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
