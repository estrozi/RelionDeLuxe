import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {readablePath} from './paths.mjs';
export function commandBlocks(notes){
 const blocks=[];let current=null;
 for(const line of notes.split(/\r?\n/)){
  if(/^\s*\+{4} with the following command\(s\):/.test(line)){current=[];continue;}
  if(current&&/^\s*\+{4}/.test(line)){if(current.length)blocks.push(current);current=null;continue;}
  if(current&&line.trim())current.push(line.trim());
 }
 return blocks;
}
export function normalizedCommands(commands,ownDirectory){
 // Never replace arbitrary input job numbers or whitespace inside quoted values.
 return JSON.stringify(commands.map(c=>ownDirectory?c.split(ownDirectory).join('@OUTPUT/').trim():c.trim()));
}
export async function duplicateJobs({project,adapter,layout,schema,values,existing='',alias=''}){
 const state=await adapter.call(['state']);
 const preview=await adapter.submit('preview',layout,schema,values,existing,alias);
 if(!preview.commands?.length)return [];
 const own=existing||preview.commands.join('\n').match(new RegExp('[A-Za-z][A-Za-z0-9]*/job'+String(state.counter).padStart(3,'0')+'/'))?.[0];
 if(!own)return [];
 const defaults=Object.fromEntries(schema.options.map(f=>[f.key,f.default]));
 const comparable=v=>JSON.stringify(schema.options.map(f=>[f.key,String(v[f.key]??defaults[f.key])]));
 const wanted=comparable(values),command=normalizedCommands(preview.commands,own),matches=[];
 for(const job of state.jobs){
  if(job.name===existing||job.type!==layout.id)continue;
  let blocks=[];
  for(const file of ['note.txt','notes.txt']){
   try{const real=await readablePath(project,[],path.join(job.name,file));blocks.push(...commandBlocks(await fs.readFile(real,'utf8')));}catch(e){if(e.code!=='ENOENT')throw Error('Cannot check duplicate history for '+job.name+': '+e.message);}
  }
  if(!blocks.length)continue; // No recorded execution (including scheduled-only jobs).
  const saved=await adapter.call(['job',job.name]);
  if(comparable(saved.values)!==wanted)continue;
  // The helical add-on records its External wrapper, while its preview shows the
  // underlying engine. All its input/engine settings are compared above.
  if(layout.custom||blocks.some(b=>normalizedCommands(b,job.name)===command))matches.push({name:job.name,alias:job.alias,status:job.status});
 }
 return matches;
}
export function duplicateApproval(payload,matches){return createHash('sha256').update(JSON.stringify({payload,matches})).digest('hex');}
