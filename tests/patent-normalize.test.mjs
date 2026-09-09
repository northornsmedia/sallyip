import test from 'node:test'
import assert from 'node:assert/strict'
import { canonicalizeResult, groupIntoFamilies, normalizeDate, normalizedNumber, parsePublicationNumber } from '../src/lib/patent-normalize-service.js'

test('parses US, EP and WO publication numbers', () => {
  assert.deepEqual(parsePublicationNumber('US2024001234A1'), { country: 'US', number: '2024001234', kind: 'A1' })
  assert.deepEqual(parsePublicationNumber('EP 1234567 A1'), { country: 'EP', number: '1234567', kind: 'A1' })
  assert.deepEqual(parsePublicationNumber('WO2023/123456'), { country: 'WO', number: '2023123456', kind: null })
  assert.equal(parsePublicationNumber('not-a-patent'), null)
  assert.equal(normalizedNumber(parsePublicationNumber('US11234567B2')), 'US11234567B2')
})

test('normalises common date shapes to ISO', () => {
  assert.equal(normalizeDate('2022-04-05'), '2022-04-05')
  assert.equal(normalizeDate('04/05/2022'), '2022-04-05')
  assert.equal(normalizeDate('5 April 2022'), '2022-04-05')
  assert.equal(normalizeDate('nonsense'), null)
  assert.equal(normalizeDate(null), null)
})

test('shared priority numbers form one family, labelled honestly', () => {
  const records = [
    { external_id: 'US2024001234A1', country: 'US', priority_numbers: ['US202261234567'] },
    { external_id: 'EP4123456A1', country: 'EP', priority_numbers: ['US202261234567'] },
    { external_id: 'GB2600000A', country: 'GB', priority_numbers: ['GB202200111'] },
  ]
  const families = groupIntoFamilies(records)
  assert.equal(families.length, 2)
  const joint = families.find(f => f.members.length === 2)
  assert.equal(joint.family_method, 'shared-priority')
  assert.ok(joint.family_key.startsWith('pri:'))
})

test('records without priority data stay unresolved, never forced', () => {
  const families = groupIntoFamilies([{ external_id: 'US9999999B1', country: 'US', priority_numbers: [] }])
  assert.equal(families.length, 1)
  assert.equal(families[0].family_method, 'unresolved')
})

test('canonicalizes EPO adapter output preserving raw', () => {
  const row = canonicalizeResult('epo_ops', { external_id: 'EP1234567A1', title: 'Widget', country: 'EP', raw_metadata: { priorityNumber: 'EP202001234' } })
  assert.equal(row.normalized_number, 'EP1234567A1')
  assert.deepEqual(row.priority_numbers, ['EP202001234'])
  assert.equal(row.provider, 'epo_ops')
})
