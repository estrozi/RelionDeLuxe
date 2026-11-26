import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';
import {addClassParticleCounts} from '../lib/class-particle-counts.mjs';
test('class counts use particle rows, rounded distribution and refreshed input',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'class-count-'));try{
 const file=path.join(dir,'particles.star'),header='data_optics\nloop_\n_rlnOpticsGroup\n1\n\ndata_particles\nloop_\n_rlnImageName\n';
 await fs.writeFile(file,header+'1@a.mrcs\n2@a.mrcs\n3@a.mrcs\n');
 const m={labels:['rlnClassDistribution'],rows:[{rlnClassDistribution:'0.666667'}]};
 assert.equal((await addClassParticleCounts(dir,[],m,'particles.star')).rows[0].NumberOfParticles,'≈ 2/3 particles');
 await fs.appendFile(file,'4@a.mrcs\n5@a.mrcs\n6@a.mrcs\n');assert.equal((await addClassParticleCounts(dir,[],m,'particles.star')).rows[0].NumberOfParticles,'≈ 4/6 particles');
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});

test('class labels count assignments exactly rather than rounded model distributions',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'exact-class-count-'));
 try{
 const file=path.join(dir,'run_data.star'),header='data_particles\nloop_\n_rlnImageName #1\n_rlnClassNumber #2\n';
 await fs.writeFile(file,header+'1@a.mrcs 1\n2@a.mrcs 1\n3@a.mrcs 1\n4@a.mrcs 2\n');
 const m={classDataFile:'run_data.star',labels:['rlnClassDistribution'],rows:[{index:0,rlnClassDistribution:'0.49'},{index:1,rlnClassDistribution:'0.51'},{index:2,rlnClassDistribution:'0'}]};
 const result=await addClassParticleCounts(dir,[],m,null);
 assert.deepEqual(result.rows.map(r=>r.NumberOfParticles),['3/4 particles','1/4 particles','0/4 particles']);
 await fs.appendFile(file,'5@a.mrcs 2\n');
 assert.equal((await addClassParticleCounts(dir,[],m,null)).rows[1].NumberOfParticles,'2/5 particles');
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});
