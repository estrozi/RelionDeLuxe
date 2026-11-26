import fs from 'node:fs/promises';
import path from 'node:path';
import {resolveExecutable} from './executables.mjs';
// Applied after SBGrid setup; children (including the native bridge and
// pipeliner) inherit this PATH for RELION's `which relion_*` commands.
export async function selectRelionInstallation(env=process.env,root=env.RELIONDELUXE_RELION){
 if(!root?.trim())return null;
 root=root.trim();
 if(!path.isAbsolute(root)||/[\r\n\0]/.test(root))throw Error('RELIONDELUXE_RELION must be an absolute RELION installation directory.');
 const bin=path.join(root,'bin');
 let real;try{real=await fs.realpath(bin);if(!(await fs.stat(real)).isDirectory())throw Error();}catch{throw Error('RELIONDELUXE_RELION has no accessible bin directory: '+bin);}
 if(/(?:^|\/)(?:sbgrid_bin)(?:\/|$)/.test(real))throw Error('RELIONDELUXE_RELION must select a version-specific installation, not an SBGrid dispatcher directory.');
 for(const name of ['relion','relion_pipeliner'])if(!await resolveExecutable(path.join(bin,name),{env}))throw Error('RELIONDELUXE_RELION is missing an executable: '+path.join(bin,name));
 env.RELIONDELUXE_RELION=root;
 env.PATH=[bin,...(env.PATH||'').split(path.delimiter).filter(p=>p!==bin)].join(path.delimiter);
 return bin;
}
