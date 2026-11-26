import fs from 'node:fs/promises';
import path from 'node:path';
import {readablePath} from './paths.mjs';
import {parseStar} from './gallery.mjs';
export async function gainCandidates(project,roots,{state,adapter,mode}={}){
 const folders=new Set(['.']);
 if(state){
  const imports=state.jobs.filter(j=>mode==='tomo'?(j.type===50||j.type==='relion.importtomo'):(j.type===0||j.type==='relion.import')).sort((a,b)=>Number(a.name.match(/job(\d+)/)?.[1])-Number(b.name.match(/job(\d+)/)?.[1]));
  for(const job of imports){
   try{
    const v=adapter?(await adapter.call(['job',job.name])).values:Object.fromEntries(parseStar(await fs.readFile(await readablePath(project,roots,job.name+'job.star'),'utf8')).flatMap(b=>b.tables).flatMap(t=>t.rows).filter(r=>r.rlnJobOptionVariable).map(r=>[r.rlnJobOptionVariable,r.rlnJobOptionValue]));
    if(mode==='tomo'?v.do_coords==='Yes':v.do_raw!=='Yes')continue;
    const pattern=mode==='tomo'?v.movie_files:v.fn_in_raw;
    if(pattern){const folder=path.dirname(pattern);if(!/[?*\[\]{}]/.test(folder))folders.add(folder);}
    break;
   }catch{/* Keep the project-root suggestions if saved import settings cannot be read. */break;}
  }
 }
 const candidates=[],seen=new Set();
 for(const folder of folders){
  try{
   const directory=await readablePath(project,roots,folder);
   for(const entry of await fs.readdir(directory,{withFileTypes:true})){
    if(!/gain/i.test(entry.name)||!/\.(mrc|mrcs|tif|tiff|gain)$/i.test(entry.name)||entry.isDirectory())continue;
    const candidate=path.join(folder,entry.name);
    try{const file=await readablePath(project,roots,candidate);if(!seen.has(file)&&(await fs.stat(file)).isFile()){seen.add(file);candidates.push(candidate);}}catch{}
   }
  }catch{/* Respect read-root restrictions; don't walk inaccessible remote folders. */}
 }
 candidates.sort((a,b)=>a.localeCompare(b));
 return candidates;
}
export async function gainWarning(project,roots,layout,values,options={}){
 if(layout.name!=='Motion correction'||String(values.fn_gain_ref||'').trim())return null;
 const candidates=await gainCandidates(project,roots,{...options,mode:layout.mode});
 const tab=Object.entries(layout.tabs||{}).find(([,keys])=>keys.includes('fn_gain_ref'))?.[0]||'I/O';
 return {severity:'warning',field:'fn_gain_ref',file:'',gainCandidates:candidates,message:'Gain reference is empty ('+tab+' tab). Confirm that these movies are already gain-normalised, or supply the correct gain reference before proceeding.'+(candidates.length?' Possible gain files in the project or first raw Import folder: '+candidates.join(', ')+'. Filenames alone do not establish compatibility.':'')};
}
