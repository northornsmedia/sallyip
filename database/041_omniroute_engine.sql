-- Swap Dots engine for OmniRoute gateway in the Brain Observatory
DELETE FROM brain_engine_stats WHERE engine_slug='dots-studio/dots-3-note-preview:free';

INSERT INTO brain_engine_stats (engine_slug,base_weight,adaptive_weight) VALUES ('openrouter/google/gemini-3.5-flash-lite',14,14)
ON CONFLICT (engine_slug) DO NOTHING;
DELETE FROM brain_engine_stats WHERE engine_slug='auto/best-fast';

-- Clean up stale admin sessions referencing nothing; no-op safety for traces that referenced dots
UPDATE brain_wire_traces SET primary_engine='auto/best-fast' WHERE primary_engine='dots-studio/dots-3-note-preview:free';
