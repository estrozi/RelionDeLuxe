import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';
import {loadSBGrid} from '../lib/startup-environment.mjs';
test('loads exported SBGrid environment, preserves working installation',async()=>{
 const p=await fs.mkdtemp(path.join(os.tmpdir(),'sbgrid-env-'));
 try{
  await fs.writeFile(path.join(p,'sbgrid.shrc'),'export PATH="'+p+'"\nexport TEST_SBGRID=loaded\n');
  const env={SHELL:'/bin/bash',PATH:'/nonexistent'};
  assert.equal(await loadSBGrid({env,base:p,log:console.log}),true);assert.equal(env.TEST_SBGRID,'loaded');
  for(const name of ['relion','relion_pipeliner','relion_image_handler'])await fs.writeFile(path.join(p,name),'#!/bin/sh\n',{mode:0o700});
  assert.equal(await loadSBGrid({env,base:p,log:console.log}),false);
 }finally{await fs.rm(p,{recursive:true,force:true});}
});
