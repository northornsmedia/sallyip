import test from 'node:test'
import assert from 'node:assert/strict'
import {evidenceOverlap} from '../src/lib/claim-chart-service.js'

test('claim chart evidence suggestions reward element coverage',()=>{
  assert.ok(evidenceOverlap('a processor configured to generate an encrypted token','The processor generates an encrypted token for the request')>.6)
})

test('claim chart evidence suggestions do not invent matches',()=>{
  assert.equal(evidenceOverlap('a quantum sensor coupled to a cryogenic controller','A red bicycle has two wheels'),0)
})
