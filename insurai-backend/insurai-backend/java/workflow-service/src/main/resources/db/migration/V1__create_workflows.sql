CREATE TYPE workflow_status AS ENUM ('PENDING', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'ESCALATED');
CREATE TYPE step_type AS ENUM ('RISK_SCORING', 'UNDERWRITER_REVIEW', 'SENIOR_REVIEW', 'FINAL_APPROVAL');

CREATE TABLE workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id UUID NOT NULL UNIQUE,
  policy_number VARCHAR(50) NOT NULL,
  holder_id UUID,
  holder_name VARCHAR(255),
  policy_type VARCHAR(50),
  status workflow_status DEFAULT 'PENDING',
  current_step step_type DEFAULT 'RISK_SCORING',
  assigned_to UUID,
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

CREATE INDEX idx_workflows_policy ON workflows(policy_id);
CREATE INDEX idx_workflows_status ON workflows(status);
CREATE INDEX idx_workflows_assigned ON workflows(assigned_to);
