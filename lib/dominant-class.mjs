import fs from 'node:fs/promises';
import {parseStar} from './gallery.mjs';
import {readablePath} from './paths.mjs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
export const dominantOption={key:'do_dominant_3d',label:'Select dominant 3D class only?',default:'No',type:5,help:'Select the 3D class with the largest population. Runs as a standard External pipeline job. Ties select the lowest class number.',choices:[],nodeType:'',nodeDepth:1,pattern:''};
export async function dominantInput(project,roots,file){
 const blocks=parseStar(await fs.readFile(await readablePath(project,roots,file),'utf8'));const opt=Object.assign({},...blocks.map(b=>b.values));
 if(!opt.rlnModelStarFile||!opt.rlnExperimentalDataStarFile)throw Error('Choose an optimiser STAR containing model and experimental-data references.');
 const model=parseStar(await fs.readFile(await readablePath(project,roots,opt.rlnModelStarFile),'utf8'));
 const general=Object.assign({},...model.map(b=>b.values));const rows=model.find(b=>b.name==='model_classes')?.tables.find(t=>t.labels.includes('rlnClassDistribution'))?.rows;
 const is3D=Number(general.rlnReferenceDimensionality)===3;
 if(!rows?.length)throw Error('Model lacks data_model_classes / rlnClassDistribution.');
 const classes=rows.map((r,i)=>({id:Number(r.rlnClassNumber||i+1),population:Number(r.rlnClassDistribution),map:r.rlnReferenceImage}));
 if(classes.some(c=>!Number.isInteger(c.id)||c.id<1||!Number.isFinite(c.population)||c.population<0))throw Error('Invalid class number or population in model STAR.');
 classes.sort((a,b)=>b.population-a.population||a.id-b.id);
 return {is3D,model:opt.rlnModelStarFile,data:opt.rlnExperimentalDataStarFile,winner:classes[0],ties:classes.filter(c=>c.population===classes[0].population).length};
}
const marker='reliondeluxe_dominant_3d';
const quote=s=>"'"+s.replaceAll("'","'\\''")+"'";
export class DominantAdapter{
 constructor(base,project,roots){this.base=base;this.env=base.env;this.project=project;this.roots=roots;}
 async call(args){const r=await this.base.call(args);
  if(args[0]==='schema')return r.map(s=>s.id===7?{...s,options:[...s.options,dominantOption]}:s);
  if(args[0]==='job'&&r.type===99&&r.values.param1_label===marker){const v=JSON.parse(Buffer.from(r.values.param2_value,'base64url').toString());return {...r,type:7,values:{...v,fn_model:r.values.in_part,do_dominant_3d:'Yes'}};}
  if(['state','refresh'].includes(args[0])){for(const j of r.jobs)if(j.type===99){try{const d=await this.base.call(['job',j.name]);if(d.values.param1_label===marker)j.type=7;}catch{}}}
  return r;
 }
 async submit(action,l,s,values,existing,alias,planning={}){
  if(l.id!==7)return this.base.submit(action,l,s,values,existing,alias,planning);
  const v={...values};delete v.do_dominant_3d;
  if(values.do_dominant_3d!=='Yes'&&existing){const raw=await this.base.call(['job',existing]);if(raw.type===99&&raw.values.param1_label===marker)throw Error('Use New from these settings to switch back to native Subset selection.');}
  if(values.do_dominant_3d!=='Yes')return this.base.submit(action,l,{...s,options:s.options.filter(f=>f.key!=='do_dominant_3d')},v,existing,alias,planning);
  if(existing){const raw=await this.base.call(['job',existing]);if(raw.type!==99||raw.values.param1_label!==marker)throw Error('Use New from these settings to create a dominant-class job; an existing native Select job cannot change pipeline type.');}
  v.do_class_ranker='No';
  for(const k of ['do_class_ranker','do_select_values','do_discard','do_split','do_recenter','do_regroup','do_remove_duplicates','do_filaments'])if(v[k]==='Yes')throw Error('Dominant 3D selection cannot combine with '+k+'. Set it to No.');
  if(!v.fn_model||v.fn_mic||v.fn_data||v.other_args?.trim())throw Error('Dominant 3D selection requires only an optimiser input and empty Additional arguments.');
  const ext=(await this.base.call(['schema'])).find(x=>x.id===99),runner=fileURLToPath(new URL('../scripts/dominant-class-runner.mjs',import.meta.url));
  const result=await this.base.submit(action,{id:99,label:'relion.external'},ext,{fn_exe:quote(process.execPath)+' '+quote(runner),in_part:v.fn_model,param1_label:marker,param1_value:'Yes',param2_label:'saved_options',param2_value:Buffer.from(JSON.stringify(v)).toString('base64url'),param3_label:'read_roots',param3_value:Buffer.from(JSON.stringify(this.roots)).toString('base64url'),do_queue:v.do_queue||'No',queuename:v.queuename||'',qsub:v.qsub||'qsub',qsubscript:v.qsubscript||'',min_dedicated:v.min_dedicated||'1',nr_threads:'1',other_args:''},existing,alias,planning);
  if(result.inputs)result.inputs=[{name:v.fn_model,type:'ProcessData.star.relion.optimiser'}];return result;
 }
}

export async function copyDominantMap(project,roots,info,output){
 const reference=info.winner.map;
 if(!reference||/^\d+@/.test(reference))throw Error('Dominant class must reference an individual 3D map in _rlnReferenceImage.');
 const source=await readablePath(project,roots,reference.replace(/:mrc$/i,''));
 if(!(await fs.stat(source)).isFile())throw Error('Dominant class reference is not a regular file.');
 const iteration=path.basename(info.model).match(/^(.*_it\d+)_model\.star$/i)?.[1];
 const name=(iteration||path.basename(info.model).replace(/_model\.star$/i,'').replace(/\.star$/i,''))+'_dominantclass.mrc';
 const target=path.join(output,name),temporary=target+'.copying';
 try{await fs.copyFile(source,temporary);await fs.rename(temporary,target);}finally{await fs.rm(temporary,{force:true});}
 return target;
}
