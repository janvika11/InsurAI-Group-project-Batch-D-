import json
from aiokafka import AIOKafkaProducer

from config import settings

_producer: AIOKafkaProducer | None = None


async def get_producer() -> AIOKafkaProducer:
    global _producer
    if _producer is None:
        _producer = AIOKafkaProducer(
            bootstrap_servers=settings.kafka_bootstrap_servers.split(","),
            value_serializer=lambda v: json.dumps(v, default=str).encode("utf-8"),
        )
        await _producer.start()
    return _producer


def _to_java_payload(d: dict) -> dict:
    """policy-service and workflow-service consumers expect camelCase keys."""
    out = {
        "requestId": d.get("request_id") or d.get("requestId"),
        "policyId": d.get("policy_id") or d.get("policyId"),
        "policyNumber": d.get("policy_number") or d.get("policyNumber"),
        "riskScore": d.get("risk_score") if "risk_score" in d else d.get("riskScore"),
        "label": d.get("label"),
        "recommendation": d.get("recommendation"),
        "factors": d.get("factors"),
        "modelVersion": d.get("model_version") or d.get("modelVersion"),
        "scoredAt": d.get("scored_at") or d.get("scoredAt"),
        "error": d.get("error"),
    }
    return {k: v for k, v in out.items() if v is not None}


async def publish_risk_result(result: dict) -> None:
    producer = await get_producer()
    await producer.send_and_wait("risk-evaluation-results", _to_java_payload(result))


async def close_producer() -> None:
    global _producer
    if _producer:
        await _producer.stop()
        _producer = None
