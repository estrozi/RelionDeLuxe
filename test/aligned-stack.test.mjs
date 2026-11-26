import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';
import {alignedStackManifest} from '../lib/aligned-stack.mjs';
test('alignment output viewer selects native output stacks, never input micrographs',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'aligned-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const job='AlignTiltSeries/job005/';await fs.mkdir(path.join(root,job),{recursive:true});
 const file=path.join(root,job,'aligned_tilt_series.star');await fs.writeFile(file,'data_global\nloop_\n_rlnTomoName\n_rlnTomoTiltSeriesStarFile\nPosition_9 missing-input.star\nPosition_7 another-input.star\n');
 for(const mode of ['Yes','No']){const result=await alignedStackManifest(root,[],job,{do_aretomo2:mode});assert.equal(result.rows.length,2);assert.equal(result.rows[0].rlnDeluxeAlignedStack,job+'external/Position_9/Position_9'+(mode==='Yes'?'_aligned':'_preali')+'.mrc');assert.equal(result.alignedStack,true);}
 await fs.writeFile(file,'data_global\nloop_\n_rlnTomoName\n_rlnTomoTiltSeriesStarFile\n../escape input.star\n');await assert.rejects(alignedStackManifest(root,[],job,{}),/Invalid tilt-series name/);
});
