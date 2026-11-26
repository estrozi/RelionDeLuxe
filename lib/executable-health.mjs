import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import {spawn} from 'node:child_process';
import {resolveExecutable} from './executables.mjs';import {healthKeys} from '../public/executable-health.js';
export function classifyProbe(key,code,output,{timeout=false,signal=null}={}){
 if(/error while loading shared libraries|cannot open shared object|symbol lookup error|ModuleNotFoundError|ImportError|Traceback \(most recent call last\)|command not found|bad interpreter|Exec format error/i.test(output)||[126,127].includes(code))return {status:'fail',message:'Executable failed to load or has missing runtime dependencies.'};
 if(timeout)return {status:'unknown',message:'Probe timed out; executable readiness could not be confirmed.'};
 if(signal)return {status:'fail',message:'Executable terminated by '+signal};
 if(code===0&&!output.trim())return {status:'unknown',message:'Executable returned no diagnostic output; readiness could not be confirmed.'};
 if(code===0&&output.trim())return {status:'pass',message:'Executable started successfully (usage check only).'};
 if(/usage|unknown (?:option|argument)|unrecognized (?:option|argument)|invalid (?:option|argument)|command.line options/i.test(output)&&code!==null)return {status:'pass',message:'Executable returned usage information (exit '+code+').'};
 return {status:'fail',message:'Probe exited '+code+' without recognizable usage information.'};
}
const cache=new Map();
export async function executableProbe(key,value,{cwd,force=false}={}){
 if(!healthKeys.includes(key)||typeof value!=='string'||value.length>4096)throw Error('Invalid executable check');
 const file=value.trim()?await resolveExecutable(value.trim(),{cwd}):null;
 if(!file)return {status:'fail',message:key+': executable not found: '+(value||'(empty)'),value};
 const st=await fs.stat(file),id=JSON.stringify([key,file,st.size,st.mtimeMs,st.ctimeMs,process.env.PATH,process.env.LD_LIBRARY_PATH]);
 if(!force&&cache.has(id))return cache.get(id);
 const work=(async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'relion-probe-'));
 try{return await new Promise(resolve=>{
  let output='',timeout=false,done=false;
  const child=spawn(file,[key==='fn_ctffind_exe'?'--reliondeluxe-probe-invalid':'--help'],{cwd:dir,detached:true,stdio:['ignore','pipe','pipe']});
  const kill=()=>{try{process.kill(-child.pid,'SIGKILL');}catch{child.kill('SIGKILL');}};
  const timer=setTimeout(()=>{timeout=true;kill();},4000);
  const finish=(code,signal,error)=>{if(done)return;done=true;clearTimeout(timer);kill();const result=error?{status:'fail',message:error.message}:classifyProbe(key,code,output,{timeout,signal});resolve({...result,message:key+': '+result.message,value,resolved:file,exitCode:code,detail:output.slice(-3000)});};
  child.on('error',e=>finish(null,null,e));child.on('exit',(code,signal)=>finish(code,signal));
  for(const stream of [child.stdout,child.stderr])stream.on('data',b=>{output=(output+b.toString()).slice(-16000);});
 });}finally{await fs.rm(dir,{recursive:true,force:true});}
 })();cache.set(id,work);if(cache.size>100)cache.delete(cache.keys().next().value);return work;
}
export async function executableHealth(values,tomo,options={}){return Object.fromEntries(await Promise.all(healthKeys.filter(k=>tomo||!['fn_batchtomo_exe','fn_aretomo_exe'].includes(k)).map(async k=>[k,await executableProbe(k,String(values[k]||''),options)])));}
