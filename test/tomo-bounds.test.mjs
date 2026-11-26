import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import path from 'node:path';import os from 'node:os';
import {inVolumeSamples,saveTomoEditor,readTomoEditor} from '../lib/tomo-editor.mjs';
import {optimizeSupport} from '../lib/tomo-optimize.mjs';
import {parseStar} from '../lib/gallery.mjs';
test('export omits outside coordinates but preserves support and user deletions',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'bounds-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const h=Buffer.alloc(1024+1000);for(const o of [0,4,8,28,32,36])h.writeInt32LE(10,o);for(const o of [40,44,48])h.writeFloatLE(100,o);await fs.writeFile(path.join(root,'v.mrc'),h);
 const context={inputRevision:'same',manifest:{file:'tomograms.star',rows:[{rlnTomoName:'T',rlnTomoReconstructedTomogram:'v.mrc'}]}},jobFile=async n=>path.join(root,n);
 const supports=[{id:1,type:'particles',tomogram:'T',points:[[0,0,0],[-50,0,0],[40,0,0],[41,0,0],[0,0,80]],excludedSamples:[2]}];
 const first=await readTomoEditor(jobFile,context);
 const result=await saveTomoEditor(jobFile,context,{revision:first.revision,supports},{finish:true,job:'Picks/job001/',filterSamples:samples=>inVolumeSamples(root,[],context.manifest,samples)});
 assert.equal(result.count,2);assert.equal(result.ignoredOutside,2);assert.deepEqual((await readTomoEditor(jobFile,context)).supports,supports);
 assert.equal(parseStar(await fs.readFile(await jobFile('particles.star'),'utf8')).flatMap(b=>b.tables)[0].rows.length,2);
});
test('optimization limit applies to usable surviving samples and trials retain fixed identities',async()=>{
 const s={id:1,type:'spheres',tomogram:'T',center:[0,0,0],radius:100,spacing:2,sphereSampleCount:33000,excludedSamples:[16000]};
 const inside=p=>Math.abs(p[2])<5;
 const result=await optimizeSupport(s,'X',2,{contains:inside,sample:async p=>p[0]**2});
 assert.ok(result.count<2000);assert.ok(result.ignoredOutside>30000);assert.deepEqual(result.support.excludedSamples,[16000]);
 await assert.rejects(optimizeSupport(s,'X',2,{contains:()=>true,sample:async()=>0}),/usable particles/);
});
