# InsurAI – Kafka Topics & Event Schemas

## Topic Configuration
```properties
# All topics: 3 partitions, replication factor 1 (dev), 3 (prod)
policy-events                   partitions=3
risk-evaluation-requests        partitions=3
risk-evaluation-results         partitions=3
fraud-check-requests            partitions=3
fraud-check-results             partitions=3
document-analysis-requests      partitions=2
document-analysis-results       partitions=2
notification-events             partitions=5
audit-events                    partitions=3
```

## Create Topics Script (run once)
```bash
kafka-topics.sh --bootstrap-server localhost:9092 --create --topic policy-events --partitions 3 --replication-factor 1
kafka-topics.sh --bootstrap-server localhost:9092 --create --topic risk-evaluation-requests --partitions 3 --replication-factor 1
kafka-topics.sh --bootstrap-server localhost:9092 --create --topic risk-evaluation-results --partitions 3 --replication-factor 1
kafka-topics.sh --bootstrap-server localhost:9092 --create --topic fraud-check-requests --partitions 3 --replication-factor 1
kafka-topics.sh --bootstrap-server localhost:9092 --create --topic fraud-check-results --partitions 3 --replication-factor 1
kafka-topics.sh --bootstrap-server localhost:9092 --create --topic document-analysis-requests --partitions 2 --replication-factor 1
kafka-topics.sh --bootstrap-server localhost:9092 --create --topic document-analysis-results --partitions 2 --replication-factor 1
kafka-topics.sh --bootstrap-server localhost:9092 --create --topic notification-events --partitions 5 --replication-factor 1
kafka-topics.sh --bootstrap-server localhost:9092 --create --topic audit-events --partitions 3 --replication-factor 1
```

---

## Event Schemas (all JSON)

### policy-events
Key: policyId
Published by: policy-service, workflow-service, rules-service, renewal-service
Consumed by: rules-service, renewal-service, notify-service, ai-risk-service

```json
{
  "eventId": "uuid",
  "eventType": "POLICY_CREATED | POLICY_APPROVED | POLICY_REJECTED | POLICY_EXPIRED | POLICY_CANCELLED | WORKFLOW_ASSIGNED | RULE_PASSED | RULE_FAILED | RENEWAL_INITIATED",
  "policyId": "uuid",
  "policyNumber": "POL-2025-0839",
  "holderId": "uuid",
  "holderName": "Nexova Systems",
  "policyType": "FIRE_HAZARD",
  "status": "PENDING_REVIEW",
  "metadata": {},
  "timestamp": "2025-03-01T09:00:00Z"
}
```

### risk-evaluation-requests
Key: requestId
Published by: policy-service
Consumed by: ai-risk-service

```json
{
  "requestId": "uuid",
  "policyId": "uuid",
  "policyNumber": "POL-2025-0839",
  "policyType": "FIRE_HAZARD",
  "features": {
    "sector": "manufacturing",
    "revenue": 180000000,
    "employees": 450,
    "coverage_amount": 25000000,
    "years_in_business": 12
  },
  "timestamp": "2025-03-01T09:00:00Z"
}
```

### risk-evaluation-results
Key: policyId
Published by: ai-risk-service
Consumed by: policy-service, workflow-service, rules-service

```json
{
  "requestId": "uuid",
  "policyId": "uuid",
  "policyNumber": "POL-2025-0839",
  "riskScore": 67,
  "label": "MEDIUM",
  "recommendation": "MANUAL_REVIEW",
  "factors": ["occupancy_index", "high_coverage_to_revenue_ratio"],
  "modelVersion": "v2.1-xgboost",
  "timestamp": "2025-03-01T09:00:05Z"
}
```

### fraud-check-requests
Key: claimId
Published by: claims-service
Consumed by: ai-fraud-service

```json
{
  "requestId": "uuid",
  "claimId": "uuid",
  "claimNumber": "CLM-0091",
  "policyId": "uuid",
  "holderId": "uuid",
  "claimType": "MARINE_DAMAGE",
  "claimedAmount": 4800000,
  "incidentDate": "2025-02-15",
  "holderClaimHistory": {
    "totalPastClaims": 2,
    "avgClaimAmount": 600000,
    "lastClaimDate": "2024-11-10"
  },
  "timestamp": "2025-03-01T09:00:00Z"
}
```

### fraud-check-results
Key: claimId
Published by: ai-fraud-service
Consumed by: claims-service, notify-service

```json
{
  "requestId": "uuid",
  "claimId": "uuid",
  "claimNumber": "CLM-0091",
  "fraudScore": 87,
  "verdict": "HIGH_RISK",
  "anomalies": ["amount_spike_8x", "location_mismatch", "first_large_claim"],
  "modelVersion": "v1.4-isolation-forest",
  "timestamp": "2025-03-01T09:00:08Z"
}
```

### document-analysis-requests
Key: documentId
Published by: policy-service, workflow-service
Consumed by: ai-document-service

```json
{
  "requestId": "uuid",
  "documentId": "uuid",
  "policyId": "uuid",
  "documentType": "POLICY_PDF | CLAIM_EVIDENCE | ID_PROOF",
  "filePath": "/uploads/policies/policy-uuid.pdf",
  "instructions": "EXTRACT_FIELDS | COMPARE_WITH_TEMPLATE",
  "timestamp": "2025-03-01T09:00:00Z"
}
```

### document-analysis-results
Key: documentId
Published by: ai-document-service
Consumed by: policy-service

```json
{
  "requestId": "uuid",
  "documentId": "uuid",
  "policyId": "uuid",
  "extractedFields": {
    "policyNumber": "POL-2025-0839",
    "holderName": "Nexova Systems",
    "coverageAmount": 25000000
  },
  "confidenceScores": { "policyNumber": 0.98 },
  "timestamp": "2025-03-01T09:00:15Z"
}
```

### notification-events
Key: recipientId
Published by: policy-service, claims-service, workflow-service, renewal-service, rules-service
Consumed by: notify-service

```json
{
  "eventId": "uuid",
  "eventType": "POLICY_APPROVED | POLICY_REJECTED | CLAIM_SUBMITTED | CLAIM_APPROVED | CLAIM_FRAUD_FLAGGED | RENEWAL_REMINDER | WORKFLOW_ASSIGNED | COMPLIANCE_ALERT",
  "recipientId": "uuid",
  "recipientEmail": "user@example.com",
  "recipientName": "Rahul Mehta",
  "channel": "EMAIL",
  "subject": "Your policy POL-2025-0839 has been approved",
  "templateName": "policy-approved",
  "templateData": {
    "policyNumber": "POL-2025-0839",
    "holderName": "Nexova Systems",
    "approvedAt": "2025-03-01T09:00:00Z"
  },
  "timestamp": "2025-03-01T09:00:00Z"
}
```

### audit-events
Key: userId
Published by: all services
Consumed by: (audit store, analytics — future)

```json
{
  "eventId": "uuid",
  "eventType": "USER_LOGIN | POLICY_CREATED | CLAIM_FILED | RULE_EXECUTED | FRAUD_FLAGGED | STATUS_CHANGED",
  "userId": "uuid",
  "userEmail": "user@example.com",
  "userRole": "UNDERWRITER",
  "resourceType": "POLICY | CLAIM | RULE | USER",
  "resourceId": "uuid",
  "action": "CREATE | UPDATE | DELETE | APPROVE | REJECT",
  "details": {},
  "ipAddress": "192.168.1.1",
  "timestamp": "2025-03-01T09:00:00Z"
}
```

---

## Consumer Group IDs
```
policy-service-group
workflow-service-group
rules-service-group
claims-service-group
renewal-service-group
notify-service-group
ai-risk-service-group
ai-fraud-service-group
ai-document-service-group
ai-assistant-service-group
```

## Spring Kafka Config Template (Java)
```java
@Configuration
public class KafkaConfig {
    
    @Bean
    public ProducerFactory<String, Object> producerFactory() {
        Map<String, Object> props = new HashMap<>();
        props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class);
        props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, JsonSerializer.class);
        props.put(ProducerConfig.ACKS_CONFIG, "all");
        props.put(ProducerConfig.RETRIES_CONFIG, 3);
        return new DefaultKafkaProducerFactory<>(props);
    }

    @Bean
    public ConsumerFactory<String, Object> consumerFactory() {
        Map<String, Object> props = new HashMap<>();
        props.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        props.put(ConsumerConfig.GROUP_ID_CONFIG, groupId);
        props.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class);
        props.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, JsonDeserializer.class);
        props.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "earliest");
        props.put(JsonDeserializer.TRUSTED_PACKAGES, "com.insurai.*");
        return new DefaultKafkaConsumerFactory<>(props);
    }
}
```

## aiokafka Consumer Template (Python)
```python
from aiokafka import AIOKafkaConsumer, AIOKafkaProducer
import json

async def start_consumer():
    consumer = AIOKafkaConsumer(
        "risk-evaluation-requests",
        bootstrap_servers=settings.kafka_bootstrap_servers,
        group_id="ai-risk-service-group",
        value_deserializer=lambda v: json.loads(v.decode("utf-8")),
        auto_offset_reset="earliest",
    )
    await consumer.start()
    try:
        async for msg in consumer:
            await handle_message(msg.value)
    finally:
        await consumer.stop()
```
