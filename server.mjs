import {denoiseAvailability} from './lib/denoise-availability.mjs';
import {alignmentSummaryEnricher} from './lib/alignment-summary.mjs';
import {ctfPreview} from './lib/ctf-preview.mjs';
import {adaptRelionLayouts,relionCompatibility} from './lib/relion-compatibility.mjs';
import {alignedStackManifest} from './lib/aligned-stack.mjs';
import {tiltManifest,exclusionView,saveExclusion} from './lib/tilt-excluder.mjs';
import {nextJobRoot,loadNextDefinitions,readNextDefinition,nextJobDirectories} from './lib/next-job-definitions.mjs';
import {initialModelThumbnail,refinementThumbnail,classificationThumbnails,maskThumbnail,reconstructionThumbnail} from './lib/refinement-thumbnail.mjs';
import {groupPending} from './lib/scheduler-readiness.mjs';
import {classRankerOverride} from './lib/class-ranker-override.mjs';
import {completionMarkers} from './lib/completion-markers.mjs';
import {postprocessNext} from './lib/postprocess-next.mjs';
import {motionOutputDefaults} from './lib/motion-output-defaults.mjs';
import {availableJobTypes} from './lib/available-job-types.mjs';
import {MaskRescaleAdapter,maskRescaleLayout} from './lib/mask-rescale.mjs';
import {classificationAlignmentGpu} from './public/classification-gpu.js';
import {cryocareTrainingDefault} from './lib/cryocare-training.mjs';
import {PinnedDrafts} from './lib/pinned-drafts.mjs';
import {executableHealth,executableProbe} from './lib/executable-health.mjs';
import {selectRelionInstallation} from './lib/relion-installation.mjs';
import {environmentHelp} from './lib/environment-help.mjs';
import {recordPickingHistory} from './lib/picking-history.mjs';
import {attachTopazModels,topazModelInputs} from './lib/topaz-models.mjs';
import {clusterSetup} from './lib/cluster-setup.mjs';
import {attachClassificationMaps} from './lib/classification-maps.mjs';
import {previousParticleDiameter} from './lib/particle-diameter-default.mjs';
import {helpProgram,executableOptions} from './lib/cli-options.mjs';
import {extractionInversion} from './lib/extraction-inversion.mjs';
import {logPickingPreview} from './lib/log-picking-preview.mjs';
import {denoiseRestriction} from './lib/sbgrid-denoise.mjs';
import {detectLocalResources} from './lib/local-resources.mjs';
import {openLocalBrowser} from './lib/open-browser.mjs';
import {loadSBGrid} from './lib/startup-environment.mjs';
import {projectLinkWarnings,confirmStartup,linkWarningText} from './lib/startup-access.mjs';
import {schedulerStatus,recordScheduler} from './lib/scheduler-status.mjs';
import {DominantAdapter,dominantInput} from './lib/dominant-class.mjs';
import {startupExecutableCheck} from './lib/startup-executables.mjs';
import {jobProgressEnricher} from './lib/job-progress.mjs';
import {CryocareAdapter} from './lib/cryocare.mjs';
import {listenWithPortPrompt} from './lib/listen.mjs';
import {postprocessDependencies} from './lib/postprocess-dependencies.mjs';
import {addClassParticleCounts} from './lib/class-particle-counts.mjs';
import {workerParticleStatistics,configurePowerWorkers} from './lib/power-workers.mjs';
import {micrographStatistics,particleStatistics,filterParticles,undoParticleFilter,particleBackups} from './lib/picking-statistics.mjs';
import {normalizeClassification} from './public/classification-controls.js';
import {sequentialDefaults} from './lib/sequential-defaults.mjs';
import {motionGainReference} from './lib/motion-gain.mjs';
import {workstationDefaults,pickingGpu,polishingTrainingResources} from './public/workstation-defaults.js';
import {exoticStarInputs} from './lib/inputs.mjs';
import {SCREENING,ScreeningAdapter,screeningSchema,screeningLayout,screeningManifest,saveScreening,localPath} from './lib/screening.mjs';
import {convergence} from './lib/convergence.mjs';
import {autopickManualSettings} from './lib/browser-picker.mjs';
import {importFrames} from './lib/import-frames.mjs';
import {logPickingProgress} from './lib/browser-picker.mjs';
import {countMatchingFiles} from './lib/file-pattern.mjs';
import {mdocInfo} from './lib/mdoc-info.mjs';
import {attachManualRequirements} from './lib/manual-requirements.mjs';
import {angularDistributionFiles,parseBild} from './public/bild.js';
import {projectSizeTracker} from './lib/project-size.mjs';
import {cleanupJobs,emptyTrash} from './lib/project-cleanup.mjs';
import {projectDirectory} from './lib/project-directory.mjs';
import {jobInfoEnricher} from './lib/job-key-info.mjs';
import {ctfPowerSpectra} from './lib/ctf-power-spectra.mjs';
import {fieldError} from './lib/field-errors.mjs';
import {validateFilaments} from './public/picking-geometry.js';
import {autopickReadOnlySnapshot,pickerCounts,pickerRawImage,resumeManualPicker,supportsPicker,pickerSnapshot,pickerCoordinates,pickerImage,coordinateName,coordinateText} from './lib/browser-picker.mjs';
import {browserSelection,selectionSnapshot} from './lib/browser-selection.mjs';
import {openVoxelSampler,optimizeSupport,sphereProbe} from './lib/tomo-optimize.mjs';
import {tomoEditorInput,readTomoEditor,saveTomoEditor,inVolumeSamples} from './lib/tomo-editor.mjs';
import {resolveTomogramSource} from './lib/tomogram-source.mjs';
import {attachTomogramParticles} from './lib/tomogram-overlay.mjs';
import {galleryManifest,galleryImage} from './lib/gallery.mjs';
import {configurationFix} from './lib/configuration-fixes.mjs';
import {IdealPipelines,validateTemplate} from './lib/ideal-pipeline.mjs';
import {preflight} from './lib/preflight.mjs';
import {RescheduleActions} from './lib/reschedule.mjs';
import {duplicateJobs,duplicateApproval} from './lib/duplicates.mjs';
import {openMapPreview,isMaskPreview} from './lib/map-preview.mjs';
import {pipeline as streamPipeline} from 'node:stream/promises';
import {ProjectDefaults,executionKeys} from './lib/project-defaults.mjs';
import {maskDefault} from './lib/mask-default.mjs';
import {HelicalAdapter,helicalSchema,addHelicalLayout} from './lib/helical.mjs';
import {launchViewer} from './lib/viewer.mjs';
import http from 'node:http';
import {isIPv4} from 'node:net';
import {networkInterfaces} from 'node:os';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomBytes,randomUUID,timingSafeEqual} from 'node:crypto';
import {spawn} from 'node:child_process';
import {NativeAdapter} from './lib/native.mjs';
import {resolveExecutable,relionPrograms} from './lib/executables.mjs';
import {TrashActions,listTrash} from './lib/trash.mjs';
import {inputField,nodeGroup,matchesPattern,matchesInputFile,compatibleInputs,continuationInputs,filesystemInputs,modelAngeloMap} from './lib/inputs.mjs';
import {DemoAdapter} from './lib/demo.mjs';
import {validateAlias,validateValues} from './lib/settings.mjs';
import {readablePath,jobPath,readLog,within} from './lib/paths.mjs';
const ROOT=path.dirname(fileURLToPath(import.meta.url));
const releaseVersion=JSON.parse(await fs.readFile(path.join(ROOT,'package.json'),'utf8')).version;
const args=process.argv.slice(2), get=(k,fallback)=>{const i=args.indexOf(k);return i<0?fallback:args[i+1];};
if(args.includes('--help')){console.log('RelionDeLuxe\n  node server.mjs --demo [--port 4310]\n  node server.mjs --project /path/to/project --bridge /path/to/relion_deluxe_bridge [--tomo] [--readonly] [--read-root /external/data]\nUse --cluster to enable queue/cluster controls. Use --no-browser to disable automatic browser opening on local desktops. Use --debug to show the pause-refresh control.\nUse --host 0.0.0.0 for LAN access, or --host <local IPv4 address> for one interface. Default: 127.0.0.1. Use a printed token URL.');console.log(environmentHelp);process.exit(0);}
const tomo=args.includes('--tomo');
const demo=args.includes('--demo'),readonly=args.includes('--readonly'),debug=args.includes('--debug');
const requestedRelion=process.env.RELIONDELUXE_RELION;
const sbgridLoaded=!demo&&!args.includes('--no-auto-sbgrid')?await loadSBGrid():false;
if(!demo){try{const bin=await selectRelionInstallation(process.env,requestedRelion);if(bin)console.log('Using RELION programs from '+bin);}catch(e){console.error(e.message);process.exit(1);}}
const relionOnPath=await resolveExecutable('relion');
const usingSBGrid=sbgridLoaded||!!process.env.SB_BASE||!!process.env.SBGRID||/\/(?:sbgrid_bin|programs\/[^/]+\/relion)\//.test(relionOnPath||'');
if(!demo&&usingSBGrid){
 const mpi=await resolveExecutable('mpirun.relion');
 if(!mpi){console.error('SBGrid is active but mpirun.relion was not found in PATH. Load the SBGrid RELION environment before starting.');process.exit(1);}
 process.env.RELIONDELUXE_MPIRUN=mpi;
}
const denoiseDisabledReason=await denoiseRestriction({tomo,demo,loaded:sbgridLoaded});
if(denoiseDisabledReason)console.warn(denoiseDisabledReason);
if(!demo&&!get('--project')){console.error('Choose --demo, or --project /path/to/project --bridge /path/to/relion_deluxe_bridge.');process.exit(1);}
let project;try{project=await projectDirectory(get('--project',process.cwd()));}catch(e){console.error(e.message);process.exit(1);}
if(!demo){try{const ranker=await classRankerOverride(project);if(ranker)console.log('Using class ranker: '+ranker);}catch(e){console.error(e.message);process.exit(1);}}
const host=get('--host','127.0.0.1');
if(!isIPv4(host))throw new Error('Invalid --host: use a local IPv4 address, or 0.0.0.0 for all IPv4 interfaces');
let cluster=args.includes('--cluster');
let submissionScripts=[];if(cluster&&!demo){try{submissionScripts=await clusterSetup();}catch(e){console.error(e.message);process.exit(1);}}
const detectedResources=!cluster&&!demo?await detectLocalResources():{};
const projectDefaults=new ProjectDefaults(project,demo,{sbgrid:usingSBGrid,resources:{...detectedResources,...(cluster?{qsubscript:'/usr/local/slurm/relion_gpu'}:{})},localOnly:!cluster});
let port=Number(get('--port','4310'));
if(!Number.isInteger(port)||port<1||port>65535)throw new Error('Invalid port');
const readRoots=[];for(let i=0;i<args.length;i++)if(args[i]==='--read-root')readRoots.push(await fs.realpath(args[++i]));
const layout=tomo?JSON.parse(await fs.readFile(path.join(ROOT,'public/layout-tomo.json'),'utf8')):[screeningLayout,...addHelicalLayout(JSON.parse(await fs.readFile(path.join(ROOT,'public/layout.json'),'utf8')))];
layout.splice(layout.findIndex(l=>l.name==='Mask creation')+1,0,maskRescaleLayout);
for(const l of layout)if(!tomo&&['3D classification','3D auto-refine'].includes(l.name))l.overrides={...l.overrides,trust_ref_size:'No'};
for(const l of layout)if(l.name==='Post-processing')l.overrides={...l.overrides,mtf_angpix:'-1'};
for(const l of layout)if(l.name==='Motion correction'&&Object.values(l.tabs).flat().includes('dose_per_frame'))l.overrides={...l.overrides,dose_per_frame:''};
const importLayout=layout.find(l=>l.name===(tomo?'Import tilt series':'Import'));
if(importLayout)importLayout.overrides={...importLayout.overrides,...(!tomo?{optics_group_name:'optics1'}:{}),angpix:'',kV:tomo?'300':'200',Cs:'2.7'};
if(usingSBGrid){const align=layout.find(l=>l.name==='Align tilt-series');if(align)align.overrides={...align.overrides,fn_batchtomo_exe:'batchruntomo'};}
const maskLayout=layout.find(l=>l.name==='Mask creation');
maskLayout.tabs={'I/O':maskLayout.tabs['I/O'],Binarisation:['inimask_threshold'],...Object.fromEntries(Object.entries(maskLayout.tabs).filter(([name])=>name!=='I/O').map(([name,keys])=>[name,keys.filter(k=>k!=='inimask_threshold')]))};
const enrichJobInfo=jobInfoEnricher(project,layout,readRoots);
const enrichProgress=jobProgressEnricher(project,layout);
const enrichAlignmentSummary=alignmentSummaryEnricher(project,readRoots,layout);
const enrichPostprocessDependencies=postprocessDependencies(project);
const projectSize=projectSizeTracker(project);
const decorateState=async state=>{
 state.executionMode=cluster?'cluster':'workstation';
 state.pinned=await pinnedDrafts.state(state.counter);
 if(demo){state.availableJobTypes=await availableJobTypes(project,readRoots,state,layout,catalog,{demo:true});return state;}
 state=await completionMarkers(project,state);
 if(tomo)state.denoiseSplitDisabledReason=await denoiseAvailability(project,readRoots,state,layout);
 state.executableHealth=await executableHealth(await projectDefaults.read(),tomo,{cwd:project});
 state=await enrichJobInfo({...state,scheduler:await schedulerStatus(project).catch(()=>null)});
 state=await enrichProgress(state);
 if(!readonly&&!demo)state=await enrichAlignmentSummary(state);
 state=await attachClassificationMaps(state,project,readRoots,layout);
 state=await enrichPostprocessDependencies(state);
 state=await attachTopazModels(project,readRoots,state);
 state.availableJobTypes=await availableJobTypes(project,readRoots,state,layout,catalog);
 return projectSize.attach(await attachManualRequirements(project,readRoots,state));
};
const fixture=JSON.parse(await fs.readFile(path.join(ROOT,tomo?'public/catalog-tomo.json':'public/catalog.json'),'utf8'));
const provenance=JSON.parse(await fs.readFile(path.join(ROOT,tomo?'public/provenance-tomo.json':'public/provenance.json'),'utf8'));
const bridge=get('--bridge',process.env.RELION_DELUXE_BRIDGE)||await resolveExecutable('relion_deluxe_bridge')||path.join(ROOT,'build/relion_deluxe_bridge');
const native=new NativeAdapter(project,bridge,{...process.env,RELIONDELUXE_MODE:tomo?'tomo':'spa'});
const adapter=new MaskRescaleAdapter(tomo?new DominantAdapter(new CryocareAdapter(demo?new DemoAdapter(fixture,layout):native),project,readRoots):demo?new DemoAdapter([...fixture,helicalSchema,screeningSchema],layout):new DominantAdapter(new ScreeningAdapter(new HelicalAdapter(native),project,readRoots),project,readRoots),project,readRoots);
if(tomo&&!demo){try{if(!(await native.call(['capabilities'])).tomography)throw Error('STA unavailable');}catch(e){console.error('Rebuild the native adapter from this release before using --tomo. '+e.message);process.exit(1);}}
const trashActions=new TrashActions(adapter);
const rescheduleActions=new RescheduleActions(project,adapter);
let catalog;try{catalog=await adapter.call(['schema']);}catch(e){console.error(`Cannot start native mode: ${e.message}\nSee README.md for building the RELION adapter. For interface review only, use --demo.`);process.exit(1);}
adaptRelionLayouts(layout,catalog,JSON.parse(await fs.readFile(path.join(ROOT,'public/placements-5.1-'+(tomo?'tomo':'spa')+'.json'),'utf8')));
const modelAngeloSequences=new Set(['p_seq','d_seq','r_seq','fn_lib']);
for(const field of catalog.find(s=>s.id===layout.find(l=>l.name==='ModelAngelo building')?.id)?.options||[])if(modelAngeloSequences.has(field.key))field.pattern='FASTA sequence files (*.{fasta,fast,fa,faa,fna,txt})';
const relionVersions=demo?{bridge:null,runtime:null,mismatch:false}:await relionCompatibility(native,{cwd:project,env:native.env,catalog});
if(!demo){console.log(`RELION bridge: ${relionVersions.bridge||'unknown'}; runtime: ${relionVersions.runtime||'unknown'}`);if(relionVersions.message)console.warn(relionVersions.message);if(relionVersions.mismatch)process.exit(1);}
for(const s of catalog)if(['3D classification','3D auto-refine'].includes(layout.find(l=>l.id===s.id)?.name))for(const f of s.options)if(f.key==='sampling'){f.choices=f.choices.filter(v=>![15,30].includes(parseFloat(v)));if([15,30].includes(parseFloat(f.default)))f.default='7.5 degrees';}
// Detect a wrong-mode project before exposing any mutating controls. Shared
// utility jobs do not establish a project mode; native variant jobs do.
if(!demo&&await fs.stat(path.join(project,'default_pipeline.star')).catch(()=>null)){
 const snapshot=await adapter.call(['state']);
 const incompatible=snapshot.jobs.find(j=>tomo?!layout.some(l=>l.id===j.type):j.type>=50&&j.type<99);
 if(incompatible)throw Error('Project contains '+incompatible.name+' from the other processing mode. Restart with '+(tomo?'SPA mode (omit --tomo).':'--tomo.'));
 const checked=new Set();for(const j of snapshot.jobs)if([1,2,18,9,10,15].includes(j.type)&&!checked.has(j.type)){await adapter.call(['job',j.name]);checked.add(j.type);}
}
if(denoiseDisabledReason){const submit=adapter.submit.bind(adapter);adapter.submit=(action,l,...rest)=>{if(l.id===58)throw Error(denoiseDisabledReason);return submit(action,l,...rest);};}
{const submit=adapter.submit.bind(adapter);adapter.submit=(action,l,s,values,...rest)=>submit(action,l,s,cluster?values:{...values,do_queue:'No'},...rest);}
const idealPipelines=new IdealPipelines({project,adapter,layout,catalog,defaults:projectDefaults,readRoots,demo});
const pinnedDrafts=new PinnedDrafts(idealPipelines);
const token=randomBytes(32).toString('hex');

const errors=[];
function json(res,code,data){res.writeHead(code,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(data));}
async function body(req){let text='';for await(const chunk of req){text+=chunk;if(text.length>(req.url?.startsWith('/api/tomo-edit-')?8:1)*1024*1024)throw new Error('Request too large');}return JSON.parse(text||'{}');}
async function hasProject(){return demo||await fs.stat(path.join(project,'default_pipeline.star')).then(()=>true,()=>false);}
async function currentJob(name){jobPath(project,name);const state=await adapter.call(['state']);const job=state.jobs.find(j=>j.name===name);if(!job)throw new Error('Job no longer exists');return job;}
async function jobFile(name,file){const dir=jobPath(project,name);const real=await fs.realpath(dir);if(!within(project,real))throw new Error('Job directory escapes project');const dest=path.join(real,file);const stat=await fs.lstat(dest).catch(e=>{if(e.code==='ENOENT')return null;throw e;});if(stat?.isSymbolicLink())throw new Error('Refusing symbolic-link job metadata');return dest;}
async function classParticleCounts(manifest){
 if(!manifest?.labels.includes('rlnClassDistribution'))return manifest;
 try{if(!manifest.classDataFile&&/_model\.star$/i.test(manifest.file)){const candidate=manifest.file.replace(/_model\.star$/i,'_data.star');if(await readablePath(project,readRoots,candidate).then(()=>true,()=>false))manifest={...manifest,classDataFile:candidate};}
 if(manifest.classDataFile)return await addClassParticleCounts(project,readRoots,manifest,null);
 const relative=path.relative(project,await readablePath(project,readRoots,manifest.file)).replaceAll('\\','/');const owner=relative.match(/^(.+?\/job\d+\/)/)?.[1];if(!owner)throw Error('Class job could not be identified');
 const data=await adapter.call(['job',owner]);return await addClassParticleCounts(project,readRoots,manifest,data.values.fn_img);
 }catch(e){return {...manifest,particleCountWarning:'NumberOfParticles unavailable: '+e.message};}
}
async function pickingContext(job,inspect=false){const current=await currentJob(job);if(inspect){if(tomo||current.type!==4)throw Error('Read-only particle inspection requires an Auto-picking job.');const data=await adapter.call(['job',job]);return autopickReadOnlySnapshot(project,readRoots,job,data.values);}await fs.access(await jobFile(job,'RELIONDELUXE_BROWSER_PICKING'));const data=await adapter.call(['job',job]);const auto=data.values.continue_manual==='Yes'&&!!data.values.fn_input_autopick;const pickerValues=auto?JSON.parse(await fs.readFile(await jobFile(job,'browser-picking-settings.json'),'utf8')):data.values;const snapshot=await pickerSnapshot(project,readRoots,pickerValues);if(auto)for(const mic of snapshot.mics)mic.mapping='autopick.star';const expected=await fs.readFile(await jobFile(job,'browser-picking-input.txt'),'utf8');if(expected!==snapshot.revision)throw Error('Micrograph input changed; start a new picking job to avoid mismatching coordinates.');return {...snapshot,powerScreening:!!auto,powerWorkers:configurePowerWorkers((await projectDefaults.read()).globalNcpus),writable:!readonly&&current.status==='Running'};}
const results=new Map();let mutation=Promise.resolve(),logPreviewBusy=false,ctfPreviewBusy=false;
async function launch(executable,argv,logName){
 const dir=path.join(project,'.reliondeluxe');await fs.mkdir(dir,{recursive:true,mode:0o700});
 const resolved=await resolveExecutable(executable,{cwd:project});
 if(!resolved)throw new Error('Executable not found in server PATH: '+executable);
 const file=await fs.open(path.join(dir,logName),'a',0o600);
 try{const child=spawn(resolved,argv,{cwd:project,env:native.env,detached:true,shell:false,stdio:['ignore',file.fd,file.fd]});
 await new Promise((resolve,reject)=>{child.once('spawn',resolve);child.once('error',reject);});if(argv.includes('--schedule'))await recordScheduler(project,child,argv,`.reliondeluxe/${logName}`);child.unref();return {pid:child.pid,log:`.reliondeluxe/${logName}`,message:'Process started. Check the log for execution errors.'};
 }finally{await file.close();}
}
async function tomoEditingContext(job){
 if(!tomo||demo)throw Error('Browser tomography editing requires a native STA project');
 const current=await currentJob(job);
 if(current.type!==59)throw Error('Select a Pick tomograms job');
 await fs.access(await jobFile(job,'RELIONDELUXE_BROWSER_TOMO'));
 const data=await adapter.call(['job',job]);
 return {...await tomoEditorInput(project,readRoots,data.values),writable:!readonly&&current.status==='Running'};
}
async function exclusionContext(job){
 if(!tomo||demo)throw Error('Tilt exclusion requires a native STA project');
 const current=await currentJob(job);if(current.type!==57)throw Error('Select an Exclude tilt-images job');
 await fs.access(await jobFile(job,'RELIONDELUXE_BROWSER_EXCLUDE'));
 const data=await adapter.call(['job',job]);
 const manifest=await tiltManifest(project,readRoots,data.values.in_tiltseries);
 const revision=await fs.readFile(await jobFile(job,'browser-exclusion-source.txt'),'utf8');
 if(revision!==manifest.revision)throw Error('Input tilt-series metadata changed. Create a new exclusion job.');
 return {manifest,writable:!readonly&&current.status==='Running'};
}
const tomoEditLocks=new Set();
async function post(url,b){
 if(!demo&&['/api/run','/api/schedule','/api/continue','/api/scheduler','/api/ideal-schedule','/api/pinned-execute'].includes(url.pathname)&&!await projectDefaults.revision())throw Error('Review and save Workstation / cluster defaults before launching or scheduling jobs.');
 if(readonly && !['/api/preview','/api/delete-plan','/api/restore-plan','/api/ideal-capture','/api/ideal-validate','/api/ideal-plan'].includes(url.pathname))throw new Error('Server is read-only');
 if(['/api/excluder-save','/api/excluder-finish'].includes(url.pathname)){
  const context=await exclusionContext(b.job);if(!context.writable)throw Error('Exclusion job is not running');
  const finish=url.pathname.endsWith('finish');
  const result=await saveExclusion(context.manifest,name=>jobFile(b.job,name),b.job,b,finish);
  await fs.appendFile(await jobFile(b.job,'run.out'),`Browser tilt exclusion: ${result.count} retained images in ${result.series} tilt-series${finish?' — finished':''}.\n`);
  if(finish){await adapter.call(['mark-success',b.job]);await fs.writeFile(await jobFile(b.job,'RELION_JOB_EXIT_SUCCESS'),'');}
  return result;
 }
 if(['/api/tomo-edit-optimize','/api/tomo-edit-probe'].includes(url.pathname)){
  if(tomoEditLocks.size)throw Error('A tomogram edit operation is already in progress');
  tomoEditLocks.add(b.job);let sampler;
  try{
   const context=await tomoEditingContext(b.job);if(!context.writable)throw Error('Picking job is not running');
   if(url.pathname==='/api/tomo-edit-optimize'&&(!['X','Y','Z'].includes(b.viewAxis)||b.axis===b.viewAxis))throw Error('Choose an axis in the displayed plane');
   const row=context.manifest.rows.find(r=>r.rlnTomoName===b.support?.tomogram);
   if(!row||!context.manifest.imageColumns.includes(b.source))throw Error('Unknown tomogram image source');
   sampler=await openVoxelSampler(project,readRoots,row[b.source]);
   if(url.pathname==='/api/tomo-edit-probe')return await sphereProbe(b.support,sampler,b.poleAxis,b.width);
   return await optimizeSupport(b.support,b.axis,Number(b.range),sampler,b.invert===true);
  }finally{await sampler?.close();tomoEditLocks.delete(b.job);}
 }
 if(['/api/tomo-edit-save','/api/tomo-edit-finish'].includes(url.pathname)){
  if(tomoEditLocks.has(b.job))throw Error('Another save is in progress');
  tomoEditLocks.add(b.job);
  try{
   const context=await tomoEditingContext(b.job);if(!context.writable)throw Error('Picking job is not running');
   const finish=url.pathname.endsWith('finish');
   const result=await saveTomoEditor(name=>jobFile(b.job,name),context,b,{finish,job:b.job,filterSamples:samples=>inVolumeSamples(project,readRoots,context.manifest,samples)});
   if(finish){
    await adapter.call(['mark-success',b.job]);
    await fs.writeFile(await jobFile(b.job,'RELION_JOB_EXIT_SUCCESS'),'');
    await fs.appendFile(await jobFile(b.job,'run.out'),'Browser tomography picking: '+result.count+' particles from '+b.supports.length+' support elements; '+result.ignoredOutside+' outside-volume particles omitted.\n');
   }
   return result;
  }finally{tomoEditLocks.delete(b.job);}
 }
 if(url.pathname==='/api/pinned-convert')return pinnedDrafts.convert(b.template,b.revision,!!b.draft);
 if(url.pathname==='/api/pinned-edit')return pinnedDrafts.edit(b.id,b.values,b.revision,!!b.draft);
 if(url.pathname==='/api/pinned-move')return pinnedDrafts.move(b.ids,b.delta,b.revision,!!b.draft);
 if(url.pathname==='/api/pinned-delete')return pinnedDrafts.remove(b.ids,b.revision,!!b.draft);
 if(url.pathname==='/api/pinned-preview')return pinnedDrafts.preview(b.ids,b.revision,!!b.draft);
 if(url.pathname==='/api/pinned-execute')return pinnedDrafts.execute(b.plan,b.revision,!!b.draft);
 if(url.pathname==='/api/pinned-reconcile')return pinnedDrafts.reconcile(b.revision);
 if(url.pathname==='/api/ideal-capture')return idealPipelines.capture(b.jobs);
 if(url.pathname==='/api/ideal-validate')return {template:validateTemplate(b.template,layout,catalog)};
 if(url.pathname==='/api/ideal-plan')return idealPipelines.preview(b.template);
 if(url.pathname==='/api/ideal-schedule')return idealPipelines.execute(b.plan);
 if(url.pathname==='/api/reschedule-plan'){if(demo)throw Error('re-schedule+N requires a native project');return rescheduleActions.preview(b.jobs,b.n);}
 if(url.pathname==='/api/reschedule'){if(demo)throw Error('re-schedule+N requires a native project');return rescheduleActions.execute(b.plan);}
 if(url.pathname==='/api/execution-mode'){
  if(!['cluster','workstation'].includes(b.mode))throw Error('Unknown execution mode');
  const next=b.mode==='cluster';
  if(next&&!cluster&&!demo)submissionScripts=await clusterSetup();
  cluster=next;projectDefaults.localOnly=!cluster;
  for(const key of ['RELIONDELUXE_MPIRUN','RELIONDELUXE_TOPAZ'])if(process.env[key])native.env[key]=process.env[key];
  return {cluster,submissionScripts,values:await projectDefaults.read(),revision:await projectDefaults.revision()};
 }
 if(url.pathname==='/api/project-defaults'){if(!cluster)b.values={...b.values,do_queue:'No'};for(const l of layout){const schema=catalog.find(s=>s.id===l.id);if(schema)workstationDefaults(l,schema,{...Object.fromEntries(schema.options.map(f=>[f.key,f.default])),...l.overrides},b.values);}const values=await projectDefaults.write(b.values);return {values,revision:await projectDefaults.revision()};}
 if(url.pathname==='/api/init'){if(await hasProject())throw new Error('Project already exists');const result=await adapter.call(['init']);if(!demo)await nextJobRoot(ROOT,project,{seed:true});return result;}
 if(url.pathname==='/api/refresh')return decorateState(await adapter.call(['refresh']));
 if(['/api/run','/api/schedule','/api/continue','/api/preview'].includes(url.pathname)){
  const type=Number(b.type),l=layout.find(x=>x.id===type),s=catalog.find(x=>x.id===type);
  if(!l||!s)throw new Error('Unknown job type in this server mode');
  const values=validateValues(s,b.values);if(tomo&&l.name==='Pick tomograms')values.do_queue='No';polishingTrainingResources(l,values,await projectDefaults.read());if(!cluster&&'do_queue' in values)values.do_queue='No';normalizeClassification(l,values);classificationAlignmentGpu(l,values);pickingGpu(l,values,{},'');validateAlias(b.alias||'');
  if(b.existing){const j=await currentJob(b.existing);if(j.type!==type)throw new Error('Job type mismatch');if(j.status==='Running'){if(l.name==='Exclude tilt-images'&&url.pathname==='/api/continue'){await exclusionContext(b.existing);return {name:b.existing,browserExclusion:true};}if(l.name==='Pick tomograms'&&url.pathname==='/api/continue'){await tomoEditingContext(b.existing);return {name:b.existing,browserTomo:true};}if(l.name==='Manual picking'&&url.pathname==='/api/continue'){if(tomo||demo)throw Error('Browser picking recovery is available for native SPA Manual picking jobs.');const saved=await adapter.call(['job',b.existing]);await resumeManualPicker(project,readRoots,saved.values,file=>jobFile(b.existing,file));return {name:b.existing,browserPicking:true};}throw new Error('Cannot resubmit a running job');}}
  if(b.executionRevision!==undefined&&b.executionRevision!==await projectDefaults.revision())throw Error('Project computing settings changed. Refresh the browser, reload the job and review its Running settings before submitting.');
  if(!tomo&&!demo&&l.name==='CTF estimation'){const power=await ctfPowerSpectra(project,adapter,await adapter.call(['state']),values.input_star_mics,layout.find(l=>l.name==='Motion correction').id);if(power.disabled)values.use_given_ps='No';}
  if(l.name==='Auto-picking'&&values.continue_manual==='Yes'){
   const saved=b.existing?(await adapter.call(['job',b.existing])).values:null;
   if([values,saved].some(v=>v?.do_topaz==='Yes'&&v.do_topaz_train==='Yes'))throw Error('Topaz training jobs cannot be continued manually: they produce a trained model, not particle picks. Run a Topaz picking job with that model first.');
  }
  if(!demo&&l.id===7&&values.fn_model){let info;try{info=await dominantInput(project,readRoots,values.fn_model);}catch(e){if(values.do_dominant_3d==='Yes'&&url.pathname!=='/api/schedule'&&url.pathname!=='/api/preview')throw e;}if(info?.is3D)values.do_class_ranker='No';if(info&&!info.is3D&&values.do_dominant_3d==='Yes')throw Error('Select dominant 3D class only requires a 3D optimiser.');}
  const fix=configurationFix(l,s,values);if(fix)return fix;
  const verification=demo?{report:[]}:await preflight({project,readRoots,adapter,layout:l,schema:s,values,existing:b.existing||'',action:url.pathname.slice(5)});
  if(verification.report.some(r=>r.severity==='error'))throw Error(verification.report.filter(r=>r.severity==='error').map(r=>r.file+' — '+r.message).join('\n'));
  if(url.pathname!=='/api/preview'&&verification.report.some(r=>r.severity==='warning')){const approval=duplicateApproval({action:url.pathname,type,values,existing:b.existing||''},verification);if(b.verificationApproval!==approval)return {verificationWarning:true,verification,approval};}
  if(!demo&&url.pathname!=='/api/preview'){
   const matches=await duplicateJobs({project,adapter,layout:l,schema:s,values,existing:b.existing||'',alias:b.alias||''});
   if(matches.length){const approval=duplicateApproval({action:url.pathname,type,values,existing:b.existing||'',alias:b.alias||''},matches);if(b.duplicateApproval!==approval)return {duplicateWarning:true,matches,approval};}
  }
  const useExclude=tomo&&!demo&&l.name==='Exclude tilt-images'&&['/api/run','/api/continue'].includes(url.pathname);
  let exclusion;
  if(useExclude){
   values.do_queue='No';exclusion=await tiltManifest(project,readRoots,values.in_tiltseries);
   if(b.existing&&(await currentJob(b.existing)).status!=='Scheduled'){
    const old=await exclusionContext(b.existing);
    if(old.manifest.revision!==exclusion.revision)throw Error('Cannot change exclusion inputs on continuation. Create a new job.');
   }
  }
  const useTomo=tomo&&!demo&&l.name==='Pick tomograms'&&['/api/run','/api/continue'].includes(url.pathname);
  if(useTomo){if(b.existing&&(await currentJob(b.existing)).status!=='Scheduled')await fs.access(await jobFile(b.existing,'RELIONDELUXE_BROWSER_TOMO')).catch(()=>{throw Error('Existing native picks remain read-only. Create a new Pick job to use browser support editing.');});values.do_queue='No';await tomoEditorInput(project,readRoots,values);}
  let useBrowser=!tomo&&!demo&&l.name==='Subset selection'&&['/api/run','/api/continue'].includes(url.pathname)&&values.do_dominant_3d!=='Yes'&&browserSelection(values);
  if(useBrowser)await selectionSnapshot(project,readRoots,values);
  const autoManual=l.name==='Auto-picking'&&url.pathname==='/api/continue'&&!!b.existing&&values.continue_manual==='Yes';
  const pickerValues=autoManual?await autopickManualSettings(project,readRoots,values,Object.fromEntries(catalog.find(s=>s.id===layout.find(l=>l.name==='Manual picking').id).options.map(f=>[f.key,f.default]))):values;
  const usePicker=!tomo&&!demo&&(l.name==='Manual picking'||autoManual)&&['/api/run','/api/continue'].includes(url.pathname)&&supportsPicker(pickerValues);
  let picking;if(usePicker){if(autoManual)await fs.access(await jobFile(b.existing,'autopick.star'));if(pickerValues.do_topaz_denoise==='Yes'&&!await resolveExecutable('relion_python_topaz',{cwd:project}))throw Error('Topaz denoising requires relion_python_topaz in the server PATH.');picking=await pickerSnapshot(project,readRoots,pickerValues);if(b.existing){const old=await fs.readFile(await jobFile(b.existing,'browser-picking-input.txt'),'utf8').catch(e=>{if(e.code==='ENOENT')return null;throw e;});if(old&&old!==picking.revision)throw Error('Micrograph input changed. Create a new picking job.');}}
  if(usePicker&&autoManual)values.do_queue='No';
  const result=await adapter.submit(useExclude?'browser-exclude':useTomo?'browser-tomo':usePicker?'browser-pick':useBrowser?'browser-select':url.pathname.slice(5),l,s,values,b.existing,b.alias);
  if(useExclude){result.browserExclusion=true;await fs.writeFile(await jobFile(result.name,'browser-exclusion-source.txt'),exclusion.revision);await fs.appendFile(await jobFile(result.name,'note.txt'),'\n ++++ Tilt images selected in excluder.html instead of native napari. Retained STAR rows preserve original metadata.\n');}
  if(useTomo){result.browserTomo=true;await fs.appendFile(await jobFile(result.name,'note.txt'),'\n ++++ Browser tomography picking in tomo_pick.html. Support geometry is stored in browser-tomo-supports.json. Native napari was not executed.\n');}
  if(usePicker){if(autoManual)await fs.writeFile(await jobFile(result.name,'browser-picking-settings.json'),JSON.stringify(pickerValues));await fs.writeFile(await jobFile(result.name,'browser-picking-input.txt'),picking.revision);result.browserPicking=true;}
  if(usePicker&&autoManual)await recordPickingHistory(project,result.name,'continue-manual',{inputRevision:picking.revision,settings:pickerValues,help:'Power filters use raw pixel mean-square within the particle disk, and per-micrograph mean and standard deviation of particle powers. Order matters; repeated deletions recalculate statistics. Min FOM is display-only. See particle-backups and manual-cleaning-history.jsonl for coordinates and settings.'});
  if(useBrowser)result.browserSelection=true;
  if(url.pathname!=='/api/preview'&&result.name)projectDefaults.markSaved(result.name);
  return {...result,verification};
 }
 if(['/api/picking-filter','/api/picking-filter-undo'].includes(url.pathname)){
  const context=await pickingContext(b.job);if(!context.writable)throw Error('Picking job is not running');
  if(context.values.do_startend==='Yes')throw Error('Particle screening does not support helical endpoint picking.');
  return url.pathname==='/api/picking-filter'?filterParticles(project,readRoots,adapter,b.job,context,b):undoParticleFilter(project,readRoots,adapter,b.job,context,b.backup);
 }
 if(url.pathname==='/api/picking-save'||url.pathname==='/api/picking-finish'){
  const context=await pickingContext(b.job);if(!context.writable)throw Error('Picking job is not running');if(b.revision!==context.revision)throw Error('Micrographs changed; reload before saving.');
  for(const filename of ['manualpick.star','autopick.star','micrographs_selected.star','manualpick.star.tmp','autopick.star.tmp','micrographs_selected.star.tmp'])await jobFile(b.job,filename);
  if(url.pathname==='/api/picking-finish'){if(context.values.do_startend==='Yes')for(const mic of context.mics)validateFilaments((await pickerCoordinates(project,readRoots,b.job,mic)).points);const result=await adapter.call(['browser-pick-finish',b.job]);if(context.powerScreening)await recordPickingHistory(project,b.job,'finished',{inputRevision:context.revision});await logPickingProgress(project,readRoots,b.job,context,'Finished').catch(e=>console.warn('Picking log update failed:',e.message));return result;}
  const mic=context.mics[b.index];if(!Number.isInteger(b.index)||!mic)throw Error('Invalid micrograph');
  const previous=await pickerCoordinates(project,readRoots,b.job,mic);if(previous.revision!==b.coordinateRevision)throw Error('Coordinates were changed in another window. Reload before saving.');
  const text=coordinateText(b.points,context.values.do_startend==='Yes');if(context.values.do_startend==='Yes')validateFilaments(b.points);const raw=await pickerRawImage(project,readRoots,mic,1);if(b.points.some(p=>p.x<0||p.y<0||p.x>=raw.nx||p.y>=raw.ny))throw Error('Coordinate lies outside the micrograph.');
  const coordinateFile=coordinateName(mic.file,mic.mapping==='autopick.star');await localPath(project,path.posix.dirname(b.job+coordinateFile),true);await localPath(project,b.job+coordinateFile);await localPath(project,b.job+coordinateFile+'.tmp');
  const temp=await jobFile(b.job,'browser-picks-'+randomUUID()+'.star');await fs.writeFile(temp,text,{flag:'wx'});
  try{await adapter.call(['browser-pick-save',b.job,String(b.index),temp]);}finally{await fs.rm(temp,{force:true});}
  if(context.powerScreening)await recordPickingHistory(project,b.job,'manual-coordinate-save',{micrograph:mic.file,coordinateFile,coordinateRevision:previous.revision,beforeCount:previous.points.length,afterCount:b.points.length,before:previous.points,after:b.points});
  await fs.appendFile(await jobFile(b.job,'run.out'),'Saved micrograph '+(b.index+1)+' / '+context.mics.length+': '+mic.file+' · '+b.points.length+' coordinate(s)\n').catch(e=>console.warn('Picking log update failed:',e.message));
  return pickerCoordinates(project,readRoots,b.job,mic);
 }
 if(url.pathname==='/api/screening-save'){
  const j=await currentJob(b.job);if(j.type!==SCREENING||j.status!=='Running')throw Error('Screening job is not running.');
  for(const flag of ['SCREENING_SAVED','RELION_JOB_ABORT_NOW','RELION_JOB_EXIT_FAILURE','RELION_JOB_EXIT_ABORTED'])if(await fs.stat(await localPath(project,b.job+flag)).catch(()=>null))throw Error('Screening is already saved or stopped; reload the gallery.');
  return saveScreening(project,readRoots,b.job,b.revision,b.indices);
 }
 if(url.pathname==='/api/selection-save'){
  const j=await currentJob(b.job);if(j.status!=='Running')throw Error('Selection job is no longer running.');
  await fs.access(await jobFile(b.job,'RELIONDELUXE_BROWSER_SELECTION'));
  const data=await adapter.call(['job',b.job]);if(!browserSelection(data.values))throw Error('Unsupported selection settings');
  const snapshot=await selectionSnapshot(project,readRoots,data.values);
  if(b.revision!==snapshot.revision)throw Error('Input metadata or settings changed. Reload the selection gallery before saving.');
  if(!Array.isArray(b.indices)||!b.indices.length||b.indices.length>20000||new Set(b.indices).size!==b.indices.length||b.indices.some(i=>!Number.isInteger(i)||i<0||i>=snapshot.manifest.rows.length))throw Error('Select between 1 and 20000 distinct images.');
  for(const name of ['particles.star','micrographs.star','class_averages.star','particles.star.browser-tmp','micrographs.star.browser-tmp','class_averages.star.browser-tmp'])await jobFile(b.job,name);
  return adapter.call(['browser-select-save',b.job,b.indices.sort((a,b)=>a-b).join(',')]);
 }
 if(url.pathname==='/api/delete-plan'){
  if(typeof b.recursive!=='boolean')throw new Error('Expected recursive flag');
  if(b.jobs!==undefined){
   if(!Array.isArray(b.jobs)||!b.jobs.length||b.jobs.length>1000||new Set(b.jobs).size!==b.jobs.length)throw new Error('Select between 1 and 1000 distinct jobs');
   const state=await adapter.call(['state']);for(const name of b.jobs){jobPath(project,name);if(!state.jobs.some(j=>j.name===name))throw new Error('Selected job no longer exists');}
   return trashActions.preview('delete',b.jobs,b.recursive);
  }
  await currentJob(b.job);return trashActions.preview('delete',b.job,b.recursive);
 }
 if(url.pathname==='/api/restore-plan')return trashActions.preview('restore',b.manifest);
 if(url.pathname==='/api/delete')return trashActions.execute('delete',b.plan);
 if(url.pathname==='/api/undelete')return trashActions.execute('restore',b.plan);
 if(url.pathname==='/api/project-cleanup'){
  if(demo)throw Error('Cleanup requires a native project');
  if(!['gentle','harsh','empty'].includes(b.action))throw Error('Invalid cleanup action');
  if(b.action==='empty'){if(b.confirm!==true)throw Error('Confirm permanent Trash deletion');await emptyTrash(project);projectSize.invalidate();return {};}
  const jobs=await cleanupJobs(project,adapter,b.action==='harsh');
  if(!b.confirm)return {jobs};
  if(JSON.stringify(jobs)!==JSON.stringify(b.jobs))throw Error('Cleanup scope changed; reopen the dialog and review again.');
  try{for(const job of jobs)await adapter.call([b.action==='harsh'?'harsh-clean':'gentle-clean',job]);}finally{projectSize.invalidate();}
  return {jobs};
 }
 if(url.pathname==='/api/action'){
  const allowed=['alias','abort','mark-success','mark-failed','gentle-clean','harsh-clean'];
  if(!allowed.includes(b.action))throw new Error('Unsupported job action');
  const j=await currentJob(b.job);
  if(['delete','gentle-clean','harsh-clean'].includes(b.action)&&j.status==='Running')throw new Error('Cannot clean or delete a running job');
  if(b.action==='alias'){validateAlias(b.alias);return adapter.call(['alias',b.job,b.alias]);}
  if(b.action==='mark-failed'&&!demo){
   // A failed MPI launcher may never enter RELION or create refinement outputs.
   // Use RELION's completion protocol, not its mark-finished output validation.
   await fs.writeFile(await jobFile(b.job,'RELION_JOB_EXIT_FAILURE'),'');
   for(const flag of ['RELION_JOB_EXIT_SUCCESS','RELION_JOB_EXIT_ABORTED'])await fs.rm(await jobFile(b.job,flag),{force:true});
   return adapter.call(['refresh']);
  }
  return adapter.call([b.action,b.job]);
 }
 if(url.pathname==='/api/note'){
  await currentJob(b.job);if(typeof b.text!=='string'||b.text.length>100000)throw new Error('Invalid note');
  if(demo)return {message:'Demo note acknowledged; it is not saved to disk.'};
  const file=await jobFile(b.job,'note.txt');const temp=file+'.'+randomUUID();await fs.writeFile(temp,b.text,{mode:0o600,flag:'wx'});await fs.rename(temp,file);return {};
 }
 if(url.pathname==='/api/display'){
  if(demo)throw new Error('Native viewers require live mode on the workstation.');
  const j=await currentJob(b.job);if(![...j.inputs,...j.outputs].includes(b.file))throw new Error('Select an input/output node of this job');
  const file=await readablePath(project,readRoots,b.file);
  const nodeType=tomo?(await adapter.call(['state'])).nodes.find(n=>n.name===b.file)?.type||'':'';
  const result=await launchViewer(project,file,{nodeType});console.warn('[Viewer] '+result.message);return result;
 }
 if(url.pathname==='/api/scheduler'){
  if(demo)throw new Error('Batch scheduler is available in native mode. Use Run on a selected demo job to simulate it.');
  if(!Array.isArray(b.jobs)||!b.jobs.length||b.jobs.length>100)throw new Error('Select scheduled jobs');
  for(const name of b.jobs){const j=await currentJob(name);if(j.status!=='Scheduled')throw new Error(`${name} is not scheduled`);}
  for(const k of ['repeat','wait','before'])if(!Number.isInteger(b[k])||b[k]<(k==='repeat'?1:0)||b[k]>100000)throw new Error('Invalid scheduler timing');
  const prepared=[],matches=[],reports=[];
  for(const job of b.jobs){const data=await adapter.call(['job',job]);if(tomo&&[57,59].includes(data.type))throw Error(job+': browser selection/picking needs interaction. Select the job and press Run to open its editor.');if(denoiseDisabledReason&&data.type===58)throw Error(denoiseDisabledReason);const effective=await projectDefaults.forJob(job,data.values),l=layout.find(l=>l.id===data.type),s=catalog.find(s=>s.id===data.type);const check=await preflight({project,readRoots,adapter,layout:l,schema:s,values:effective,existing:job,action:'scheduler',scheduledBefore:b.jobs.slice(0,b.jobs.indexOf(job))});reports.push(...check.report.map(r=>({...r,job})));prepared.push({job,data,effective,l,s,dependencies:check.dependencies});for(const match of await duplicateJobs({project,adapter,layout:l,schema:s,values:effective,existing:job}))matches.push({...match,scheduledJob:job});}
  if(reports.some(r=>['warning','pending','error'].includes(r.severity))){const verification={report:groupPending(reports,(await adapter.call(['state'])).jobs),scheduler:true};const approval=duplicateApproval({jobs:prepared.map(p=>({job:p.job,values:p.effective})),repeat:b.repeat,wait:b.wait,before:b.before},verification);if(b.verificationApproval!==approval)return {verificationWarning:true,verification,approval};}
  if(matches.length){const approval=duplicateApproval({jobs:prepared.map(p=>({job:p.job,values:p.effective})),repeat:b.repeat,wait:b.wait,before:b.before},matches);if(b.duplicateApproval!==approval)return {duplicateWarning:true,matches,approval};}
  for(const {job,data,effective,l,s} of prepared)if(effective!==data.values)await adapter.submit('schedule',l,s,effective,job,'');
  const name='deluxe_'+randomUUID().replaceAll('-','');
  const pipeliner=await resolveExecutable(get('--pipeliner','relion_pipeliner'),{cwd:project});
  if(!pipeliner)throw Error('relion_pipeliner was not found.');
  const planFile=path.join(project,'.reliondeluxe',name+'-plan.json');
  await fs.mkdir(path.dirname(planFile),{recursive:true});
  await fs.writeFile(planFile,JSON.stringify({project,name,bridge:path.resolve(bridge),readRoots,prepared,pipeliner,repeat:b.repeat,wait:b.wait,before:b.before}),{mode:0o600});
  return {...await launch(process.execPath,[path.join(ROOT,'scripts/guarded-scheduler.mjs'),planFile,'--schedule',name,'--RunJobs',b.jobs.join(' ')],`scheduler-${name}.log`),name};
 }
 throw new Error('Unknown API route');
}
const server=http.createServer(async(req,res)=>{
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Cache-Control','no-store');
 res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; worker-src 'self' blob:; frame-src 'self' blob:; frame-ancestors 'self'; base-uri 'none'; form-action 'none'");
 res.setHeader('Referrer-Policy','no-referrer');
 try{
  const localAddress=req.socket.localAddress;
  const allowedHosts=[`${localAddress}:${port}`];
  if(localAddress==='127.0.0.1')allowedHosts.push(`localhost:${port}`);
  if(!allowedHosts.includes(req.headers.host))return json(res,403,{error:'Invalid Host'});
  const url=new URL(req.url,`http://127.0.0.1:${port}`);
  if(url.pathname.startsWith('/api/')){
   const supplied=Buffer.from(req.headers['x-relion-token']||'');const expected=Buffer.from(token);
   if(supplied.length!==expected.length||!timingSafeEqual(supplied,expected))return json(res,401,{error:'Open the token URL printed by the server.'});
   if(req.headers.origin&&req.headers.origin!==`http://${req.headers.host}`)return json(res,403,{error:'Cross-origin requests rejected'});
   if(req.method==='POST'){
    if(!(req.headers['content-type']||'').startsWith('application/json'))return json(res,415,{error:'Expected application/json'});
    const b=await body(req);const id=req.headers['x-request-id'];if(typeof id!=='string'||!/^[a-f0-9-]{36}$/.test(id))throw new Error('Missing request ID');
    if(results.has(id)){const r=await results.get(id);return json(res,r.code,r.data);}
    const previewRequest=['/api/log-picking-preview','/api/ctf-preview'].includes(url.pathname);
    const run=async()=>{
     if(!previewRequest)return post(url,b);
     if(demo||readonly)throw Error('Preview requires a writable native RELION project.');
     if(url.pathname==='/api/ctf-preview'){
      if(b.job)throw Error('CTF preview is only available for drafts.');
      if(ctfPreviewBusy)throw Error('A CTF preview is already running. Please wait.');
      ctfPreviewBusy=true;try{return await ctfPreview(project,readRoots,b,{debug});}finally{ctfPreviewBusy=false;}
     }
     if(logPreviewBusy)throw Error('A LoG preview is already running. Please wait.');
     logPreviewBusy=true;try{return await logPickingPreview(project,readRoots,b);}finally{logPreviewBusy=false;}
    };
    const promise=(previewRequest?run():mutation.then(run)).then(data=>({code:200,data}),e=>({code:400,data:{error:fieldError(e.message,layout.find(l=>l.id===Number(b.type)),catalog.find(s=>s.id===Number(b.type)),b.values)}}));
    if(!previewRequest)mutation=promise.then(()=>{});results.set(id,promise);if(results.size>500)results.delete(results.keys().next().value);
    const r=await promise;return json(res,r.code,r.data);
   }
   if(req.method!=='GET')return json(res,405,{error:'Method not allowed'});
   if(['/api/picking','/api/picking-image','/api/picking-coordinates'].includes(url.pathname)){
    const job=url.searchParams.get('job'),context=await pickingContext(job,url.searchParams.get('readonly')==='1');if(url.pathname==='/api/picking')return json(res,200,context);
    const index=Number(url.searchParams.get('index')),mic=context.mics[index];if(!Number.isInteger(index)||!mic)throw Error('Invalid micrograph');
    if(url.pathname==='/api/picking-coordinates')return json(res,200,await pickerCoordinates(project,readRoots,job,mic));
    const image=await pickerImage(project,readRoots,mic,context.values);res.writeHead(200,{'Content-Type':'application/octet-stream','X-Image-Nx':image.nx,'X-Image-Ny':image.ny});res.end(image.output);return;
   }
   if(['/api/screening','/api/screening-image','/api/screening-script'].includes(url.pathname)){
    const job=url.searchParams.get('job'),j=await currentJob(job);
    if(j.type!==SCREENING)throw Error('Select a Screening job.');
    if(url.pathname==='/api/screening-script'){
     const file=await localPath(project,job+'copy_selected.sh');
     const text=await fs.readFile(file);res.writeHead(200,{'Content-Type':'text/plain; charset=utf-8','Content-Disposition':'attachment; filename="copy_selected.sh"'});res.end(text);return;
    }
    let manifest;
    try{manifest=await screeningManifest(project,job);}catch(e){
     if(e.code!=='ENOENT')throw e;
     if(url.pathname!=='/api/screening')throw Error('JPEG previews are not ready.');
     const progress=await fs.readFile(await localPath(project,job+'screening-progress.json'),'utf8').then(JSON.parse,()=>({message:'Preparing JPEG previews…'}));
     return json(res,200,{pending:true,status:j.status,message:progress.message});
    }
    if(url.pathname==='/api/screening'){
     const saved=await fs.readFile(await localPath(project,job+'selected.json'),'utf8').then(JSON.parse,e=>{if(e.code==='ENOENT')return null;throw e;});
     const committed=await fs.stat(await localPath(project,job+'SCREENING_SAVED')).then(()=>true,()=>false);
     const progress=await fs.readFile(await localPath(project,job+'screening-progress.json'),'utf8').then(JSON.parse,()=>null);
     const copied=await fs.readFile(await localPath(project,job+'screening-copy.json'),'utf8').then(JSON.parse,()=>null);
     return json(res,200,{...manifest,saved,progress,copied,writable:!readonly&&j.status==='Running'&&!committed,status:j.status});
    }
    const index=Number(url.searchParams.get('index'));if(!Number.isInteger(index)||!manifest.rows[index])throw Error('Invalid preview index.');
    const file=await readablePath(project,[],manifest.rows[index].jpeg),stat=await fs.stat(file);
    if(stat.size>32*1024*1024||!stat.isFile())throw Error('Invalid JPEG preview');
    res.writeHead(200,{'Content-Type':'image/jpeg','Content-Length':stat.size,'Cache-Control':'private, max-age=3600'});res.end(await fs.readFile(file));return;
   }
   if(url.pathname==='/api/selection'){
    const job=url.searchParams.get('job'),j=await currentJob(job);
    await fs.access(await jobFile(job,'RELIONDELUXE_BROWSER_SELECTION'));
    const data=await adapter.call(['job',job]);
    const snapshot=await selectionSnapshot(project,readRoots,data.values);snapshot.manifest=await classParticleCounts(snapshot.manifest);
    return json(res,200,{...snapshot,writable:!readonly&&j.status==='Running',job});
   }
   if(url.pathname==='/api/picking-counts'){const job=url.searchParams.get('job'),context=await pickingContext(job,url.searchParams.get('readonly')==='1');return json(res,200,{counts:await pickerCounts(project,readRoots,job,context)});}
   if(url.pathname==='/api/log-preview'){
    const snapshot=await pickerSnapshot(project,readRoots,{fn_in:url.searchParams.get('file'),angpix:'-1'});
    const mic=snapshot.mics.filter(m=>Number.isFinite(m.defocusU)).sort((a,b)=>b.defocusU-a.defocusU)[0];
    if(!mic)throw Error('No numeric rlnDefocusU values found in the input micrographs STAR.');
    const image=await pickerRawImage(project,readRoots,mic,2048,false);
    res.writeHead(200,{'Content-Type':'application/octet-stream','X-Input-Revision':snapshot.revision,'X-Image-Nx':String(image.nx),'X-Image-Ny':String(image.ny),'X-Pixel-Size':String(mic.pixel),'X-Defocus':String(mic.defocusU),'X-Micrograph':encodeURIComponent(mic.file)});res.end(image.output);return;
   }
   if(url.pathname==='/api/excluder'){
    if(url.searchParams.get('edit')==='1'){
     const job=url.searchParams.get('job'),context=await exclusionContext(job);
     return json(res,200,await exclusionView(context.manifest,name=>jobFile(job,name),context.writable));
    }
    return json(res,200,await exclusionView(await tiltManifest(project,readRoots,url.searchParams.get('file'))));
   }
   if(url.pathname==='/api/tomo-edit'){
    const job=url.searchParams.get('job'),context=await tomoEditingContext(job);
    return json(res,200,await readTomoEditor(name=>jobFile(job,name),context));
   }
   if(url.pathname==='/api/gallery'||url.pathname==='/api/gallery-image'){
    if(req.method!=='GET')return json(res,405,{error:'Method not allowed'});
    if(url.pathname==='/api/gallery'){
     let file=url.searchParams.get('file'),particles=null;
     const job=url.searchParams.get('job');
     if(url.searchParams.get('aligned')==='1'){
      if(!tomo||demo)throw Error('Aligned stacks require a native STA project');
      const current=await currentJob(job);if(current.type!==55)throw Error('Select an Align tilt-series job');
      const data=await adapter.call(['job',job]);
      return json(res,200,await alignedStackManifest(project,readRoots,job,data.values));
     }
     if(job&&tomo&&!demo){
      const data=await adapter.call(['job',job]);
      if(['Subset selection','Extract subtomos','3D classification'].includes(layout.find(l=>l.id===data.type)?.name)&&/(?:^|\/)particles\.star$/i.test(file)){
       particles=file;file=await resolveTomogramSource(project,readRoots,particles,job,adapter);
      }
      if(layout.find(l=>l.id===data.type)?.name==='Pick tomograms'){
       particles=job.replace(/\/?$/,'/')+'particles.star';
       if(/(?:^|\/)particles\.star$/i.test(file))file=data.values.in_tomoset||data.values.in_tomograms;
      }
     }
     const manifest=await classParticleCounts(await galleryManifest(project,readRoots,file,url.searchParams.has('class')?Number(url.searchParams.get('class')):null));
     if(particles&&manifest.imageColumns.some(c=>c.startsWith('rlnTomoReconstructed')||c==='rlnTomoDenoisedTomogram')){
      try{await attachTomogramParticles(project,readRoots,manifest,particles);}catch(e){manifest.overlayWarning='Particle crosses unavailable: '+e.message;}
     }
     return json(res,200,manifest);
    }
    const image=await galleryImage(project,readRoots,url.searchParams.get('file'),url.searchParams.get('full')==='1'?16384:512,url.searchParams.get('central')==='1',url.searchParams.get('axis')||'Z',false,url.searchParams.has('slice')?Number(url.searchParams.get('slice')):null);res.writeHead(200,{'Content-Type':'application/octet-stream','Content-Length':image.output.length,'X-Image-Scale':image.scale,'X-Volume-Geometry':JSON.stringify({dimensions:image.dimensions,voxelSize:image.voxelSize,slice:image.slice,axis:image.axis})});res.end(image.output);return;
   }
   if(url.pathname==='/api/refinement-thumbnail'){
    const name=url.searchParams.get('job'),job=await currentJob(name);
    if(layout.find(l=>l.id===job.type)?.name==='3D initial reference'){const data=await adapter.call(['job',name]);return json(res,200,await initialModelThumbnail(project,readRoots,name,url.searchParams.get('axis')||'Z',url.searchParams.has('slice')?Number(url.searchParams.get('slice')):null,Number(data.values.nr_classes)));}
    if(layout.find(l=>l.id===job.type)?.name==='3D classification'){
     const data=await adapter.call(['job',name]);
     return json(res,200,await classificationThumbnails(project,readRoots,name,url.searchParams.get('axis')||'Z',url.searchParams.has('slice')?Number(url.searchParams.get('slice')):null,Number(data.values.nr_classes),url.searchParams.has('iteration')?Number(url.searchParams.get('iteration')):null));
    }
    if(tomo&&layout.find(l=>l.id===job.type)?.name==='Reconstruct particle')return json(res,200,await reconstructionThumbnail(project,readRoots,name,url.searchParams.get('axis')||'Z',url.searchParams.has('slice')?Number(url.searchParams.get('slice')):null));
    if(layout.find(l=>l.id===job.type)?.name==='Mask creation')return json(res,200,await maskThumbnail(project,readRoots,name,url.searchParams.get('axis')||'Z',url.searchParams.has('slice')?Number(url.searchParams.get('slice')):null));
    if(layout.find(l=>l.id===job.type)?.name!=='3D auto-refine')throw Error('Select a 3D refinement or classification job.');
    return json(res,200,await refinementThumbnail(project,readRoots,name,url.searchParams.get('axis')||'Z',url.searchParams.has('slice')?Number(url.searchParams.get('slice')):null));
   }
   if(url.pathname==='/api/pdf'){
    if(req.method!=='GET')return json(res,405,{error:'Method not allowed'});
    const file=await readablePath(project,readRoots,url.searchParams.get('file'));
    if(!/\.pdf$/i.test(file))throw Error('Select a PDF file.');
    const handle=await fs.open(file,'r');
    try{const stat=await handle.stat();if(!stat.isFile())throw Error('Not a regular file');const signature=Buffer.alloc(5);await handle.read(signature,0,5,0);if(signature.toString()!=='%PDF-')throw Error('Invalid or incomplete PDF file');res.writeHead(200,{'Content-Type':'application/pdf','Content-Length':stat.size,'Cache-Control':'no-store'});await streamPipeline(handle.createReadStream({start:0}),res);}finally{await handle.close();}return;
   }
   if(url.pathname==='/api/map-download'){
    if(req.method!=='GET')return json(res,405,{error:'Method not allowed'});
    const file=await readablePath(project,readRoots,url.searchParams.get('file'));
    if(!/\.(mrc|map|cif|mmcif)$/i.test(file))throw Error('Only MRC/MAP/CIF downloads are supported.');
    const handle=await fs.open(file,'r');
    try{const stat=await handle.stat();if(!stat.isFile())throw Error('Not a regular file');res.writeHead(200,{'Content-Type':'application/octet-stream','Content-Length':stat.size,'Content-Disposition':"attachment; filename*=UTF-8''"+encodeURIComponent(path.basename(file))});await streamPipeline(handle.createReadStream({start:0}),res);}finally{await handle.close();}return;
   }
   if(url.pathname==='/api/map-angular-distribution'){
    const map=await readablePath(project,readRoots,url.searchParams.get('file'));
    for(const candidate of angularDistributionFiles(map)){let file;try{file=await readablePath(project,readRoots,candidate);}catch(e){if(e.code==='ENOENT')continue;throw e;}const st=await fs.stat(file);if(st.size>32*1024*1024)throw Error('Angular distribution exceeds 32 MiB');return json(res,200,{file:path.basename(file),cylinders:parseBild(await fs.readFile(file,'utf8'))});}
    return json(res,200,{file:null,cylinders:[]});
   }
   if(url.pathname==='/api/map-preview'){if(req.method!=='GET')return json(res,405,{error:'Method not allowed'});const input=url.searchParams.get('file'),snapshot=await hasProject()?await adapter.call(['state']):{jobs:[],nodes:[]},mask=isMaskPreview(project,input,snapshot,layout);const map=await openMapPreview(project,readRoots,input);res.writeHead(200,{'Content-Type':'application/octet-stream','Content-Length':map.size,'X-Relion-Map-Kind':mask?'mask':'density'});try{await streamPipeline(map.handle.createReadStream({start:0}),res);}catch{res.destroy();}return;}
   if(url.pathname==='/api/picking-filter-backups'){const job=url.searchParams.get('job');await pickingContext(job);return json(res,200,await particleBackups(project,job));}
   if(url.pathname==='/api/picking-micrograph-statistics'){const job=url.searchParams.get('job'),context=await pickingContext(job,url.searchParams.get('readonly')==='1'),index=Number(url.searchParams.get('index'));if(!Number.isInteger(index)||!context.mics[index])throw Error('Invalid micrograph');return json(res,200,await micrographStatistics(project,readRoots,context.mics[index]));}
   if(url.pathname==='/api/picking-statistics'){const job=url.searchParams.get('job'),context=await pickingContext(job);return json(res,200,await workerParticleStatistics(project,readRoots,job,context,Number(url.searchParams.get('index')),url.searchParams.get('diameter')));}
   if(url.pathname==='/api/executable-health')return json(res,200,await executableProbe(url.searchParams.get('key'),url.searchParams.get('value')||'',{cwd:project,force:url.searchParams.get('retry')==='1'}));
   if(url.pathname==='/api/config')return json(res,200,{nextJobs:await loadNextDefinitions(await nextJobRoot(ROOT,project,{seed:!demo&&!readonly&&await hasProject()}),tomo?'tomo':'spa',layout,catalog),version:releaseVersion,relionVersions,executionDefaults:await projectDefaults.read(),executionRevision:await projectDefaults.revision(),executionKeys,cluster,submissionScripts,detectedResources,denoiseDisabledReason,mode:tomo?'tomo':'spa',demo,readonly,debug,project:demo?(tomo?'STA tutorial · demonstration':'SPA tutorial · demonstration'):project,catalog,layout,provenance,initialized:await hasProject()});
   if(url.pathname==='/api/convergence'){const job=await currentJob(url.searchParams.get('job'));const name=layout.find(l=>l.id===job.type)?.name;if(!['2D classification','3D classification','3D auto-refine'].includes(name))throw Error('Select a classification or 3D auto-refine job.');return json(res,200,await convergence(project,readRoots,job.name,name==='2D classification'?'2d':name==='3D auto-refine'?'refine3d':'3d'));}
   if(url.pathname==='/api/extraction-inversion')return json(res,200,demo||tomo?{}:await extractionInversion(project,adapter,await adapter.call(['state']),url.searchParams.get('input'),layout.find(l=>l.name==='Auto-picking')?.id));
   if(url.pathname==='/api/sequential-defaults')return json(res,200,demo?{}:await sequentialDefaults(project,readRoots,await adapter.call(['state']),layout,catalog,Number(url.searchParams.get('type')),{convertGains:!readonly}));
   if(url.pathname==='/api/motion-gain-reference'){if(demo||readonly)throw Error('Gain conversion requires a writable native project.');return json(res,200,{path:await motionGainReference(project,readRoots,url.searchParams.get('file'))});}
   if(url.pathname==='/api/import-frames')return json(res,200,await importFrames(project,readRoots,url.searchParams.get('pattern')));
   if(url.pathname==='/api/import-match-count'){const pattern=url.searchParams.get('pattern');if(!pattern||pattern.length>16384)throw Error('Invalid wildcard');return json(res,200,{count:await countMatchingFiles(project,readRoots,pattern)});}
   if(url.pathname==='/api/mdoc-info'){
    const pattern=url.searchParams.get('pattern');
    if(!tomo||demo)return json(res,200,{files:0,fileNames:[],dose:null,doseValues:[],numSubFrames:null,numSubFrameValues:[]});
    try{
     const result=await mdocInfo(project,readRoots,pattern);
     if(debug)console.log(`[debug] .mdoc detection pattern=${JSON.stringify(pattern)} files=${result.files} doseValues=${JSON.stringify(result.doseValues)} acceptedDose=${result.dose===null?'none':result.dose} numSubFrames=${JSON.stringify(result.numSubFrameValues)} acceptedNumSubFrames=${result.numSubFrames===null?'none':result.numSubFrames}`);
     if(debug)console.log(`[debug] .mdoc detection files=${JSON.stringify(result.fileNames)}`);
     return json(res,200,result);
    }catch(error){if(debug)console.log(`[debug] .mdoc detection failed pattern=${JSON.stringify(pattern)} error=${error.message}`);throw error;}
   }
   if(url.pathname==='/api/check-input-path'){
    const value=url.searchParams.get('value')||'';
    if(!value||value==='None'||/[\*?\[\]]/.test(value))return json(res,200,{valid:null});
    if(url.searchParams.get('directory')==='yes')return json(res,200,{valid:await fs.stat(path.resolve(project,value)).then(s=>s.isDirectory(),()=>false),message:'Directory does not exist or is inaccessible.'});
    if(url.searchParams.get('executable')==='yes')return json(res,200,{valid:!!await resolveExecutable(value,{cwd:project}),message:'Executable not found or not executable.'});
    try{const file=await readablePath(project,readRoots,value);const st=await fs.stat(file);return json(res,200,{valid:st.isFile(),message:'Not a regular file.'});}catch(e){
     const state=await adapter.call(['state']);const normalized=value.replace(/^\.\//,'');
     if(state.jobs.some(j=>['Scheduled','Running'].includes(j.status)&&normalized.startsWith(j.name)))return json(res,200,{valid:null,message:'Input may be produced by a pending job.'});
     return json(res,200,{valid:false,message:'Input file is missing or inaccessible.'});
    }
   }
 if(url.pathname==='/api/dominant-input')return json(res,200,await dominantInput(project,readRoots,url.searchParams.get('file')));
   if(url.pathname==='/api/cli-options'){const job=layout.find(l=>String(l.id)===url.searchParams.get('type'));if(!job)throw Error('Unknown job type');return json(res,200,demo?{options:[],message:'Executable CLI help is available in native mode.'}:await executableOptions(helpProgram(job.name,tomo,url.searchParams.get('variant')),{cwd:project,env:adapter.env||process.env}));}
   if(url.pathname==='/api/executables')return json(res,200,{demo,programs:await Promise.all(relionPrograms.map(async name=>({name,path:demo?null:await resolveExecutable(name,{cwd:project})}))),bridge:demo?null:bridge});
   if(url.pathname==='/api/trash')return json(res,200,{entries:demo?adapter.trashEntries():await listTrash(project)});
   if(url.pathname==='/api/state')return json(res,200,await hasProject()?await decorateState(await adapter.call(['state'])):{jobs:[],nodes:[],counter:1});
   if(url.pathname==='/api/job'){const job=await currentJob(url.searchParams.get('name'));const data=await adapter.call(['job',url.searchParams.get('name')]);if(job.status==='Scheduled')data.values=await projectDefaults.forJob(url.searchParams.get('name'),data.values);return json(res,200,data);}
   if(url.pathname==='/api/log'){
    const name=url.searchParams.get('job'),kind=url.searchParams.get('kind');await currentJob(name);
    const file=({stdout:'run.out',stderr:'run.err',note:'note.txt',script:'run.job'})[kind];if(!file)throw new Error('Unknown log');
    if(demo)return json(res,200,{text:kind==='stderr'?'':`DEMONSTRATION ONLY\n${name}\nThis is simulated ${kind}. No RELION calculation has run.\n`,truncated:false});
    const logPath=await jobFile(name,file);const result=await readLog(logPath).catch(e=>{if(e.code==='ENOENT')return {text:'',truncated:false};throw e;});
    if(kind==='stdout'){const entries=await fs.readdir(path.dirname(logPath),{withFileTypes:true});const candidates=entries.filter(e=>(e.isFile()||e.isSymbolicLink())&&/^run_it\d+_(optimiser\.star|(?:half1_)?class001\.mrc)$/.test(e.name));result.iterationFiles=(await Promise.all(candidates.map(async e=>await fs.stat(path.join(path.dirname(logPath),e.name)).then(s=>s.isFile()?name+e.name:null,()=>null)))).filter(Boolean);}
    return json(res,200,result);
   }
   if(url.pathname==='/api/motion-output-defaults')return json(res,200,tomo?await motionOutputDefaults(project,adapter,await adapter.call(['state']),url.searchParams.get('input'),layout.find(l=>l.name==='Motion correction').id):{});
   if(url.pathname==='/api/motion-nyquist'){
    const input=url.searchParams.get('input'),state=await adapter.call(['state']),source=state.jobs.find(job=>(job.outputs||[]).includes(input));
    if(!source)return json(res,200,{nyquist:null});
    const values=(await adapter.call(['job',source.name])).values,pixel=Number(values.angpix);
    return json(res,200,{nyquist:Number.isFinite(pixel)&&pixel>0?2*pixel:null,source:source.name});
   }
   if(url.pathname==='/api/cryocare-training-defaults')return json(res,200,tomo&&!demo?await cryocareTrainingDefault({project,readRoots,input:url.searchParams.get('input')}):{value:''});
   if(url.pathname==='/api/ctf-power-spectra')return json(res,200,await ctfPowerSpectra(project,adapter,await adapter.call(['state']),url.searchParams.get('input'),layout.find(l=>l.name==='Motion correction').id));
   if(url.pathname==='/api/next-job-template'){
    const name=url.searchParams.get('job'),job=await currentJob(name);
    const root=await nextJobRoot(ROOT,project),file=url.searchParams.get('file'),mode=tomo?'tomo':'spa';
    const definition=await readNextDefinition(root,mode,job.type,file,layout,catalog);
    if(!definition.template)throw Error('This next-job definition is not a pipeline template.');
    if(definition.binding==='postprocess'){
     if(tomo)throw Error('Postprocess binding currently requires SPA.');
     const bound=await postprocessNext(adapter,layout,name,path.join(root,'SPA',nextJobDirectories[job.type],file));
     return json(res,200,{...definition,template:bound.template});
    }
    return json(res,200,definition);
   }
   if(url.pathname==='/api/postprocess-next'){if(tomo)throw Error('This sequence is for SPA projects.');return json(res,200,await postprocessNext(adapter,layout,url.searchParams.get('job'),path.join(ROOT,'templates/postprocess-refinement.json')));}
   if(url.pathname==='/api/mask-refinement'){
    const snapshot=await enrichJobInfo(await adapter.call(['state']));
    const target=snapshot.jobs.find(j=>j.name===url.searchParams.get('job'))?.maskRefinement;
    if(!target)throw Error('This mask must come from a finished 3D auto-refine job whose saved mask input is empty.');
    const file=await readablePath(project,readRoots,target.mask),stat=await fs.stat(file);
    if(!stat.isFile()||stat.size<1024)throw Error('The mask output is missing or incomplete.');
    return json(res,200,target);
   }
   if(url.pathname==='/api/mask-default'){
    const l=layout.find(l=>l.id===Number(url.searchParams.get('type')));
    if(!l||!['2D classification','3D classification','3D auto-refine'].includes(l.name))throw new Error('Mask default is not available for this job type');
    if(demo||tomo)return json(res,200,{diameter:null,reason:'Demo mode has no extraction STAR files to read.'});
    const snapshot=await adapter.call(['state']);
    const previous=await previousParticleDiameter(project,readRoots,snapshot,layout);if(previous)return json(res,200,previous);
    return json(res,200,await maskDefault(project,readRoots,adapter,snapshot,url.searchParams.get('input'),layout.find(l=>l.name==='Particle extraction').id));
   }
   if(url.pathname==='/api/inputs'){
    const field={...inputField(catalog,url.searchParams.get('type'),url.searchParams.get('field'))};
   const modelAngeloSequence=layout.find(l=>l.id===Number(url.searchParams.get('type')))?.name==='ModelAngelo building'&&modelAngeloSequences.has(field.key);
    field.requireMicrographMetadata=layout.find(l=>l.id===Number(url.searchParams.get('type')))?.name==='Bayesian polishing'&&field.key==='fn_mic';
    if(url.searchParams.get('mode')==='exotic'){
     const name=layout.find(l=>l.id===Number(url.searchParams.get('type')))?.name;
     return json(res,200,{...await exoticStarInputs(project,name,field,url.searchParams.get('path')||'.'),mode:'files'});
    }
    const query=(url.searchParams.get('q')||'').slice(0,256);
    if(field.key==='topaz_model'){
     const snapshot=await hasProject()?await adapter.call(['state']):{jobs:[],nodes:[]};
     return json(res,200,{...await topazModelInputs(project,readRoots,snapshot,{query}),mode:'compatible'});
    }
    if(field.key==='fn_cont'){
     const snapshot=await hasProject()?await adapter.call(['state']):{jobs:[],nodes:[]};
     return json(res,200,{...(demo?{entries:[],truncated:false}:await continuationInputs(project,readRoots,field,snapshot,Number(url.searchParams.get('type')),{query,job:url.searchParams.get('job')||'',iterationsOnly:url.searchParams.get('iterations')==='yes'})),mode:'compatible',demo});
    }
    if(modelAngeloSequence){
     if(demo)return json(res,200,{entries:['example.fasta','protein.fast','library.fa'].filter(name=>matchesPattern(name,field.pattern)).map(name=>({name,path:name,directory:false})),mode:'files',demo:true,truncated:false});
     return json(res,200,{...await filesystemInputs(project,readRoots,url.searchParams.get('path')||'.',field),mode:'files'});
    }
    if(field.type===3){
     const snapshot=await hasProject()?await adapter.call(['state']):{jobs:[],nodes:[]};
     if(demo){
      const group=nodeGroup(field);
      const entries=snapshot.nodes.filter(n=>n.type.split('.').slice(0,field.nodeDepth).join('.')===group&&matchesInputFile(path.basename(n.name),field)).map(n=>{
       const j=snapshot.jobs.find(j=>j.outputs.includes(n.name));
       return {name:path.basename(n.name),path:n.name,directory:false,job:j?.name||'',alias:j?.alias==='None'?j.name:j?.alias||'',status:j?.status||'',available:j?.status==='Succeeded'};
      }).filter(e=>(e.path+' '+e.alias).toLowerCase().includes(query.toLowerCase())&&(layout.find(l=>l.id===Number(url.searchParams.get('type')))?.name!=='ModelAngelo building'||field.key!=='fn_map'||modelAngeloMap(project,snapshot,e.path)));
      return json(res,200,{entries,mode:'compatible',demo:true,truncated:false});
     }
     return json(res,200,{...await compatibleInputs(project,readRoots,{...field,modelAngeloMapOnly:layout.find(l=>l.id===Number(url.searchParams.get('type')))?.name==='ModelAngelo building'&&field.key==='fn_map'},snapshot,{query}),mode:'compatible'});
    }
    if(demo)return json(res,200,{entries:['example.star','movie.tiff','gain.mrc','submit.sh'].filter(name=>matchesPattern(name,field.pattern)).map(name=>({name,path:name,directory:false})),mode:'files',demo:true,truncated:false});
    return json(res,200,{...await filesystemInputs(project,readRoots,url.searchParams.get('path')||'.',field),mode:'files'});
   }
   throw new Error('Unknown API route');
  }
  if(req.method!=='GET')return json(res,405,{error:'Method not allowed'});
  const files={'/local-resolution-color.js':'local-resolution-color.js','/alignment-cpu-default.js':'alignment-cpu-default.js','/ctf-preview.js':'ctf-preview.js','/probe-domain.js':'probe-domain.js','/sphere-fit.js':'sphere-fit.js','/excluder.html':'excluder.html','/excluder.js':'excluder.js','/excluder.css':'excluder.css','/next-job-definitions.js':'next-job-definitions.js','/sphere-probe.js':'sphere-probe.js','/tomo-edit-actions.js':'tomo-edit-actions.js','/support-menu.js':'support-menu.js','/tomo-supports.js':'tomo-supports.js','/tomo-editor.js':'tomo-editor.js','/tomo_pick.html':'tomo_pick.html','/tomo_pick.js':'tomo_pick.js','/tomo_pick.css':'tomo_pick.css','/tomo-view.js':'tomo-view.js','/slice-cache.js':'slice-cache.js','/tomogram-coordinates.js':'tomogram-coordinates.js','/pinned-drafts.js':'pinned-drafts.js','/executable-health.js':'executable-health.js','/subset-defaults.js':'subset-defaults.js','/input-sort.js':'input-sort.js','/draft-job.js':'draft-job.js','/cli-completion.js':'cli-completion.js','/workspace-feed.js':'workspace-feed.js','/log-preview.js':'log-preview.js','/tree-atlas.css':'tree-atlas.css','/tree-atlas.html':'tree-atlas.html','/tree-atlas.js':'tree-atlas.js','/':'index.html','/job-icons.js':'job-icons.js','/panel-widths.js':'panel-widths.js','/surface-budget.js':'surface-budget.js','/job-ports.js':'job-ports.js','/job-connections.js':'job-connections.js','/request-id.js':'request-id.js','/convergence.js':'convergence.js','/bild.js':'bild.js','/iteration-links.js':'iteration-links.js','/picking-geometry.js':'picking-geometry.js','/picker.html':'picker.html','/picker.js':'picker.js','/particle-quality.js':'particle-quality.js','/picker.css':'picker.css','/pdf-viewer.html':'pdf-viewer.html','/pdf-viewer.js':'pdf-viewer.js','/pdf-viewer.css':'pdf-viewer.css','/gallery.html':'gallery.html','/gallery.js':'gallery.js','/screening-gallery.js':'screening-gallery.js','/screening-selection.js':'screening-selection.js','/gallery.css':'gallery.css','/map-viewer.html':'map-viewer.html','/map-viewer.js':'map-viewer.js','/map-viewer.css':'map-viewer.css','/map-links.js':'map-links.js','/ideal-pipeline.js':'ideal-pipeline.js','/mask-viewer.js':'mask-viewer.js','/vendor/ngl.js':'vendor/ngl.js','/app.js':'app.js','/classification-controls.js':'classification-controls.js','/classification-gpu.js':'classification-gpu.js','/workstation-defaults.js':'workstation-defaults.js','/template-resources.js':'template-resources.js','/auto-picking-controls.js':'auto-picking-controls.js','/continuation-controls.js':'continuation-controls.js','/job-selection.js':'job-selection.js','/terminal-text.js':'terminal-text.js','/style.css':'style.css'};
  const file=files[url.pathname];if(!file)return json(res,404,{error:'Not found'});
  res.setHeader('Content-Type',({'html':'text/html','js':'text/javascript','css':'text/css'})[file.split('.').pop()]+'; charset=utf-8');res.end(await fs.readFile(path.join(ROOT,'public',file)));
 }catch(e){if(req.url?.split('?')[0]==='/api/display')console.warn('[Viewer] '+e.message);errors.push(e.message);json(res,400,{error:e.message});}
});
try{
if(!demo){
 const accept=args.includes('--accept-startup-warnings');
 console.log('Checking RELION executables in server PATH…');
 const check=await startupExecutableCheck({mode:tomo?'tomo':'spa',cwd:project});
 if(check.message){console.warn(check.message);await confirmStartup('Are you sure you want to continue without these executables?',{accept,details:check.message});}
 else console.log('RELION executable PATH check passed.');
 console.log('Checking project symbolic links…');
 const warnings=await projectLinkWarnings(project,readRoots);
 if(warnings.length){console.warn(linkWarningText(warnings));await confirmStartup('Proceed without access to these linked files?',{accept,details:linkWarningText(warnings)});}
}
port=await listenWithPortPrompt(server,port,host);

 let interfaces=[];
 if(host==='0.0.0.0')try{interfaces=Object.values(networkInterfaces()).flat().filter(n=>n?.family==='IPv4').map(n=>n.address);}catch{console.warn('Cannot enumerate network interfaces. For LAN access, replace 127.0.0.1 in the token URL with this workstation’s LAN IPv4 address.');}
 const addresses=host==='0.0.0.0'?[...new Set(['127.0.0.1',...interfaces])]:[host];
 console.log(`RelionDeLuxe ${demo?'DEMO — no computation':readonly?'READ ONLY':'NATIVE'}\nListening on ${host}:${port}\n${addresses.map(address=>`http://${address}:${port}/#token=${token}`).join('\n')}\nProject: ${project}\nKeep this URL private. Ctrl+C stops the web server, not native RELION jobs.`);
try{await openLocalBrowser('http://'+(host==='0.0.0.0'?'127.0.0.1':host)+':'+port+'/#token='+token,{disabled:args.includes('--no-browser')});}catch{console.warn('Could not launch the browser. Open the printed token URL manually.');}
}catch(e){console.error(e.message);process.exitCode=1;}
