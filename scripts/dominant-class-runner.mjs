import fs from 'node:fs/promises';import path from 'node:path';import {execFile} from 'node:child_process';import {promisify} from 'node:util';import {dominantInput,copyDominantMap} from '../lib/dominant-class.mjs';import {resolveExecutable} from '../lib/executables.mjs';import {starValue} from '../lib/settings.mjs';
const args=process.argv.slice(2),get=k=>args[args.indexOf(k)+1],out=get('--o');
if(!out||!/^External\/job\d+\/$/.test(out))throw Error('Invalid external output directory');
try{
 for(const mark of ['SUCCESS','FAILURE','ABORTED'])await fs.rm(path.join(out,'RELION_JOB_EXIT_'+mark),{force:true});
 const roots=JSON.parse(Buffer.from(get('--read_roots'),'base64url').toString());
 const info=await dominantInput(process.cwd(),roots,get('--in_parts'));if(!info.is3D)throw Error('Dominant-class selection requires a 3D model (rlnReferenceDimensionality=3).');
 const exe=await resolveExecutable('relion_star_handler');if(!exe)throw Error('relion_star_handler not found in PATH');
 console.log(`Dominant 3D class: ${info.winner.id}; population ${info.winner.population}. ${info.ties>1?'Tie: lowest class number selected.':''}`);
 await promisify(execFile)(exe,['--i',info.data,'--o',out+'particles.star','--select','rlnClassNumber','--minval',String(info.winner.id),'--maxval',String(info.winner.id)],{maxBuffer:8*1024*1024}).then(r=>{console.log(r.stdout);if(r.stderr)console.error(r.stderr);});
 const outputStat=await fs.stat(out+'particles.star');if(!outputStat.isFile()||!outputStat.size)throw Error('Particle selection did not produce a nonempty STAR file.');
 if(await fs.stat(out+'RELION_JOB_ABORT_NOW').then(()=>true,()=>false)){await fs.writeFile(out+'RELION_JOB_EXIT_ABORTED','');process.exitCode=2;}else{
 const map=await copyDominantMap(process.cwd(),roots,info,out);console.log('Copied dominant class map: '+map);
 await fs.writeFile(out+'RELION_OUTPUT_NODES.star','data_output_nodes\nloop_\n_rlnPipeLineNodeName #1\n_rlnPipeLineNodeTypeLabel #2\n'+starValue(out+'particles.star')+' ParticleGroupMetadata.star.relion\n'+starValue(map)+' DensityMap.mrc.relion\n');await fs.writeFile(out+'RELION_JOB_EXIT_SUCCESS','');}
}catch(e){console.error(e.message);await fs.writeFile(out+'RELION_JOB_EXIT_FAILURE','');process.exitCode=1;}
