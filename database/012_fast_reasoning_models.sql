UPDATE ai_models SET enabled=false,updated_at=now() WHERE slug='z-ai/glm-5.2:free';

INSERT INTO ai_models(slug,display_name,provider,access_tier,supports_reasoning,model_type,enabled)
VALUES
 ('liquid/lfm-2.5-2.6b:free','Liquid LFM 2.5 2.6B','OpenRouter','free',true,'chat',true),
 ('dots-studio/dots-3-note-preview:free','Dots 3 Note Preview','OpenRouter','free',true,'chat',true)
ON CONFLICT(slug) DO UPDATE SET display_name=EXCLUDED.display_name,provider=EXCLUDED.provider,access_tier=EXCLUDED.access_tier,supports_reasoning=EXCLUDED.supports_reasoning,model_type=EXCLUDED.model_type,enabled=true,updated_at=now();
