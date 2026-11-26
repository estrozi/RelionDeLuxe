import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {NativeAdapter} from '../lib/native.mjs';

test('bridge reply and next request finish while background job retains inherited output', {timeout:10000},async()=>{
 const project=await fs.mkdtemp(path.join(os.tmpdir(),'bridge-response-'));
 let pid;
 try{
  const script=path.join(project,'bridge.mjs');
  await fs.writeFile(script, `import {spawn} from 'node:child_process';
import fs from 'node:fs';
if(process.argv[2]==='run'){
 const child=spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{stdio:'inherit'});
 fs.writeFileSync('worker.pid',String(child.pid));
 child.unref();
 console.log('@@RELIONDELUXE@@'+JSON.stringify({name:'Import/job001/'}));
}else console.log('@@RELIONDELUXE@@'+JSON.stringify({jobs:[]}));
`);
  const adapter=new NativeAdapter(project,process.execPath);
  const timeout=new Promise((_,reject)=>{const t=setTimeout(()=>reject(Error('Bridge queue blocked by background output descriptors')),2500);t.unref();});
  const result=await Promise.race([adapter.call([script,'run']),timeout]);
  pid=Number(await fs.readFile(path.join(project,'worker.pid'),'utf8'));
  assert.deepEqual(result,{name:'Import/job001/'});
  process.kill(pid,0);
  assert.deepEqual(await Promise.race([adapter.call([script,'state']),timeout]),{jobs:[]});
  assert.deepEqual(await fs.readdir(path.join(project,'.reliondeluxe')),[]);
 }finally{
  if(!pid)pid=Number(await fs.readFile(path.join(project,'worker.pid'),'utf8').catch(()=>0));
  if(pid)try{process.kill(pid,'SIGTERM');}catch{}
  await fs.rm(project,{recursive:true,force:true});
 }
});

test('bridge errors release the queue and clean capture files',async()=>{
 const project=await fs.mkdtemp(path.join(os.tmpdir(),'bridge-error-'));
 try{
  const adapter=new NativeAdapter(project,process.execPath);
  await assert.rejects(adapter.call(['-e',"console.error('launch failed');process.exit(2)"]),/launch failed/);
  await assert.rejects(adapter.call(['-e',"console.log('bad response')"]),/Unrecognized bridge output/);
  assert.deepEqual(await adapter.call(['-e',"console.log('@@RELIONDELUXE@@{}')"]),{});
  assert.deepEqual(await fs.readdir(path.join(project,'.reliondeluxe')),[]);
 }finally{await fs.rm(project,{recursive:true,force:true});}
});
