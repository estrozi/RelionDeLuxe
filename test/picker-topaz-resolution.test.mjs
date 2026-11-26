import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {resolvePickerTopaz} from '../lib/executables.mjs';
test('Topaz uses SBGrid reported path, explicit override, and normal PATH',async()=>{
 const p=await fs.mkdtemp(path.join(os.tmpdir(),'topaz-resolution-'));
 try{
  const bin=path.join(p,'sbgrid_bin'),real=path.join(p,'real','relion_python_topaz');
  await fs.mkdir(bin);await fs.mkdir(path.dirname(real));
  await fs.writeFile(real,'#!/bin/sh\nexit 0\n',{mode:0o700});
  const wrapper=path.join(bin,'relion_python_topaz');
  await fs.writeFile(wrapper,'#!/bin/sh\n[ "$1" = "--sbwhich" ] || exit 1\nprintf "%s\\n" "'+real+'"\n',{mode:0o700});
  assert.equal(await resolvePickerTopaz({env:{PATH:bin}}),real);
  assert.equal(await resolvePickerTopaz({env:{PATH:bin,RELIONDELUXE_TOPAZ:real}}),real);
  await assert.rejects(resolvePickerTopaz({env:{PATH:bin,RELIONDELUXE_TOPAZ:path.join(p,'missing')}}),/not an executable/);
  assert.equal(await resolvePickerTopaz({env:{PATH:path.dirname(real)}}),real);
  await fs.writeFile(wrapper,'#!/bin/sh\nexit 0\n',{mode:0o700});
  assert.equal(await resolvePickerTopaz({env:{PATH:bin}}),wrapper);
 }finally{await fs.rm(p,{recursive:true,force:true});}
});
