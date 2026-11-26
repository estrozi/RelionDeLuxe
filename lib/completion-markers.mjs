import fs from 'node:fs/promises';
import {jobPath,readablePath} from './paths.mjs';
import path from 'node:path';
// Native scheduler and pipeline snapshots can briefly disagree. Terminal marker
// files are RELION's completion signal; never infer completion from stdout.
export async function completionMarkers(project,state){
 for(const job of state.jobs){
  if(job.status!=='Running')continue;
  try{
   const dir=jobPath(project,job.name);
   const markers=await Promise.all(['SUCCESS','FAILURE','ABORTED'].map(async kind=>{
    const file=await readablePath(project,[],path.join(dir,'RELION_JOB_EXIT_'+kind)).catch(()=>null);
    return file&&await fs.stat(file).then(s=>s.isFile()?s:null,()=>null);
   }));
   // Match PipeLine::checkProcessCompletion: RELION removes old markers
   // when launching/continuing. job.star is editable and is not a start clock.
   const index=markers.findIndex(Boolean);
   if(index<0)continue;
   job.status=['Succeeded','Failed','Aborted'][index];
   job.completionSource='RELION_JOB_EXIT_'+['SUCCESS','FAILURE','ABORTED'][index];
  }catch{/* Leave the native status intact if the job is unavailable. */}
 }
 return state;
}
