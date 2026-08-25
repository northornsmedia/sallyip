import test from 'node:test'
import assert from 'node:assert/strict'
import {planLegalTask} from '../src/lib/legal-task-planner.js'

test('plans an instruction-driven FTO workflow and extracts jurisdiction',()=>{const plan=planLegalTask('Run an FTO analysis for Product X in Germany.');assert.equal(plan.workflow_type,'fto');assert.equal(plan.jurisdiction,'Germany')})
test('plans an India FTO workflow without routing it to Europe',()=>{const plan=planLegalTask('Run an FTO analysis for Product X in India.');assert.equal(plan.workflow_type,'fto');assert.equal(plan.jurisdiction,'India')})
test('resolves jurisdictions outside the original hard-coded list',()=>{assert.equal(planLegalTask('Run an FTO analysis in Brazil.').jurisdiction,'Brazil');assert.equal(planLegalTask('Run an FTO analysis in Japan.').jurisdiction,'Japan');assert.equal(planLegalTask('Run an FTO analysis in South Africa.').jurisdiction,'South Africa')})
test('plans patentability without falsely completing a search',()=>{const plan=planLegalTask('Assess patentability of this invention.',{matterJurisdictions:['EPO']});assert.equal(plan.workflow_type,'patentability');assert.equal(plan.jurisdiction,'EPO')})
test('extracts an uppercase trademark and SaaS scope',()=>{const plan=planLegalTask('Check whether NOVARA is clear for SaaS in the EU.');assert.equal(plan.workflow_type,'trademark_clearance');assert.equal(plan.mark,'NOVARA');assert.equal(plan.jurisdiction,'EU');assert.match(plan.goods,/SaaS/)})
test('ordinary questions do not trigger a mutating workflow',()=>{assert.equal(planLegalTask('Explain what a trademark is.').workflow_type,null)})
test('routes explicit intake analysis before patentability keywords',()=>{const plan=planLegalTask("Give document type, invention summary, novelty signals, red flags, open questions and next steps. Don't draft claims; this is intake analysis.");assert.equal(plan.workflow_type,'invention_intake')})
