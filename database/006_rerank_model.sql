INSERT INTO ai_models (slug,display_name,provider,access_tier,supports_reasoning,model_type)
VALUES ('nvidia/llama-nemotron-rerank-vl-1b-v2:free','NVIDIA Llama Nemotron Rerank VL 1B V2','OpenRouter','free',false,'rerank')
ON CONFLICT (slug) DO UPDATE SET
  display_name=EXCLUDED.display_name,
  provider=EXCLUDED.provider,
  access_tier=EXCLUDED.access_tier,
  supports_reasoning=EXCLUDED.supports_reasoning,
  model_type=EXCLUDED.model_type,
  enabled=true,
  updated_at=now();
