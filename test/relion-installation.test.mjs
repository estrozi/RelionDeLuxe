import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import {execFileSync} from 'node:child_process';
import {selectRelionInstallation} from '../lib/relion-installation.mjs';import {resolveExecutable} from '../lib/executables.mjs';
test('selected installation wins in server lookup and inherited shell PATH',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'relion-env-'));
 try{const root=path.join(dir,'version'),bin=path.join(root,'bin'),wrappers=path.join(dir,'sbgrid_bin');await fs.mkdir(bin,{recursive:true});await fs.mkdir(wrappers);
 for(const n of ['relion','relion_pipeliner','relion_python_tomo_import']){await fs.writeFile(path.join(bin,n),'#!/bin/sh\necho direct\n',{mode:0o700});await fs.writeFile(path.join(wrappers,n),'#!/bin/sh\necho wrapper\n',{mode:0o700});}
 const env={PATH:wrappers};assert.equal(await selectRelionInstallation(env),null);await selectRelionInstallation(env,root);
 assert.equal(await resolveExecutable('relion_python_tomo_import',{env}),path.join(bin,'relion_python_tomo_import'));
 assert.equal(execFileSync('/bin/sh',['-c','relion_python_tomo_import'],{env,encoding:'utf8'}).trim(),'direct');
 await selectRelionInstallation(env,root);assert.equal(env.PATH.split(':').filter(p=>p===bin).length,1);
 await assert.rejects(selectRelionInstallation(env,'relative'),/absolute/);await assert.rejects(selectRelionInstallation(env,path.join(dir,'absent')),/bin directory/);
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});
