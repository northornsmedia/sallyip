import test from 'node:test'
import assert from 'node:assert/strict'
import {extractDatedPassages} from '../src/lib/litigation-evidence-service.js'

test('extracts dated source passages as proposed, not verified, chronology events',()=>{const events=extractDatedPassages([{passage_id:'p1',source_title:'Email bundle',content:'On 14 March 2024 the engineering team received the infringement notice. Follow-up occurred later.'}]);assert.equal(events.length,1);assert.equal(events[0].event_date,'2024-03-14');assert.equal(events[0].review_status,'proposed');assert.equal(events[0].passage_id,'p1')})
test('does not invent chronology entries where no date appears',()=>{assert.deepEqual(extractDatedPassages([{passage_id:'p1',content:'The team discussed the product launch.'}]),[])})
