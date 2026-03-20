CREATE TYPE rule_status AS ENUM ('ACTIVE', 'DRAFT', 'DISABLED');

CREATE TABLE rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  trigger_event VARCHAR(100) NOT NULL,
  rule_definition JSONB NOT NULL,
  priority INTEGER DEFAULT 100,
  status rule_status DEFAULT 'ACTIVE',
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE rule_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID REFERENCES rules(id),
  entity_id UUID NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  input_data JSONB,
  output_data JSONB,
  passed BOOLEAN NOT NULL,
  executed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_rules_trigger ON rules(trigger_event);
CREATE INDEX idx_rules_status ON rules(status);
CREATE INDEX idx_rule_executions_entity ON rule_executions(entity_id, entity_type);

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
