CREATE TYPE claim_status AS ENUM (
  'SUBMITTED', 'UNDER_REVIEW', 'FRAUD_REVIEW', 'INVESTIGATION',
  'APPROVED', 'REJECTED', 'SETTLED', 'WITHDRAWN'
);

CREATE TYPE claim_type AS ENUM (
  'MEDICAL_EXPENSE', 'HOSPITALIZATION', 'ACCIDENT', 'PROPERTY_DAMAGE',
  'MARINE_DAMAGE', 'PUBLIC_LIABILITY', 'EMPLOYEE_HEALTH', 'GROUP_MEDICAL', 'OTHER'
);

CREATE TABLE claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_number VARCHAR(50) UNIQUE NOT NULL,
  policy_id UUID NOT NULL,
  policy_number VARCHAR(50) NOT NULL,
  holder_id UUID NOT NULL,
  holder_name VARCHAR(255) NOT NULL,
  claim_type claim_type NOT NULL,
  status claim_status DEFAULT 'SUBMITTED',
  claimed_amount DECIMAL(15,2) NOT NULL,
  approved_amount DECIMAL(15,2),
  incident_date DATE NOT NULL,
  description TEXT,
  fraud_score INTEGER,
  fraud_verdict VARCHAR(50),
  fraud_factors JSONB,
  assigned_adjuster_id UUID,
  filed_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE claim_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID REFERENCES claims(id) ON DELETE CASCADE,
  from_status claim_status,
  to_status claim_status NOT NULL,
  changed_by UUID NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE claim_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID REFERENCES claims(id) ON DELETE CASCADE,
  document_name VARCHAR(255) NOT NULL,
  document_type VARCHAR(100),
  file_path VARCHAR(500) NOT NULL,
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_claims_policy ON claims(policy_id);
CREATE INDEX idx_claims_holder ON claims(holder_id);
CREATE INDEX idx_claims_status ON claims(status);
CREATE INDEX idx_claims_number ON claims(claim_number);

CREATE SEQUENCE claim_number_seq START 100;
