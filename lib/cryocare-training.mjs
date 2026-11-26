import fs from 'node:fs/promises';
import path from 'node:path';
import {parseStar} from './gallery.mjs';
import {readablePath} from './paths.mjs';
export async function cryocareTrainingDefault({project,readRoots=[],input}){
 if(typeof input!=='string'||!input.trim())return {value:''};
 const actual=await readablePath(project,readRoots,input),blocks=parseStar(await fs.readFile(actual,'utf8'));
 const table=blocks.flatMap(b=>b.tables).find(t=>t.labels.includes('rlnTomoName'));
 const names=(table?.rows||[]).map(row=>String(row.rlnTomoName||'').trim()).filter(Boolean).slice(0,5);
 return {value:names.join(':')};
}
export async function checkCryocareTraining({project,readRoots=[],state,values}){
 if(values.do_cryocare_train!=='Yes')return [];
 const field='tomograms_for_training',report=(message,file='',severity='warning')=>[{severity,file,field,message:'CryoCare tab · Tomograms for training: '+message}];
 const names=String(values[field]||'').split(':').map(x=>x.trim());
 if(names.some(x=>!x))return report('enter nonempty tilt-series names separated by colons.');
 const imports=state.jobs.filter(j=>Number(j.type)===50||j.type==='relion.importtomo'||j.outputs?.some(o=>/\/tilt_series\.star$/.test(o))&&/^Import\//.test(j.name)).sort((a,b)=>Number(a.name.match(/job(\d+)/)?.[1])-Number(b.name.match(/job(\d+)/)?.[1]));
 const first=imports[0],file=first?.outputs?.find(o=>/(^|\/)tilt_series\.star$/.test(o))||(first?first.name+'tilt_series.star':'');
 if(!file)return report('cannot verify names: no first Import tilt_series.star output is registered.');
 try{
  const actual=await readablePath(project,readRoots,file),blocks=parseStar(await fs.readFile(actual,'utf8'));
  const table=blocks.flatMap(b=>b.tables).find(t=>t.labels.includes('rlnTomoName'));
  if(!table?.rows.length)return report('cannot verify names: the Import STAR has no tilt-series names (_rlnTomoName).',file);
  const allowed=new Set(table.rows.map(r=>r.rlnTomoName)),unknown=[...new Set(names.filter(n=>!allowed.has(n)))];
  return unknown.length?report('unknown name(s): '+unknown.join(', ')+'. Use a subset of the names in '+file+'.',file):[];
 }catch(e){return report('cannot verify names against '+file+': '+(first?.status==='Scheduled'?'Import is scheduled; validation must wait until its output exists.':e.message),file);}
}


export async function cryocareModelDefault(project,readRoots,state,layout){
 const jobs=state.jobs.filter(j=>layout.find(l=>l.id===j.type)?.name==='Denoise tomograms'&&['Succeeded','Running','Scheduled'].includes(j.status))
  .sort((a,b)=>Number(b.name.match(/job(\d+)/)?.[1]||0)-Number(a.name.match(/job(\d+)/)?.[1]||0));
 for(const job of jobs){
  try{
   const file=await readablePath(project,readRoots,path.posix.join(job.name,'job.star'));
   const options=Object.fromEntries(parseStar(await fs.readFile(file,'utf8')).flatMap(b=>b.tables).flatMap(t=>t.rows).filter(r=>r.rlnJobOptionVariable).map(r=>[r.rlnJobOptionVariable,r.rlnJobOptionValue]));
   if(options.do_cryocare_train!=='Yes'||options.do_cryocare_predict==='Yes')continue;
   const model=path.posix.join(job.name,'denoising_model.tar.gz');
   if(job.status==='Succeeded')await readablePath(project,readRoots,model);
   return model;
  }catch{}
 }
 return '';
}
