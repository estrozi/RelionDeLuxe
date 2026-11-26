import test from 'node:test';import assert from 'node:assert/strict';import {fieldError} from '../lib/field-errors.mjs';
test('Missing input errors name their actual tab without guessing unrelated errors',()=>{
 const layout={tabs:{'I/O':['fn_img'],References:['fn_ref']},fields:{}},schema={options:[{key:'fn_img',default:''},{key:'fn_ref',default:''}]};
 assert.equal(fieldError('ERROR: empty field for input STAR file...',layout,schema),'ERROR: empty field for input STAR file (I/O tab)...');
 assert.equal(fieldError('ERROR: empty field for reference.',layout,schema),'ERROR: empty field for reference (References tab).');
 assert.equal(fieldError('Unknown error',layout,schema),'Unknown error');
 assert.equal(fieldError('ERROR: empty field for input STAR file...',layout,schema,{fn_img:'input.star'}),'ERROR: empty field for input STAR file...');
});
