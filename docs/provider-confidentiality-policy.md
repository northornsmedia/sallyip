# Provider confidentiality policy (Phase 1 — enforced)

Default execution mode: `CONFIDENTIAL_IP` (fail-closed). See `src/lib/provider-policy.js`.

## Modes
- `PUBLIC_RESEARCH`: public-domain statutes, published patents, general education. Free models allowed.
- `CONFIDENTIAL_IP`: any matter content, uploads, drafts, NDA, client comms. Free/contributor models BLOCKED. Fails closed if no approved provider.
- `HIGHLY_CONFIDENTIAL`: unpublished inventions, trade secrets, litigation strategy. Only explicitly approved paid primary; no fallback.

Set via `SALLYIP_EXECUTION_MODE` or per-request `options.mode`. Orchestrator enforces in `src/lib/sally-orchestrator.js` (`assertChatAllowed`, embedding gate).

## Registry summary (`PROVIDER_REGISTRY`)
| slug | paid | trains? | confidential chat | notes |
|---|---|---|---|---|
| gemini-3.7-flash | yes (Cloud) | No with DPA; AI Studio free MAY train | conditional — requires `SALLYIP_APPROVE_GEMINI_CONFIDENTIAL=1` + paid project + DPA | never route free-tier key |
| nvidia/nemotron-3-ultra-550b-a55b:free | no | MAY TRAIN | NO | public-only fallback |
| nvidia/nemotron-3.5-lightning:free | no | MAY TRAIN | NO | public-only / rescue only for public |
| liquid/lfm-2.5-embedding-350m:free | no | MAY TRAIN (embeddings leak semantics) | NO | blocked for confidential; local embedding still TODO |
| liquid/lfm-2.5-2.6b:free, dots-3-note-preview:free, gemma-4-26b-a4b-it:free | no | MAY TRAIN | NO | public-only |
| nvidia/llama-nemotron-rerank-vl-1b-v2:free | no | MAY TRAIN (sees passages) | NO | blocked for confidential |
| stealth/ox-alpha | unknown | assume MAY TRAIN | NO | unregistered — fail closed |
| official:epo-ops / euipo / uspto / courtlistener | key-gated | No training | query-only | send search queries only, never full vault docs |

Unknown slugs fail closed (`getProviderRecord` default deny).

## Rules
1. Confidential content NEVER sent to unapproved provider (chat, embedding, rerank, ingestion, background).
2. No automatic fallback from approved -> free. `filterEnginesForMode` removes free engines; empty set throws `CONFIDENTIAL_PROVIDER_UNAVAILABLE`.
3. Keys separated per engine (`OPENROUTER_*_API_KEY`, `GEMINI_API_KEY`, `SALLYIP_PRIMARY_KEY`). Do not share free keys with confidential path.
4. Embeddings: `assertEmbeddingAllowed` blocks free embedding for confidential; current state = embeddings skipped (`blocked_confidential`) until paid zero-retention embedding is configured — retrieval degrades to lexical + packs (documented limitation, not silent).
5. Benchmarks on public statutes may run `SALLYIP_EXECUTION_MODE=PUBLIC_RESEARCH` explicitly; matter chat must not.

## To approve Gemini for confidential
1. Paid Google Cloud project (not AI Studio free), DPA signed, data region pinned.
2. Confirm zero-retention/abuse-retention terms with counsel.
3. Set `SALLYIP_APPROVE_GEMINI_CONFIDENTIAL=1`.
4. Record decision + date in `SECURITY_IMPLEMENTATION_LOG.md`.
