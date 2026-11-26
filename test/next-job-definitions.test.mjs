import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {loadNextDefinitions,nextJobRoot} from '../lib/next-job-definitions.mjs';
import {helicalLayout,helicalSchema} from '../lib/helical.mjs';
import {screeningLayout,screeningSchema} from '../lib/screening.mjs';
import {nextCondition,nextContext} from '../public/next-job-definitions.js';
const root=path.resolve('.');
for(const mode of ['spa','tomo'])test('valid starter definitions: '+mode,async()=>{
 const suffix=mode==='tomo'?'-tomo':'';
 const layout=JSON.parse(await fs.readFile(`public/layout${suffix}.json`)),catalog=JSON.parse(await fs.readFile(`public/catalog${suffix}.json`));
 if(mode==='spa'){layout.push(helicalLayout,screeningLayout);catalog.push(helicalSchema,screeningSchema);}
 const result=await loadNextDefinitions(path.join(root,'next-job'),mode,layout,catalog);
 assert.deepEqual(result.errors,[]);
 for(const fn_mask of ['', 'MaskCreate/job010/mask.mrc']){
 const matches=result.definitions[10].filter(d=>nextCondition(d.when,nextContext({status:'Succeeded'},{fn_mask})));
 assert.equal(matches.length,1);assert(matches.some(d=>d.target===(fn_mask?15:12)));
 }
 for(const defs of Object.values(result.definitions))for(const d of defs){assert.ok(d.iconNames.length);assert.equal(d.iconNames.length,new Set(d.iconNames).size);}
 assert.deepEqual(result.definitions[1].find(d=>d.target===2).iconNames,['CTF estimation']);
 if(mode==='spa'){
  const pipeline=result.definitions[15].find(d=>d.action==='pipeline');assert.ok(pipeline);
  assert.deepEqual(pipeline.iconNames,['CTF refinement','3D auto-refine','Post-processing','Bayesian polishing']);
  assert.deepEqual(result.definitions[4].find(d=>d.action==='continue-manual').iconNames,['Auto-picking']);
 }
 assert.deepEqual(result.definitions[12].find(d=>d.action==='continue-with-mask').iconNames,['3D auto-refine']);
});
test('project starter copy preserves user removals',async t=>{
 const project=await fs.mkdtemp(path.join(os.tmpdir(),'nextjobs-'));t.after(()=>fs.rm(project,{recursive:true,force:true}));
 const dest=await nextJobRoot(root,project,{seed:true});
 const files=await fs.readdir(path.join(dest,'SPA','Select'));const filename=files.find(f=>f.endsWith('.json'));
 await fs.unlink(path.join(dest,'SPA','Select',filename));
 await nextJobRoot(root,project,{seed:true});
 await assert.rejects(fs.stat(path.join(dest,'SPA','Select',filename)),{code:'ENOENT'});
});
test('malformed definitions are isolated and user additions load',async t=>{
 const project=await fs.mkdtemp(path.join(os.tmpdir(),'nextcustom-'));t.after(()=>fs.rm(project,{recursive:true,force:true}));
 const dest=await nextJobRoot(root,project,{seed:true});
 const dir=path.join(dest,'SPA','Select');
 await fs.writeFile(path.join(dir,'00-custom.json'),JSON.stringify({format:'RelionDeLuxe.next-job',version:1,target:'relion.class3d',values:{nr_classes:'7'}}));
 await fs.writeFile(path.join(dir,'99-broken.json'),'{');
 const layout=JSON.parse(await fs.readFile('public/layout.json')),catalog=JSON.parse(await fs.readFile('public/catalog.json'));
 const result=await loadNextDefinitions(dest,'spa',layout,catalog);
 assert.equal(result.errors.length,1);assert.match(result.errors[0],/99-broken.json/);
 assert.equal(result.definitions[7][0].values.nr_classes,'7');
});
