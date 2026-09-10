import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { classifyContradiction } from '../../src/lib/contradiction-service.js';
import { validateAuthorityCurrency } from '../../src/lib/temporal-service.js';
import { checkEntailment } from '../../src/lib/entailment-service.js';

test('material contradiction surfaces to user', () => {
  const r = classifyContradiction({
    proposition: 'A composition of matter is not patentable under 35 U.S.C. § 101',
    passages: [
      { passage_id: 'p1', authority_tier: 1, content: 'Whoever invents any new and useful composition of matter may obtain a patent', locator: '§ 101' },
    ],
  });
  assert.ok(['MATERIAL_CONFLICT', 'POTENTIAL_CONFLICT'].includes(r.class));
  assert.equal(r.must_surface, true);
});

test('no conflict when passages agree', () => {
  const r = classifyContradiction({
    proposition: 'Composition of matter may be patented',
    passages: [{ passage_id: 'p1', authority_tier: 1, content: 'composition of matter may obtain a patent', locator: '§ 101' }],
  });
  assert.equal(r.class, 'NO_CONFLICT');
});

test('temporal validation qualifies when currency unknown', () => {
  const r = validateAuthorityCurrency({ jurisdiction: null });
  assert.equal(r.qualify, true);
  assert.ok(r.user_message);
});

test('superseded authority is flagged, never silently used', () => {
  const r = validateAuthorityCurrency({ jurisdiction: 'US', effective_date: '2020-01-01', superseded_by: 'Pub. L. 118-1', retrieved_at: new Date().toISOString() });
  assert.equal(r.verdict, 'SUPERSEDED');
});

test('entailment is independent from citation existence', () => {
  const good = checkEntailment('composition of matter may obtain a patent', 'Whoever invents any new composition of matter may obtain a patent');
  const bad = checkEntailment('software per se is patentable with no exceptions', 'Whoever invents any new composition of matter may obtain a patent');
  assert.ok(['ENTAILS', 'PARTIALLY_SUPPORTS'].includes(good.verdict));
  assert.ok(['DOES_NOT_SUPPORT', 'CONTEXT_ONLY', 'CONTRADICTS'].includes(bad.verdict));
});
