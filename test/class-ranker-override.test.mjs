import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {classRankerOverride} from '../lib/class-ranker-override.mjs';
import {resolveExecutable} from '../lib/executables.mjs';
test('ranker override outranks PATH, forwards arguments and preserves inherited environment',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'ranker-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const target=path.join(root,"real ranker's executable");
 await fs.writeFile(target,'#!/bin/sh\nprintf "%s\\n" "$TEST_CONDA" "$@"\n',{mode:0o755});
 const env={...process.env,RELIONDELUXE_CLASS_RANKER:target,TEST_CONDA:'inherited'};
 assert.equal(await classRankerOverride(root,env),target);
 const launcher=await resolveExecutable('relion_class_ranker',{env});
 const {stdout}=await promisify(execFile)(launcher,['--i','a b.star','$(literal)'],{env});
 assert.equal(stdout,'inherited\n--i\na b.star\n$(literal)\n');
 await classRankerOverride(root,env);assert.equal(await resolveExecutable('relion_class_ranker',{env}),launcher);
 await assert.rejects(classRankerOverride(root,{RELIONDELUXE_CLASS_RANKER:'/no/such/ranker'}),/executable absolute/);
 assert.equal(await classRankerOverride(root,{}),null);
});
test('Post-processing layout has the requested fresh-job default',async()=>{
 const source=await fs.readFile(new URL('../server.mjs',import.meta.url),'utf8');
 assert.match(source,/l.name==='Post-processing'\)l.overrides=\{\.\.\.l.overrides,mtf_angpix:'-1'\}/);
});
