import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {filesystemInputs,matchesPattern} from '../lib/inputs.mjs';

test('project-file browser lists ModelAngelo FASTA sequences without pipeline nodes',async t=>{
 const project=await fs.mkdtemp(path.join(os.tmpdir(),'modelangelo-sequences-'));t.after(()=>fs.rm(project,{recursive:true,force:true}));
 await fs.mkdir(path.join(project,'Sequences'));
 for(const file of ['protein.fasta','protein.fast','dna.fa','rna.fna','library.txt','unrelated.mrc'])await fs.writeFile(path.join(project,'Sequences',file),'>test\nACGT\n');
 const field={type:3,pattern:'FASTA sequence files (*.{fasta,fast,fa,faa,fna,txt})'};
 const root=await filesystemInputs(project,[],'.',field);assert(root.entries.some(e=>e.name==='Sequences'&&e.directory));
 const found=await filesystemInputs(project,[],'Sequences',field);
 assert.deepEqual(found.entries.map(e=>e.name).sort(),['dna.fa','library.txt','protein.fast','protein.fasta','rna.fna']);
 assert(!matchesPattern('unrelated.mrc',field.pattern));
});
test('ModelAngelo sequence API uses file browsing for all four fields',async()=>{
 const child=spawn(process.execPath,['server.mjs','--demo','--port','23461'],{cwd:new URL('..',import.meta.url),stdio:['ignore','pipe','pipe']});
 try{
  const token=await new Promise((resolve,reject)=>{child.stdout.on('data',chunk=>{const match=chunk.toString().match(/#token=([a-f0-9]+)/);if(match)resolve(match[1]);});child.once('error',reject);child.once('exit',code=>reject(Error('Server exited '+code)));});
  const origin='http://127.0.0.1:23461',headers={'X-Relion-Token':token};
  const config=await (await fetch(origin+'/api/config',{headers})).json(),id=config.layout.find(l=>l.name==='ModelAngelo building').id;
  for(const key of ['p_seq','d_seq','r_seq','fn_lib']){
   const field=config.catalog.find(s=>s.id===id).options.find(f=>f.key===key);assert(matchesPattern('protein.fast',field.pattern));
   const response=await fetch(origin+`/api/inputs?type=${id}&field=${key}`,{headers});assert.equal(response.status,200);const data=await response.json();assert.equal(data.mode,'files');assert(data.entries.some(e=>e.name==='protein.fast'));
  }
 }finally{if(child.exitCode===null){child.kill();await once(child,'exit');}}
});
