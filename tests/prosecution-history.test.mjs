import assert from 'node:assert/strict'
import test from 'node:test'
import {analyzeClaimAmendment} from '../src/lib/prosecution-history-service.js'

test('flags added claim limitations for legal review without deciding scope',()=>{const result=analyzeClaimAmendment('A device comprising a processor and memory.','A device comprising a processor and encrypted memory configured to store keys.');assert.equal(result.scope_signal,'potential_narrowing');assert.ok(result.added_terms.includes('encrypted'));assert.equal(result.estoppel_review_required,true);assert.match(result.explanation,/legal review/i)})
test('flags removed limitations as potential broadening',()=>{const result=analyzeClaimAmendment('A device comprising an encrypted processor and memory.','A device comprising a processor and memory.');assert.equal(result.scope_signal,'potential_broadening');assert.ok(result.removed_terms.includes('encrypted'));assert.equal(result.added_matter_review_required,false)})
test('does not invent an amendment analysis when either claim is missing',()=>{const result=analyzeClaimAmendment('', 'A device.');assert.equal(result.scope_signal,'insufficient');assert.deepEqual(result.added_terms,[])})

