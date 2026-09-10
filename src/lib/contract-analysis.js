// Contract analysis status — Phase 8.
// Regex layer is RULE_BASED_SCREENING only, never full legal analysis.
// Pipeline: deterministic signals -> segmentation -> model-assisted analysis (gated) ->
// playbook comparison -> clause citation -> risk reasoning -> human-review flag.

import { flagClause as regexFlag, splitClauses } from './contract-service.js';

export const ANALYSIS_LABEL = 'RULE_BASED_SCREENING';

export function screenContract(content, { playbook = null } = {}) {
  const clauses = splitClauses(content);
  return clauses.map((c) => {
    const signal = regexFlag(c.heading, c.body);
    return {
      ...c,
      screening: { ...signal, method: ANALYSIS_LABEL },
      playbook_position: playbook ? findPlaybookPosition(playbook, c) : null,
      requires_human_review: signal.risk_level !== 'green',
      evidence: { clause_ordinal: c.ordinal, heading: c.heading },
    };
  });
}

function findPlaybookPosition(playbook, clause) {
  const text = `${clause.heading}\n${clause.body}`.toLowerCase();
  for (const pos of playbook.positions || []) {
    if (pos.keywords?.some((k) => text.includes(String(k).toLowerCase()))) return pos;
  }
  return null;
}

// Model-assisted layer is explicitly gated by confidentiality policy.
// Free models must NOT receive contract text (see provider-policy.js).
export function assertModelAssistedAllowed({ mode }) {
  const m = String(mode || 'CONFIDENTIAL_IP').toUpperCase();
  if (m === 'CONFIDENTIAL_IP' || m === 'HIGHLY_CONFIDENTIAL') {
    const error = new Error(
      'Contract model-assisted analysis blocked: no approved confidential provider configured. Regex screening only.'
    );
    error.code = 'CONFIDENTIAL_PROVIDER_UNAVAILABLE';
    throw error;
  }
  return true;
}
