// Optional browser verification: install playwright in your development environment.
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const child=spawn(process.execPath,['server.mjs','--demo','--port','23452'],{cwd:new URL('..',import.meta.url),stdio:['ignore','pipe','pipe']});
let browser;
try{
 const url=await new Promise((resolve,reject)=>{child.stdout.on('data',x=>{const m=x.toString().match(/http:\/\/127[^\s]+/);if(m)resolve(m[0]);});child.on('error',reject);});
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox','--disable-dev-shm-usage','--no-zygote','--single-process'],headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:1050}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url);await page.waitForSelector('.job-type');assert.equal(await page.locator('.job-type').count(),23);
 assert.equal(await page.locator('#job-title').textContent(),'Import');
 assert.deepEqual(await page.locator('#theme option').allTextContents(),['Light','Dark','Brazil 🇧🇷','France 🇫🇷']);
 await page.evaluate(()=>localStorage.setItem('relion-theme','gray'));await page.reload();await page.waitForSelector('.job-type');assert.equal(await page.locator('#theme').inputValue(),'light');
 await page.evaluate(()=>localStorage.setItem('relion-theme','samba'));await page.reload();await page.waitForSelector('.job-row');assert.equal(await page.locator('#theme').inputValue(),'brazil');
 await page.locator('#theme').selectOption('france');assert.equal(await page.locator('html').getAttribute('data-theme'),'france');
 await page.locator('.job-row').first().click();await page.keyboard.press('ArrowDown');
 await page.waitForFunction(()=>document.querySelector('#selected-name').textContent===document.querySelectorAll('.job-row')[1].dataset.job);
 assert.equal(await page.locator('.job-row.marked').count(),1);
 await page.keyboard.press('Shift+ArrowDown');assert.equal(await page.locator('.job-row.marked').count(),2);
 await page.keyboard.press('Shift+ArrowUp');assert.equal(await page.locator('.job-row.marked').count(),1);
 await page.waitForTimeout(5500);assert.equal(await page.evaluate(()=>document.activeElement?.dataset.job),await page.locator('.job-row').nth(1).getAttribute('data-job'));
 await page.locator('.job-type').filter({hasText:'Import'}).click();
 await page.locator('#executables').click();await page.waitForSelector('dialog[open]');assert.match(await page.locator('#dialog-body').textContent(),/Demo mode/);await page.locator('#dialog-close').click();
 await page.locator('#f-do_raw').selectOption('No');assert.equal(await page.locator('#f-fn_in_raw').isDisabled(),true);await page.locator('#f-do_raw').selectOption('Yes');
 // Every SPA type and tab must render; no missing fields or client exceptions.
 const types=await page.locator('.job-type').count();let tabsVisited=0;
 for(let i=0;i<types;i++){await page.locator('.job-type').nth(i).click();const tabs=await page.locator('#tabs button').count();for(let j=0;j<tabs;j++){await page.locator('#tabs button').nth(j).click();assert.ok(await page.locator('.field').count());tabsVisited++;}}
 // Field-specific chooser hides internal indexing, filters candidates, resolves aliases.
 await page.locator('.job-type').filter({hasText:'Motion correction'}).click();
 await page.locator('#f-input_star_mics').locator('..').locator('.browse').click();
 await page.waitForSelector('.input-candidate');assert.equal(await page.locator('.input-candidate').count(),1);
 assert.match(await page.locator('#dialog-body').textContent(),/Import\/job001\/movies.star/);
 assert(! (await page.locator('#dialog-body').textContent()).includes('.Nodes'));
 await page.getByRole('textbox',{name:'Search filenames or job aliases'}).fill('missing');
 await page.waitForFunction(()=>document.querySelector('#dialog-body').textContent.includes('No matching inputs found'));
 await page.getByRole('textbox',{name:'Search filenames or job aliases'}).fill('movies');await page.waitForSelector('.input-candidate');await page.locator('.input-candidate').click();
 assert.equal(await page.locator('#f-input_star_mics').inputValue(),'Import/job001/movies.star');
 await page.locator('.job-type').filter({hasText:'Import'}).click();await page.locator('#f-fn_in_raw').fill('Movies/*.tiff');await page.locator('#alias').fill('browser_test');await page.locator('#schedule').click();await page.waitForFunction(()=>document.querySelector('#selected-name').textContent.includes('job005'));assert.match(await page.locator('#job-lists').textContent(),/browser_test/);
 await page.locator('#run').click();await page.waitForFunction(()=>document.querySelector('#run').textContent==='Continue!');await page.waitForFunction(()=>document.querySelector('#job-lists').textContent.includes('browser_test')&&!document.querySelector('#run').disabled,{},{timeout:15000});
 await page.locator('#check-command').click();await page.waitForSelector('dialog[open]');assert.match(await page.locator('#dialog-body').textContent(),/DEMO/);await page.locator('#dialog-close').click();
 // Recursive deletion shows the complete scope and blocks a running descendant.
 await page.locator('.job-row').filter({hasText:'Import/job001/'}).click();await page.waitForFunction(()=>document.querySelector('#selected-name').textContent==='Import/job001/');
 await page.locator('#job-action').selectOption('delete-recursive');await page.waitForSelector('dialog[open]');assert.match(await page.locator('#dialog-body').textContent(),/CtfFind\/job003/);assert.match(await page.locator('#dialog-body').textContent(),/Running job/);assert.equal(await page.locator('#dialog-actions .primary').count(),0);await page.locator('#dialog-close').click();
 await page.locator('.job-row').filter({hasText:'CtfFind/job003/'}).click();await page.waitForFunction(()=>document.querySelector('#selected-name').textContent==='CtfFind/job003/');await page.locator('#job-action').selectOption('abort');await page.locator('#dialog-actions .primary').click();await page.waitForSelector('dialog[open]',{state:'hidden'});
 await page.locator('.job-row').filter({hasText:'Import/job001/'}).click();await page.waitForFunction(()=>document.querySelector('#selected-name').textContent==='Import/job001/');await page.locator('#job-action').selectOption('delete-recursive');await page.waitForSelector('dialog[open]');assert.equal(await page.locator('#dialog-body li').count(),3);await page.locator('#dialog-actions .primary').click();await page.waitForFunction(()=>!document.querySelector('#job-lists').textContent.includes('Import/job001/'));
 await page.locator('#trash').click();await page.waitForSelector('dialog[open]');await page.locator('#dialog-body .file-row').click();await page.waitForFunction(()=>document.querySelector('#dialog-title').textContent==='Confirm undelete');assert.equal(await page.locator('#dialog-body li').count(),3);await page.locator('#dialog-actions .primary').click();await page.waitForFunction(()=>document.querySelector('#job-lists').textContent.includes('Import/job001/'));
 await page.locator('.job-row').filter({hasText:'MotionCorr/job002/'}).click();await page.waitForFunction(()=>document.querySelector('#job-title').textContent==='Motion correction');
 await page.locator('#message').waitFor({state:'hidden'});
 await fs.mkdir(new URL('../docs/screenshots',import.meta.url),{recursive:true});
 for(const theme of ['light','dark']){await page.locator('#theme').selectOption(theme);await page.screenshot({path:new URL(`../docs/screenshots/${theme}.png`,import.meta.url).pathname,fullPage:true});assert.equal(await page.evaluate(()=>document.documentElement.dataset.theme),theme);}
 await page.reload();await page.waitForSelector('.job-type');assert.equal(await page.locator('#theme').inputValue(),'dark');
 await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true);
 assert.deepEqual(errors,[]);console.log(`Browser checks passed: ${types} job types, ${tabsVisited} tabs; schedule/run, PATH diagnostics, recursive delete/restore, two themes, gray migration and mobile width. No client exceptions.`);
}finally{await browser?.close();child.kill();await once(child,'exit').catch(()=>{});}
