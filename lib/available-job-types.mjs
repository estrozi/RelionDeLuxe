import fs from 'node:fs/promises';
import path from 'node:path';
import {readablePath} from './paths.mjs';
import {nodeGroup,matchesInputFile,validInputProducer,modelAngeloMap} from './inputs.mjs';

// Visibility is a suggestion based on at least one produced compatible input.
// Full input validation still occurs when preparing and submitting the job.
export async function availableJobTypes(project,roots,state,layout,catalog,{demo=false}={}){
 const nodes=new Map((state.nodes||[]).map(n=>[n.name,n]));
 const outputs=[];
 for(const job of state.jobs||[])if(job.status==='Succeeded')for(const file of job.outputs||[]){
  const node=nodes.get(file);if(!node)continue;
  try{if(!demo&&!(await fs.stat(await readablePath(project,roots,file))).isFile())continue;}catch{continue;}
  outputs.push({job,file,node});
 }
 return layout.filter(l=>{
  if(['Screening','Import','Import tilt series'].includes(l.name))return true;
  const fields=catalog.find(s=>s.id===l.id)?.options||[];
  return fields.filter(f=>f.type===3&&!['fn_cont','fn_checkpoint','fn_mask','p_seq','d_seq','r_seq','fn_lib','fn_mtf'].includes(f.key)).some(f=>{
   let group;try{group=nodeGroup(f);}catch{return false;}
   return outputs.some(({job,file,node})=>validInputProducer(f,job)&&node.type.split('.').slice(0,f.nodeDepth).join('.')===group&&matchesInputFile(path.posix.basename(file),f)&&(l.name!=='ModelAngelo building'||f.key!=='fn_map'||modelAngeloMap(project,state,file)));
  });
 }).map(l=>l.id);
}
