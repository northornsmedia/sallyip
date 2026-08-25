import test from 'node:test'
import assert from 'node:assert/strict'
import {clearanceGaps} from '../src/lib/trademark-clearance-service.js'

test('clearance reports every unsearched source class as a research gap',()=>{const gaps=clearanceGaps([{channel:'matter_graph',status:'completed'},{channel:'official_registry',status:'not_configured'}]);assert.ok(!gaps.includes('matter_graph'));assert.ok(gaps.includes('official_registry'));assert.ok(gaps.includes('common_law'));assert.ok(gaps.includes('domains'))})
test('clearance removes only completed channels from gaps',()=>{assert.deepEqual(clearanceGaps([{channel:'matter_graph',status:'completed'},{channel:'official_registry',status:'completed'},{channel:'common_law',status:'completed'},{channel:'company_names',status:'completed'},{channel:'domains',status:'completed'},{channel:'social',status:'completed'},{channel:'marketplaces',status:'completed'}]),[])})
