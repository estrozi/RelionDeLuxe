import {gainWarning} from './gain-warning.mjs';
import {verifyImportFormat} from './import-format.mjs';
import {inputReadiness} from './input-readiness.mjs';
import {checkCryocareTraining} from './cryocare-training.mjs';
import {inspectTomography,tomographyKind} from './tomography.mjs';
import {configuredExecutableWarnings} from './executables.mjs';
import {hasMatchingFile} from './file-pattern.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import {readablePath} from './paths.mjs';
import {mrcGrid} from './mask-rescale.mjs';
import {modelAngeloMap} from './inputs.mjs';
import {motionOutputDefaults} from './motion-output-defaults.mjs';
const prediction=['rlnAngleRot','rlnAngleTilt','rlnAnglePsi','rlnOriginXAngst','rlnOriginYAngst','rlnRandomSubset'];
export function starRules(job,field,type,values){
 const rules=[],add=(block,all=[],any=[])=>rules.push({block,all,any});
 if(type.startsWith('ParticleGroupMetadata'))add('particles',['rlnImageName']);
 if(type.startsWith('MicrographMovieGroupMetadata'))add('movies',['rlnMicrographMovieName']);
 if(type.startsWith('MicrographGroupMetadata'))add('micrographs',['rlnMicrographName']);
 if(type.startsWith('Image2DGroupMetadata'))add('',[],[['rlnImageName','rlnReferenceImage']]);
 if(type.startsWith('MicrographCoordsGroup'))add('coordinate_files',['rlnMicrographName','rlnMicrographCoordinates']);
 if(['fn_cont','fn_opt'].includes(field)||(job==='3D multi-body'&&field==='fn_in'))add('optimiser_general',['rlnExperimentalDataStarFile','rlnModelStarFile','rlnOrientSamplingStarFile']);
 if(field==='fn_bodies')add('',['rlnBodyMaskName'],[['rlnBodySigmaAngles','rlnBodySigmaTilt'],['rlnBodySigmaAngles','rlnBodySigmaPsi'],['rlnBodySigmaOffsetAngst','rlnBodySigmaOffset']]);
 if(field==='fn_mtf')add('',['rlnResolutionInversePixel','rlnMtfValue']);
 if(['CTF refinement','Bayesian polishing'].includes(job)&&field==='fn_data')add('particles',[...prediction,'rlnMicrographName',...(job==='Bayesian polishing'?['rlnCoordinateX','rlnCoordinateY']:[])]);
 if(type.startsWith('ParticleGroupMetadata')&&(values.do_ctf_correction==='Yes'||['CTF refinement','Bayesian polishing','Particle subtraction'].includes(job)))add('particles',['rlnDefocusU','rlnDefocusV','rlnDefocusAngle']);
 if(job==='Auto-picking'&&values.do_ctf_autopick==='Yes'&&type.startsWith('MicrographGroupMetadata'))add('micrographs',['rlnDefocusU','rlnDefocusV','rlnDefocusAngle']);
 if(field==='fn_post'){add('general',['rlnUnfilteredMapHalf1','rlnUnfilteredMapHalf2','rlnMaskName']);add('fsc',['rlnSpectralIndex','rlnFourierShellCorrelationCorrected']);}
 if(job==='Bayesian polishing'&&field==='fn_mic')add('micrographs',['rlnMicrographMetadata']);
 if(job==='Particle subtraction'&&field==='fn_fliplabel')add('particles',['rlnImageOriginalName']);
 if(job==='CTF estimation'){
  if(values.use_noDW==='Yes')add('micrographs',['rlnMicrographNameNoDW']);
  if(values.use_given_ps==='Yes')add('micrographs',['rlnCtfPowerSpectrum']);
 }
 return rules.map(r=>({...r,all:r.all.filter(Boolean)}));
}
export function missingColumns(table,rule){return [...rule.all.filter(x=>!table.labels.includes(x)),...rule.any.filter(group=>!group.some(x=>table.labels.includes(x))).map(group=>'one of '+group.join(' / '))];}
const number=name=>Number(name?.match(/\/job(\d+)\//)?.[1]);
export async function preflight({project,readRoots=[],adapter,layout,schema,values,existing='',action='run',scheduledBefore=[],readinessOnly=false}){
 values={...Object.fromEntries(schema.options.map(f=>[f.key,f.default])),...values};
 if(layout.name==='3D classification'&&values.dont_skip_align==='No'&&values.use_gpu==='Yes')throw Error('3D classification with image alignment skipped requires Use GPU = No. Review the job compute settings.');
 if(layout.name==='Motion correction'&&/\.tiff?$/i.test(String(values.fn_gain_ref||'')))throw Error('Motion correction requires an MRC gain reference. Choose the converted gain in .reliondeluxe/converted-gains, or use a detected gain suggestion to convert the TIFF first.');
 if(!readinessOnly)await verifyImportFormat(project,readRoots,layout,values);
 const state=await adapter.call(['state']);
 if(layout.name==='ModelAngelo building'&&values.fn_map&&!modelAngeloMap(project,state,values.fn_map))throw Error('ModelAngelo requires a Post-processing postprocess_masked.mrc output for fn_map. Select a masked Post-processing map; a Local resolution map cannot be used.');
 if(layout.mode==='tomo'&&layout.name==='Reconstruct tomograms'&&values.in_tiltseries&&values.generate_split_tomograms==='Yes'){
  const motionType=state.jobs.find(j=>j.type===1&&j.name.startsWith('MotionCorr/'))?.type??1;
  const upstream=await motionOutputDefaults(project,adapter,state,values.in_tiltseries,motionType);
  if(upstream.values?.generate_split_tomograms==='No')throw Error('Split tomograms require even/odd splitting in upstream Motion correction ('+upstream.source+'). Set Generate split tomograms to No.');
 }
 const preview=await adapter.submit('preview',layout,schema,values,existing,'');
 if(!preview.inputs)throw Error('Rebuild the native adapter to enable input verification.');
 const report=[],reported=new Set(),add=(severity,file,field,message)=>{const key=JSON.stringify([severity,file,field,message]);if(!reported.has(key)){reported.add(key);report.push({severity,file,field,message});}};
 if(layout.name==='Post-processing'&&values.fn_in&&values.fn_mask){
  try{
   const [map,mask]=await Promise.all([mrcGrid(project,readRoots,values.fn_in),mrcGrid(project,readRoots,values.fn_mask)]);
   if(Math.abs(map.pixelSize-mask.pixelSize)>Math.max(0.0001,map.pixelSize*0.0001))add('warning',values.fn_mask,'fn_mask',`Mask pixel size ${mask.pixelSize.toFixed(4)} Å/px differs from the input half-map ${map.pixelSize.toFixed(4)} Å/px. Run a Mask re-scaling job using this map and mask, then use its rescaled_mask.mrc output for Post-processing.`);
  }catch(error){if(error.code!=='ENOENT')add('warning',values.fn_mask,'fn_mask','Could not compare mask and half-map pixel sizes: '+error.message);}
 }
 if(!readinessOnly){
 const gain=await gainWarning(project,readRoots,layout,values,{state,adapter});if(gain)report.push(gain);
 if(layout.id===58)for(const issue of await checkCryocareTraining({project,readRoots,state,values}))add(issue.severity,issue.file,issue.field,issue.message);
 for(const warning of await configuredExecutableWarnings(layout,values,{cwd:project,env:adapter.env||adapter.base?.env||process.env}))add(warning.severity,warning.file,warning.field,warning.message);
 }
 const canonical=name=>{let result=path.isAbsolute(name)?path.relative(project,name):name;for(const j of state.jobs)if(j.alias&&j.alias!=='None'&&result.startsWith(j.alias)){result=j.name+result.slice(j.alias.length);break;}return result.replace(/^\.\//,'');};
 const currentNumber=existing?number(existing):number(preview.jobName)||state.counter;
 const inputs=preview.inputs.map(n=>({file:n.name,type:n.type,field:schema.options.find(f=>values[f.key]&&canonical(values[f.key])===canonical(n.name))?.key||''}));
 for(const f of schema.options){
  // RELION's polishing command consumes fn_mic without registering an input node.
  const polishingMicrographs=layout.name==='Bayesian polishing'&&f.key==='fn_mic';
  const tomoImport=layout.mode==='tomo'&&layout.id===50&&values.do_coords!=='Yes'&&['movie_files','mdoc_files'].includes(f.key);
  if(tomoImport&&!values[f.key])add('warning','',f.key,'Provide a non-empty input file pattern.');
  const v=values[f.key];if((f.type!==2&&!polishingMicrographs&&!tomoImport)||!v||v==='None'||f.key==='fn_exe'||f.key.endsWith('_exe')||f.key==='fn_resmap')continue;
  if(f.key==='qsubscript'&&values.do_queue!=='Yes')continue;
  if(layout.fields?.[f.key]?.when?.some(c=>values[c.key]!==c.value))continue;
  if(!inputs.some(i=>i.file===v))inputs.push({file:v,type:f.nodeType||'',field:f.key});
 }
 // Class selection consumes the optimiser even when the native preview omits it.
 if(layout.name==='Subset selection'&&values.fn_model){
  const file=canonical(values.fn_model),ready=await inputReadiness(project,readRoots,file,{optimiser:/_optimis?er\.star$/i.test(file)});
  if(!ready.available){
   const source=state.jobs.find(j=>file.startsWith(j.name));
   const deferred=source&&number(source.name)<currentNumber&&['Running','Scheduled'].includes(source.status)&&(action==='schedule'||scheduledBefore.includes(source.name)||(action==='scheduler'&&source.status==='Running'));
   add(deferred?'pending':action==='preview'?'warning':'error',file,'fn_model',ready.reason+'. Input: OR select classes from model.star (I/O tab). Wait for the input to be ready or schedule this job after its producer.');
  }
 }
 const dependencies=new Set();
 const track=file=>{const source=state.jobs.find(j=>file.startsWith(j.name)||j.outputs?.some(o=>canonical(o)===file));if(source&&source.name!==existing)dependencies.add(source.name);};
 const cache=new Map();
 for(const item of inputs){
  const file=canonical(item.file.replace(/^\d+@/,'')),field=item.field;
  track(file);
  const source=state.jobs.find(j=>j.outputs.some(o=>canonical(o)===file))||state.jobs.find(j=>file.startsWith(j.name));
  const sourceNumber=number(source?.name||file);
  if(sourceNumber>currentNumber&&source?.status!=='Succeeded')add('warning',file,field,`Input comes from job${String(sourceNumber).padStart(3,'0')}, later than this job${String(currentNumber).padStart(3,'0')}. Check the dependency order.`);
  let actual;
  if(/[?*\[{]/.test(file)){
   let found;try{found=await hasMatchingFile(path.resolve(project,file));}catch(e){add('warning',file,field,'Cannot inspect input pattern: '+e.message);continue;}
   if(!found)add('warning',file,field,'Input pattern does not match any files.');
   else add('info',file,field,'Input pattern has matches; individual matched file contents were not inspected.');
   continue;
  }
  try{actual=await readablePath(project,readRoots,file);if(!(await fs.stat(actual)).isFile())throw Error('Not a regular file');}
  catch(e){
   const earlier=source&&sourceNumber<currentNumber&&['Scheduled','Running'].includes(source.status);
   const deferred=earlier&&(action==='schedule'||scheduledBefore.includes(source.name)||(action==='scheduler'&&source.status==='Running'));
   if(e.code==='ENOENT'&&deferred)add('pending',file,field,'Expected output of earlier '+source.status.toLowerCase()+' job '+source.name+'; STAR checks deferred until the file exists.');
   else add('warning',file,field,e.code==='ENOENT'?'Input file does not exist'+(source?' (producer '+source.name+' is '+source.status+')':'')+'.':e.message);
   continue;
  }
  if(!/\.star$/i.test(file))continue;
  if(layout.mode==='tomo'&&tomographyKind(item.type)){
   await inspectTomography({project,readRoots,file,kind:tomographyKind(item.type),job:layout.name,values,
    onIssue:(file,message)=>add('warning',file,field,message),
    onReference:async(reference,parent)=>{
     const ref=canonical(reference);track(ref);const producer=state.jobs.find(j=>ref.startsWith(j.name)),n=number(producer?.name||ref);
     if(n>currentNumber&&producer?.status!=='Succeeded')add('warning',ref,field,'Referenced by '+parent+': producer has a higher job number than this job.');
     try{const actual=await readablePath(project,readRoots,ref);if(!(await fs.stat(actual)).isFile())throw Error('Not a regular file');return true;}
     catch(e){const deferred=e.code==='ENOENT'&&producer&&n<currentNumber&&['Scheduled','Running'].includes(producer.status)&&(action==='schedule'||scheduledBefore.includes(producer.name)||(action==='scheduler'&&producer.status==='Running'));add(deferred?'pending':'warning',ref,field,'Referenced by '+parent+': '+(deferred?'expected from earlier '+producer.name:e.code==='ENOENT'?'file does not exist':e.message));return false;}
    }});
   continue;
  }
  const rules=starRules(layout.name,field==='in_post'?'fn_post':field,item.type,values);
  if(!rules.length){add('info',file,field,'No complete column profile for this input; checking STAR syntax only.');rules.push({block:'',all:[],any:[]});}
  if(/^(ParticleGroupMetadata|MicrographGroupMetadata|MicrographMovieGroupMetadata)/.test(item.type)){
   try{
    const optics=await adapter.call(['star-schema',actual,'optics']);
    if(optics.rows){
     const block=item.type.startsWith('Particle')?'particles':item.type.startsWith('MicrographMovie')?'movies':'micrographs';
     const pixel=block==='particles'?'rlnImagePixelSize':block==='movies'?'rlnMicrographOriginalPixelSize':'rlnMicrographPixelSize';
     rules.push({block,all:['rlnOpticsGroup'],any:[]},{block:'optics',all:['rlnOpticsGroup',pixel,'rlnVoltage','rlnSphericalAberration'],any:[]});
     cache.set(actual+'\0optics',optics);
    }else add('info',file,field,'No optics block: legacy conversion compatibility has not been verified.');
   }catch(e){add('warning',file,field,'Could not inspect optics metadata: '+e.message.split('\n')[0]);}
  }
  for(const rule of rules){
   try{
    const key=actual+'\0'+rule.block;
    if(!cache.has(key))cache.set(key,await adapter.call(['star-schema',actual,rule.block]));
    let table=cache.get(key);
    if(!table.rows&&['particles','micrographs','movies','coordinate_files'].includes(rule.block)){
     const legacy=await adapter.call(['star-schema',actual,'']);
     if(legacy.labels.includes(rule.all[0])){table=legacy;add('info',file,field,'Legacy unnamed table detected; RELION conversion may supply optics metadata.');}
    }
    let allDeferred=!!table.missingReferences?.length;
    for(const reference of table.missingReferences||[]){
     const ref=canonical(reference);track(ref);const producer=state.jobs.find(j=>ref.startsWith(j.name)),producerNumber=number(producer?.name||ref);
     const deferred=producer&&producerNumber<currentNumber&&['Scheduled','Running'].includes(producer.status)&&(action==='schedule'||scheduledBefore.includes(producer.name)||(action==='scheduler'&&producer.status==='Running'));
     if(!deferred)allDeferred=false;
     add(deferred?'pending':'warning',ref,field,'Referenced by '+file+': file does not exist'+(deferred?'; expected from earlier '+producer.name:'')+'.');
     if(producerNumber>currentNumber&&producer?.status!=='Succeeded')add('warning',ref,field,'STAR reference points to a higher-numbered job than the job being prepared.');
    }
    if(table.missingReferenceCount>100&&!allDeferred)add('warning',file,field,table.missingReferenceCount+' referenced files are missing; only the first 100 are listed.');
    const missing=missingColumns(table,rule);
    if(!table.rows)add('warning',file,field,'Missing or empty data_'+rule.block+' block.');
    if(missing.length)add('warning',file,field,'data_'+rule.block+' is missing: '+missing.map(x=>'_'+x).join(', ')+(layout.name==='Bayesian polishing'&&field==='fn_mic'&&missing.includes('rlnMicrographMetadata')?'. Select micrographs from RELION Motion correction containing per-micrograph movie metadata.':''));
   }catch(e){add('warning',file,field,'Cannot read STAR metadata: '+e.message.split('\n').slice(0,3).join(' '));}
  }
 }
 if(action==='scheduler')for(const name of dependencies){const producer=state.jobs.find(j=>j.name===name);if(producer?.status==='Running'&&number(name)<currentNumber)add('pending',name,'','Waiting for '+name+' to finish producing its inputs.');}
 return {report,jobNumber:currentNumber,dependencies:[...dependencies]};
}
