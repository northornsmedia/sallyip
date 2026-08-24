INSERT INTO ai_models (slug,display_name,provider,access_tier,supports_reasoning,model_type)
VALUES ('z-ai/glm-5.2:free','Z.AI GLM 5.2','OpenRouter','free',true,'chat')
ON CONFLICT (slug) DO UPDATE SET
  display_name=EXCLUDED.display_name,
  provider=EXCLUDED.provider,
  access_tier=EXCLUDED.access_tier,
  supports_reasoning=EXCLUDED.supports_reasoning,
  model_type=EXCLUDED.model_type,
  enabled=true,
  updated_at=now();
