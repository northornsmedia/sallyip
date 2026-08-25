import test from 'node:test'
import assert from 'node:assert/strict'
import {buildTrademarkSearchSet,detectWritingSystem} from '../src/lib/trademark-intelligence-service.js'
test('detects major writing systems without pretending to translate',()=>{assert.equal(detectWritingSystem('САЛЛИ'),'Cyrillic');assert.equal(detectWritingSystem('سالي'),'Arabic');assert.equal(detectWritingSystem('サリー'),'Japanese');assert.equal(detectWritingSystem('샐리'),'Korean');assert.equal(detectWritingSystem('莎莉'),'Han');assert.equal(detectWritingSystem('SALLY'),'Latin')})
test('search set includes only lawyer-accepted linguistic variants',()=>{const set=buildTrademarkSearchSet('SALLY',[{variant_text:'САЛЛИ',review_status:'accepted'},{variant_text:'unreviewed guess',review_status:'proposed'},{variant_text:'SALLY',review_status:'accepted'}]);assert.deepEqual(set,['SALLY','САЛЛИ'])})
