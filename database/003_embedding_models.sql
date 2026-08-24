ALTER TABLE ai_models ADD COLUMN IF NOT EXISTS model_type text NOT NULL DEFAULT 'chat';
ALTER TABLE ai_models ADD COLUMN IF NOT EXISTS embedding_dimensions integer;

UPDATE ai_models SET model_type='chat' WHERE slug='nvidia/nemotron-3.5-lightning:free';

INSERT INTO ai_models (slug,display_name,provider,access_tier,supports_reasoning,model_type,embedding_dimensions)
VALUES ('liquid/lfm-2.5-embedding-350m:free','Liquid LFM 2.5 Embedding 350M','OpenRouter','free',false,'embedding',1024)
ON CONFLICT (slug) DO UPDATE SET
  display_name=EXCLUDED.display_name,
  provider=EXCLUDED.provider,
  access_tier=EXCLUDED.access_tier,
  supports_reasoning=EXCLUDED.supports_reasoning,
  model_type=EXCLUDED.model_type,
  embedding_dimensions=EXCLUDED.embedding_dimensions,
  enabled=true,
  updated_at=now();
