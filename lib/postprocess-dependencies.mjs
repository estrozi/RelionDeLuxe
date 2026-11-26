import fs from 'node:fs/promises';
import path from 'node:path';
import {parseStar} from './gallery.mjs';
import {jobPath,readablePath} from './paths.mjs';
// Supplement the display graph from job settings; never rewrite RELION's pipeline.
export function postprocessDependencies(project){
 const cache=new Map();
 return async state=>{
  const live=new Set(state.jobs.map(j=>j.name));for(const key of cache.keys())if(!live.has(key))cache.delete(key);
  for(const job of state.jobs){
   if(![4,16,20,21,'relion.autopick','relion.localres','relion.polish','relion.ctfrefine'].includes(job.type))continue;
   try{
    const file=await readablePath(project,[],path.join(jobPath(project,job.name),'job.star'));
    const stat=await fs.stat(file),stamp=`${stat.mtimeMs}:${stat.ctimeMs}:${stat.size}`;
    let entry=cache.get(job.name);
    if(entry?.stamp!==stamp){
     const blocks=parseStar(await fs.readFile(file,'utf8'));
     const options=Object.fromEntries(blocks.flatMap(b=>b.tables).flatMap(t=>t.rows).filter(r=>r.rlnJobOptionVariable).map(r=>[r.rlnJobOptionVariable,r.rlnJobOptionValue]));
     const fields=[16,'relion.localres'].includes(job.type)?['fn_in']:[4,'relion.autopick'].includes(job.type)?(options.do_topaz!=='Yes'?[]:options.do_topaz_train==='Yes'?[options.do_topaz_train_parts==='Yes'?'topaz_train_parts':'topaz_train_picks']:options.do_topaz_pick==='Yes'?['topaz_model']:[]):[20,'relion.polish'].includes(job.type)?['fn_post','fn_mic',...(options.do_polish==='Yes'&&options.do_own_params!=='Yes'?['opt_params']:[])]:['fn_post'];
     const inputs=blocks.flatMap(b=>b.tables).flatMap(t=>t.rows).filter(r=>fields.includes(r.rlnJobOptionVariable)).map(r=>r.rlnJobOptionValue?.trim()||'');
     entry={stamp,inputs};cache.set(job.name,entry);
    }
    for(let input of entry.inputs){if(!input||['None','?'].includes(input))continue;
    if(path.isAbsolute(input)){const relative=path.relative(project,input);if(!relative.startsWith('..'+path.sep)&&relative!=='..')input=relative;}
    input=input.replace(/^\.\//,'');
    job.inputs=[...new Set([...(job.inputs||[]),input])];
    // Expose the missing output at the producer too, for inspector highlighting.
    const source=state.jobs.find(j=>[j.name,j.alias&&j.alias!=='None'?j.alias:null].filter(Boolean).some(dir=>input.startsWith(dir.endsWith('/')?dir:dir+'/')));
    if(source){const alias=source.alias&&source.alias!=='None'?(source.alias.endsWith('/')?source.alias:source.alias+'/'):null;
     const canonical=alias&&input.startsWith(alias)?source.name+input.slice(alias.length):input;
     source.outputs=[...new Set([...(source.outputs||[]),canonical])];
    }
    }
   }catch{/* Missing or transiently rewritten job settings: keep native dependencies. */}
  }
  return state;
 };
}
