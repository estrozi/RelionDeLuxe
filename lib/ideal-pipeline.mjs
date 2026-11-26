import {unusedPickingInputs} from '../public/auto-picking-controls.js';
import {normalizeManualRequirements,saveManualRequirements,attachManualRequirements,manualHint,pruneGeneratedModelReminders} from './manual-requirements.mjs';
import {isMachineOption,portableResources,resolveResources} from './template-resources.mjs';
import {fieldError} from './field-errors.mjs';
import {unfoldDynaMight,isDyna} from './dynamight-continuation.mjs';
import {unfoldMaskCycles,validateContinuation} from './mask-continuation.mjs';
import {randomUUID,createHash} from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import {validateValues} from './settings.mjs';
import {preflight} from './preflight.mjs';
import {duplicateJobs} from './duplicates.mjs';
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const tokens=value=>[...value.matchAll(/\$\{([^}]+)\}/g)].map(m=>m[1]);
const plain=x=>x&&typeof x==='object'&&!Array.isArray(x);
// Conditional activation is independent of whether a field is editable during
// continuation: locked scientific inputs still belong in a fresh-job recipe.
export function inactiveCaptureInputs(layout,schema,values){
 const effective={...Object.fromEntries(schema.options.map(f=>[f.key,f.default])),...values};
 function active(key,seen=new Set()){
  if(seen.has(key))return true; // Do not discard data for ambiguous cyclic UI rules.
  const next=new Set(seen);next.add(key);
  if(key==='qsubscript'&&effective.do_queue!=='Yes')return false;
  if(unusedPickingInputs(layout,effective).includes(key))return false;
  return !(layout.fields?.[key]?.when||[]).some(c=>effective[c.key]!==c.value||!active(c.key,next));
 }
 return new Set(schema.options.filter(f=>[2,3].includes(f.type)&&!active(f.key)).map(f=>f.key));
}
export function validateTemplate(input,layout,catalog){
 if(!plain(input)||input.format!=='RelionDeLuxe.ideal-pipeline'||input.version!==1)throw Error('Import a RelionDeLuxe idealized pipeline JSON (version 1). A concrete pipeline STAR alone does not contain job parameters; capture from its open project instead.');
 const t=structuredClone(input),mode=layout.some(l=>l.mode==='tomo')?'tomo':'spa';
 if((t.mode||'spa')!==mode)throw Error('Template mode does not match this server. Open the corresponding SPA or --tomo project.');
 t.mode=mode;
 if(mode==='tomo'&&t.steps?.some(s=>s.continuation||s.values?.fn_cont))throw Error('STA templates currently replay fresh jobs. Explicit clone continuations are reserved for SPA; capture separate STA refinement rounds instead.');
 if(typeof t.name!=='string'||t.name.length>200||!plain(t.inputs)||!Array.isArray(t.steps)||!t.steps.length||t.steps.length>100)throw Error('Expected a name, input bindings and 1–100 steps.');
 for(const [key,value]of Object.entries(t.inputs))if(!/^[A-Za-z][A-Za-z0-9_]*$/.test(key)||typeof value!=='string'||value.length>16384||value.includes('${'))throw Error('Invalid input binding: '+key);
 // Job substitutions are directory paths ending in a slash; accept either JSON spelling.
 for(const step of t.steps)for(const [key,value]of Object.entries(step?.values||{}))if(typeof value==='string')step.values[key]=value.replace(/(\$\{jobN(?:\+[1-9]\d*)?\})\/+/g,'$1');
 const unfolding=mode==='tomo'?[]:[...unfoldDynaMight(t),...unfoldMaskCycles(t)];if(t.steps.length>100)throw Error('Unfolding exceeds the 100-step limit.');if(unfolding.length)t.unfoldingNotes=[...(t.unfoldingNotes||[]),...unfolding];
 const byId=new Map();
 for(const step of t.steps){
  if(!plain(step)||!/^jobN(?:\+[1-9]\d*)?$/.test(step.id)||byId.has(step.id))throw Error('Steps need unique symbolic IDs: jobN, jobN+1, …');
  const l=layout.find(l=>l.label===step.type),s=catalog.find(s=>s.id===l?.id);
  if(l?.label==='relion.external.screening')throw Error(step.id+': complete Screening separately before scheduling an idealized pipeline.');
  if(!s||!plain(step.values)||typeof step.directory!=='string'||!/^[A-Za-z][A-Za-z0-9]*$/.test(step.directory))throw Error('Unsupported step in this mode: '+step.id);
  if(step.values.fn_cont&&!step.continuation)throw Error(step.id+': templates replay fresh jobs; clear Continue from here.');
  for(const [key,value]of Object.entries(step.values))if(typeof value!=='string'||!s.options.some(f=>f.key===key))throw Error(step.id+': invalid option '+key);
  portableResources(step.values,s);
  normalizeManualRequirements(step,s);
  byId.set(step.id,step);
 }
 pruneGeneratedModelReminders(t.steps);
 const usedInputs=new Set(t.steps.flatMap(step=>Object.values(step.values).flatMap(value=>tokens(value))).filter(token=>token.startsWith('input:')).map(token=>token.slice(6)));for(const key of Object.keys(t.inputs))if(!usedInputs.has(key))delete t.inputs[key];
 for(const step of t.steps)validateContinuation(step,byId);
 const ordered=[],visiting=new Set(),done=new Set();
 function visit(step){
  if(done.has(step.id))return;if(visiting.has(step.id))throw Error('Cycle involving '+step.id+'. Correct the input references before scheduling.');
  visiting.add(step.id);const dependencies=new Set();
  for(const value of Object.values(step.values)){if(value.replace(/\$\{[^}]+\}/g,'').includes('${'))throw Error('Malformed symbolic reference in '+step.id);for(const token of tokens(value)){
   if(token.startsWith('input:')){if(!Object.hasOwn(t.inputs,token.slice(6)))throw Error('Unbound input '+token);}
   else {if(!byId.has(token))throw Error('Unknown step reference '+token);dependencies.add(token);visit(byId.get(token));}
  }
  }visiting.delete(step.id);done.add(step.id);step.dependencies=[...dependencies];ordered.push(step);
 }
 t.steps.forEach(visit);const ids=new Map(ordered.map((s,i)=>[s.id,i?'jobN+'+i:'jobN']));for(const step of ordered){step.id=ids.get(step.id);if(step.continuation)step.continuation.source=ids.get(step.continuation.source);delete step.captureCheckpoint;step.dependencies=step.dependencies.map(id=>ids.get(id));for(const [key,value]of Object.entries(step.values))step.values[key]=value.replace(/\$\{([^}]+)\}/g,(whole,id)=>ids.has(id)?'${'+ids.get(id)+'}':whole);}t.steps=ordered;return t;
}
export function resolveValues(step,inputs,mapping){return Object.fromEntries(Object.entries(step.values).map(([k,v])=>[k,v.replace(/\$\{([^}]+)\}/g,(_,key)=>key.startsWith('input:')?inputs[key.slice(6)]:mapping[key])]));}
export function batchStepError(error,step,layout,schema,target,values,global){
 let message=fieldError(error.message,layout,schema,values||{});
 if(/Laplacian-of-Gaussian picker does not support GPU/i.test(message)){
  const tab=Object.entries(layout.tabs).find(([,keys])=>keys.includes('use_gpu'))?.[0]||'Other options';
  message+=`\nEffective options: do_log = ${values?.do_log} (I/O tab), use_gpu = ${values?.use_gpu} (${tab} tab). LoG requires use_gpu = No; portable-template resource rules should set this automatically. Review the resolved resource report and workstation settings.`;
 }
 return Error(`Batch preview — ${step.id} · ${layout.name}${step.title&&step.title!==layout.name?' · '+step.title:''}\nPlanned job: ${target}\n${message}`);
}
export class IdealPipelines{
 constructor({project,adapter,layout,catalog,defaults,readRoots=[],demo=false}){Object.assign(this,{project,adapter,layout,catalog,defaults,readRoots,demo});this.plans=new Map();}
 async capture(names){
  const state=await this.adapter.call(['state']);if(!this.demo)await attachManualRequirements(this.project,this.readRoots,state);
  if(!Array.isArray(names)||!names.length)names=state.jobs.filter(j=>j.status==='Succeeded'&&this.layout.find(l=>l.id===j.type)?.label!=='relion.external.screening').map(j=>j.name);
  if(names.length>100||new Set(names).size!==names.length)throw Error('Select at most 100 distinct jobs.');
  const jobs=names.map(name=>{const j=state.jobs.find(j=>j.name===name);if(!j||!['Succeeded','Scheduled'].includes(j.status))throw Error('Capture only successful or scheduled jobs: '+name);return j;});
  const ids=new Map(jobs.map((j,i)=>[j.name,i?'jobN+'+i:'jobN'])),inputs={},warnings=[],steps=[];
  const references=jobs.flatMap(j=>[j.name,'./'+j.name,...(j.alias&&j.alias!=='None'?[j.alias]:[]),path.resolve(this.project,j.name)+'/'].map(ref=>({ref,id:ids.get(j.name)}))).sort((a,b)=>b.ref.length-a.ref.length);
  for(const j of jobs){
   const data=await this.adapter.call(['job',j.name]),l=this.layout.find(l=>l.id===data.type),s=this.catalog.find(s=>s.id===data.type);if(!l||!s)throw Error('Unsupported job '+j.name);
   const values={...await this.defaults.forJob(j.name,data.values)};
   const checkpointValue=isDyna(l.label)?values.fn_checkpoint:values.fn_cont;
   const owner=checkpointValue&&references.find(r=>checkpointValue.startsWith(r.ref));
   const checkpoint=!isDyna(l.label)&&owner?.id===ids.get(j.name)?path.basename(checkpointValue):undefined;
   const continuation=data.isContinue&&owner&&owner.id!==ids.get(j.name)&&(['relion.refine3d','relion.class3d'].includes(l.label)||isDyna(l.label))&&jobs.find(j=>ids.get(j.name)===owner.id)?.type===data.type?{source:owner.id,checkpoint:isDyna(l.label)?checkpointValue.slice(owner.ref.length):path.basename(values.fn_cont),...(isDyna(l.label)?{kind:'dynamight'}:{})}:undefined;
   // Clear inactive file inputs before constructing bindings or graph edges.
   for(const key of inactiveCaptureInputs(l,s,values))if(!(isDyna(l.label)&&key==='fn_checkpoint'))values[key]='';
   if(values.fn_cont&&!continuation){warnings.push(j.name+': self-checkpoint retained for mask-feedback detection; fresh steps otherwise restart from saved input settings.');values.fn_cont='';}
   portableResources(values,s);
   for(const [key,original] of Object.entries(values)){
    if(isMachineOption(key))continue;
    let value=original;
    if(value.includes('${'))throw Error('Reserved template syntax in '+j.name+' '+key);
    // One pass prevents alias/canonical paths from being rewritten twice.
    const escaped=references.map(x=>x.ref.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'));
    if(escaped.length)value=value.replace(new RegExp('(^|[\\s\\\'"=@])('+escaped.join('|')+')','g'),(_,prefix,ref)=>prefix+'${'+references.find(x=>x.ref===ref).id+'}');
    const field=s.options.find(f=>f.key===key);
    if(value&&!value.includes('${')&&[2,3].includes(field?.type)&&value!=='None'){
     const previous=Object.entries(inputs).find(([,v])=>v===value)?.[0],binding=previous||'input'+(Object.keys(inputs).length+1);inputs[binding]=value;value='${input:'+binding+'}';
     if(/\/job\d+\//.test(original))warnings.push(j.name+' '+key+': dependency outside the captured steps is an external input: '+original);
    }
    values[key]=value;
   }
   const manualRequirements=j.manualRequirements?.map(({field,instruction})=>({field,instruction}))||Object.entries(values).filter(([key,value])=>{if(!s.options.some(f=>f.key===key&&[2,3].includes(f.type)))return false;const match=value.match(/^\$\{(jobN(?:\+[1-9]\d*)?)\}(.+)$/);if(!match||match[1]===ids.get(j.name))return false;const source=jobs.find(source=>ids.get(source.name)===match[1]);return source&&source.outputs&&!source.outputs.includes(source.name+match[2]);}).map(([field])=>({field,instruction:manualHint}));
   steps.push({...(manualRequirements.length?{manualRequirements}:{}),id:ids.get(j.name),type:l.label,directory:j.name.split('/')[0],title:l.name,values,...(checkpoint?{captureCheckpoint:checkpoint}:{}),...(continuation?{continuation,...(isDyna(l.label)?{dynamightPhase:values.do_inverse==='Yes'?'inverse':'reconstruct'}:{})}:{})});
  }
  pruneGeneratedModelReminders(steps);
  for(const step of steps)if(step.manualRequirements?.length)warnings.push(jobs.find(j=>ids.get(j.name)===step.id).name+': review possible manual preparation for '+step.manualRequirements.map(r=>r.field).join(', ')+'. Unregistered intermediate outputs may also be legitimate.');
  for(const step of steps)if(step.continuation?.kind==='dynamight'){const source=steps.find(s=>s.id===step.continuation.source);if(source&&!source.continuation)source.dynamightPhase='forward';}
  const template={format:'RelionDeLuxe.ideal-pipeline',version:1,mode:this.layout.some(l=>l.mode==='tomo')?'tomo':'spa',name:'Idealized pipeline',inputs,steps};
  // Return editable draft even if historical/self references require correction.
  try{const normalized=validateTemplate(template,this.layout,this.catalog);return {template:normalized,warnings:[...warnings,...(normalized.unfoldingNotes||[])]};}catch(e){return {template,warnings:[...warnings,e.message]};}
 }
 async stopped(){if(!this.demo&&(await fs.readdir(this.project)).some(f=>f.startsWith('RUNNING_PIPELINER_')))throw Error('Stop the active scheduler before instantiating a template.');}
 async build(input){
  await this.stopped();const template=validateTemplate(input,this.layout,this.catalog),state=await this.adapter.call(['state']),revision=await this.defaults.revision();
  const global=await this.defaults.read(),mapping=Object.fromEntries(template.steps.map((s,i)=>[s.id,s.directory+'/job'+String(state.counter+i).padStart(3,'0')+'/'])),items=[],report=[];
  const virtual=structuredClone(state);
  for(const step of template.steps){
   const l=this.layout.find(l=>l.label===step.type),s=this.catalog.find(s=>s.id===l.id),target=mapping[step.id];
   let values;try{values=resolveValues(step,template.inputs,mapping);values=validateValues(s,resolveResources(l,s,values,global));
   if(!this.demo&&await fs.lstat(path.join(this.project,target)).catch(e=>{if(e.code==='ENOENT')return null;throw e;}))throw Error('Destination already exists: '+target);
   const continuation=step.continuation?{source:mapping[step.continuation.source],target}:undefined;
   if(continuation&&this.demo)throw Error('Clone continuations require native mode.');
   if(continuation&&step.type==='relion.class3d'){const source=items.find(i=>i.id===step.continuation.source),iteration=Number(step.continuation.checkpoint.match(/_it(\d+)_/)[1]);if(Number(source?.values.nr_iter)<iteration)throw Error(step.id+': the initial classification stops before the requested checkpoint iteration. Increase its Number of iterations or choose an earlier checkpoint.');}
   if(continuation&&step.type==='relion.class3d'&&Number(values.nr_iter)<=Number(step.continuation.checkpoint.match(/_it(\d+)_/)[1]))throw Error(step.id+': continuation Number of iterations must exceed the checkpoint iteration.');
   report.push({severity:'info',step:step.id,message:'Resolved resources: '+Object.entries(values).filter(([key])=>isMachineOption(key)).map(([key,value])=>key+'='+value).join(', ')});
   const preview=await this.adapter.submit('preview',l,s,values,'','',{anticipatedInputs:virtual.nodes,continuation});
   if(continuation&&isDyna(step.type))report.push({severity:'warning',step:step.id,message:'DynaMight clone links prior forward/inverse results using absolute paths. Keep the source jobs and check phase-specific parameters.'});
   if(continuation&&!isDyna(step.type))report.push({severity:'warning',step:step.id,message:'Clone continuation reads '+values.fn_cont+' without copying source results. Keep the source checkpoint and its referenced files. The checkpoint must exist after the unmasked run; review its iteration for this dataset.'});
   if(!this.demo&&preview.jobName?.split('/')[0]!==step.directory)throw Error(step.id+': directory does not match native job type.');
   const manualRequirements=(step.manualRequirements||[]).map(r=>({...r,file:values[r.field]}));
   for(const r of manualRequirements){if(!this.demo&&!preview.inputs?.some(n=>n.name===r.file))throw Error('Manual input '+r.field+' is not registered by this job. RELION cannot wait for it; select an active input field.');report.push({severity:'warning',step:step.id,file:r.file,message:'Manual preparation required: '+r.instruction+' RELION waits for this registered input file; no extra confirmation gate is added.'});}
   if(l.name==='Pick tomograms')throw Error(step.id+': browser tomogram picking is interactive; run it manually before scheduling downstream jobs.');
   const nativePreview=structuredClone(preview);preview.jobName=target;
   const wrapper={call:args=>args[0]==='state'?Promise.resolve(virtual):this.adapter.call(args),submit:async()=>preview};
   if(!this.demo){const check=await preflight({project:this.project,readRoots:this.readRoots,adapter:wrapper,layout:l,schema:s,values,action:'schedule'});report.push(...check.report.map(r=>({...r,step:step.id})));const matches=await duplicateJobs({project:this.project,adapter:{call:args=>this.adapter.call(args),submit:async()=>nativePreview},layout:l,schema:s,values});for(const match of matches)report.push({severity:'warning',step:step.id,message:'Identical executed job: '+match.name});}
   report.push({severity:'info',step:step.id,message:'Outputs may depend on data, convergence or interactive selection. Future output filenames and STAR contents must be checked when produced.'});
   items.push({id:step.id,target,type:l.id,values,manualRequirements,...(continuation?{continuation}:{}),command:(nativePreview.jobName&&nativePreview.jobName!==target?'Native dry run uses provisional output '+nativePreview.jobName+'; actual scheduled output will be '+target+'\n\n':'')+(preview.command||'DEMO'),inputs:preview.inputs||[]});
   virtual.jobs.push({name:target,type:l.id,status:'Scheduled',inputs:[],outputs:[]});
   // Future class averages are allowed only for planning; actual scheduling uses native registered nodes.
   virtual.nodes.push({name:target+'class_averages.star',type:'Image2DGroupMetadata.star.relion'});
   }catch(error){throw batchStepError(error,step,l,s,target,values,global);}
  }
  return {template,items,report,signature:hash({state,revision,template,items,report})};
 }
 async preview(template){const plan=await this.build(template),id=randomUUID();for(const [k,v]of this.plans)if(v.expires<Date.now())this.plans.delete(k);if(this.plans.size>=50)this.plans.delete(this.plans.keys().next().value);this.plans.set(id,{template:plan.template,signature:plan.signature,expires:Date.now()+300000});return {id,items:plan.items,report:plan.report};}
 async execute(id,hooks={}){
  const saved=this.plans.get(id);this.plans.delete(id);if(!saved||saved.expires<Date.now())throw Error('Preview expired. Preview the batch again.');
  const plan=await this.build(saved.template);if(saved.signature!==plan.signature)throw Error('Pipeline or settings changed. Preview the batch again.');
  const created=[];
  try{for(const item of plan.items){await this.stopped();const state=await this.adapter.call(['state']);if(state.counter!==Number(item.target.match(/job(\d+)\//)[1]))throw Error('Job numbering changed outside this server.');const l=this.layout.find(l=>l.id===item.type),s=this.catalog.find(s=>s.id===item.type);await hooks.before?.(item);const result=await this.adapter.submit('schedule',l,s,item.values,'','',{continuation:item.continuation});created.push(result.name);await hooks.created?.(result.name);if(result.name!==item.target)throw Error('Native numbering changed during scheduling.');this.defaults.markSaved(result.name);if(!this.demo)await saveManualRequirements(this.project,result.name,item.manualRequirements);}return {created};}
  catch(e){throw Error(e.message+'\nCreated scheduled jobs: '+(created.join(', ')||'none')+'. No existing jobs were deleted. Inspect these jobs before retrying the batch.');}
 }
}
