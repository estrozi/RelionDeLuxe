import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';

test('classification GPU module is served as executable JavaScript',async()=>{
 const child=spawn(process.execPath,['server.mjs','--demo','--port','23459'],{cwd:new URL('..',import.meta.url),stdio:['ignore','pipe','pipe']});
 try{
  await new Promise((resolve,reject)=>{child.stdout.on('data',chunk=>{if(chunk.toString().includes('#token='))resolve();});child.once('error',reject);child.once('exit',code=>reject(Error('Server exited '+code)));});
  const response=await fetch('http://127.0.0.1:23459/classification-gpu.js');
  assert.equal(response.status,200);
  assert.match(response.headers.get('content-type'),/^text\/javascript/);
  assert.match(await response.text(),/export function classificationAlignmentGpu/);
 }finally{if(child.exitCode===null){child.kill();await once(child,'exit');}}
});
