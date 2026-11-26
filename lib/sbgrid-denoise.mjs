import path from 'node:path';
import {resolveExecutable} from './executables.mjs';
export const denoiseUnavailable='Denoise tomograms is disabled with SBGrid RELION. Use a local RELION installation with a working tomography Python environment.';
export function sbgridExecutable(file,base='/programs'){
 if(!file)return false;
 const relative=path.relative(base,file);
 return !relative.startsWith('..')&&!path.isAbsolute(relative)&&(/(^|\/)sbgrid_bin\//.test(relative)||/(^|\/)relion\//.test(relative));
}
export async function denoiseRestriction({tomo,demo,env=process.env,loaded=false}){
 if(!tomo||demo)return '';
 const files=await Promise.all(['relion_python_tomo_denoise','relion'].map(name=>resolveExecutable(name,{env})));
 return loaded||files.some(file=>sbgridExecutable(file,env.SB_BASE||'/programs'))?denoiseUnavailable:'';
}
