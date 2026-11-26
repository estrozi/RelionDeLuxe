import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const exec=promisify(execFile);
export function parseAvailableSpace(stdout){const row=stdout.trim().split(/\r?\n/).at(-1).trim().split(/\s+/);if(row.length<6||!/^\d/.test(row[3]))throw Error('Unrecognized df output');return row[3];}
export function projectSizeTracker(project,measure=async()=>{const [du,df]=await Promise.all([exec('du',['-sh','--',project],{maxBuffer:1024*1024}),exec('df',['-hP','--',project],{maxBuffer:1024*1024,env:{...process.env,LC_ALL:'C'}})]);return {value:du.stdout.split(/\s/)[0],free:parseAvailableSpace(df.stdout)};}){
 let signature=null,pending=null,value=null,free=null,error=null,dirty=true;
 return {invalidate(){dirty=true;},attach(state){const next=JSON.stringify(state.jobs.filter(j=>['Succeeded','Failed','Aborted'].includes(j.status)).map(j=>[j.name,j.status]).sort());if(next!==signature){signature=next;dirty=true;}if(dirty&&!pending){dirty=false;pending=Promise.resolve().then(measure).then(v=>{value=typeof v==='string'?v:v.value;free=typeof v==='string'?null:v.free;error=null;},e=>{error=e.message;}).finally(()=>pending=null);}return {...state,projectSize:{value,free,pending:!!pending,error}};}};
}
