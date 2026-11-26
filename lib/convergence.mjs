import fs from 'node:fs/promises';
import path from 'node:path';
import {jobPath,readablePath} from './paths.mjs';
import {parseStar} from './gallery.mjs';
const cache=new Map();
export function classConvergence(text,mode="3d"){
 const section=text.match(/^data_model_classes\s*$([\s\S]*?)(?=^data_|$(?![\s\S]))/m);
 if(!section)throw Error('Missing model_classes block');
 if(mode==='2d'){
  const table=parseStar(section[0]).find(b=>b.name==='model_classes')?.tables.find(t=>t.labels.includes('rlnAccuracyRotations')&&t.labels.includes('rlnAccuracyTranslationsAngst'));
  if(!table?.rows.length)throw Error('Class rotation/translation accuracy table is incomplete');
  const metric=v=>{const n=Number(v);return Number.isFinite(n)&&n>0&&n!==999?n:null;};
  return table.rows.map((r,i)=>({id:Number(r.rlnClassNumber||r.rlnReferenceImage?.match(/^(\d+)@/)?.[1]||i+1),rotation:metric(r.rlnAccuracyRotations),translation:metric(r.rlnAccuracyTranslationsAngst)}));
 }
 const table=parseStar(section[0]).find(b=>b.name==='model_classes')?.tables.find(t=>t.labels.includes('rlnClassDistribution')&&t.labels.includes('rlnEstimatedResolution'));
 if(!table?.rows.length)throw Error('Class population/resolution table is incomplete');
 return table.rows.map((r,i)=>{const population=Number(r.rlnClassDistribution),resolution=Number(r.rlnEstimatedResolution),id=Number(r.rlnClassNumber||r.rlnReferenceImage?.match(/class(\d+)/)?.[1]||i+1);if(!Number.isInteger(id))throw Error('Invalid class identifier');return {id,population:Number.isFinite(population)&&population>=0&&population<=1?population:null,resolution:Number.isFinite(resolution)&&resolution>0&&resolution!==999?resolution:null};});
}
export async function convergence(project,roots,job,mode="3d"){
 if(mode==='refine3d')return refineConvergence(project,roots,job);
 const dir=await readablePath(project,roots,jobPath(project,job)),iterations=new Map(),warnings=[];
 const files=(await fs.readdir(dir)).map(name=>({name,match:name.match(/^run((?:_ct\d+)*)_it(\d+)_model\.star$/)})).filter(x=>x.match).sort((a,b)=>Number(a.match[2])-Number(b.match[2])||a.name.localeCompare(b.name));
 for(const {name,match}of files){try{const file=await readablePath(project,roots,path.join(dir,name)),st=await fs.stat(file);if(st.size>64*1024*1024)throw Error('Model STAR exceeds 64 MiB');const stamp=mode+':'+st.size+':'+st.mtimeMs;let entry=cache.get(file);if(entry?.stamp!==stamp){const classes=classConvergence(await fs.readFile(file,'utf8'),mode),after=await fs.stat(file);if(after.size!==st.size||after.mtimeMs!==st.mtimeMs)throw Error('File is being updated');entry={stamp,classes};cache.set(file,entry);if(cache.size>512)cache.delete(cache.keys().next().value);}const iteration=Number(match[2]),prior=iterations.get(iteration);if(!prior||st.mtimeMs>=prior.modified)iterations.set(iteration,{iteration,file:name,classes:entry.classes,modified:st.mtimeMs});}catch(e){warnings.push(name+': '+e.message);}}
 return {mode,iterations:[...iterations.values()].sort((a,b)=>a.iteration-b.iteration),warnings};
}

export function refinementLogParser(){
 const iterations=new Map();let current=null;
 const metric=value=>{const n=Number(value);return Number.isFinite(n)&&n>=0&&n!==999?n:null;};
 return {
  line(line){
   const marker=line.match(/Auto-refine:\s*Iteration=\s*(\d+)/);
   if(marker){const iteration=Number(marker[1]);current={iteration,classes:[{id:1,resolution:null,rotation:null,translation:null}]};iterations.set(iteration,current);}
   if(!current)return;
   const resolution=line.match(/Auto-refine:\s*Resolution=\s*(\S+)/);
   if(resolution)current.classes[0].resolution=metric(resolution[1]);
   const angles=line.match(/Auto-refine:\s*Changes in angles=\s*(\S+)\s+degrees;\s*and in offsets=\s*(\S+)\s+Angstroms/);
   if(angles){current.classes[0].rotation=metric(angles[1]);current.classes[0].translation=metric(angles[2]);}
  },
  result(){return {mode:'refine3d',iterations:[...iterations.values()].sort((a,b)=>a.iteration-b.iteration),warnings:[]};}
 };
}
async function refineConvergence(project,roots,job){
 const file=await readablePath(project,roots,path.join(jobPath(project,job),'run.out')).catch(e=>{if(e.code==='ENOENT')return null;throw e;});
 if(!file)return {mode:'refine3d',iterations:[],warnings:[]};
 const st=await fs.stat(file),stamp='refine3d:'+st.size+':'+st.mtimeMs+':'+st.ctimeMs;
 if(cache.get(file)?.stamp===stamp)return cache.get(file).data;
 const parser=refinementLogParser();
 const {createReadStream}=await import('node:fs'),{createInterface}=await import('node:readline');
 const stream=createReadStream(file,{encoding:'utf8'}),lines=createInterface({input:stream,crlfDelay:Infinity});
 try{for await(const line of lines)parser.line(line);}finally{lines.close();stream.destroy();}
 const data=parser.result(),after=await fs.stat(file);
 if(after.size===st.size&&after.mtimeMs===st.mtimeMs){cache.set(file,{stamp,data});if(cache.size>512)cache.delete(cache.keys().next().value);}
 return data;
}
