import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {classificationAlignmentGpu} from '../public/classification-gpu.js';
import {resolveResources} from '../public/template-resources.js';
import {preflight} from '../lib/preflight.mjs';

test('3D classification skipping alignment turns GPU off and restores the previous choice',()=>{
 const layout={name:'3D classification'},values={dont_skip_align:'Yes',use_gpu:'Yes'};
 values.dont_skip_align='No';assert.equal(classificationAlignmentGpu(layout,values,true),'No');
 assert.equal(classificationAlignmentGpu(layout,values),'No');
 assert.equal(classificationAlignmentGpu(layout,values,true),'No');
 values.dont_skip_align='Yes';assert.equal(classificationAlignmentGpu(layout,values,true),'Yes');
 values.use_gpu='No';values.dont_skip_align='No';classificationAlignmentGpu(layout,values,true);
 values.dont_skip_align='Yes';assert.equal(classificationAlignmentGpu(layout,values,true),'No');
 assert.equal(classificationAlignmentGpu({name:'3D auto-refine'},values),'No');
});

test('SPA and STA resource resolution retains No GPU when classification alignment is skipped',async()=>{
 for(const suffix of ['', '-tomo']){
  const layout=JSON.parse(await fs.readFile(new URL('../public/layout'+suffix+'.json',import.meta.url)));
  const catalog=JSON.parse(await fs.readFile(new URL('../public/catalog'+suffix+'.json',import.meta.url)));
  const l=layout.find(x=>x.name==='3D classification'),schema=catalog.find(x=>x.id===l.id);
  const global={globalNcpus:'12',globalNgpus:'2',gpu_ids:'0:1',use_gpu:'Yes'};
  assert.equal(resolveResources(l,schema,{dont_skip_align:'No',use_gpu:'Yes'},global).use_gpu,'No');
  assert.equal(resolveResources(l,schema,{dont_skip_align:'Yes',use_gpu:'Yes'},global).use_gpu,'Yes');
 }
});

test('preflight rejects an inconsistent scheduled classification before native preview',async()=>{
 const adapter={call:()=>assert.fail('called native adapter'),submit:()=>assert.fail('called native preview')};
 await assert.rejects(preflight({project:'.',adapter,layout:{name:'3D classification'},schema:{options:[]},values:{dont_skip_align:'No',use_gpu:'Yes'}}),/requires Use GPU = No/);
});

test('new classification with alignment enabled preserves either GPU choice',()=>{
 for(const use_gpu of ['Yes','No'])assert.equal(classificationAlignmentGpu({name:'3D classification'},{dont_skip_align:'Yes',use_gpu}),use_gpu);
});
