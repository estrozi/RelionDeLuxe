import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {verifyImportFormat} from '../lib/import-format.mjs';
import {preflight} from '../lib/preflight.mjs';
function header(mode,frames=1,big=false){const b=Buffer.alloc(1024),write=(v,o)=>big?b.writeInt32BE(v,o):b.writeInt32LE(v,o);write(128,0);write(128,4);write(frames,8);write(mode,12);b[212]=big?17:68;b[213]=big?17:65;return b;}
async function setup(t){const p=await fs.mkdtemp(path.join(os.tmpdir(),'import-format-'));t.after(()=>fs.rm(p,{recursive:true,force:true}));await fs.mkdir(path.join(p,'Micrographs'));return p;}
const layout={name:'Import'},values={do_raw:'Yes',is_multiframe:'No',fn_in_raw:'Micrographs/*.mrc'};
test('checks all matched headers, blocks LE/BE float16, accepts integer16 and float32',async t=>{
 const p=await setup(t);await fs.writeFile(path.join(p,'Micrographs/a.mrc'),header(2));await fs.writeFile(path.join(p,'Micrographs/b.mrc'),header(1));
 await verifyImportFormat(p,[],layout,values);
 for(const big of [false,true]){await fs.writeFile(path.join(p,'Micrographs/z.mrc'),header(12,1,big));await assert.rejects(verifyImportFormat(p,[],layout,values),/Import blocked:.*mode 12.*mode 2.*Micrographs\/z.mrc/);}
});
test('scope excludes raw multi-frame stacks and other node imports; corrected STA images are checked',async t=>{
 const p=await setup(t);await fs.writeFile(path.join(p,'Micrographs/a.mrc'),header(12,20));
 await verifyImportFormat(p,[],layout,{...values,is_multiframe:'Yes'});
 await verifyImportFormat(p,[],layout,{...values,do_raw:'No',do_other:'Yes'});
 await assert.rejects(verifyImportFormat(p,[],{name:'Import tilt series'},{images_are_motion_corrected:'Yes',movie_files:values.fn_in_raw}),/Import blocked/);
});
test('invalid headers and external links cannot bypass verification',async t=>{
 const p=await setup(t),external=await setup(t);await fs.writeFile(path.join(p,'Micrographs/bad.mrc'),'short');
 await assert.rejects(verifyImportFormat(p,[],layout,values),/Cannot verify.*Incomplete MRC header/);
 await fs.unlink(path.join(p,'Micrographs/bad.mrc'));await fs.writeFile(path.join(external,'test.mrc'),header(12));await fs.symlink(path.join(external,'test.mrc'),path.join(p,'Micrographs/link.mrc'));
 await assert.rejects(verifyImportFormat(p,[],layout,values),/outside configured read roots/);
 await assert.rejects(verifyImportFormat(p,[external],layout,values),/Import blocked/);
});
test('format restriction stops preflight before native preview for every submission path',async t=>{
 const p=await setup(t);await fs.writeFile(path.join(p,'Micrographs/a.mrc'),header(12));
 for(const action of ['run','schedule','continue','preview','scheduler'])await assert.rejects(preflight({project:p,layout,values,schema:{options:[]},action,adapter:{call:()=>assert.fail('native call before format verification'),submit:()=>assert.fail('native submission before format verification')}}),/Import blocked/);
});
