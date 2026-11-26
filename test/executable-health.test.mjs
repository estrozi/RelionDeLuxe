import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';
import {classifyProbe,executableProbe} from '../lib/executable-health.mjs';import {healthBlock} from '../public/executable-health.js';
test('usage exits pass, loader failures fail, timeouts are inconclusive',()=>{
 assert.equal(classifyProbe('fn_ctffind_exe',255,'Usage: ctffind').status,'pass');
 for(const [code,text] of [[127,'usage'],[0,'error while loading shared libraries: libfoo.so'],[1,'Traceback (most recent call last)']])assert.equal(classifyProbe('fn_ctffind_exe',code,text).status,'fail');
 assert.equal(classifyProbe('fn_resmap',null,'',{timeout:true}).status,'unknown');
});
test('job and alignment tab gating follows confirmed failures only',()=>{
 const fail={status:'fail',message:'unavailable'},checks={fn_batchtomo_exe:fail};
 assert.equal(healthBlock('Align tilt-series',checks),'');assert.equal(healthBlock('Align tilt-series',checks,'IMOD'),'unavailable');assert.equal(healthBlock('Align tilt-series',checks,'AreTomo2'),'');
 checks.fn_aretomo_exe=fail;assert.ok(healthBlock('Align tilt-series',checks));
 for(const [name,key]of [['Motion correction','fn_motioncor2_exe'],['CTF estimation','fn_ctffind_exe'],['Local resolution','fn_resmap']]){assert.ok(healthBlock(name,{[key]:fail}));assert.equal(healthBlock(name,{[key]:{status:'unknown'}}),'');}
});
test('probe runs without interactive input and caches results',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'health-test-'));
 try{const file=path.join(dir,'ctffind');await fs.writeFile(file,'#!/bin/sh\necho "Usage: ctffind"\nexit 255\n',{mode:0o700});const r=await executableProbe('fn_ctffind_exe',file);assert.equal(r.status,'pass');assert.equal(r.exitCode,255);assert.deepEqual(await executableProbe('fn_ctffind_exe',file),r);
 assert.equal((await executableProbe('fn_ctffind_exe',path.join(dir,'missing'))).status,'fail');
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});
