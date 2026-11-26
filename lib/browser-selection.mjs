import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {galleryManifest,parseStar} from './gallery.mjs';
import {readablePath} from './paths.mjs';
export function browserSelection(values){
 return !['do_remove_duplicates','do_filaments','do_dominant_3d','do_class_ranker','do_select_values','do_discard','do_split','do_recenter','do_regroup','do_queue'].some(k=>values[k]==='Yes')&&!String(values.other_args||'').trim()&&!!(values.fn_model||values.fn_mic||values.fn_data);
}
export async function selectionSnapshot(project,roots,values){
 const file=values.fn_model||values.fn_mic||values.fn_data;
 const manifest=await galleryManifest(project,roots,file),sources=[file,manifest.file];
 if(values.fn_model){const blocks=parseStar(await fs.readFile(await readablePath(project,roots,file),'utf8'));const data=blocks.find(b=>b.values.rlnExperimentalDataStarFile)?.values.rlnExperimentalDataStarFile;if(!data)throw Error('Browser class selection requires an optimiser STAR file.');sources.push(data);}
 const stamps=[];for(const source of new Set(sources)){const actual=await readablePath(project,roots,source),stat=await fs.stat(actual);stamps.push([actual,stat.size,stat.mtimeMs,stat.ctimeMs]);}
 const revision=createHash('sha256').update(JSON.stringify({manifest,stamps,values})).digest('hex');
 return {file,manifest,revision,mode:values.fn_model?'classes':values.fn_mic?'micrographs':'particles'};
}
