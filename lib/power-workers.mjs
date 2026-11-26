import {Worker} from 'node:worker_threads';
import {availableParallelism} from 'node:os';
let limit=availableParallelism();const queue=[];let running=0;
export function configurePowerWorkers(count){count=Number(count);limit=Number.isSafeInteger(count)&&count>0?count:availableParallelism();pump();return limit;}
export function workerParticleStatistics(...args){return new Promise((resolve,reject)=>{queue.push({args,resolve,reject});pump();});}
function pump(){while(running<limit&&queue.length){const task=queue.shift();running++;let worker;
 try{worker=new Worker(new URL('./power-worker.mjs',import.meta.url),{workerData:task.args,execArgv:[]});}catch(e){running--;task.reject(e);continue;}
 let answered=false;worker.once('message',m=>{answered=true;m.error?task.reject(Error(m.error)):task.resolve(m.result);});worker.once('error',e=>{answered=true;task.reject(e);});worker.once('exit',code=>{if(!answered)task.reject(Error('Power worker exited before returning statistics ('+code+')'));running--;pump();});
}}
