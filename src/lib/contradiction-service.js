// Contradiction detection — Phase 5A.
// Deterministic, no LLM self-grading. Classifies cross-authority conflicts.

export const CONFLICT_CLASSES = [
  'NO_CONFLICT',
  'POTENTIAL_CONFLICT',
  'MATERIAL_CONFLICT',
  'RESOLVED_BY_HIGHER_AUTHORITY',
  'UNRESOLVED',
];

const NEG = /\b(not|no|never|neither|nor|without|except|unless|prohibit|forbid|deny|denies|denied|reject|rejects|refuse|refuses|fail|fails|lack|lacks|absent|void|invalid|ineligible|unpatentable)\b/i;

function norm(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9 §]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function sectionRefs(s) {
  return [...String(s || '').matchAll(/§\s*(\d{2,4}[a-z]?(?:\(\w+\))?)/g)].map((m) => m[1].replace(/\(.*/, ''));
}

// Authority tier: lower number = higher authority (1 = statute/court, 4 = discovery).
export function classifyContradiction({ proposition, passages = [] } = {}) {
  if (!passages.length) return { class: 'UNRESOLVED', reason: 'no passages to compare', details: [] };
  const pNorm = norm(proposition);
  const pNeg = NEG.test(proposition || '');
  const details = passages.map((p) => {
    const cNeg = NEG.test(p.content || '');
    const pSecs = sectionRefs(proposition);
    const cSecs = new Set(sectionRefs(`${p.locator || ''} ${p.content || ''}`));
    const sectionMismatch = pSecs.length > 0 && !pSecs.some((s) => cSecs.has(s));
    return {
      passage_id: p.passage_id || p.id || null,
      authority_tier: p.authority_tier ?? null,
      negation_flip: pNeg !== cNeg,
      section_mismatch: sectionMismatch,
      content_excerpt: String(p.content || '').slice(0, 160),
    };
  });

  const flips = details.filter((d) => d.negation_flip);
  if (!flips.length) return { class: 'NO_CONFLICT', reason: 'no negation flip across passages', details };

  // If highest-authority passages agree, lower-tier disagreement is resolved upward.
  const tiers = [...new Set(details.map((d) => d.authority_tier).filter((t) => t !== null))].sort((a, b) => a - b);
  if (tiers.length >= 2) {
    const top = Math.min(...tiers);
    const topFlip = details.filter((d) => d.authority_tier === top && d.negation_flip);
    if (!topFlip.length) {
      return { class: 'RESOLVED_BY_HIGHER_AUTHORITY', reason: `tier ${top} agrees; lower-tier conflict set aside`, details };
    }
  }

  const material = flips.some((d) => !d.section_mismatch);
  if (material) {
    return {
      class: 'MATERIAL_CONFLICT',
      reason: 'passages negate the proposition on the same section — surface to user',
      details,
      must_surface: true,
      user_message: 'Conflicting authorities found. Review both passages before relying on this conclusion.',
    };
  }
  return { class: 'POTENTIAL_CONFLICT', reason: 'negation signal but different sections — needs reviewer', details, must_surface: true };
}
