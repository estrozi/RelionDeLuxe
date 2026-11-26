import test from 'node:test';
import assert from 'node:assert/strict';
import {configurationFix} from '../lib/configuration-fixes.mjs';
const schema={options:[{key:'do_own_motioncor',default:'Yes'},{key:'do_float16',default:'Yes'}]},layout={name:'Motion correction'};
test('MotionCor2 float16 conflict proposes a non-mutating repair, including schema defaults',()=>{
 const values={do_own_motioncor:'No',do_float16:'Yes',fn_motioncor2_exe:'/tools/MotionCor2'},original={...values};
 const fix=configurationFix(layout,schema,values);assert.equal(fix.configurationWarning,true);assert.deepEqual(fix.changes,{do_float16:'No'});assert.deepEqual(values,original);
 assert.equal(configurationFix(layout,schema,{...values,...fix.changes}),null);
 assert.deepEqual(configurationFix(layout,schema,{do_own_motioncor:'No'}).changes,{do_float16:'No'});
 assert.equal(configurationFix(layout,schema,{}),null);
 assert.equal(configurationFix(layout,schema,{do_own_motioncor:'Yes',do_float16:'Yes'}),null);
 assert.equal(configurationFix({name:'Particle extraction'},schema,values),null);
});

test('Accepted repair produces a valid native MotionCor2 preview without registering a job',{skip:!process.env.RELION_DELUXE_BRIDGE},async()=>{
 const fs=await import('node:fs/promises'),path=await import('node:path'),os=await import('node:os');
 const {NativeAdapter}=await import('../lib/native.mjs');
 const project=await fs.mkdtemp(path.join(os.tmpdir(),'float16-fix-'));
 try{
  const adapter=new NativeAdapter(project,path.resolve(process.env.RELION_DELUXE_BRIDGE));await adapter.call(['init']);
  const layouts=JSON.parse(await fs.readFile(new URL('../public/layout.json',import.meta.url))),l=layouts.find(l=>l.name==='Motion correction'),s=(await adapter.call(['schema'])).find(s=>s.id===l.id);
  const values={input_star_mics:'Import/job001/movies.star',do_own_motioncor:'No',do_float16:'Yes'};
  await assert.rejects(adapter.submit('preview',l,s,values,'',''),/MotionCor2 cannot write float16/);
  const proposed=configurationFix(l,s,values);assert.deepEqual(proposed.changes,{do_float16:'No',do_save_ps:'No'});const fixed={...values,...proposed.changes};
  const preview=await adapter.submit('preview',l,s,fixed,'','');assert.match(preview.command,/--use_motioncor2/);assert(!preview.command.includes('--float16'));assert.equal((await adapter.call(['state'])).jobs.length,0);assert.equal(values.do_float16,'Yes');
 }finally{await fs.rm(project,{recursive:true,force:true});}
});
