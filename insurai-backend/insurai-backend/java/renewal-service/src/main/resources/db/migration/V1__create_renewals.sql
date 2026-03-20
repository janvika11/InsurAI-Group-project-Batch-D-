CREATE TABLE renewals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id UUID NOT NULL,
  policy_number VARCHAR(50) NOT NULL,
  holder_id UUID NOT NULL,
  holder_email VARCHAR(255),
  expiry_date DATE NOT NULL,
  renewal_status VARCHAR(50) DEFAULT 'PENDING',
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

CREATE INDEX idx_renewals_policy ON renewals(policy_id);
CREATE INDEX idx_renewals_holder ON renewals(holder_id);
CREATE INDEX idx_renewals_status ON renewals(renewal_status);
CREATE INDEX idx_renewals_expiry ON renewals(expiry_date);
