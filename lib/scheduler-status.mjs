import fs from 'node:fs/promises';
import path from 'node:path';
import {tail,readablePath} from './paths.mjs';
async function identity(pid){
 try{const stat=await fs.readFile('/proc/'+pid+'/stat','utf8'),fields=stat.slice(stat.lastIndexOf(')')+2).split(' ');
 return fields[0]==='Z'?null:fields[19];}catch{return null;}
}
export async function recordScheduler(project,child,argv,log){
 snapshots.delete(project);
 const name=argv[argv.indexOf('--schedule')+1],dir=path.join(project,'.reliondeluxe','schedulers');
 await fs.mkdir(dir,{recursive:true,mode:0o700});
 const file=path.join(dir,name+'.json'),record={name,guarded:argv.some(a=>a.endsWith('/guarded-scheduler.mjs')),pid:child.pid,start:await identity(child.pid),started:new Date().toISOString(),jobs:argv[argv.indexOf('--RunJobs')+1]||'',log};
 await fs.writeFile(file,JSON.stringify(record),{mode:0o600});
 const finish=(code,signal)=>{record.exitCode=code;record.signal=signal;record.ended=new Date().toISOString();fs.writeFile(file,JSON.stringify(record),{mode:0o600}).catch(()=>{});};
 child.once('exit',finish);
 if(child.exitCode!==null||child.signalCode)finish(child.exitCode,child.signalCode);
}
const snapshots=new Map();
export function schedulerStatus(project){
 const old=snapshots.get(project);if(old&&Date.now()-old.time<3000)return old.promise;
 const promise=scanSchedulers(project);snapshots.set(project,{time:Date.now(),promise});
 promise.catch(()=>snapshots.delete(project));return promise;
}
async function scanSchedulers(project){
 const records=new Map(),dir=path.join(project,'.reliondeluxe','schedulers');
 for(const file of await fs.readdir(dir).catch(()=>[])){
  try{const r=JSON.parse(await fs.readFile(path.join(dir,file),'utf8'));records.set(r.name,r);}catch{}
 }
 const files=await fs.readdir(project);
 for(const file of files.filter(f=>/^pipeline_[\w-]+\.log$/.test(f))){
  const name=file.slice(9,-4);if(!records.has(name))records.set(name,{name});
 }
 // Discover schedulers started outside this server too; only the same project.
 const root=await fs.realpath(project),proc=await fs.readdir('/proc').catch(()=>null);
 if(proc)for(const pid of proc.filter(p=>/^\d+$/.test(p))){
  try{
   const argv=(await fs.readFile('/proc/'+pid+'/cmdline','utf8')).split('\0').filter(Boolean);
   if(!argv.some(a=>/^relion_pipeliner(?:_mpi)?$/.test(path.basename(a)))||!argv.includes('--schedule'))continue;
   if(await fs.realpath('/proc/'+pid+'/cwd')!==root)continue;
   const name=argv[argv.indexOf('--schedule')+1];if(!name)continue;
   const start=await identity(pid);if(!start)continue;
   const old=records.get(name)||{};
   if(old.guarded&&old.pid&&await identity(old.pid)===old.start)continue;
   records.set(name,{...old,name,pid:Number(pid),start,active:true,jobs:argv.includes('--RunJobs')?argv[argv.indexOf('--RunJobs')+1]:old.jobs});
  }catch{}
 }
 const processes=[];
 for(const r of records.values()){
  if(!r.active)r.active=!!(proc&&r.pid&&r.start&&!r.ended&&await identity(r.pid)===r.start);
  const marker=files.includes('RUNNING_PIPELINER_'+r.name);
  r.status=r.active?'On':!proc?'Unknown':r.ended?(r.exitCode===0?'Exited':'Failed'):'Off';
  r.marker=marker;
  const candidates=[r.log,'pipeline_'+r.name+'.log'].filter(Boolean);let lines=[];
  for(const file of candidates)try{
   const actual=await readablePath(project,[],file),data=await tail(actual,16384);
   const text=data.text||'';const parsed=text.replace(/\x1b\[[0-9;]*[A-Za-z]/g,'').split(/[\r\n]+/).map(s=>s.trim()).filter(Boolean);
   if(parsed.length){lines=parsed;r.file=file;break;}
  }catch{}
  r.line=lines.at(-1)||'No scheduler output yet';r.recent=lines.slice(-12).join('\n');
  if(!r.active&&marker)r.line='Stopped with RUNNING marker still present · '+r.line;
  processes.push(r);
 }
 processes.sort((a,b)=>Number(b.active)-Number(a.active)||(b.started||b.name).localeCompare(a.started||a.name));
 if(!processes.length)return null;
 return {...processes[0],processes};
}
