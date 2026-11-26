import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {terminalConfirm} from '../lib/terminal-confirm.mjs';
test('whiptail shows full warning details before asking for confirmation',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'confirm-'));const old={PATH:process.env.PATH,TERM:process.env.TERM,CONFIRM_LOG:process.env.CONFIRM_LOG};
 try{
  await fs.writeFile(path.join(dir,'whiptail'),'#!/bin/sh\nprintf "%s\\n" "$*" >> "$CONFIRM_LOG"\nif [ "$4" = "--textbox" ]; then /bin/cat "$5" >> "$CONFIRM_LOG"; fi\nexit 0\n',{mode:0o700});
  process.env.PATH=dir;process.env.TERM='xterm';process.env.CONFIRM_LOG=path.join(dir,'log');
  const details='project/Movies → /data/Movies\n--read-root /data/Movies\nproject/broken → ENOENT';
  assert.equal(await terminalConfirm('Proceed?',{input:{isTTY:true},output:{isTTY:true},details}),true);
  const log=await fs.readFile(process.env.CONFIRM_LOG,'utf8');assert.ok(log.includes(details));assert.ok(log.indexOf('--textbox')<log.indexOf('--yesno'));assert.match(log,/--defaultno/);
 }finally{for(const [k,v]of Object.entries(old))if(v===undefined)delete process.env[k];else process.env[k]=v;await fs.rm(dir,{recursive:true,force:true});}
});
