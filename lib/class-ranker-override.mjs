import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {resolveExecutable} from './executables.mjs';
// Keep the launcher on disk: scheduled/detached jobs may outlive the server.
export async function classRankerOverride(project,env=process.env){
 const target=env.RELIONDELUXE_CLASS_RANKER?.trim();
 if(!target)return null;
 if(!path.isAbsolute(target)||/[\r\n\0]/.test(target)||!await resolveExecutable(target,{env}))throw Error('RELIONDELUXE_CLASS_RANKER must point to an executable absolute relion_class_ranker path: '+target);
 const id=createHash('sha256').update(target).digest('hex').slice(0,24);
 const dir=path.join(project,'.reliondeluxe','executable-overrides',id);
 await fs.mkdir(dir,{recursive:true});
 const file=path.join(dir,'relion_class_ranker'),quoted="'"+target.replaceAll("'","'\\''")+"'";
 const script='#!/bin/sh\nexec '+quoted+' "$@"\n';
 try{await fs.writeFile(file,script,{flag:'wx',mode:0o755});}catch(e){if(e.code!=='EEXIST')throw e;if(await fs.readFile(file,'utf8')!==script)throw Error('Unexpected class-ranker launcher contents: '+file);}
 env.PATH=[dir,...(env.PATH||'').split(path.delimiter).filter(p=>p!==dir)].join(path.delimiter);
 return target;
}
