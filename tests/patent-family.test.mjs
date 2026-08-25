import test from 'node:test'
import assert from 'node:assert/strict'
import {createsFamilyCycle,familyLayers} from '../src/lib/patent-family-service.js'

test('patent family links reject directed cycles',()=>{const links=[{from_member_id:'a',to_member_id:'b',relationship_type:'claims_priority_to'},{from_member_id:'b',to_member_id:'c',relationship_type:'national_phase_of'}];assert.equal(createsFamilyCycle(links,'c','a'),true);assert.equal(createsFamilyCycle(links,'c','d'),false)})
test('patent family visual layers preserve relationship order',()=>{const members=[{id:'a'},{id:'b'},{id:'c'}],links=[{from_member_id:'a',to_member_id:'b',relationship_type:'claims_priority_to'},{from_member_id:'b',to_member_id:'c',relationship_type:'national_phase_of'}],layers=familyLayers(members,links);assert.deepEqual(layers.map(layer=>layer.map(item=>item.id)),[['a'],['b'],['c']])})
