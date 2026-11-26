import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {preflight} from '../lib/preflight.mjs';

const header=pixel=>{const b=Buffer.alloc(1024);for(let axis=0;axis<3;axis++){b.writeInt32LE(32,axis*4);b.writeInt32LE(32,28+axis*4);b.writeFloatLE(32*pixel,40+axis*4);}b.writeInt32LE(2,12);b.write('MAP ',208);b[212]=68;b[213]=65;return b;};
test('Post-processing warns about a mismatched mask scale before running',async t=>{
 const project=await fs.mkdtemp(path.join(os.tmpdir(),'post-mask-warning-'));t.after(()=>fs.rm(project,{recursive:true,force:true}));
 await fs.writeFile(path.join(project,'map.mrc'),header(1.25));await fs.writeFile(path.join(project,'mask.mrc'),header(3.54));
 const adapter={call:async()=>({counter:1,jobs:[]}),submit:async()=>({inputs:[{name:'map.mrc',type:'DensityMap.mrc'},{name:'mask.mrc',type:'Mask3D.mrc'}]})};
 const args={project,adapter,layout:{id:15,name:'Post-processing'},schema:{options:[{key:'fn_in',default:'',type:3},{key:'fn_mask',default:'',type:3}]},values:{fn_in:'map.mrc',fn_mask:'mask.mrc'}};
 for(const action of ['run','schedule','scheduler']){const result=await preflight({...args,action});assert(result.report.some(r=>r.severity==='warning'&&r.field==='fn_mask'&&r.message.includes('Mask re-scaling')&&r.message.includes('3.5400')&&r.message.includes('1.2500')));}
 await fs.writeFile(path.join(project,'mask.mrc'),header(1.25));assert(!(await preflight(args)).report.some(r=>r.field==='fn_mask'&&r.message.includes('Mask re-scaling')));
});
