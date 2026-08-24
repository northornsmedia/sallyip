INSERT INTO ai_models (slug,display_name,provider,access_tier,supports_reasoning,model_type)
VALUES ('google/gemma-4-26b-a4b-it:free','Google Gemma 4 26B A4B IT','OpenRouter','free',true,'chat')
ON CONFLICT (slug) DO UPDATE SET
  display_name=EXCLUDED.display_name,
  provider=EXCLUDED.provider,
  access_tier=EXCLUDED.access_tier,
  supports_reasoning=EXCLUDED.supports_reasoning,
  model_type=EXCLUDED.model_type,
  enabled=true,
  updated_at=now();
