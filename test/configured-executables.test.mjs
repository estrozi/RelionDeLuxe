import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {configuredExecutableWarnings} from '../lib/executables.mjs';
import {preflight} from '../lib/preflight.mjs';
test('External CTF/MotionCor2 checks cover paths, PATH, permissions, disabled methods and scheduling',async()=>{
 const project=await fs.mkdtemp(path.join(os.tmpdir(),'engine-check-'));
 try{
  const good=path.join(project,'engine'),bad=path.join(project,'not-executable');await fs.writeFile(good,'#!/bin/sh\nexit 99\n',{mode:0o700});await fs.writeFile(bad,'text',{mode:0o600});
  const env={PATH:project},options={cwd:project,env},ctf={name:'CTF estimation'},motion={name:'Motion correction'};
  for(const value of [good,'./engine','engine'])assert.deepEqual(await configuredExecutableWarnings(ctf,{fn_ctffind_exe:value},options),[]);
  for(const value of ['',bad,project,'missing'])assert.equal((await configuredExecutableWarnings(ctf,{fn_ctffind_exe:value},options))[0].field,'fn_ctffind_exe');
  assert.deepEqual(await configuredExecutableWarnings(motion,{do_own_motioncor:'Yes',fn_motioncor2_exe:'missing'},options),[]);
  assert.equal((await configuredExecutableWarnings(motion,{do_own_motioncor:'No',fn_motioncor2_exe:'missing'},options))[0].field,'fn_motioncor2_exe');
  assert.deepEqual(await configuredExecutableWarnings(motion,{do_own_motioncor:'No',fn_motioncor2_exe:good},options),[]);
  assert.match((await configuredExecutableWarnings(ctf,{fn_ctffind_exe:'missing',do_queue:'Yes'},options))[0].message,/cluster workers/);
  const adapter={env,call:async()=>({counter:1,jobs:[]}),submit:async()=>({jobName:'CtfFind/job001/',inputs:[]})};
  for(const action of ['run','schedule','scheduler']){
   const report=(await preflight({project,adapter,layout:ctf,schema:{options:[{key:'fn_ctffind_exe',type:2,default:'missing'}]},values:{},action})).report;
   assert(report.some(r=>r.severity==='warning'&&r.field==='fn_ctffind_exe'));
  }
 }finally{await fs.rm(project,{recursive:true,force:true});}
});
