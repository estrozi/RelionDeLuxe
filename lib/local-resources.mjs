import fs from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {resolveExecutable} from './executables.mjs';
export async function detectLocalResources(){
 const result={};
 const cpus=await physicalCoreCount();
 if(cpus>0)result.globalNcpus=String(cpus);
 const exe=await resolveExecutable('nvidia-smi');
 if(exe)try{
  const {stdout}=await promisify(execFile)(exe,['--query-gpu=uuid','--format=csv,noheader'],{timeout:5000,maxBuffer:65536});
  let ids=stdout.trim().split(/\r?\n/).filter(x=>/^GPU-/.test(x));
  const visible=process.env.CUDA_VISIBLE_DEVICES;
  if(visible!==undefined){
   const requested=visible.split(',').map(x=>x.trim()).filter(Boolean);
   ids=requested.filter(x=>/^\d+$/.test(x)?Number(x)<ids.length:ids.some(id=>id===x||id.startsWith(x)));
  }
  if(ids.length>0)result.globalNgpus=String(new Set(ids).size);
 }catch{}
 return result;
}


export function countPhysicalCores(cpuinfo,allowedList){
 const allowed=new Set();
 for(const range of allowedList.trim().split(',')){
  const [start,end=start]=range.split('-').map(Number);
  if(!Number.isInteger(start)||!Number.isInteger(end)||end<start||end-start>100000)return null;
  for(let i=start;i<=end;i++)allowed.add(i);
 }
 const cores=new Set();
 for(const block of cpuinfo.trim().split(/\n\s*\n/)){
  const values=Object.fromEntries(block.split('\n').map(line=>line.split(/\s*:\s*/)));
  if(!allowed.has(Number(values.processor)))continue;
  if(values['physical id']===undefined||values['core id']===undefined)return null;
  cores.add(values['physical id']+':'+values['core id']);
 }
 return cores.size||null;
}
async function physicalCoreCount(){
 if(process.platform==='linux')try{
  const [info,status]=await Promise.all([fs.readFile('/proc/cpuinfo','utf8'),fs.readFile('/proc/self/status','utf8')]);
  return countPhysicalCores(info,status.match(/^Cpus_allowed_list:\s*(.+)$/m)?.[1]||'');
 }catch{}
 if(process.platform==='darwin')try{
  const {stdout}=await promisify(execFile)('/usr/sbin/sysctl',['-n','hw.physicalcpu'],{timeout:5000});
  const n=Number(stdout.trim());return Number.isInteger(n)&&n>0?n:null;
 }catch{}
 return null; // Do not label logical-thread counts as detected physical cores.
}
