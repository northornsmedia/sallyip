INSERT INTO ai_models (slug,display_name,provider,access_tier,supports_reasoning,model_type)
VALUES ('stealth/ox-alpha','Stealth OX Alpha','OpenRouter','standard',true,'chat')
ON CONFLICT (slug) DO UPDATE SET
  display_name=EXCLUDED.display_name,
  provider=EXCLUDED.provider,
  access_tier=EXCLUDED.access_tier,
  supports_reasoning=EXCLUDED.supports_reasoning,
  model_type=EXCLUDED.model_type,
  enabled=true,
  updated_at=now();
