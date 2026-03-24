ALTER TABLE claims
  ALTER COLUMN claim_type TYPE VARCHAR(50) USING claim_type::text,
  ALTER COLUMN status TYPE VARCHAR(50) USING status::text;

ALTER TABLE claim_status_history
  ALTER COLUMN from_status TYPE VARCHAR(50) USING from_status::text,
  ALTER COLUMN to_status TYPE VARCHAR(50) USING to_status::text;

ALTER TABLE claims
  ALTER COLUMN status SET DEFAULT 'SUBMITTED';
