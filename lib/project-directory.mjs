import fs from 'node:fs/promises';
import path from 'node:path';
import {terminalConfirm} from './terminal-confirm.mjs';
export async function projectDirectory(input, {confirm}={}) {
 const target=path.resolve(input);
 try {const stat=await fs.stat(target);if(!stat.isDirectory())throw Error(`Project path is not a directory: ${target}`);}
 catch(e){if(e.code!=='ENOENT')throw e;
  if(!confirm)confirm=async()=>{if(!process.stdin.isTTY)throw Error(`Project directory does not exist: ${target}. Start in an interactive terminal to approve creation, or create it first.`);return terminalConfirm(`Project folder does not exist: ${target}\nCreate it and start RelionDeLuxe?`);};
  if(!await confirm(target))throw Error('Startup cancelled; project folder was not created.');
  await fs.mkdir(target,{recursive:true});
 }
 return fs.realpath(target);
}
