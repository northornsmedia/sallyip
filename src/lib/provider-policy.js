// Provider confidentiality registry — Phase 1 hardening.
// Confidential matter content must NEVER reach a provider unless explicitly approved.
// Free / contributor-tier models train on prompts and are NOT approved for confidential IP.

export const EXECUTION_MODES = ['PUBLIC_RESEARCH', 'CONFIDENTIAL_IP', 'HIGHLY_CONFIDENTIAL'];

export const CONFIDENTIAL_CONTENT_CLASSES = [
  'unpublished_invention',
  'patent_draft',
  'invention_disclosure',
  'confidential_document',
  'nda_material',
  'litigation_evidence',
  'contract',
  'client_communication',
  'trade_secret',
  'privileged_material',
];

// Static registry. Retention/training posture as of 2026-09-10 hardening window.
// Unknown = fail closed (approved=false).
export const PROVIDER_REGISTRY = [
  {
    slug: 'gemini-3.7-flash',
    provider: 'google',
    model: 'gemini-3.7-flash',
    purpose: 'Primary flagship legal reasoning & drafting',
    paid: true,
    retention_policy: 'Google Cloud data handling; retains for abuse/security unless enterprise zero-retention addendum',
    training_policy: 'No training on Cloud API data with DPA; AI Studio free tier MAY train — do not use free tier for confidential IP',
    dpa_available: true,
    zero_retention_available: 'enterprise-only',
    region: 'us/global (config-dependent)',
    approved_for_confidential_ip: 'conditional',
    approved_for_unpublished_invention: 'conditional',
    approved_for_contracts: 'conditional',
    approved_for_litigation: 'conditional',
    fallback_allowed: true,
    approval_note: 'Set SALLYIP_APPROVE_GEMINI_CONFIDENTIAL=1 only after confirming paid Cloud project + DPA + no AI Studio free-tier routing.',
  },
  {
    slug: 'nvidia/nemotron-3-ultra-550b-a55b:free',
    provider: 'openrouter/nvidia',
    model: 'nemotron-3-ultra-550b-a55b:free',
    purpose: 'Secondary fallback legal-technical synthesis',
    paid: false,
    retention_policy: 'OpenRouter free-tier: requests may be retained and used for model improvement',
    training_policy: 'MAY TRAIN on prompts/completions',
    dpa_available: false,
    zero_retention_available: false,
    region: 'unknown',
    approved_for_confidential_ip: false,
    approved_for_unpublished_invention: false,
    approved_for_contracts: false,
    approved_for_litigation: false,
    fallback_allowed: 'public-only',
  },
  {
    slug: 'nvidia/nemotron-3.5-lightning:free',
    provider: 'openrouter/nvidia',
    model: 'nemotron-3.5-lightning:free',
    purpose: 'Fast fallback / rescue engine',
    paid: false,
    retention_policy: 'OpenRouter free-tier: may be retained/used for improvement',
    training_policy: 'MAY TRAIN on prompts/completions',
    dpa_available: false,
    zero_retention_available: false,
    region: 'unknown',
    approved_for_confidential_ip: false,
    approved_for_unpublished_invention: false,
    approved_for_contracts: false,
    approved_for_litigation: false,
    fallback_allowed: 'public-only',
  },
  {
    slug: 'liquid/lfm-2.5-embedding-350m:free',
    provider: 'openrouter/liquid',
    model: 'lfm-2.5-embedding-350m:free',
    purpose: 'Document + query embeddings',
    paid: false,
    retention_policy: 'OpenRouter free-tier: may be retained/used for improvement',
    training_policy: 'MAY TRAIN — embeddings leak document semantics; treat as confidential content',
    dpa_available: false,
    zero_retention_available: false,
    region: 'unknown',
    approved_for_confidential_ip: false,
    approved_for_unpublished_invention: false,
    approved_for_contracts: false,
    approved_for_litigation: false,
    fallback_allowed: 'public-only',
  },
  {
    slug: 'liquid/lfm-2.5-2.6b:free',
    provider: 'openrouter/liquid',
    model: 'lfm-2.5-2.6b:free',
    purpose: 'LFM chat / retrieval helper',
    paid: false,
    retention_policy: 'OpenRouter free-tier',
    training_policy: 'MAY TRAIN',
    dpa_available: false,
    zero_retention_available: false,
    region: 'unknown',
    approved_for_confidential_ip: false,
    approved_for_unpublished_invention: false,
    approved_for_contracts: false,
    approved_for_litigation: false,
    fallback_allowed: 'public-only',
  },
  {
    slug: 'dots-studio/dots-3-note-preview:free',
    provider: 'openrouter/dots-studio',
    model: 'dots-3-note-preview:free',
    purpose: 'Auxiliary chat',
    paid: false,
    retention_policy: 'OpenRouter free-tier',
    training_policy: 'MAY TRAIN',
    dpa_available: false,
    zero_retention_available: false,
    region: 'unknown',
    approved_for_confidential_ip: false,
    approved_for_unpublished_invention: false,
    approved_for_contracts: false,
    approved_for_litigation: false,
    fallback_allowed: 'public-only',
  },
  {
    slug: 'google/gemma-4-26b-a4b-it:free',
    provider: 'openrouter/google',
    model: 'gemma-4-26b-a4b-it:free',
    purpose: 'Auxiliary chat',
    paid: false,
    retention_policy: 'OpenRouter free-tier',
    training_policy: 'MAY TRAIN',
    dpa_available: false,
    zero_retention_available: false,
    region: 'unknown',
    approved_for_confidential_ip: false,
    approved_for_unpublished_invention: false,
    approved_for_contracts: false,
    approved_for_litigation: false,
    fallback_allowed: 'public-only',
  },
  {
    slug: 'nvidia/llama-nemotron-rerank-vl-1b-v2:free',
    provider: 'openrouter/nvidia',
    model: 'llama-nemotron-rerank-vl-1b-v2:free',
    purpose: 'Reranking retrieved passages (receives query + passage text)',
    paid: false,
    retention_policy: 'OpenRouter free-tier',
    training_policy: 'MAY TRAIN — rerank payload contains confidential passages',
    dpa_available: false,
    zero_retention_available: false,
    region: 'unknown',
    approved_for_confidential_ip: false,
    approved_for_unpublished_invention: false,
    approved_for_contracts: false,
    approved_for_litigation: false,
    fallback_allowed: 'public-only',
  },
  {
    slug: 'stealth/ox-alpha',
    provider: 'openrouter/stealth',
    model: 'ox-alpha',
    purpose: 'Undocumented auxiliary engine',
    paid: 'unknown',
    retention_policy: 'unknown — fail closed',
    training_policy: 'unknown — assume MAY TRAIN',
    dpa_available: false,
    zero_retention_available: false,
    region: 'unknown',
    approved_for_confidential_ip: false,
    approved_for_unpublished_invention: false,
    approved_for_contracts: false,
    approved_for_litigation: false,
    fallback_allowed: 'public-only',
  },
  {
    slug: 'official:epo-ops',
    provider: 'epo',
    model: 'n/a (official search API)',
    purpose: 'EPO patent search — receives search queries only, not full vault docs',
    paid: 'key-gated',
    retention_policy: 'EPO OPS terms; operational logs only',
    training_policy: 'No model training',
    dpa_available: true,
    zero_retention_available: 'n/a — query API',
    region: 'EU',
    approved_for_confidential_ip: 'query-only',
    approved_for_unpublished_invention: 'query-only-avoid-unpublished-terms',
    approved_for_contracts: false,
    approved_for_litigation: 'query-only',
    fallback_allowed: false,
  },
  {
    slug: 'official:euipo',
    provider: 'euipo',
    model: 'n/a',
    purpose: 'EUIPO trademark search — queries only',
    paid: 'key-gated',
    retention_policy: 'EUIPO API terms',
    training_policy: 'No model training',
    dpa_available: true,
    zero_retention_available: 'n/a',
    region: 'EU',
    approved_for_confidential_ip: 'query-only',
    approved_for_unpublished_invention: 'query-only',
    approved_for_contracts: false,
    approved_for_litigation: false,
    fallback_allowed: false,
  },
  {
    slug: 'official:uspto',
    provider: 'uspto',
    model: 'n/a',
    purpose: 'USPTO patent search — queries only',
    paid: 'key-gated',
    retention_policy: 'US federal API logging',
    training_policy: 'No model training',
    dpa_available: false,
    zero_retention_available: 'n/a',
    region: 'US',
    approved_for_confidential_ip: 'query-only',
    approved_for_unpublished_invention: 'query-only',
    approved_for_contracts: false,
    approved_for_litigation: 'query-only',
    fallback_allowed: false,
  },
  {
    slug: 'official:courtlistener',
    provider: 'free-law-project',
    model: 'n/a',
    purpose: 'CourtListener opinions — queries only',
    paid: 'key-gated',
    retention_policy: 'FLP API logging',
    training_policy: 'No model training',
    dpa_available: false,
    zero_retention_available: 'n/a',
    region: 'US',
    approved_for_confidential_ip: 'query-only',
    approved_for_unpublished_invention: false,
    approved_for_contracts: false,
    approved_for_litigation: 'query-only',
    fallback_allowed: false,
  },
];

const bySlug = new Map(PROVIDER_REGISTRY.map((r) => [r.slug, r]));

export function getProviderRecord(slug) {
  if (!slug) return null;
  if (bySlug.has(slug)) return bySlug.get(slug);
  // Unknown model: fail closed.
  return {
    slug,
    provider: 'unknown',
    model: slug,
    purpose: 'unregistered — fail closed',
    paid: 'unknown',
    retention_policy: 'unknown',
    training_policy: 'unknown — assume MAY TRAIN',
    dpa_available: false,
    zero_retention_available: false,
    region: 'unknown',
    approved_for_confidential_ip: false,
    approved_for_unpublished_invention: false,
    approved_for_contracts: false,
    approved_for_litigation: false,
    fallback_allowed: false,
  };
}

export function isFreeTierSlug(slug) {
  return /:free$/i.test(String(slug || '')) || String(slug || '').includes('free');
}

export function resolveExecutionMode(input = {}) {
  const raw =
    input.mode || input.execution_mode || process.env.SALLYIP_EXECUTION_MODE || 'CONFIDENTIAL_IP';
  const mode = String(raw).toUpperCase();
  if (EXECUTION_MODES.includes(mode)) return mode;
  return 'CONFIDENTIAL_IP';
}

export function isGeminiConfidentialApproved(env = {}) {
  return String(env.SALLYIP_APPROVE_GEMINI_CONFIDENTIAL || '').trim() === '1';
}

export function isEngineApprovedForMode(engine, mode, env = {}) {
  const slug = engine?.slug || engine;
  const record = getProviderRecord(slug);
  if (mode === 'PUBLIC_RESEARCH') return true;
  if (mode === 'CONFIDENTIAL_IP' || mode === 'HIGHLY_CONFIDENTIAL') {
    // Free tier never approved for confidential.
    if (record.paid === false || isFreeTierSlug(slug)) return false;
    if (record.approved_for_confidential_ip === false) return false;
    if (record.approved_for_confidential_ip === 'conditional') {
      // Currently only Gemini conditional path exists.
      if (String(slug).includes('gemini')) return isGeminiConfidentialApproved(env);
      return false;
    }
    if (record.approved_for_confidential_ip === 'query-only') return false; // search APIs are not chat engines
    if (mode === 'HIGHLY_CONFIDENTIAL') {
      // Highly confidential: only explicitly approved paid primary, no fallback engines.
      const primary = String(env.SALLYIP_PRIMARY_MODEL || '').trim();
      if (!primary || slug !== primary) return false;
      return isGeminiConfidentialApproved(env) || record.approved_for_confidential_ip === true;
    }
    return record.approved_for_confidential_ip === true;
  }
  return false;
}

export function filterEnginesForMode(engines, mode, env = {}) {
  return (engines || []).filter((e) => isEngineApprovedForMode(e, mode, env));
}

export function assertChatAllowed({ engines, mode, env = {} }) {
  const resolved = resolveExecutionMode({ mode });
  const allowed = filterEnginesForMode(engines, resolved, env);
  if ((resolved === 'CONFIDENTIAL_IP' || resolved === 'HIGHLY_CONFIDENTIAL') && allowed.length === 0) {
    const error = new Error(
      `Confidentiality fail-closed: no approved provider for mode ${resolved}. ` +
        `Free/contributor models are blocked for unpublished inventions, drafts, NDA, litigation, contracts. ` +
        `Configure SALLYIP_PRIMARY_MODEL with a paid zero-retention/DPA provider and set SALLYIP_APPROVE_GEMINI_CONFIDENTIAL=1 only after review.`
    );
    error.code = 'CONFIDENTIAL_PROVIDER_UNAVAILABLE';
    throw error;
  }
  return { mode: resolved, allowed };
}

export function assertEmbeddingAllowed({ model, mode, env = {} }) {
  const resolved = resolveExecutionMode({ mode });
  if (resolved === 'PUBLIC_RESEARCH') return { mode: resolved, allowed: true };
  const record = getProviderRecord(model);
  if (record.paid === false || isFreeTierSlug(model) || record.approved_for_confidential_ip !== true) {
    const error = new Error(
      `Confidentiality fail-closed: embedding model ${model} is not approved for ${resolved}. Embeddings leak document semantics.`
    );
    error.code = 'CONFIDENTIAL_EMBEDDING_BLOCKED';
    throw error;
  }
  return { mode: resolved, allowed: true };
}

export function assertRerankAllowed({ model, mode }) {
  const resolved = resolveExecutionMode({ mode });
  if (resolved === 'PUBLIC_RESEARCH') return { mode: resolved, allowed: true };
  const record = getProviderRecord(model);
  if (record.paid === false || isFreeTierSlug(model) || record.approved_for_confidential_ip !== true) {
    const error = new Error(
      `Confidentiality fail-closed: rerank model ${model} is not approved for ${resolved}. Rerank payload contains confidential passages.`
    );
    error.code = 'CONFIDENTIAL_RERANK_BLOCKED';
    throw error;
  }
  return { mode: resolved, allowed: true };
}
