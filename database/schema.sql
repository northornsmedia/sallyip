CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  full_name text NOT NULL,
  initials varchar(4) NOT NULL,
  role text NOT NULL DEFAULT 'researcher',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE plans (
  id text PRIMARY KEY,
  name text NOT NULL UNIQUE,
  price_monthly integer,
  message_limit integer,
  member_limit integer NOT NULL DEFAULT 1,
  is_academic boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id text NOT NULL REFERENCES plans(id),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','trialing','past_due','cancelled')),
  current_period_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'New conversation',
  model text NOT NULL DEFAULT 'SallyIP 4.1 Pro',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user','assistant','system')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX messages_conversation_created_idx ON messages(conversation_id, created_at);
CREATE INDEX conversations_user_updated_idx ON conversations(user_id, updated_at DESC);

CREATE TABLE datasets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  file_type text,
  size_bytes bigint,
  status text NOT NULL DEFAULT 'processing',
  rights_confirmed boolean NOT NULL DEFAULT false,
  visibility text NOT NULL DEFAULT 'private',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE training_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  dataset_id uuid REFERENCES datasets(id) ON DELETE SET NULL,
  name text NOT NULL,
  model text NOT NULL DEFAULT 'SallyIP 4.1 Pro',
  method text NOT NULL DEFAULT 'QLoRA',
  status text NOT NULL DEFAULT 'queued',
  progress smallint NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  loss numeric(8,4),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  training_job_id uuid REFERENCES training_jobs(id) ON DELETE SET NULL,
  name text NOT NULL,
  version text NOT NULL DEFAULT 'v1.0',
  base_model text NOT NULL,
  evaluation_score numeric(5,2),
  visibility text NOT NULL DEFAULT 'private',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE points_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount integer NOT NULL,
  activity text NOT NULL,
  source text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX points_ledger_user_created_idx ON points_ledger(user_id, created_at DESC);

INSERT INTO plans (id,name,price_monthly,message_limit,member_limit,is_academic) VALUES
  ('basic','Basic',900,100,1,false),
  ('pro','Pro',4900,NULL,1,false),
  ('scale','Scale',19900,NULL,5,false),
  ('university','Universities',0,NULL,100,true);

INSERT INTO users (email,full_name,initials,role)
VALUES ('carlos@sallyip.com','Carlos Northon','CN','owner');

INSERT INTO subscriptions (user_id,plan_id,status)
SELECT id,'pro','active' FROM users WHERE email='carlos@sallyip.com';
