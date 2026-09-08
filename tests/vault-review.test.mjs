import test from 'node:test'
import assert from 'node:assert/strict'
import { extractCell, validateColumns } from '../src/lib/vault-review-service.js'

test('review columns require keys and valid patterns', () => {
  assert.throws(() => validateColumns([]), /At least one column/)
  assert.throws(() => validateColumns([{ key: 'x', pattern: '([' }]), /invalid pattern/)
  const cols = validateColumns([{ key: 'Renewal Date', label: 'Renewal', pattern: 'renewal.{0,20}(\\d{4}-\\d{2}-\\d{2})' }])
  assert.equal(cols[0].key, 'renewal_date')
})

test('extraction prefers regex capture then keyword snippet', () => {
  assert.equal(extractCell('Renewal date 2027-03-01 confirmed.', { pattern: 'renewal date (\\d{4}-\\d{2}-\\d{2})', keywords: [] }), '2027-03-01')
  assert.match(extractCell('The agreement renews automatically each year.', { pattern: null, keywords: ['renews automatically'] }), /renews automatically/)
  assert.equal(extractCell('Nothing relevant here.', { pattern: 'effective (\\d+)', keywords: ['absent'] }), null)
})
