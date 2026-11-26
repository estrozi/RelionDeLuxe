import test from 'node:test';import assert from 'node:assert/strict';import {spawn} from 'node:child_process';import {once} from 'node:events';import {randomUUID} from 'node:crypto';
test('GUI can switch server execution mode without restarting',async()=>{
 const child=spawn(process.execPath,['server.mjs','--demo','--port','23462'],{cwd:new URL('..',import.meta.url),stdio:['ignore','pipe','pipe']});
 try{
 const token=await new Promise((resolve,reject)=>{child.stdout.on('data',c=>{const m=c.toString().match(/#token=([a-f0-9]+)/);if(m)resolve(m[1]);});child.once('error',reject);child.once('exit',()=>reject(Error('startup failed')));});
 const base='http://127.0.0.1:23462';
 for(const mode of ['cluster','workstation']){
 const r=await fetch(base+'/api/execution-mode',{method:'POST',headers:{'Content-Type':'application/json','X-Relion-Token':token,'X-Request-ID':randomUUID(),'Origin':base},body:JSON.stringify({mode})});
 assert.equal(r.status,200);assert.equal((await r.json()).cluster,mode==='cluster');
 const config=await fetch(base+'/api/config',{headers:{'X-Relion-Token':token}}).then(r=>r.json());assert.equal(config.cluster,mode==='cluster');
 }
 }finally{if(child.exitCode===null){child.kill();await once(child,'exit');}}
});
