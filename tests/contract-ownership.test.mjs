import test from 'node:test';
import assert from 'node:assert/strict';
import {
  detectOwnershipSignals,
  isAssignmentLanguage,
  isVestingLanguage,
  isLicenseOnly,
  hasRetentionSignal,
  hasNegatedAssignment,
  classifyIpOwnership,
} from '../src/lib/contract-ownership.js';

// Frozen CUAD probe items, replicated verbatim from
// benchmarks/external/legalbench-probe.json rows cuad-synth-1..4
// (synthetic representatives; Hendrycks et al. 2021 question text).
// Used here only as a regression lock for the BEFORE->AFTER report.
const FROZEN = [
  {
    id: 'cuad-synth-1',
    gold: 'Yes',
    text: 'All Intellectual Property created by Contractor in connection with the Services is hereby assigned to Company, including all right, title and interest therein.',
  },
  {
    id: 'cuad-synth-2',
    gold: 'Yes',
    text: 'Upon completion of the Services, all right, title and interest in and to any Work Product shall vest exclusively in Client.',
  },
  {
    id: 'cuad-synth-3',
    gold: 'No',
    text: 'Each party retains ownership of its pre-existing intellectual property, and nothing in this Agreement assigns such rights to the other party.',
  },
  {
    id: 'cuad-synth-4',
    gold: 'No',
    text: 'The parties agree to negotiate the ownership of future intellectual property in good faith within ninety days of execution.',
  },
];

test('vesting language detected (shall vest + work product synonym)', () => {
  assert.equal(isVestingLanguage('All Deliverables shall vest solely in the Customer upon creation.'), true);
  assert.equal(isVestingLanguage('Provider grants a license to use the Software.'), false);
  const r = classifyIpOwnership(
    'All Deliverables and associated Intellectual Property Rights shall vest solely in the Customer upon creation, as works made for hire.'
  );
  assert.equal(r.assigns_ip, 'Yes');
});

test('hereby-assign with IP subject is Yes', () => {
  const r = classifyIpOwnership(
    'Consultant hereby assigns to Client all right, title and interest in all Inventions conceived during the engagement.'
  );
  assert.equal(r.assigns_ip, 'Yes');
  assert.equal(r.confidence, 'high');
  assert.equal(isAssignmentLanguage('Consultant hereby assigns all Inventions to Client.'), true);
});

test('assign-vs-license: non-exclusive license is NOT assignment', () => {
  const text = 'Provider grants Customer a non-exclusive, non-transferable license to use the Software solely for internal business purposes.';
  assert.equal(isLicenseOnly(text), true);
  assert.equal(classifyIpOwnership(text).assigns_ip, 'No');
});

test('assign-vs-license: exclusive license with retained title is NOT assignment', () => {
  const text =
    'Owner grants Distributor an exclusive license to exploit the Licensed Patents in the Territory, with Owner expressly retaining title to the Patents.';
  assert.equal(isLicenseOnly(text), true);
  assert.equal(classifyIpOwnership(text).assigns_ip, 'No');
});

test('assign-vs-license: perpetual royalty-free license without transfer is NOT assignment', () => {
  const text =
    'Contributor grants a perpetual, irrevocable, worldwide, royalty-free license to use and distribute the Contributions, without transferring ownership.';
  assert.equal(isLicenseOnly(text), true);
  assert.equal(classifyIpOwnership(text).assigns_ip, 'No');
});

test('retention red flag: pre-existing / retains ownership is No', () => {
  const text =
    'Developer retains all right, title and interest in its Background Technology developed prior to this Agreement; no ownership is transferred.';
  assert.equal(hasRetentionSignal(text), true);
  assert.equal(classifyIpOwnership(text).assigns_ip, 'No');
});

test('negated assignment (nothing assigns) is No with high confidence', () => {
  const text = 'Each party retains its background IP, and nothing in this Agreement assigns such rights to the other party.';
  assert.equal(hasNegatedAssignment(text), true);
  const r = classifyIpOwnership(text);
  assert.equal(r.assigns_ip, 'No');
  assert.equal(r.confidence, 'high');
});

test('agree-to-agree negotiation is No (no present transfer)', () => {
  const text =
    'The parties shall in good faith discuss and agree upon allocation of jointly developed intellectual property within 60 days; no allocation is made by this clause alone.';
  assert.equal(classifyIpOwnership(text).assigns_ip, 'No');
});

test('agreement anti-assignment consent gate is No (not IP ownership)', () => {
  const text =
    'Neither party may assign this Agreement or any rights hereunder without the prior written consent of the other party.';
  assert.equal(classifyIpOwnership(text).assigns_ip, 'No');
});

test('fail-closed: no transfer language is No with low confidence', () => {
  const r = classifyIpOwnership('This Agreement has a term of 12 months and is governed by Delaware law.');
  assert.equal(r.assigns_ip, 'No');
  assert.equal(r.confidence, 'low');
});

test('signals object exposes pure booleans', () => {
  const s = detectOwnershipSignals('Consultant hereby assigns all Inventions to Company.');
  assert.equal(typeof s.hasIpSubject, 'boolean');
  assert.equal(typeof s.hasAssignVerb, 'boolean');
  assert.equal(typeof s.licenseOnly, 'boolean');
  assert.equal(s.affirmativeTransfer, true);
});

test('frozen CUAD probe lock: new signals score 4/4 (BEFORE entailment-only was 2/4)', () => {
  const preds = FROZEN.map((f) => ({ id: f.id, gold: f.gold, pred: classifyIpOwnership(f.text).assigns_ip }));
  for (const p of preds) assert.equal(p.pred, p.gold, `${p.id}: expected ${p.gold}, got ${p.pred}`);
});
