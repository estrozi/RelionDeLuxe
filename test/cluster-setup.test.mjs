import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {clusterSetup} from '../lib/cluster-setup.mjs';
test('cluster validates overrides and discovers readable relion scripts',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'cluster-'));
 try{
  assert.deepEqual(await clusterSetup({PATH:''},dir,{log(){},warn(){}}),[]);
  await fs.writeFile(path.join(dir,'relion_gpu'),'template');
  await fs.writeFile(path.join(dir,'relion_cpu'),'template');
  await fs.writeFile(path.join(dir,'other'),'other');
  await fs.mkdir(path.join(dir,'relion_directory'));
  const executable=path.join(dir,'program');await fs.writeFile(executable,'#!/bin/sh\nexit 0\n',{mode:0o700});
  const env={RELIONDELUXE_MPIRUN:executable,RELIONDELUXE_TOPAZ:executable};
  assert.deepEqual(await clusterSetup(env,dir),[path.join(dir,'relion_cpu'),path.join(dir,'relion_gpu')]);
  await fs.mkdir(path.join(dir,'sbgrid_bin'));await fs.symlink(executable,path.join(dir,'sbgrid_bin','mpirun'));
  await assert.rejects(clusterSetup({...env,RELIONDELUXE_MPIRUN:path.join(dir,'sbgrid_bin','mpirun')},dir),/dispatcher/);
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});

test('cluster discovers PATH executables and preserves configured MPI',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'cluster-detect-'));
 try{
  for(const name of ['mpirun','relion_python_topaz'])await fs.writeFile(path.join(dir,name),'#!/bin/sh\nexit 0\n',{mode:0o700});
  const env={PATH:dir},quiet={log(){},warn(){}};
  await clusterSetup(env,dir,quiet);
  assert.equal(env.RELIONDELUXE_MPIRUN,path.join(dir,'mpirun'));
  assert.equal(env.RELIONDELUXE_TOPAZ,path.join(dir,'relion_python_topaz'));
  const configured={PATH:dir,RELION_MPIRUN:'site-launcher --flag'};
  await clusterSetup(configured,dir,quiet);assert.equal(configured.RELIONDELUXE_MPIRUN,undefined);
  await assert.rejects(clusterSetup({PATH:dir,RELIONDELUXE_MPIRUN:'/does/not/exist'},dir,quiet),/invalid explicit/);
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});
