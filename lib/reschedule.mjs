import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
import {settingsStar} from './settings.mjs';
import {jobPath} from './paths.mjs';
const digest=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
export const shiftJob=(name,n)=>name.replace(/\/job(\d+)\//,(_,v)=>'/job'+String(Number(v)+n).padStart(3,'0')+'/');
export class RescheduleActions{
 constructor(project,adapter){this.project=project;this.base=adapter;while(this.base.base)this.base=this.base.base;this.plans=new Map();}
 async settings(source,values,fn){
  const dir=path.join(this.project,'.reliondeluxe');await fs.mkdir(dir,{recursive:true,mode:0o700});
  const file=path.join(dir,randomUUID()+'.star');
  try{await fs.writeFile(file,settingsStar({label:source.label},source.schema,values),{flag:'wx',mode:0o600});return await fn(file);}finally{await fs.unlink(file).catch(e=>{if(e.code!=='ENOENT')throw e;});}
 }
 async build(jobs,n){
  if(!Number.isSafeInteger(n)||n<=0)throw Error('N must be a positive integer.');
  if(!Array.isArray(jobs)||!jobs.length||jobs.length>100||new Set(jobs).size!==jobs.length)throw Error('Select between 1 and 100 different scheduled jobs.');
  for(const name of jobs)jobPath(this.project,name);
  if((await fs.readdir(this.project)).some(f=>f.startsWith('RUNNING_PIPELINER_')))throw Error('Stop the active pipeline scheduler before re-scheduling jobs (a RUNNING_PIPELINER marker exists).');
  const state=await this.base.call(['state']),catalog=await this.base.call(['schema']);
  const selected=new Set(jobs),mapping=new Map(jobs.map(name=>[name,shiftJob(name,n)]));
  const deletion=await this.base.call(['reschedule-trash-plan',jobs.join(',')]);
  if(deletion.blocked.length)throw Error(deletion.blocked.join('\n'));
  const items=[];
  for(const name of [...jobs].sort((a,b)=>Number(a.match(/job(\d+)/)[1])-Number(b.match(/job(\d+)/)[1]))){
   const job=state.jobs.find(j=>j.name===name);if(!job||job.status!=='Scheduled')throw Error('Only Scheduled jobs can be re-scheduled: '+name);
   const target=mapping.get(name),number=Number(target.match(/job(\d+)/)[1]);
   if(number<state.counter||number>2147483000)throw Error(target+' must have an unused number at or above '+state.counter+'.');
   if(state.jobs.some(j=>Number(j.name.match(/job(\d+)/)[1])===number))throw Error('Destination job number already used: '+target);
   const data=await this.base.call(['job',name]),schema=catalog.find(s=>s.id===data.type);
   const original=await fs.readFile(path.join(this.project,name,'job.star'),'utf8');
   const label=original.match(/_rlnJobTypeLabel\s+([^\s]+)/)?.[1]?.replace(/['"]/g,'');if(!label)throw Error('Cannot read job type label: '+name);
   const values={...data.values},changes=[];
   for(const [key,old] of Object.entries(values)){
    let value=old;
    for(const source of state.jobs){
     const aliases=[source.name,...(source.alias&&source.alias!=='None'?[source.alias]:[])];
     if(!aliases.some(a=>value.includes(a)))continue;
     let replacement=mapping.get(source.name);
     if(!replacement){const candidate=shiftJob(source.name,n),upstream=state.jobs.find(j=>j.name===candidate&&!selected.has(j.name)&&j.type===source.type&&j.status==='Succeeded');if(upstream)replacement=candidate;}
     if(!replacement){if(['Failed','Aborted'].includes(source.status))throw Error('No successful +N replacement for dependency '+source.name+' in '+name+' ('+key+').');continue;}
     // Perform all substitutions from the original string to avoid shifting a path twice.
    }
    value=old.replace(/[A-Za-z][A-Za-z0-9]*\/(?:job\d+|[A-Za-z0-9_.-]+)\//g,ref=>{
     const source=state.jobs.find(j=>j.name===ref||j.alias===ref);if(!source)return ref;
     if(mapping.has(source.name))return mapping.get(source.name);
     const candidate=shiftJob(source.name,n);return state.jobs.some(j=>j.name===candidate&&!selected.has(j.name)&&j.type===source.type&&j.status==='Succeeded')?candidate:ref;
    });
    if(value!==old){values[key]=value;changes.push({field:key,from:old,to:value});}
   }
   const source={label,schema};
   const preview=await this.settings(source,values,file=>this.base.call(['reschedule-copy-plan',name,target,file]));
   items.push({source:name,target,values,changes,metadata:source,inputs:preview.inputs,outputs:preview.outputs,originalDigest:digest(original)});
  }
  const outputs=new Set(items.flatMap(i=>i.outputs));
  for(const item of items)for(const input of item.inputs){
   if(outputs.has(input))continue;
   const producer=state.jobs.find(j=>j.outputs.includes(input));
   if(producer&&selected.has(producer.name))throw Error('Input still depends on an original selected job: '+input);
   if(!state.nodes.some(node=>node.name===input)&&!await fs.stat(path.resolve(this.project,input)).catch(()=>null))throw Error('Missing replacement input: '+input);
  }
  return {n,items,state,signature:digest({state,items})};
 }
 async preview(jobs,n){const plan=await this.build(jobs,n),id=randomUUID();for(const [k,p]of this.plans)if(p.expires<Date.now())this.plans.delete(k);if(this.plans.size>=100)this.plans.delete(this.plans.keys().next().value);this.plans.set(id,{jobs,n,signature:plan.signature,expires:Date.now()+300000});return {id,n,items:plan.items.map(({source,target,changes})=>({source,target,changes}))};}
 async execute(id){
  const saved=this.plans.get(id);this.plans.delete(id);if(!saved||saved.expires<Date.now())throw Error('Preview expired. Preview re-schedule+N again.');
  const plan=await this.build(saved.jobs,saved.n);if(plan.signature!==saved.signature)throw Error('Pipeline or job settings changed. Preview again.');
  const created=[];
  try{
   for(const item of plan.items){await this.settings(item.metadata,item.values,file=>this.base.call(['reschedule-copy',item.source,item.target,file]));created.push(item.target);}
   const deletion=await this.base.call(['reschedule-trash-plan',saved.jobs.join(',')]);if(deletion.blocked.length)throw Error(deletion.blocked.join('\n'));
   await this.base.call(['reschedule-trash',saved.jobs.join(',')]);
   return {created,trashed:saved.jobs};
  }catch(e){throw Error(e.message+'\nCreated replacements: '+(created.join(', ')||'none')+'. Originals were not intentionally removed before all replacements were scheduled. Inspect the pipeline before retrying.');}
 }
}
