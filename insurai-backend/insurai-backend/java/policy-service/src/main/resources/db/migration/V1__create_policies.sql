CREATE TYPE policy_status AS ENUM (
  'DRAFT', 'PENDING_REVIEW', 'APPROVED', 'ACTIVE', 'REJECTED', 'EXPIRED', 'CANCELLED'
);

CREATE TYPE policy_type AS ENUM (
  'CORPORATE_HEALTH', 'GROUP_LIFE', 'TERM_LIFE', 'VEHICLE',
  'FIRE_HAZARD', 'MARINE_CARGO', 'CYBER_RISK', 'PUBLIC_LIABILITY', 'HOME'
);

CREATE TABLE policy_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  policy_type policy_type NOT NULL,
  template_data JSONB NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_number VARCHAR(50) UNIQUE NOT NULL,
  holder_id UUID NOT NULL,
  holder_name VARCHAR(255) NOT NULL,
  org_id UUID,
  policy_type policy_type NOT NULL,
  status policy_status DEFAULT 'DRAFT',
  premium_amount DECIMAL(15,2),
  coverage_amount DECIMAL(15,2),
  start_date DATE,
  end_date DATE,
  risk_score INTEGER,
  ai_recommendation VARCHAR(50),
  template_id UUID REFERENCES policy_templates(id),
  metadata JSONB,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE policy_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id UUID REFERENCES policies(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  snapshot JSONB NOT NULL,
  changed_by UUID NOT NULL,
  change_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE policy_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id UUID REFERENCES policies(id) ON DELETE CASCADE,
  document_name VARCHAR(255) NOT NULL,
  document_type VARCHAR(100),
  file_path VARCHAR(500),
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_policies_holder ON policies(holder_id);
CREATE INDEX idx_policies_status ON policies(status);
CREATE INDEX idx_policies_number ON policies(policy_number);

CREATE SEQUENCE policy_number_seq START 100;
