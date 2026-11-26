import fs from 'node:fs/promises';
import path from 'node:path';
import {parseStar} from './gallery.mjs';
import {jobPath,readablePath} from './paths.mjs';
// These are derived GUI outputs only; leave RELION's native pipeline intact.
export async function attachTopazModels(project,roots,state){
 for(const job of state.jobs){
  if(![4,'relion.autopick'].includes(job.type))continue;
  try{
   const dir=jobPath(project,job.name);
   const blocks=parseStar(await fs.readFile(await readablePath(project,roots,path.join(dir,'job.star')),'utf8'));
   const v=Object.fromEntries(blocks.flatMap(b=>b.tables).flatMap(t=>t.rows).filter(r=>r.rlnJobOptionVariable).map(r=>[r.rlnJobOptionVariable,r.rlnJobOptionValue]));
   if(v.do_topaz!=='Yes'||v.do_topaz_train!=='Yes')continue;
   job.topazTraining=true;
   job.topazInput=v.fn_input_autopick||'';
   const names=(await fs.readdir(await readablePath(project,roots,dir))).filter(n=>/^model_epoch\d+\.sav$/i.test(n)).sort((a,b)=>Number(b.match(/epoch(\d+)/i)[1])-Number(a.match(/epoch(\d+)/i)[1]));
   // Never advertise an empty or incomplete newest checkpoint by falling back
   // to an earlier epoch. A running job's checkpoint is not final yet.
   const model=names[0]?job.name+names[0]:'';
   let ready=false;if(model){const st=await fs.stat(await readablePath(project,roots,model));ready=st.isFile()&&st.size>0;}
   job.topazModel=ready?model:'';
   job.outputs=(job.outputs||[]).filter(f=>!/(?:^|\/)(?:input_training_coords\.star|model_epoch\d+\.sav)$/i.test(f));
   if(ready){job.outputs.push(model);if(!state.nodes.some(n=>n.name===model))state.nodes.push({name:model,type:'TopazModel'});}
  }catch{/* A job may be queued or its settings in the middle of a rewrite. */}
 }
 return state;
}
export async function topazModelInputs(project,roots,state,{query=''}={}){
 await attachTopazModels(project,roots,state);
 const entries=state.jobs.filter(j=>j.topazTraining&&j.topazModel&&j.status==='Succeeded').sort((a,b)=>Number(b.name.match(/job(\d+)/)?.[1])-Number(a.name.match(/job(\d+)/)?.[1])).map(j=>({name:path.basename(j.topazModel),path:j.topazModel,directory:false,job:j.name,alias:j.alias&&j.alias!=='None'?j.alias:j.name,status:j.status,available:true})).filter(e=>(e.path+' '+e.alias).toLowerCase().includes(query.toLowerCase()));
 return {entries,truncated:false};
}
