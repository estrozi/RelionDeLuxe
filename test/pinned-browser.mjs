import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const project=await fs.mkdtemp(path.join(os.tmpdir(),'pin-browser-'));
const child=spawn(process.execPath,['server.mjs','--demo','--project',project,'--port','23598','--no-browser'],{stdio:['ignore','pipe','pipe']});let browser;
try{const url=await new Promise((resolve,reject)=>{child.stdout.on('data',b=>{const u=b.toString().match(/http:\/\/127[^\s]+/);if(u)resolve(u[0]);});child.stderr.on('data',b=>console.error(b.toString()));child.once('exit',code=>reject(Error('server exited '+code)));});browser=await chromium.launch({headless:true,args:['--no-sandbox']});const page=await browser.newPage({viewport:{width:1500,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(url);await page.waitForSelector('.job-row');
const template={format:'RelionDeLuxe.ideal-pipeline',version:1,name:'Browser pins',inputs:{},steps:[{id:'jobN',type:'relion.external',directory:'External',title:'External',values:{fn_exe:'/bin/true',in_part:'input.star'}},{id:'jobN+1',type:'relion.external',directory:'External',title:'External',values:{fn_exe:'/bin/true',in_part:'${jobN}particles.star'}}]};
await page.locator('#ideal-file').setInputFiles({name:'pipeline.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(template))});await page.waitForFunction(()=>!document.querySelector('#ideal-pin').disabled);await page.locator('#ideal-pin').evaluate(b=>b.click());await page.waitForSelector('.pinned-job-row');assert.equal(await page.locator('.pinned-job-row').count(),2);assert.equal(await page.locator('.pinned-workspace').count(),2);
await page.locator('.pinned-job-row').first().click();await page.locator('.pinned-job-row').nth(1).click({modifiers:['Control']});assert.equal(await page.locator('.pinned-job-row.marked').count(),2);
await page.locator('.pinned-job-row').first().locator('.pinned-controls button').first().click();await page.waitForFunction(()=>document.querySelector('.pinned-job-row small').textContent.includes('J7'));await page.locator('.pinned-job-row').first().locator('.pinned-controls button').last().click();await page.waitForFunction(()=>document.querySelector('.pinned-job-row small').textContent.includes('J6'));
await page.locator('.pinned-workspace').first().getByRole('button',{name:'Discard normal draft'}).click();await page.locator('.pinned-job-row').first().locator('.pinned-controls button').last().click();await page.waitForFunction(()=>document.querySelector('.pinned-job-row small').textContent.includes('J5'));
await page.locator('.pinned-workspace').first().locator('[data-pin-field=in_part]').fill('other.star');await page.locator('.pinned-workspace').first().locator('[data-pin-field=in_part]').blur();await page.waitForTimeout(1000);
await page.reload();await page.waitForSelector('.pinned-job-row');assert.equal(await page.locator('.pinned-workspace').first().locator('[data-pin-field=in_part]').inputValue(),'other.star');assert.equal(await page.locator('.pinned-workspace').count(),2);assert.deepEqual(errors,[]);console.log('Pinned browser integration passed');
}finally{await browser?.close();child.kill();await fs.rm(project,{recursive:true,force:true});}
