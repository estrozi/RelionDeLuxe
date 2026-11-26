// Standard RELION External job: prepare JPEGs, then wait for browser selection.
import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {prepareScreening,copyScreenedFiles} from '../lib/screening.mjs';
const args=process.argv.slice(2),get=k=>args[args.indexOf(k)+1],job=get('--o'),project=process.cwd();
if(!/^External\/job\d+\/$/.test(job||''))throw Error('Invalid screening output directory');
let aborted=false;
const exists=async f=>fs.access(job+f).then(()=>true,()=>false);
let nextAbortCheck=0;
const abort=async()=>{if(aborted)throw Error('Screening aborted.');if(Date.now()<nextAbortCheck)return;nextAbortCheck=Date.now()+250;if(await exists('RELION_JOB_ABORT_NOW')){aborted=true;throw Error('Screening aborted.');}};
const progress=async message=>{console.log(message);const tmp=job+'screening-progress.tmp';await fs.writeFile(tmp,JSON.stringify({message}));await fs.rename(tmp,job+'screening-progress.json');};
try{
 const {values,roots,continuation}=JSON.parse(Buffer.from(get('--screening_config'),'base64url').toString());
 let context={continuation};
 if(continuation){
  const previous=await fs.readFile(job+'screening.json','utf8').then(JSON.parse,()=>null),selected=await fs.readFile(job+'selected.json','utf8').then(JSON.parse,()=>null),copied=await fs.readFile(job+'screening-copy.json','utf8').then(JSON.parse,()=>null);
  context={continuation:true,previousFolder:copied?.folder,previousRows:previous?.rows||[],selectedSources:(selected?.indices||[]).map(i=>previous?.rows[i]?.source).filter(Boolean)};
  const history=job+'screening-history/'+randomUUID()+'/';await fs.mkdir(history,{recursive:true});
  for(const name of ['screening.json','selected.json','screening-copy.json','screening-gains.json','SCREENING_SAVED','RELION_OUTPUT_NODES.star']){
   await fs.rename(job+name,history+name).catch(e=>{if(e.code!=='ENOENT')throw e;});
  }
 }
 await progress('Scanning collection for current previews and full-size files…');
 await prepareScreening(project,roots,job,values,progress,abort,context);
 while(!await exists('SCREENING_SAVED')){await abort();await new Promise(resolve=>setTimeout(resolve,500));}
 await abort();
 await copyScreenedFiles(project,roots,job,progress,abort);
 await fs.writeFile(job+'RELION_JOB_EXIT_SUCCESS','');
}catch(e){console.error(e.message);await progress(e.message).catch(()=>{});await fs.writeFile(job+'RELION_JOB_EXIT_'+(aborted?'ABORTED':'FAILURE'),'');process.exitCode=1;}
