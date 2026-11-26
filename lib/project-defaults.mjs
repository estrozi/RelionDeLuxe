import {resolveExecutable} from './executables.mjs';
import fs from 'node:fs/promises';
import {constants} from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {starValue} from './settings.mjs';
export const executionKeys=['cryocare_path','do_queue','queuename','qsub','qsubscript','min_dedicated','use_gpu','gpu_ids','globalNgpus','globalNcpus','fn_ctffind_exe','nr_pool','fn_motioncor2_exe','fn_resmap','fn_batchtomo_exe','fn_aretomo_exe'];
let cryocareInstall={};
try{cryocareInstall=JSON.parse(await fs.readFile(new URL('../cryocare-install.json',import.meta.url),'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
export const initialDefaults={nr_pool:'30',cryocare_path:cryocareInstall.cryocare_path||'/programs/x86_64-linux/cryocare/0.3.0/bin',fn_batchtomo_exe:'/programs/x86_64-linux/imod/5.2.2b/imod_5.2.2/bin/batchruntomo',fn_aretomo_exe:'/programs/x86_64-linux/aretomo3/2.2.8/bin/AreTomo3',use_gpu:'Yes',gpu_ids:'',fn_ctffind_exe:'/programs/x86_64-linux/ctffind4/4.1.14-c7/bin/ctffind',fn_resmap:'/programs/x86_64-linux/resmap/1.1.4/ResMap-1.1.4-linux64',fn_motioncor2_exe:'/programs/x86_64-linux/motioncor2/1.6.4/MotionCor2_1.6.4_Cuda102_Mar312023'};
export function validateDefaults(values){
 if(!values||typeof values!=='object'||Array.isArray(values))throw Error('Expected project defaults');
 values={...values};if(!Object.hasOwn(values,'gpu_ids')&&Object.hasOwn(values,'globalGpu_ids'))values.gpu_ids=values.globalGpu_ids;delete values.globalGpu_ids;
 const result={};
 for(const [key,value] of Object.entries(values)){
  if(!executionKeys.includes(key)||typeof value!=='string'||value.length>16384)throw Error('Invalid project default: '+key);
  starValue(value);
  if(['do_queue','use_gpu'].includes(key)&&!['Yes','No'].includes(value))throw Error(key+' must be Yes or No');
  if(['min_dedicated','globalNgpus','globalNcpus','nr_pool'].includes(key)&&(!/^\d+$/.test(value)||!Number.isSafeInteger(Number(value))||Number(value)<1))throw Error(key+' must be a positive integer');
  if(key==='gpu_ids'&&value!==''&&!/^\d+(?:[:,]\d+)*$/.test(value))throw Error('Which GPUs to use: enter GPU numbers separated by commas or colons');
  result[key]=value;
 }
 return result;
}
export class ProjectDefaults{
 constructor(project,demo=false,options={}){this.initialDefaults={...initialDefaults,...(options.sbgrid?{fn_batchtomo_exe:'batchruntomo'}:{})};this.resourceFallback=options.resources||{};this.localOnly=options.localOnly||false;this.directory=path.join(project,'.reliondeluxe');this.file=path.join(this.directory,'execution-defaults.json');this.demo=demo;this.memory={};this.changed=0;this.savedJobs=new Map();}
 async revision(){if(this.demo)return this.changed;await this.checkDirectory();return (await fs.stat(this.file).catch(e=>{if(e.code==='ENOENT')return null;throw e;}))?.mtimeMs||0;}
 async forJob(name,values){const revision=await this.revision();const saved=this.demo?(this.savedJobs.get(name)||0):(await fs.stat(path.join(this.directory,'..',name,'job.star'))).mtimeMs;if(!revision||saved>=revision)return values;return {...values,...Object.fromEntries(Object.entries(await this.read()).filter(([key])=>key in values))};}
 markSaved(name){if(this.demo)this.savedJobs.set(name,Math.max(Date.now(),this.changed));}
 async checkDirectory(){const stat=await fs.lstat(this.directory).catch(e=>{if(e.code==='ENOENT')return null;throw e;});if(stat?.isSymbolicLink())throw Error('Project settings directory must not be a symbolic link');}
 async storedRead(){if(this.demo)return {...this.initialDefaults,...this.memory};await this.checkDirectory();const stat=await fs.lstat(this.file).catch(e=>{if(e.code==='ENOENT')return null;throw e;});if(!stat)return {...this.initialDefaults};if(!stat.isFile())throw Error('Invalid project defaults file');const values=JSON.parse(await fs.readFile(this.file,'utf8'));if(values&&typeof values==='object'&&!Array.isArray(values)){delete values.nr_threads;delete values.nr_mpi;}return {...this.initialDefaults,...validateDefaults(values)};}
 async read(){const values={...this.resourceFallback,...await this.storedRead()};if(this.localOnly)values.do_queue='No';return values;}
 async write(values){const normalized=validateDefaults(this.localOnly?{...values,do_queue:'No'}:values);if(normalized.cryocare_path){const directory=path.resolve(path.dirname(this.directory),normalized.cryocare_path);if(!await fs.stat(directory).then(s=>s.isDirectory(),()=>false))throw Error('cryocare_path: directory does not exist: '+normalized.cryocare_path+'. Enter an existing directory, or leave it empty to use PATH.');}if(normalized.do_queue==='Yes'&&normalized.qsubscript){const script=path.resolve(path.dirname(this.directory),normalized.qsubscript);try{if(!(await fs.stat(script)).isFile())throw Error('Not a file');await fs.access(script,constants.R_OK);}catch{throw Error('qsubscript: queue submission template does not exist or is not a readable file: '+normalized.qsubscript);}}for(const key of ['fn_ctffind_exe','fn_motioncor2_exe','fn_resmap','fn_batchtomo_exe','fn_aretomo_exe'])if(normalized[key]&& !await resolveExecutable(normalized[key],{cwd:path.dirname(this.directory)}))throw Error(key+': executable not found or not executable: '+normalized[key]+'. Enter an existing executable path, a command available in PATH, or leave it empty.');if(this.demo){this.memory=normalized;this.changed=Math.max(Date.now(),this.changed+1);return normalized;}await this.checkDirectory();await fs.mkdir(this.directory,{recursive:true,mode:0o700});const temporary=path.join(this.directory,randomUUID()+'.json');try{await fs.writeFile(temporary,JSON.stringify(normalized,null,2)+'\n',{flag:'wx',mode:0o600});await fs.rename(temporary,this.file);}finally{await fs.unlink(temporary).catch(e=>{if(e.code!=='ENOENT')throw e;});}return normalized;}
}
