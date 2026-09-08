ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('owner','admin','researcher','viewer'));

CREATE TABLE IF NOT EXISTS security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  ip text,
  user_agent text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL,
  attempted_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS security_events_user_idx ON security_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS security_events_type_idx ON security_events(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS login_attempts_identifier_idx ON login_attempts(identifier, attempted_at DESC);
