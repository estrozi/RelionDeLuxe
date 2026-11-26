import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';

test('Atlas HTML and JavaScript are served with correct MIME types',async()=>{
 const child=spawn(process.execPath,['server.mjs','--demo','--port','23461'],{cwd:new URL('..',import.meta.url),stdio:['ignore','pipe','pipe']});
 try{
  await new Promise((resolve,reject)=>{child.stdout.on('data',chunk=>{if(chunk.toString().includes('#token='))resolve();});child.once('error',reject);child.once('exit',code=>reject(Error('Server exited '+code)));});
  const html=await fetch('http://127.0.0.1:23461/tree-atlas.html');assert.equal(html.status,200);assert.match(html.headers.get('content-type'),/^text\/html/);
 const markup=await html.text();assert.doesNotMatch(markup,/<style[ >]/i);assert.match(markup,/rel="stylesheet" href="tree-atlas.css"/);
  assert.match(html.headers.get('content-security-policy'),/style-src 'self'/);
  const css=await fetch('http://127.0.0.1:23461/tree-atlas.css');
  assert.equal(css.status,200);assert.match(css.headers.get('content-type'),/^text\/css/);
  const rules=await css.text();assert.match(rules,/svg\{width:100%;height:100%/);assert.match(rules,/\.edge\{[^}]*fill:none/);assert.match(rules,/\.node text\{fill:var\(--text\)/);
 const response=await fetch('http://127.0.0.1:23461/tree-atlas.js');
  assert.equal(response.status,200);
  assert.match(response.headers.get('content-type'),/^text\/javascript/);
  assert.match(await response.text(),/window.relionTree=/);
 }finally{if(child.exitCode===null){child.kill();await once(child,'exit');}}
});
