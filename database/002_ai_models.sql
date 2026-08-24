CREATE TABLE IF NOT EXISTS ai_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  display_name text NOT NULL,
  provider text NOT NULL,
  access_tier text NOT NULL DEFAULT 'free',
  supports_reasoning boolean NOT NULL DEFAULT false,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO ai_models (slug,display_name,provider,access_tier,supports_reasoning)
VALUES ('nvidia/nemotron-3.5-lightning:free','NVIDIA Nemotron 3.5 Lightning','OpenRouter','free',true)
ON CONFLICT (slug) DO UPDATE SET
  display_name=EXCLUDED.display_name,
  provider=EXCLUDED.provider,
  access_tier=EXCLUDED.access_tier,
  supports_reasoning=EXCLUDED.supports_reasoning,
  enabled=true,
  updated_at=now();
