import asyncio
import json
from aiokafka import AIOKafkaConsumer

from config import settings
from kafka.producer import publish_risk_result, close_producer
from services.risk_service import score_risk
from schemas.risk import RiskScoreRequest, RiskFeatures, KafkaRiskResult
from datetime import datetime, timezone


def _pick(msg: dict, *keys: str):
    for k in keys:
        if k in msg and msg[k] is not None:
            return msg[k]
    return None


def _normalize_java_risk_request(msg: dict) -> dict:
    """Java policy-service sends camelCase; legacy samples used snake_case."""
    policy_id = _pick(msg, "policyId", "policy_id")
    policy_type = _pick(msg, "policyType", "policy_type") or ""
    raw_features = _pick(msg, "features") or {}
    if not isinstance(raw_features, dict):
        raw_features = {}
    return {
        "request_id": (_pick(msg, "requestId", "request_id") or ""),
        "policy_id": str(policy_id) if policy_id is not None else "",
        "policy_number": _pick(msg, "policyNumber", "policy_number"),
        "policy_type": str(policy_type),
        "features": raw_features,
    }


async def _process_message(msg_value: dict) -> None:
    norm = _normalize_java_risk_request(msg_value)
    try:
        if not norm["policy_id"]:
            raise ValueError("Missing policyId on risk evaluation request")
        features = RiskFeatures.model_validate(norm["features"])
        req = RiskScoreRequest(
            policy_id=norm["policy_id"],
            policy_number=norm.get("policy_number"),
            policy_type=norm["policy_type"],
            features=features,
        )
        result = await score_risk(req)
        kafka_result = KafkaRiskResult(
            request_id=norm["request_id"],
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
        err_result = {
            "request_id": norm.get("request_id", ""),
            "policy_id": norm.get("policy_id", ""),
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
