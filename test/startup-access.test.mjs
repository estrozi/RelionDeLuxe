import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import path from 'node:path';import os from 'node:os';
import {projectLinkWarnings,confirmStartup} from '../lib/startup-access.mjs';
test('link scan respects roots, internal links, loops and broken links',async()=>{
 const base=await fs.mkdtemp(path.join(os.tmpdir(),'links-'));
 try{
  const p=path.join(base,'project'),outside=path.join(base,'outside');await fs.mkdir(p);await fs.mkdir(outside);
  await fs.symlink(p,path.join(p,'loop'));await fs.symlink(outside,path.join(p,'movies'));await fs.symlink(path.join(base,'missing'),path.join(p,'broken'));
  let w=await projectLinkWarnings(p);assert.equal(w.length,2);assert.equal(w.find(x=>x.root)?.root,outside);
  w=await projectLinkWarnings(p,[outside]);assert.equal(w.length,1);assert.equal(w[0].error,'ENOENT');
 }finally{await fs.rm(base,{recursive:true,force:true});}
});
test('unattended startup requires explicit acceptance',async()=>{
 await assert.rejects(confirmStartup('Continue?',{input:{isTTY:false}}),/Startup cancelled/);
 await confirmStartup('Continue?',{input:{isTTY:false},accept:true});
});
test('startup scan ignores Trash contents but still reports active broken links',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'trash-links-'));
 try{
  await fs.mkdir(path.join(root,'Trash','Import','job001'),{recursive:true});
  await fs.symlink('/missing-trash-target',path.join(root,'Trash','Import','job001','broken'));
  await fs.symlink('/missing-active-target',path.join(root,'active'));
  assert.deepEqual((await projectLinkWarnings(root)).map(w=>path.relative(root,w.file)),['active']);
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
