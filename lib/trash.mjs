import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
const fingerprint=plan=>createHash('sha256').update(JSON.stringify(plan)).digest('hex');
export function manifestPath(value){
 if(typeof value!=='string'||!/^Trash\/[A-Za-z][A-Za-z0-9]*\/job\d+\/deleted_pipeline\.star$/.test(value))throw new Error('Invalid Trash manifest');
 return value;
}
export async function listTrash(project){
 const files=[];
 async function dirs(dir){return (await fs.readdir(path.join(project,dir),{withFileTypes:true}).catch(e=>{if(e.code==='ENOENT')return [];throw e;})).filter(x=>x.isDirectory()&&!x.isSymbolicLink());}
 const root=await fs.lstat(path.join(project,'Trash')).catch(e=>{if(e.code==='ENOENT')return null;throw e;});
 if(root?.isSymbolicLink())throw new Error('Trash cannot be a symbolic link');
 for(const type of await dirs('Trash')){
  if(!/^[A-Za-z][A-Za-z0-9]*$/.test(type.name))continue;
  for(const job of await dirs(`Trash/${type.name}`)){
   if(!/^job\d+$/.test(job.name))continue;
   const file=`Trash/${type.name}/${job.name}/deleted_pipeline.star`;
   const stat=await fs.lstat(path.join(project,file)).catch(e=>{if(e.code==='ENOENT')return null;throw e;});
   if(stat?.isFile())files.push({kind:'deleted',manifest:file,modified:stat.mtime.toISOString()});
   else {const directory=`Trash/${type.name}/${job.name}/`;const contents=await fs.readdir(path.join(project,directory),{withFileTypes:true});if(contents.length){const info=await fs.stat(path.join(project,directory));files.push({kind:'cleaned',directory,job:`${type.name}/${job.name}/`,contents:contents.map(e=>e.name+(e.isDirectory()?'/':'')).sort(),modified:info.mtime.toISOString()});}}

  }
 }
 return files.sort((a,b)=>b.modified.localeCompare(a.modified));
}
// A short-lived confirmation is tied to the exact scope/status shown to the user.
export class TrashActions {
 constructor(adapter){this.adapter=adapter;this.plans=new Map();}
 async preview(kind,target,recursive=false){
  const args=kind==='delete'?[Array.isArray(target)?'delete-many-plan':'delete-plan',Array.isArray(target)?target.join(','):target,String(recursive)]:['restore-plan',manifestPath(target)];
  const plan=await this.adapter.call(args),id=randomUUID();
  for(const [key,item]of this.plans)if(item.expires<Date.now())this.plans.delete(key);
  if(this.plans.size>=100)this.plans.delete(this.plans.keys().next().value);
  this.plans.set(id,{kind,target,recursive,args,digest:fingerprint(plan),expires:Date.now()+120000});
  return {...plan,id};
 }
 async execute(kind,id){
  const saved=this.plans.get(id);this.plans.delete(id);
  if(!saved||saved.kind!==kind||saved.expires<Date.now())throw new Error('Confirmation expired. Preview the affected jobs again.');
  const current=await this.adapter.call(saved.args);
  if(fingerprint(current)!==saved.digest)throw new Error('Pipeline or Trash changed. Preview the affected jobs again.');
  if(current.blocked.length)throw new Error(current.blocked.join('\n'));
  const names=current.jobs.map(j=>j.name).join(',');
  return this.adapter.call(kind==='delete'?[Array.isArray(saved.target)?'delete-many':'delete',Array.isArray(saved.target)?saved.target.join(','):saved.target,String(saved.recursive),names]:['undelete',saved.target,names]);
 }
}
