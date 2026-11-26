// Optional browser integration: PLAYWRIGHT_MODULE, CHROMIUM_PATH and TEST_RELION_BRIDGE.
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {NativeAdapter} from '../lib/native.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=await fs.mkdtemp(path.join(os.tmpdir(),'screening-browser-')),project=path.join(root,'project'),source=path.join(root,'collection');
let browser,child;
try{
 await fs.mkdir(project);await fs.mkdir(source);
 const bin=path.join(root,'bin');await fs.mkdir(bin);await fs.writeFile(path.join(bin,'relion_image_handler'),['#!/bin/sh','echo frame1','echo frame2',''].join('\n'),{mode:0o700});process.env.PATH=bin+path.delimiter+process.env.PATH;
 // Browser decodes these previews as JPEG files.
 const jpeg=Buffer.from('/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAX/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAABAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdAAr/2Q==','base64');
 for(let i=0;i<70;i++){const stem='FoilHole_'+String(i).padStart(3,'0')+'_Data_123';await fs.writeFile(path.join(source,stem+'.jpg'),jpeg);await fs.writeFile(path.join(source,stem+'_Fractions.tiff'),'data');}
 await new NativeAdapter(project,process.env.TEST_RELION_BRIDGE).call(['init']);
 child=spawn(process.execPath,['server.mjs','--project',project,'--bridge',process.env.TEST_RELION_BRIDGE,'--read-root',source,'--port','23459'],{cwd:new URL('..',import.meta.url),stdio:['ignore','pipe','pipe']});
 const url=await new Promise((resolve,reject)=>{child.stdout.on('data',x=>{const m=x.toString().match(/http:\/\/127[^\s]+/);if(m)resolve(m[0]);});child.on('error',reject);child.stderr.on('data',x=>process.stderr.write(x));});
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox','--disable-dev-shm-usage','--no-zygote','--single-process'],headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url);await page.waitForSelector('.job-type');assert.equal(await page.locator('.job-type').count(),24);
 assert.match(await page.locator('.job-type').first().textContent(),/00Pre-import/);
 await page.locator('.job-type').first().click();await page.locator('#f-collection_path').fill(source);assert.equal(await page.locator('#schedule').isDisabled(),true);
 await page.locator('#run').click();await page.getByRole('link',{name:'Open screening gallery ↗'}).waitFor();
 const popup=page.waitForEvent('popup');await page.getByRole('link',{name:'Open screening gallery ↗'}).click();const gallery=await popup;gallery.on('pageerror',e=>errors.push(e.message));
 await gallery.waitForSelector('figure[data-index="60"]');await gallery.waitForFunction(()=>document.querySelector('canvas').width>1);
 await gallery.locator('figure[data-index="60"]').click();await gallery.locator('#next').click();await gallery.locator('figure[data-index="65"]').click({modifiers:['Shift']});
 assert.match(await gallery.locator('#selection-count').textContent(),/^6 \/ 70/);
 await gallery.locator('#invert-selection').click();assert.match(await gallery.locator('#selection-count').textContent(),/^64 \/ 70/);
 await gallery.locator('#invert-selection').click();assert.match(await gallery.locator('#selection-count').textContent(),/^6 \/ 70/);
 await gallery.reload();await gallery.waitForSelector('figure');assert.match(await gallery.locator('#selection-count').textContent(),/^6 \/ 70/);
 await gallery.locator('#save-selection').click();await gallery.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('Finished: 6'));
 assert.equal((await fs.readdir(path.join(project,'Movies'))).length,6);
 await page.evaluate(async()=>{
  const {drawConvergence}=await import('/convergence.js');const box=document.createElement('div');box.id='scroll-test';box.style.width='500px';document.body.append(box);
  drawConvergence(box,{mode:'2d',warnings:[],iterations:Array.from({length:50},(_,i)=>({iteration:i,classes:[{id:1,rotation:i+1,translation:(i+1)/2}]}))});
  box.querySelector('.convergence-plot').scrollLeft=200;
 });
 await page.waitForFunction(()=>[...document.querySelectorAll('#scroll-test .convergence-plot')].every(p=>p.scrollLeft===200));
 await page.evaluate(()=>document.querySelectorAll('#scroll-test .convergence-plot')[1].scrollLeft=50);
 await page.waitForFunction(()=>[...document.querySelectorAll('#scroll-test .convergence-plot')].every(p=>p.scrollLeft===50));
 assert.deepEqual(errors,[]);console.log('Browser screening, cross-page Shift selection, inversion, saved selection, automatic copying and linked plot scrolling passed.');
}finally{await browser?.close();if(child&&child.exitCode===null){child.kill();await once(child,'exit');}await fs.rm(root,{recursive:true,force:true});}
