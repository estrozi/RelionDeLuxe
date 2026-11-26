import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
const bridge=process.env.RELION_DELUXE_BRIDGE;
const delay=ms=>new Promise(r=>setTimeout(r,ms));
test('Native background job survives terminal-group SIGINT and SIGHUP after backend launch',{skip:!bridge||process.platform==='win32',timeout:15000},async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'relion-detached-'));
 try{
  for(const signal of ['SIGINT','SIGHUP']){
   const project=path.join(root,signal);await fs.mkdir(project);
   const worker=path.join(project,'worker.mjs');
   await fs.writeFile(worker,`import fs from 'node:fs';const out=process.argv[process.argv.indexOf('--o')+1];fs.writeFileSync(out+'started',String(process.pid));setTimeout(()=>{fs.writeFileSync(out+'RELION_JOB_EXIT_SUCCESS','');console.log('Job survived backend shutdown');},1200);`);
   const parentFile=path.join(project,'parent.mjs');
   await fs.writeFile(parentFile,`import {NativeAdapter} from ${JSON.stringify(new URL('../lib/native.mjs',import.meta.url).href)};const a=new NativeAdapter(${JSON.stringify(project)},${JSON.stringify(path.resolve(bridge))});await a.call(['init']);const schema=(await a.call(['schema'])).find(s=>s.id===99);const result=await a.submit('run',{id:99,label:'relion.external'},schema,{fn_exe:${JSON.stringify(process.execPath+' '+worker)},do_queue:'No',nr_threads:'1'},'','');console.log(JSON.stringify(result));setInterval(()=>{},1000);`);
   const child=spawn(process.execPath,[parentFile],{detached:true,stdio:['ignore','pipe','pipe']});let out='',err='';child.stderr.on('data',c=>err+=c);
   try{
    const job=await new Promise((resolve,reject)=>{child.stdout.on('data',c=>{out+=c;try{resolve(JSON.parse(out).name);}catch{}});child.once('error',reject);child.once('exit',code=>reject(Error('Launcher exited '+code+': '+err)));});
    for(let i=0;i<100;i++){if(await fs.stat(path.join(project,job,'started')).catch(()=>null))break;await delay(20);}
    assert(await fs.stat(path.join(project,job,'started')));
    const exit=once(child,'exit');process.kill(-child.pid,signal);await exit;
    let succeeded=false;for(let i=0;i<150;i++){if(await fs.stat(path.join(project,job,'RELION_JOB_EXIT_SUCCESS')).catch(()=>null)){succeeded=true;break;}await delay(20);}
    assert(succeeded,'Background job must survive '+signal);
   }finally{if(child.exitCode===null&&child.signalCode===null){process.kill(-child.pid,'SIGTERM');await once(child,'exit');}}
  }
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
