import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {settingsStar,validateValues,starValue,validateAlias} from '../lib/settings.mjs';
import {readablePath,tail,jobPath} from '../lib/paths.mjs';
const catalog=JSON.parse(await fs.readFile(new URL('../public/catalog.json',import.meta.url)));
const layout=JSON.parse(await fs.readFile(new URL('../public/layout.json',import.meta.url)));
test('All 22 SPA job types have unique definitions and valid choices',()=>{
 assert.equal(catalog.length,22);assert.equal(new Set(catalog.map(s=>s.id)).size,22);
 for(const schema of catalog){const values=Object.fromEntries(schema.options.map(f=>[f.key,f.default]));assert.doesNotThrow(()=>validateValues(schema,values));assert.equal(new Set(schema.options.map(f=>f.key)).size,schema.options.length);assert.ok(layout.find(l=>l.id===schema.id));}
});
test('Settings preserve raw options and correctly quote STAR values',()=>{
 assert.equal(starValue("one's value"),'"one\'s value"');assert.equal(starValue(''),"''");assert.throws(()=>starValue('bad\nvalue'));
 assert.throws(()=>starValue(`both'"`));
 const s=settingsStar(layout[0],catalog[0],{fn_in_raw:'Movies/*.tiff',angpix:'0.885',do_raw:'Yes'});assert.match(s,/_rlnJobIsTomo 0/);assert.match(s,/fn_in_raw 'Movies\/\*\.tiff'/);assert.match(s,/relion.import/);
});
test('Type validation rejects unsupported fields, invalid booleans and nonfinite numbers',()=>{
 for(const values of [{unknown:'abc'},{do_raw:'true'},{angpix:'NaN'},{angpix:'Infinity'},{angpix:''}])assert.throws(()=>validateValues(catalog[0],values));
 assert.doesNotThrow(()=>validateValues(catalog[0],{angpix:'0.2'})); // Do not enforce slider's 0.5 min as a scientific constraint.
});
test('Aliases and canonical job paths cannot contain path or command syntax',()=>{
 for(const a of ['../bad','a;touch x','x/y','.','..','None'])assert.throws(()=>validateAlias(a));
 for(const a of ['movies','motion-corrected','class_02'])assert.equal(validateAlias(a),a);
 assert.throws(()=>jobPath('/p','../../secret'));assert.equal(jobPath('/p','Class2D/job123/'),'/p/Class2D/job123/');
});
test('Filesystem reader contains symlinks; approved external roots work; log tails are bounded',async()=>{
 const temp=await fs.mkdtemp(path.join(os.tmpdir(),'deluxe-test-'));try{const project=path.join(temp,'project'),external=path.join(temp,'data');await fs.mkdir(project);await fs.mkdir(external);await fs.writeFile(path.join(external,'movie'),'abc');await fs.symlink(external,path.join(project,'Movies'));await assert.rejects(readablePath(project,[],'Movies/movie'));assert.equal(await readablePath(project,[external],'Movies/movie'),path.join(external,'movie'));await assert.rejects(readablePath(project,[],'../data/movie'));const file=path.join(project,'log');await fs.writeFile(file,'0123456789');assert.deepEqual(await tail(file,4),{text:'6789',truncated:true,size:10});}finally{await fs.rm(temp,{recursive:true,force:true});}
});
test('GUI log snapshots retain the complete file beyond the former 128 KiB limit',async()=>{
 const {readLog}=await import('../lib/paths.mjs');const dir=await fs.mkdtemp(path.join(os.tmpdir(),'relion-full-log-'));
 try{
  const file=path.join(dir,'run.out'),text='FIRST LINE\n'+'full log α\n'.repeat(40000)+'LAST LINE\n';
  await fs.writeFile(file,text);const result=await readLog(file);
  assert.equal(result.text,text);assert.equal(result.truncated,false);assert.equal(result.size,Buffer.byteLength(text));
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});
