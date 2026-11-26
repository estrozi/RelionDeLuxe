import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import path from 'node:path';import os from 'node:os';
import {mpiEnvironment,checkMpiLauncher} from '../lib/executables.mjs';import {extractionInversion} from '../lib/extraction-inversion.mjs';
test('MPI override reaches native environment and bad SBGrid launcher reports actionable error',async t=>{
 const p=await fs.mkdtemp(path.join(os.tmpdir(),'mpi-check-'));t.after(()=>fs.rm(p,{recursive:true,force:true}));await fs.mkdir(path.join(p,'sbgrid_bin'));const wrapper=path.join(p,'sbgrid_bin/mpirun');await fs.writeFile(wrapper,'#!/bin/sh\necho "missing mpirun__ccpem" >&2\nexit 71\n',{mode:0o755});
 await assert.rejects(checkMpiLauncher({nr_mpi:'2'},{env:{PATH:path.dirname(wrapper)}}),/RELIONDELUXE_MPIRUN/);
 const exe=path.join(p,'mpi real');await fs.writeFile(exe,'#!/bin/sh\nexit 0\n',{mode:0o755});const env=mpiEnvironment({PATH:path.dirname(wrapper),RELIONDELUXE_MPIRUN:exe});assert.equal(env.RELION_MPIRUN,"'"+exe+"'");await checkMpiLauncher({nr_mpi:'2'},{env});await checkMpiLauncher({nr_mpi:'2',do_queue:'Yes'},{env:{PATH:''}});
});
test('inversion default applies only to inverted LoG coordinate producer, including aliases',async()=>{
 const state={jobs:[{name:'AutoPick/job002/',alias:'AutoPick/white/',type:4,outputs:['AutoPick/job002/autopick.star']}]};let values={do_log:'Yes',log_invert:'Yes'};const adapter={call:async()=>({values})};
 assert.deepEqual(await extractionInversion('/project',adapter,state,'AutoPick/white/autopick.star',4),{do_invert:'No'});
 values={do_log:'No',log_invert:'Yes'};assert.deepEqual(await extractionInversion('/project',adapter,state,'AutoPick/job002/autopick.star',4),{});
});
