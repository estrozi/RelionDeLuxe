// Detached readiness guard; stock relion_pipeliner still executes each job and
// waits for its terminal marker. No native source or generated job scripts change.
import fs from 'node:fs/promises';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {NativeAdapter} from '../lib/native.mjs';
import {HelicalAdapter} from '../lib/helical.mjs';
import {ScreeningAdapter} from '../lib/screening.mjs';
import {CryocareAdapter} from '../lib/cryocare.mjs';
import {DominantAdapter} from '../lib/dominant-class.mjs';
import {preflight} from '../lib/preflight.mjs';
import {readinessDecision} from '../lib/scheduler-readiness.mjs';
import {completionMarkers} from '../lib/completion-markers.mjs';
const plan=JSON.parse(await fs.readFile(process.argv[2],'utf8'));
const {project,name}=plan;
const marker=path.join(project,'RUNNING_PIPELINER_'+name);
const log=message=>console.log(new Date().toISOString()+' '+message);
const native=new NativeAdapter(project,plan.bridge);
const base=process.env.RELIONDELUXE_MODE==='tomo'?new CryocareAdapter(native):new ScreeningAdapter(new HelicalAdapter(native),project,plan.readRoots);
const adapter=new DominantAdapter(base,project,plan.readRoots);
const alive=async()=>{try{await fs.access(marker);}catch{throw Error('Scheduler stopped: RUNNING marker was removed.');}};
const wait=async ms=>{const end=Date.now()+ms;while(Date.now()<end){await alive();await new Promise(r=>setTimeout(r,Math.min(1000,end-Date.now())));}};
const state=async()=>completionMarkers(project,await adapter.call(['refresh']));
async function ready(item){
 let last='',dependencies=item.dependencies||[];
 while(true){
  await alive();
  const snapshot=await state();
  if(snapshot.jobs.find(j=>j.name===item.job)?.status!=='Scheduled')throw Error(item.job+' is no longer scheduled; refusing a duplicate launch.');
  const prior=readinessDecision({dependencies,report:[]},snapshot.jobs);
  if(prior.error)throw Error(item.job+' — '+prior.error);
  if(prior.waiting){
   const message='Waiting for '+prior.waiting.join(', ')+' to finish producing inputs for '+item.job;
   if(message!==last){log(message);last=message;}
   await wait(10000);continue;
  }
  const saved=await adapter.call(['job',item.job]);
  const check=await preflight({project,readRoots:plan.readRoots,adapter,layout:item.l,schema:item.s,values:saved.values,existing:item.job,action:'scheduler',readinessOnly:true});
  dependencies=check.dependencies;
  const decision=readinessDecision(check,(await state()).jobs);
  if(decision.error)throw Error(item.job+' — '+decision.error);
  if(decision.ready)return;
  const message='Waiting for '+decision.waiting.join(', ')+' to finish producing inputs for '+item.job;
  if(message!==last){log(message);last=message;}
  await wait(10000);
 }
}
async function nativeJob(job){
 await alive();
 log('Inputs ready; starting '+job);
 const code=await new Promise((resolve,reject)=>{
  const child=spawn(plan.pipeliner,['--schedule',name,'--RunJobs',job,'--repeat','1','--min_wait','0','--min_wait_before','0'],{cwd:project,env:process.env,stdio:'inherit'});
  child.once('error',reject);child.once('exit',code=>resolve(code));
 });
 if(code!==0)throw Error('relion_pipeliner exited with status '+code+' for '+job);
 const current=(await state()).jobs.find(j=>j.name===job);
 if(current?.status!=='Succeeded')throw Error(job+' ended with status '+(current?.status||'unknown'));
 // Stock single-run pipeliner removes this marker on success.
 await fs.writeFile(marker,'');
}
try{
 await fs.writeFile(marker,'');
 log('Scheduler started. Minimum initial delay: '+plan.before+' minutes.');
 await wait(plan.before*60000);
 for(let repeat=0;repeat<plan.repeat;repeat++){
  const start=Date.now();
  for(const item of plan.prepared){
   if(repeat){
    const saved=await adapter.call(['job',item.job]);
    const current=(await state()).jobs.find(j=>j.name===item.job);
    if(current?.status!=='Succeeded')throw Error(item.job+' changed state before the repeat.');
    const nativeSaved=await native.call(['job',item.job]);
    await adapter.submit('schedule',item.l,item.s,saved.values,item.job,'');
    // Match stock repeat behaviour: incremental job types continue; other
    // types retain the flag with which this scheduler was started.
    const continuation=[1,2,4,5,7].includes(nativeSaved.type)||nativeSaved.isContinue;
    const file=path.join(project,item.job,'job.star'),text=await fs.readFile(file,'utf8');
    if(!/^_rlnJobIsContinue\s+\S+/m.test(text))throw Error('Missing continuation flag in '+file);
    const temp=file+'.guard.tmp';
    await fs.writeFile(temp,text.replace(/^(_rlnJobIsContinue\s+)\S+/m,(_,prefix)=>prefix+(continuation?'1':'0')));
    await fs.rename(temp,file);
   }
   await ready(item);await nativeJob(item.job);
  }
  if(repeat+1<plan.repeat)await wait(Math.max(0,plan.wait*60000-(Date.now()-start)));
 }
 log('All scheduled jobs finished successfully.');
}catch(error){log('ERROR: '+error.message);process.exitCode=1;}
finally{
 await fs.rm(marker,{force:true});
 const recordFile=path.join(project,'.reliondeluxe','schedulers',name+'.json');
 try{
  const record=JSON.parse(await fs.readFile(recordFile,'utf8'));
  if(record.pid===process.pid){record.exitCode=process.exitCode||0;record.ended=new Date().toISOString();await fs.writeFile(recordFile,JSON.stringify(record),{mode:0o600});}
 }catch{}
}
