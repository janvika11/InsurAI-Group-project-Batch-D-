# workflow-service – Cursor Build Instructions

## Overview
Manages policy approval workflows with state machine. Assigns underwriters, tracks approvals/escalations.

## application.yml
```yaml
server:
  port: 8083
spring:
  datasource:
    url: ${SPRING_DATASOURCE_URL:jdbc:postgresql://localhost:5434/workflowdb}
    username: insurai
    password: insurai123
kafka:
  bootstrap-servers: ${KAFKA_BOOTSTRAP_SERVERS:localhost:9092}
```

## Database (V1__create_workflows.sql)
```sql
CREATE TYPE workflow_status AS ENUM ('PENDING', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'ESCALATED');
CREATE TYPE step_type AS ENUM ('RISK_SCORING', 'UNDERWRITER_REVIEW', 'SENIOR_REVIEW', 'FINAL_APPROVAL');

CREATE TABLE workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id UUID NOT NULL UNIQUE,
  policy_number VARCHAR(50) NOT NULL,
  status workflow_status DEFAULT 'PENDING',
  current_step step_type DEFAULT 'RISK_SCORING',
  assigned_to UUID,                      -- underwriter user ID
  risk_score INTEGER,
  escalation_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE workflow_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
  step_type step_type NOT NULL,
  status VARCHAR(50),
  actor_id UUID,
  notes TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## REST API

### GET /api/workflows
Query: status, assignedTo, page, size

### GET /api/workflows/{policyId}
Get workflow for a policy.

### PUT /api/workflows/{id}/assign
Body: `{ "underwriterId": "uuid" }` — ADMIN only

### PUT /api/workflows/{id}/decision
Body: `{ "decision": "APPROVED|REJECTED|ESCALATE", "notes": "..." }`
Only UNDERWRITER assigned to this workflow.

### GET /api/workflows/my-queue
Returns workflows assigned to current user (X-User-Id).

## Kafka Consumers
← policy-events (POLICY_CREATED) → create workflow entry, set status PENDING
← risk-evaluation-results → update workflow risk_score, advance to UNDERWRITER_REVIEW

## Kafka Producers
→ policy-events (WORKFLOW_APPROVED / WORKFLOW_REJECTED)
→ notification-events (assigned underwriter, policy holder)
→ audit-events

## State Machine
PENDING → (risk scored) → IN_REVIEW → (approved) → APPROVED
                                     → (escalated) → ESCALATED → (senior approved) → APPROVED
                                     → (rejected) → REJECTED

---

# rules-service – Cursor Build Instructions

## Overview
Rule engine for eligibility, compliance (IRDAI), and auto-routing decisions.
Consumes policy events and risk results, evaluates rules, produces outcome events.

## application.yml
```yaml
server:
  port: 8084
spring:
  datasource:
    url: ${SPRING_DATASOURCE_URL:jdbc:postgresql://localhost:5435/rulesdb}
kafka:
  bootstrap-servers: ${KAFKA_BOOTSTRAP_SERVERS:localhost:9092}
```

## Database (V1__create_rules.sql)
```sql
CREATE TYPE rule_status AS ENUM ('ACTIVE', 'DRAFT', 'DISABLED');

CREATE TABLE rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_code VARCHAR(50) UNIQUE NOT NULL,   -- RUL-001
  name VARCHAR(255) NOT NULL,
  description TEXT,
  trigger_event VARCHAR(100) NOT NULL,     -- POLICY_CREATED, RISK_SCORE_GT_70, etc.
  rule_definition JSONB NOT NULL,          -- conditions + actions in JSON DSL
  priority INTEGER DEFAULT 100,
  status rule_status DEFAULT 'ACTIVE',
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE rule_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID REFERENCES rules(id),
  entity_id UUID NOT NULL,              -- policyId or claimId
  entity_type VARCHAR(50) NOT NULL,
  input_data JSONB,
  output_data JSONB,
  passed BOOLEAN NOT NULL,
  executed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default rules
INSERT INTO rules (rule_code, name, trigger_event, rule_definition, priority) VALUES
('RUL-001', 'Eligibility Check', 'POLICY_CREATED', 
  '{"conditions": [{"field": "age", "operator": "gte", "value": 18}, {"field": "coverage_amount", "operator": "lte", "value": 100000000}], "action": "PROCEED"}', 10),
('RUL-002', 'IRDAI Compliance Check', 'POLICY_APPROVED',
  '{"conditions": [{"field": "premium_to_coverage_ratio", "operator": "gte", "value": 0.001}], "action": "PROCEED"}', 20),
('RUL-003', 'High Risk Auto-Escalate', 'RISK_EVALUATED',
  '{"conditions": [{"field": "risk_score", "operator": "gt", "value": 70}], "action": "ESCALATE"}', 5),
('RUL-004', 'Auto-Renewal Reminder', 'POLICY_EXPIRY_30D',
  '{"conditions": [{"field": "status", "operator": "eq", "value": "ACTIVE"}], "action": "SEND_RENEWAL"}', 50);
```

## REST API

### GET /api/rules
Returns all rules with their definitions.

### POST /api/rules
Create new rule (ADMIN only).

### PUT /api/rules/{id}
Update rule. Changes trigger recompile. (ADMIN only)

### DELETE /api/rules/{id}
Soft delete (set status DISABLED). (ADMIN only)

### POST /api/rules/evaluate
Manual rule evaluation for testing:
```json
{ "trigger": "POLICY_CREATED", "entityId": "uuid", "data": {...} }
```

## Kafka Consumers
← policy-events → evaluate POLICY_CREATED rules
← risk-evaluation-results → evaluate RISK_EVALUATED rules (check if auto-escalate)

## Kafka Producers
→ policy-events (RULE_PASSED, RULE_FAILED)
→ notification-events (compliance failures)
→ audit-events

---

# renewal-service – Cursor Build Instructions

## Overview
Tracks policy expiry, sends renewal reminders, generates renewal quotes.
Has scheduled jobs (Spring @Scheduled).

## application.yml
```yaml
server:
  port: 8086
spring:
  datasource:
    url: ${SPRING_DATASOURCE_URL:jdbc:postgresql://localhost:5437/renewaldb}
kafka:
  bootstrap-servers: ${KAFKA_BOOTSTRAP_SERVERS:localhost:9092}
```

## Database (V1__create_renewals.sql)
```sql
CREATE TABLE renewals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id UUID NOT NULL,
  policy_number VARCHAR(50) NOT NULL,
  holder_id UUID NOT NULL,
  holder_email VARCHAR(255),
  expiry_date DATE NOT NULL,
  renewal_status VARCHAR(50) DEFAULT 'PENDING',  -- PENDING / NOTIFIED / RENEWED / LAPSED
  last_reminded_at TIMESTAMPTZ,
  renewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE renewal_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  renewal_id UUID REFERENCES renewals(id),
  quoted_premium DECIMAL(15,2) NOT NULL,
  quote_valid_until DATE NOT NULL,
  discount_percent DECIMAL(5,2) DEFAULT 0,
  accepted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Scheduled Jobs (Spring @Scheduled)
```java
// Run every day at 9 AM IST
@Scheduled(cron = "0 0 9 * * *", zone = "Asia/Kolkata")
public void sendExpiryReminders() {
    // Find policies expiring in 30 days → send notification-events
    // Find policies expiring in 7 days → send urgent notification-events
    // Find expired policies → update status to EXPIRED, publish policy-events
}

@Scheduled(cron = "0 0 0 1 * *")  // First of every month
public void generateRenewalQuotes() {
    // Generate quotes for policies expiring in next 60 days
}
```

## REST API

### GET /api/renewals
Query: status, holderId, expiresInDays, page, size

### GET /api/renewals/{id}
Full renewal detail with quotes.

### POST /api/renewals/{id}/accept-quote
Accept a renewal quote (initiates new policy creation).

## Kafka Consumers
← policy-events (POLICY_APPROVED / POLICY_ACTIVE) → create renewal tracking record
← policy-events (POLICY_EXPIRED) → mark renewal lapsed

## Kafka Producers
→ notification-events (renewal reminders, expiry alerts)
→ policy-events (RENEWAL_INITIATED when customer accepts quote)

---

# notify-service – Cursor Build Instructions

## Overview
Stateless event-driven notification service. Consumes notification-events topic,
sends email (SMTP), SMS (future), Teams webhook.

## application.yml
```yaml
server:
  port: 8087
spring:
  mail:
    host: ${SMTP_HOST:smtp.gmail.com}
    port: ${SMTP_PORT:587}
    username: ${SMTP_USER:}
    password: ${SMTP_PASS:}
    properties:
      mail.smtp.auth: true
      mail.smtp.starttls.enable: true
kafka:
  bootstrap-servers: ${KAFKA_BOOTSTRAP_SERVERS:localhost:9092}
  consumer:
    group-id: notify-service-group
```

## No database required (stateless). Optional: notification_logs table.

## Package Structure
```
com.insurai.notify
├── NotifyServiceApplication.java
├── kafka/
│   └── NotificationEventConsumer.java   # @KafkaListener on notification-events
├── service/
│   ├── EmailService.java                # JavaMailSender
│   ├── TemplateService.java             # Thymeleaf email templates
│   └── NotificationDispatcher.java      # routes to email/SMS/teams
└── dto/
    └── NotificationEvent.java
```

## Notification Event Schema (consumed from Kafka)
```json
{
  "eventType": "POLICY_APPROVED | CLAIM_STATUS_CHANGED | RENEWAL_REMINDER | FRAUD_ALERT | WORKFLOW_ASSIGNED",
  "recipientId": "uuid",
  "recipientEmail": "user@example.com",
  "recipientName": "Rahul Mehta",
  "channel": "EMAIL",
  "subject": "Your policy has been approved",
  "templateName": "policy-approved",
  "templateData": {
    "policyNumber": "POL-2025-0839",
    "holderName": "Nexova Systems"
  },
  "timestamp": "2025-03-01T09:00:00Z"
}
```

## Email Templates (Thymeleaf, in resources/templates/)
- `policy-approved.html`
- `policy-rejected.html`
- `claim-submitted.html`
- `claim-approved.html`
- `claim-fraud-flagged.html`
- `renewal-reminder.html`
- `workflow-assigned.html`

