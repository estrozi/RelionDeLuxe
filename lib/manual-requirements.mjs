import fs from 'node:fs/promises';import path from 'node:path';import {jobPath,readablePath} from './paths.mjs';
export const manualHint='Inspect the upstream results, select the appropriate class, and prepare this input with the required external operation. Write to a temporary filename, then rename it to the required filename after the operation succeeds.';
// Topaz training writes model_epoch<N>.sav via --save-prefix=<job>/model,
// but RELION does not register these model files as pipeline output nodes.
export function pruneGeneratedModelReminders(steps){
 const byId=new Map(steps.map(step=>[step.id,step]));
 for(const step of steps){
  const match=step.values?.topaz_model?.match(/^\$\{(jobN(?:\+[1-9]\d*)?)\}\/?model_epoch\d+\.sav$/);
  const source=match&&byId.get(match[1]);
  if(source&&source!==step&&source.type==='relion.autopick'&&source.values.do_topaz==='Yes'&&source.values.do_topaz_train==='Yes'){
   // Migrate earlier inferred reminders; keep user-authored preparation notes.
   if(Array.isArray(step.manualRequirements))step.manualRequirements=step.manualRequirements.filter(r=>!(r.field==='topaz_model'&&r.instruction===manualHint));
  }
 }
}
export function normalizeManualRequirements(step,schema){
 if(step.manualRequirements===undefined){step.manualRequirements=Object.entries(step.values).filter(([key,v])=>schema.options.some(f=>f.key===key&&[2,3].includes(f.type))&&/^\$\{jobN/.test(v)&&/_box\d+\.mrc$/i.test(v)).map(([field])=>({field,instruction:manualHint}));}
 if(!Array.isArray(step.manualRequirements)||step.manualRequirements.length>50)throw Error(step.id+': invalid manual requirements');
 const seen=new Set();for(const r of step.manualRequirements){if(!r||typeof r.field!=='string'||seen.has(r.field)||!schema.options.some(f=>f.key===r.field&&[2,3].includes(f.type))||!step.values[r.field]||step.values[r.field]==='TBD'||typeof r.instruction!=='string'||!r.instruction.trim()||r.instruction.length>4000)throw Error(step.id+': manual requirements need an input field and preparation instructions');seen.add(r.field);}
}
export async function saveManualRequirements(project,job,requirements){if(!requirements?.length)return;const dir=await readablePath(project,[],jobPath(project,job));await fs.writeFile(path.join(dir,'reliondeluxe-manual-inputs.json'),JSON.stringify(requirements,null,2)+'\n',{flag:'wx',mode:0o600});}
export async function attachManualRequirements(project,roots,state){for(const job of state.jobs){try{const file=await readablePath(project,[],path.join(jobPath(project,job.name),'reliondeluxe-manual-inputs.json'));const st=await fs.stat(file);if(st.size>256000)continue;const requirements=JSON.parse(await fs.readFile(file,'utf8'));if(!Array.isArray(requirements))continue;job.manualRequirements=await Promise.all(requirements.map(async r=>({...r,exists:await readablePath(project,roots,r.file).then(p=>fs.stat(p)).then(s=>s.isFile(),()=>false)})));}catch(e){if(e.code!=='ENOENT')job.manualRequirementsError='Could not read manual preparation reminders.';}}return state;}
