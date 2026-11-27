import {mountCtfPreview,ctfPreviewSession,ctfPreviewTabs} from './ctf-preview.js';
import {alignmentCpuDefault} from './alignment-cpu-default.js';
let disposeCtfPreview,ctfSession=ctfPreviewSession();
import {nextCondition,nextContext,nextJobTypeIds} from './next-job-definitions.js';
import {mountPinnedDrafts} from './pinned-drafts.js';
import {healthKeys,healthBlock,healthImpact} from './executable-health.js';
import {classSelectionDefaults} from './subset-defaults.js';
import {sortInputCandidates,candidateJobType,referenceResolution,referenceSamplingDefault,referenceGreyscaleDefault} from './input-sort.js';
import {draftJob,DRAFT_JOB} from './draft-job.js';
import {attachCliCompletion} from './cli-completion.js';
import {motionSplitDefault,canContinueAutopick,connectionNavigation,nextJobSource,suggestedNextJob,nextJobInputs,createWorkspaceFeed,comparePipelineJobs,centerPipelineRow} from './workspace-feed.js';
const workspaceId=new URLSearchParams(location.search).get('workspace');
const pinnedId=new URLSearchParams(location.search).get('pin');
let treeFrame=null,treeMode=false;
let pinnedSeed=null,pinnedTbd=new Set();
const embeddedWorkspace=!!workspaceId&&window.parent!==window;
let seededInputFields=[],copiedDraft=false,nextJobButton,nextSubsetButton,nextManualButton,nextMaskButton,nextSeriesButton,nextJobPrompt,workspaceFeed,workspaceVisible=true,workspaceReady=false,workspaceMissing=false;
if(embeddedWorkspace)document.documentElement.classList.add('embedded-workspace');
let initialLoading=embeddedWorkspace,initialRequests=0;
const loadingNotice=document.createElement('div');
loadingNotice.className='workspace-loading';loadingNotice.setAttribute('role','status');loadingNotice.textContent='Loading...';
if(initialLoading){document.body.append(loadingNotice);document.querySelector('main').inert=true;document.querySelector('main').setAttribute('aria-busy','true');}
async function finishInitialLoading(){
 // Let response handlers and any dependent requests finish before enabling edits.
 while(initialLoading){await new Promise(resolve=>setTimeout(resolve,0));if(initialRequests===0)break;}
 initialLoading=false;loadingNotice.remove();document.querySelector('main').inert=false;document.querySelector('main').removeAttribute('aria-busy');
}

function workspaceSnapshot(){return {seededInputFields:[...seededInputFields],copiedDraft,type,selected,selectedIsContinuation,values:pinnedId?Object.fromEntries(Object.entries(values).map(([k,v])=>[k,pinnedTbd.has(k)?'TBD':v])):{...values},tab,alias:$('#alias').value,title:config.layout.find(l=>l.id===type)?.name||'Job',defaults:[...savedJobDefaults]};}
function workspaceChanged(){if(embeddedWorkspace&&workspaceReady){if(pinnedId)window.parent.relionPinChanged?.(pinnedId,workspaceSnapshot());else window.parent.relionFeedChanged?.(workspaceId,workspaceSnapshot());}}
import {mountLogPreview} from './log-preview.js';
let disposeLogPreview;
const inspectedSavedModes=new Map();
import {jobTypeIcon} from './job-icons.js';
import {setupPanelWidths} from './panel-widths.js';
import {nodeSymbol,inputSymbol,appendPorts,portLegend,potentialConnection,setupPortColumns} from './job-ports.js';
function setupRightTabs(){
 const stack=document.querySelector('.pipeline-stack');document.body.append(stack);stack.classList.add('tabbed-pipelines');
 const bar=document.createElement('div');bar.className='pipeline-tabbar';bar.setAttribute('role','tablist');
 const panels=[stack.querySelector('.pipeline'),stack.querySelector('.ideal-panel')];
 const buttons=['Pipeline','Idealized pipeline'].map((label,i)=>{const b=document.createElement('button');b.textContent=label;b.setAttribute('role','tab');b.id='pipeline-tab-'+i;panels[i].id='pipeline-page-'+i;panels[i].setAttribute('role','tabpanel');panels[i].setAttribute('aria-labelledby',b.id);b.setAttribute('aria-controls',panels[i].id);b.onclick=()=>{panels.forEach((p,j)=>{p.hidden=i!==j;buttons[j].setAttribute('aria-selected',String(i===j));buttons[j].tabIndex=i===j?0:-1;});};b.onkeydown=e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();buttons[1-i].click();buttons[1-i].focus();}};bar.append(b);return b;});stack.prepend(bar);buttons[0].click();
}
setupRightTabs();
const fullHeightSidebar=document.querySelector('.sidebar');document.body.append(fullHeightSidebar);fullHeightSidebar.classList.add('full-height-sidebar');setupPanelWidths();
function enforceSetupGate(){
 if(!config)return;const locked=config.initialized&&!config.demo&&!config.readonly&&!config.executionRevision;
 for(const element of document.querySelectorAll('main,.projectbar,.pipeline-stack,.full-height-sidebar,.topbar .brand,.topbar .top-right'))element.inert=locked;
 document.body.classList.toggle('needs-execution-setup',locked);
 let hint=document.querySelector('#execution-setup-hint');if(!hint){hint=document.createElement('div');hint.id='execution-setup-hint';hint.setAttribute('role','status');hint.textContent='↑ Start here: review and save your workstation / cluster defaults.';document.querySelector('.execution-settings').append(hint);}hint.hidden=!locked;
}
import {jobConnections,hierarchyConnections,renderJobConnections,pipelineJobNumber,nextConnectionFocus} from './job-connections.js';
import {normalizeClassification,showClassificationField,ctfAlwaysOn} from './classification-controls.js';
import {workstationDefaults,topazTrainingGpu,pickingGpu,polishingTrainingResources} from './workstation-defaults.js';
import {classificationAlignmentGpu} from './classification-gpu.js';
import {drawConvergence,classColor} from './convergence.js';
import {iterationLogParts} from './iteration-links.js';
import {isMapNode,mapViewerURL,downloadMap} from './map-links.js';
import {alignmentMethods,selectAlignmentMethod,showAlignmentField,topazModes,selectTopazMode,pickingTabEnabled,showTopazMode,importMethods,selectImportMethod,showImportField,localResolutionMethods,selectLocalResolutionMethod,pickingMethodsFor,selectPickingMethod,isContinuation,showPickingField} from './auto-picking-controls.js';
import {mountIdealPipeline} from './ideal-pipeline.js';
import {mountMaskViewer} from './mask-viewer.js';
let disposeMaskViewer;
import {increaseContinuationIterations,halfFields,continuationTools,iterationKey,halfValue} from './continuation-controls.js';
import {selectRows,navigateRows,trashTargets} from './job-selection.js';
import {terminalText} from './terminal-text.js';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
const fragment=new URLSearchParams(location.hash.slice(1));
if(fragment.get('token')){sessionStorage.setItem('relion-token',fragment.get('token'));history.replaceState(null,'',location.pathname);}
const token=sessionStorage.getItem('relion-token')||'';
let config,state={jobs:[],nodes:[]},type,values={},tab,selected=null,logKind='stdout',busy=false,loadSerial=0,polling=false;
let completedJobs=new Set(),completionKey='';
let selectedIsContinuation=false;
let markedJobs=new Set(),selectionAnchor=null,jobCursor=null,fullConnectionJob=null;
let refreshPaused=sessionStorage.getItem('relion-refresh-paused')==='true',refreshGeneration=0;
const jobSectionHorizontalScroll=new Map();
const savedJobDefaults=new Map();
const selectionKey=()=>'relion-last-selection:'+config.project;
function rememberSelection(){if(embeddedWorkspace)return;try{localStorage.setItem(selectionKey(),JSON.stringify({type,job:selected}));}catch{}}
const drafts=new Map();let toastTimer;
function notify(text,error=false){clearTimeout(toastTimer);$('#message').textContent=text;$('#message').className=error?'error':'';$('#message').hidden=false;toastTimer=setTimeout(()=>$('#message').hidden=true,error?15000:6000);}
function requestId(){const b=crypto.getRandomValues(new Uint8Array(16));b[6]=(b[6]&15)|64;b[8]=(b[8]&63)|128;const h=Array.from(b,x=>x.toString(16).padStart(2,'0')).join('');return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;}
async function api(route,data){const tracked=initialLoading;if(tracked)initialRequests++;try{const response=await fetch('/api/'+route,{method:data===undefined?'GET':'POST',headers:{'X-Relion-Token':token,...(data===undefined?{}:{'Content-Type':'application/json','X-Request-ID':requestId()})},body:data===undefined?undefined:JSON.stringify(data)});const result=await response.json();if(!response.ok)throw Error(result.error||'Request failed');return result;}finally{if(tracked)initialRequests--;}}
async function task(fn){if(busy)return;busy=true;workspaceFeed?.lock(true);if(embeddedWorkspace)window.parent.relionFeedBusy?.(workspaceId,true);document.body.classList.add('busy');setButtons();try{return await fn();}catch(e){notify(e.message,true);}finally{busy=false;workspaceFeed?.lock(false);document.body.classList.remove('busy');setButtons();workspaceChanged();if(embeddedWorkspace)window.parent.relionFeedBusy?.(workspaceId,false);}}
let frameRevision=0;
const detectedFrames=new Map(),detectedFrameHints=new Map();
function importFrameFields(){return currentLayout().name==='Import tilt series'?{pattern:'movie_files',flag:'images_are_motion_corrected'}:{pattern:'fn_in_raw',flag:'is_multiframe'};}
const frameRequests=new Map();
const mdocRequests=new Map(),mdocResults=new Map();
async function showFrameHint(){
 const {pattern:patternKey,flag}=importFrameFields(),pattern=values[patternKey],input=$('#f-'+flag),jobType=type;
 if(!input||!pattern||selected||disabledField(flag)||!['Import','Import tilt series'].includes(currentLayout().name)||(detectedFrameHints.has(pattern)&&!(currentLayout().name==='Import tilt series'&&values.mdoc_files&&!mdocResults.has(values.mdoc_files))))return;
 const request=++frameRevision;
 const hint=$('#inline-frame-hint');if(hint)hint.textContent='Calculating…';
 let pending=frameRequests.get(pattern);if(!pending){pending=api('import-frames?'+new URLSearchParams({pattern})).catch(e=>({hint:'Could not estimate frames: '+e.message}));frameRequests.set(pattern,pending);}
 const result=await pending;
 if(request!==frameRevision||type!==jobType||values[patternKey]!==pattern||!input.isConnected)return;
 if(Number.isInteger(result.frames)&&result.frames>0){const yes=flag==='is_multiframe'?result.frames>1:result.frames===1;input.value=yes?'Yes':'No';detectedFrames.set(pattern,input.value);input.oninput?.();}
 let mdoc=null;
 if(currentLayout().name==='Import tilt series'&&values.mdoc_files){let mp=mdocRequests.get(values.mdoc_files);if(!mp){mp=api('mdoc-info?'+new URLSearchParams({pattern:values.mdoc_files})).catch(e=>({error:e.message}));mdocRequests.set(values.mdoc_files,mp);}mdoc=await mp;if(values.mdoc_files&&mdoc&&!mdoc.error)mdocResults.set(values.mdoc_files,mdoc);}
 let text=result.frames?result.frames+' frame'+(result.frames===1?'':'s')+' detected':'Detection unavailable',title=result.file?'Based on '+result.file+(flag==='images_are_motion_corrected'?' — single-frame inputs are treated as motion-corrected images; frame count alone does not verify prior motion correction.':''):result.hint;
 if(mdoc?.numSubFrameValues?.length>1){text+=' · Warning: .mdoc files disagree on NumSubFrames ('+mdoc.numSubFrameValues.join(', ')+')';title+=' The .mdoc files report different frame counts.';}
 else if(mdoc?.numSubFrames&&Number.isInteger(result.frames)&&mdoc.numSubFrames!==result.frames){text+=' · Warning: .mdoc NumSubFrames='+mdoc.numSubFrames+' disagrees with detected '+result.frames+' frame'+(result.frames===1?'':'s');title+=' The .mdoc metadata and image frame count disagree.';}
 detectedFrameHints.set(pattern,{text,title});syncDisabled();
if(Number.isFinite(mdoc?.dose)&&!(typeof editedInputDefaults!=='undefined'&&editedInputDefaults.get(type)?.has('dose_rate'))){const dose=$('#f-dose_rate'),defaultDose=schema().options.find(f=>f.key==='dose_rate')?.default;if(!values.dose_rate||values.dose_rate===defaultDose){values.dose_rate=String(mdoc.dose);if(dose)dose.value=values.dose_rate;drafts.set(type,{...values});}}
}
const importCounts=new Map(),importCountRequests=new Map();
function watchImportPattern(input,key){
 let hint;
 if(['fn_in_raw','movie_files','mdoc_files'].includes(key)){const shell=el('span',undefined,'input-hint-shell');input.before(shell);shell.append(input);}
 const allowed=()=>['fn_in_raw','movie_files','mdoc_files'].includes(key)||values.node_type==='Particle coordinates (*.box, *_pick.star)';
 const show=()=>{hint?.remove();if(!allowed()||!/[?*\[{]/.test(input.value))return;const result=importCounts.get(input.value);if(!result)return;if(['fn_in_raw','movie_files','mdoc_files'].includes(key)){hint=el('span',result,'input-match-hint');hint.setAttribute('role','status');input.parentElement.append(hint);input.style.paddingRight=Math.min(180,result.length*7+16)+'px';return;}hint=el('div',result,'path-warning wildcard-hint');hint.setAttribute('role','status');input.parentElement.append(hint);if(hint.showPopover){hint.setAttribute('popover','manual');hint.showPopover();}const r=input.getBoundingClientRect();hint.style.left=Math.max(8,Math.min(r.left,innerWidth-hint.getBoundingClientRect().width-8))+'px';hint.style.top=Math.max(8,Math.min(r.bottom+6,innerHeight-hint.getBoundingClientRect().height-8))+'px';};
 input.addEventListener('input',()=>{hint?.remove();input.style.paddingRight='';});
 if(!['fn_in_raw','movie_files','mdoc_files'].includes(key))input.addEventListener('blur',()=>hint?.remove());
 input.addEventListener('focus',show);show();
 const redrawWhenReady=(pattern,request)=>request.then(()=>{if(input.isConnected&&input.value===pattern)show();});
 if(importCountRequests.has(input.value))redrawWhenReady(input.value,importCountRequests.get(input.value));
 input.addEventListener('change',()=>{
  hint?.remove();const pattern=input.value;if(!config?.initialized||!allowed()||!/[?*\[{]/.test(pattern))return;
  let request=importCountRequests.get(pattern);
  if(!request){
   importCounts.set(pattern,'Calculating…');
   request=api('import-match-count?'+new URLSearchParams({pattern}))
    .then(r=>importCounts.set(pattern,r.count+' matching file'+(r.count===1?'':'s')))
    .catch(e=>importCounts.set(pattern,'Could not count files: '+e.message))
    .finally(()=>importCountRequests.delete(pattern));
   importCountRequests.set(pattern,request);
  }
  show();redrawWhenReady(pattern,request);
 });
 if(!importCounts.has(input.value)&&!importCountRequests.has(input.value))input.dispatchEvent(new Event('change'));
}
function watchPath(input,container,executable=false,directory=false){
 let previous=input.value===''?'':null,serial=0;
 const check=value=>!config?.initialized||(pinnedId&&/\$\{pin\d+\}/.test(value))?Promise.resolve({valid:null}):api('check-input-path?'+new URLSearchParams({value,executable:executable?'yes':'no',directory:directory?'yes':'no'}));
 const initial=input.value;check(initial).then(r=>{if(r.valid&&previous===null)previous=initial;}).catch(()=>{});
 input.addEventListener('change',async()=>{
  const value=input.value,request=++serial;container.querySelector('.path-warning')?.remove();
  try{const result=await check(value);if(request!==serial||!input.isConnected||input.value!==value)return;
   if(result.valid||value===''){previous=value;return;}if(result.valid!==false)return;
   const warning=el('div',result.message,'path-warning');warning.setAttribute('role','alert');
   if(previous!==null){const restore=el('button',previous===''?'Restore empty field':'Restore previous valid path');restore.type='button';restore.onclick=async()=>{try{const r=previous===''?{valid:true}:await check(previous);if(!r.valid){warning.textContent='The previous path is no longer valid.';return;}input.value=previous;input.dispatchEvent(new Event('input',{bubbles:true}));++serial;warning.remove();}catch(e){warning.textContent=e.message;}};warning.append(restore);}
   const dismiss=el('button','×','path-warning-close');dismiss.type='button';dismiss.setAttribute('aria-label','Dismiss path warning');dismiss.onclick=()=>warning.remove();warning.append(dismiss);container.append(warning);
   // The browser top layer escapes scrolling panels and tab stacking contexts.
   if(warning.showPopover){warning.setAttribute('popover','manual');warning.showPopover();}
   const rect=input.getBoundingClientRect(),height=warning.getBoundingClientRect().height;
   warning.style.left=Math.max(8,Math.min(rect.left,innerWidth-warning.getBoundingClientRect().width-8))+'px';
   warning.style.top=Math.max(8,Math.min(rect.bottom+6,innerHeight-height-8))+'px';
  }catch(e){if(config?.initialized&&input.isConnected)notify('Could not check path: '+e.message,true);}
 });
}
document.addEventListener('scroll',()=>document.querySelectorAll('.path-warning').forEach(w=>w.remove()),true);
window.addEventListener('resize',()=>document.querySelectorAll('.path-warning').forEach(w=>w.remove()));
let dialogResize;
function modal(title,content,actions=[]){const required=title==='Initialize RELION project';$('#dialog-close').hidden=required;$('#dialog').dataset.required=String(required);$('#dialog').setAttribute('closedby',required?'none':'closerequest');dialogResize?.disconnect();$('#dialog-top-save')?.remove();$('#dialog-title').textContent=title;$('#dialog-body').replaceChildren(typeof content==='string'?el('div',content):content);$('#dialog-actions').replaceChildren();for(const {label,run,primary} of actions){const b=el('button',label,primary?'primary':'');b.onclick=async()=>{b.disabled=true;try{await run();}catch(e){let error=$('.dialog-error');if(!error){error=el('div','', 'dialog-error');$('#dialog-body').append(error);}error.textContent=e.message;}finally{b.disabled=false;}};$('#dialog-actions').append(b);}if(!$('#dialog').open)$('#dialog').showModal();if(['Workstation defaults','Cluster defaults'].includes(title)&&actions.length){const top=el('button','Save project defaults','primary');top.id='dialog-top-save';top.onclick=()=>$('#dialog-actions button').click();$('#dialog-close').before(top);const update=()=>{top.hidden=$('#dialog').scrollHeight<=$('#dialog').clientHeight;};dialogResize=new ResizeObserver(update);dialogResize.observe($('#dialog'));dialogResize.observe($('#dialog-body'));requestAnimationFrame(update);}}
$('#dialog-close').onclick=()=>{if($('#dialog').dataset.required!=='true')$('#dialog').close();};
$('#dialog').addEventListener('cancel',e=>{if($('#dialog').dataset.required==='true')e.preventDefault();});
for(const event of ['keydown','keyup'])window.addEventListener(event,e=>{if(e.key==='Escape'&&$('#dialog').open&&$('#dialog').dataset.required==='true'){e.preventDefault();e.stopImmediatePropagation();}},true);
$('#dialog').addEventListener('close',()=>{if($('#dialog').dataset.required==='true'&&config&&!config.initialized)queueMicrotask(()=>{if(!$('#dialog').open&&!config.initialized)$('#dialog').showModal();});});
function info(){modal('RelionDeLuxe · '+(config?.version||'unknown'),`${config?.mode==='tomo'?'STA tomography':'SPA'} control console for RELION 5.0 / 5.1.\n\n${config?.mode==='tomo'?'24 native STA job types are included. Tilt exclusion, tomogram picking and interactive Subset selection use workstation tools in this first implementation.':'All 22 official SPA types, the 3D initial helical reference add-on and Screening are included.'} Parameter definitions come from the official source; native mode loads them from the compiled adapter, including environment defaults.\n\nLive mode delegates command generation, execution, scheduling and pipeline updates to RELION. Native picking and image viewers still open on the workstation desktop.\n\nNot yet full FLTK parity: overwrite mode, Schemes, concrete pipeline export/import and specialized display dialogs are not implemented. Some conditional widget behavior needs workstation comparison.\n\n${config?.demo?'DEMO MODE: all pipeline data and job transitions are simulated. Nothing is computed or saved.':'NATIVE MODE: actions operate on the selected workstation project.'}\n\nRELION bridge: ${config?.relionVersions?.bridge||'unknown'}; runtime: ${config?.relionVersions?.runtime||'unknown'}.\nBundled demo metadata revision: ${config?.provenance.commit}\nIndependent add-on; not an official RELION release.`);}
$('#about').onclick=info;
const savedTheme=localStorage.getItem('relion-theme')||'light';const theme=savedTheme==='samba'?'brazil':savedTheme;document.documentElement.dataset.theme=['light','dark','brazil','france'].includes(theme)?theme:'light';localStorage.setItem('relion-theme',document.documentElement.dataset.theme);$('#theme').value=document.documentElement.dataset.theme;$('#theme').onchange=e=>{document.documentElement.dataset.theme=e.target.value;localStorage.setItem('relion-theme',e.target.value);workspaceFeed?.theme();};
function currentLayout(){return config.layout.find(x=>x.id===type);}function schema(){return config.catalog.find(x=>x.id===type);}function current(){return state.jobs.find(x=>x.name===selected);}
function showContinuationTools(){return continuationTools(currentLayout(),current(),completedJobs);}
function rememberCompletions(){
 let changed=false;for(const job of state.jobs)if(job.status==='Succeeded'&&!completedJobs.has(job.name)){completedJobs.add(job.name);changed=true;}
 if(changed&&completionKey)try{localStorage.setItem(completionKey,JSON.stringify([...completedJobs]));}catch{}
}
const manualMasks=new Map(),maskNotes=new Map();let maskRevision=0,maskTimer;
function showMaskNote(){
 const row=document.querySelector('.field[data-key="particle_diameter"]');if(!row)return;
 row.querySelector('.mask-default-note')?.remove();
 const note=!selected&&maskNotes.get(type);if(note)row.append(el('small',note,'mask-default-note'));
}
async function applyMaskDefault(){
 if(copiedDraft||config.mode==='tomo'||selected||config.readonly||manualMasks.get(type)===values.fn_img||!['2D classification','3D classification','3D auto-refine'].includes(currentLayout().name)||!values.fn_img)return;
 const request=++maskRevision,jobType=type,input=values.fn_img,old=values.particle_diameter,serial=loadSerial;
 try{
  const result=await api('mask-default?'+new URLSearchParams({type:String(jobType),input}));
  if(request!==maskRevision||serial!==loadSerial||selected||type!==jobType||values.fn_img!==input||manualMasks.get(type)===values.fn_img||values.particle_diameter!==old)return;
  if(result.diameter!==null){values.particle_diameter=result.diameter;drafts.set(type,{...values});const control=$('#f-particle_diameter');if(control)control.value=result.diameter;
   maskNotes.set(type,result.sourceJob?'Default particle diameter from '+result.sourceJob:'Default = pixel size × (box size − 4), from '+result.sources.map(s=>s.file).join(', '));
  }else maskNotes.set(type,result.reason);
  showMaskNote();applyAngularSamplingDefault();
 }catch(e){if(request===maskRevision&&serial===loadSerial&&!selected&&type===jobType){maskNotes.set(type,'Could not calculate mask default: '+e.message);showMaskNote();}}
}
const sequentialRequests=new Map(),editedInputDefaults=new Map();
async function applySequentialDefaults(){
 if(pinnedId||copiedDraft||workspaceFeed||busy||selected||!config?.initialized||(currentLayout().name==='Import'&&values.do_raw!=='Yes'))return;
 const jobType=type,editor=values,serial=loadSerial,defaults=newDefaults(type);
 const key=jobType+':'+JSON.stringify(state.jobs.map(j=>[j.name,j.type,j.status,j.outputs]));
 let promise=sequentialRequests.get(key);if(!promise){promise=api('sequential-defaults?type='+jobType);sequentialRequests.clear();sequentialRequests.set(key,promise);}
 try{const proposed=await promise;if(busy||selected||type!==jobType||values!==editor||serial!==loadSerial||(currentLayout().name==='Import'&&values.do_raw!=='Yes'))return;let changed=false;
 const exclusive=currentLayout().name==='Subset selection'?['fn_model','fn_mic','fn_data']:[];
 const exclusiveEdited=exclusive.some(k=>seededInputFields.includes(k)||editedInputDefaults.get(jobType)?.has(k));
 for(const [field,value] of Object.entries(proposed)){
 if(exclusive.includes(field)){if(exclusiveEdited)continue;if(values[field]!==value){values[field]=value;changed=true;}continue;}
if(field==='fn_gain_ref'&&values[field]?.trim())continue;
 if(((field==='fn_map'&&currentLayout().name==='ModelAngelo building')||(field==='in_tiltseries'&&currentLayout().name==='Exclude tilt-images'))&&!seededInputFields.includes(field)&&!editedInputDefaults.get(jobType)?.has(field)){if(values[field]!==value){values[field]=value;changed=true;}continue;}
 if(field==='is_multiframe'||seededInputFields.includes(field)||editedInputDefaults.get(jobType)?.has(field))continue;
 if(field!=='particle_diameter'&&!((currentLayout().name==='Bayesian polishing'&&['fn_mic','opt_params'].includes(field))||(currentLayout().name==='CTF estimation'&&field==='input_star_mics'))&&values[field]!==defaults[field]&&values[field]!=='')continue;if(values[field]===value)continue;
 values[field]=value;changed=true;if(field==='fn_in_raw'&&proposed.is_multiframe){values.is_multiframe=proposed.is_multiframe;detectedFrames.set(value,proposed.is_multiframe);}}
 if(changed){classSelectionDefaults(currentLayout(),schema(),values);drafts.set(type,{...values});renderEditor();applyMaskDefault();workspaceChanged();}
 }catch(e){sequentialRequests.delete(key);console.warn('Input default suggestion:',e.message);}
}
let extractionRequest=0;
async function applyExtractionInversion(){
 const request=++extractionRequest;
 if(copiedDraft||selected||!config?.initialized||currentLayout().name!=='Particle extraction'||!values.coords_suffix||editedInputDefaults.get(type)?.has('do_invert'))return;
 const input=values.coords_suffix,editor=values;
 try{const proposed=await api('extraction-inversion?'+new URLSearchParams({input}));
 if(request!==extractionRequest||copiedDraft||selected||values!==editor||values.coords_suffix!==input||editedInputDefaults.get(type)?.has('do_invert'))return;
 if(proposed.do_invert==='No'){values.do_invert='No';const field=$('#f-do_invert');if(field)field.value='No';drafts.set(type,{...values});workspaceChanged();}
 }catch(e){console.warn('Extraction inversion default:',e.message);}
}
function submissionChoices(input){
 if(!config.cluster)return;
 const id=input.id+'-choices';
 document.getElementById(id)?.remove();
 const list=el('datalist');list.id=id;
 for(const value of config.submissionScripts||[]){const option=el('option');option.value=value;list.append(option);}
 input.setAttribute('list',id);input.after(list);
}
function newDefaults(t){const l=config.layout.find(x=>x.id===t),schema=config.catalog.find(s=>s.id===t);const defaults={...Object.fromEntries(schema.options.map(f=>[f.key,f.default])),...l.overrides,...(savedJobDefaults.get(t)||{})};if(['Import','Import tilt series'].includes(l.name))defaults.angpix='';if(l.name==='Motion correction'&&schema.options.some(f=>f.key==='dose_per_frame'))defaults.dose_per_frame='';if('fn_cont' in defaults)defaults.fn_cont='';if('continue_manual' in defaults)defaults.continue_manual='No';alignmentCpuDefault(l,defaults,config.executionDefaults,config.cluster);return classSelectionDefaults(l,schema,{...defaults,...workstationDefaults(l,schema,defaults,config.executionDefaults||{})});}
function applyWorkstation(t,v){Object.assign(v,workstationDefaults(config.layout.find(l=>l.id===t),config.catalog.find(s=>s.id===t),v,config.executionDefaults||{}));}

function attachExecutableCheck(input,row,key){
 const icon=el('button','…','executable-check');icon.type='button';icon.setAttribute('aria-label','Test executable');row.append(icon);row.classList.add('has-executable-check');let serial=0,timer;
 const run=async retry=>{const current=++serial,value=input.value;icon.textContent='…';icon.dataset.status='pending';icon.title='Testing executable…';try{const r=await api('executable-health?'+new URLSearchParams({key,value,...(retry?{retry:'1'}:{})}));if(current!==serial||input.value!==value)return;icon.textContent=r.status==='pass'?'✓':r.status==='fail'?'✕':'?';icon.dataset.status=r.status;icon.title=r.message+(r.status==='fail'?'\n'+healthImpact(key):'')+(r.detail?'\n'+r.detail:'')+'\nClick to test again.';}catch(e){if(current===serial){icon.textContent='?';icon.dataset.status='unknown';icon.title=e.message;}}};
 input.addEventListener('input',()=>{++serial;clearTimeout(timer);icon.textContent='…';icon.dataset.status='pending';timer=setTimeout(()=>run(false),600);});icon.onclick=()=>run(true);run(false);
}
function executableTabEnabled(layout,values,name){return pickingTabEnabled(layout,values,name)&&!(layout.name==='Align tilt-series'&&['IMOD','AreTomo2'].includes(name)&&healthBlock(layout.name,state.executableHealth,name));}
$('#execution-defaults').onclick=()=>{
 const body=el('div');body.append(el('p','Save computing settings for all future runs and continuations. This replaces earlier Running settings; you can then change individual job fields before submitting.'));
 const controls={};
 for(const key of config.executionKeys){
  if(!config.cluster&&['do_queue','queuename','qsub','qsubscript','min_dedicated'].includes(key))continue;
  const resourceFields={globalNgpus:{label:'Number of GPUs to use:',default:'1',help:'Used by job-specific computing defaults for new jobs and template batches.'},globalNcpus:{label:'Number of CPUs to use:',default:'1',help:'CPU budget used by the job-specific resource rules.'},gpu_ids:{label:'Which GPUs to use:',default:'',help:'GPU numbers, for example 0:1. Use as many distinct IDs as Number of GPUs, or leave blank for automatic GPU selection.'}};const f=resourceFields[key]||config.catalog.flatMap(s=>s.options).find(f=>f.key===key);if(!f)continue;
  const row=el('div',undefined,'execution-row'),label=el('label',f.label),input=el(['do_queue','use_gpu'].includes(key)?'select':'input');
  input.id='project-'+(key==='cryocare_path'?'fn_cryocare_path':key);label.htmlFor=input.id;input.title=f.help;
  if(['do_queue','use_gpu'].includes(key))for(const value of ['No','Yes']){const option=el('option',value);option.value=value;input.append(option);}else input.type='text';
  input.value=config.executionDefaults[key]??f.default;
  if(config.detectedResources?.[key]===String(input.value)){const hint=el('small','detected','resource-detected');label.append(hint);input.addEventListener('input',()=>hint.hidden=input.value!==config.detectedResources[key]);}
  row.append(label,input);body.append(row);if(healthKeys.includes(key))attachExecutableCheck(input,row,key);if(key==='qsubscript')submissionChoices(input);controls[key]=input;if(['fn_ctffind_exe','fn_motioncor2_exe','fn_resmap','fn_batchtomo_exe','fn_aretomo_exe','qsubscript','cryocare_path'].includes(key))watchPath(input,row,!['qsubscript','cryocare_path'].includes(key),key==='cryocare_path');
 }
 const sync=()=>{for(const [key,input] of Object.entries(controls)){input.parentElement.hidden=['queuename','qsub','qsubscript','min_dedicated'].includes(key)&&controls.do_queue?.value!=='Yes';input.disabled=config.readonly||(['queuename','qsub','qsubscript','min_dedicated'].includes(key)&&controls.do_queue?.value!=='Yes');}};
 if(controls.do_queue)controls.do_queue.onchange=sync;if(controls.use_gpu)controls.use_gpu.onchange=sync;sync();
 modal(config.cluster?'Cluster defaults':'Workstation defaults',body,config.readonly?[]:[{label:'Save project defaults',primary:true,run:async()=>{
  const result=await api('project-defaults',{values:Object.fromEntries(Object.entries(controls).map(([key,input])=>[key,input.value]))});
  config.executionDefaults=result.values;config.executionRevision=result.revision;workspaceFeed?.defaults(result.values,result.revision);enforceSetupGate();
  const refreshDraft=(t,v)=>{applyWorkstation(t,v);alignmentCpuDefault(config.layout.find(l=>l.id===t),v,config.executionDefaults,config.cluster,editedInputDefaults.get(t)?.has('other_args'));};
  for(const [t,v] of drafts)refreshDraft(t,v);
  if(!selected){refreshDraft(type,values);drafts.set(type,{...values});}renderEditor();
  await update();workspaceFeed?.refresh();$('#dialog').close();notify('Computing defaults updated for all new-job drafts. Saved jobs are unchanged.');
 }}]);
};
function prepareJobDraft(id,source=null,overrides={}){if(treeMode)document.querySelector('[name=job-view][value=cards]').click();ctfSession=ctfPreviewSession();copiedDraft=false;const l=config.layout.find(l=>l.id===id);if(!l)return;if(busy)return;const reason=(l.name==='Denoise tomograms'&&denoiseUnavailable())||healthBlock(l.name,state.executableHealth);if(reason){notify(reason,true);return;}workspaceFeed?.newDraft();++loadSerial;const leaving={...values};if(selected)applyWorkstation(type,leaving);drafts.set(type,leaving);selected=null;if(type!==l.id)tab=null;type=l.id;values={...(drafts.get(type)||newDefaults(type)),...nextJobInputs(source,l,state.jobs,config.layout,leaving),...overrides};if(config.mode==='tomo'&&schema().options.some(f=>f.key==='in_particles')&&!schema().options.some(f=>f.key==='fn_img'))delete values.fn_img;seededInputFields=[...new Set([...Object.keys(nextJobInputs(source,l,state.jobs,config.layout,leaving)),...Object.keys(overrides)])];editedInputDefaults.delete(type);classSelectionDefaults(l,schema(),values);if('fn_cont' in values)values.fn_cont='';drafts.set(type,{...values});$('#alias').value='';renderEditor();renderPipeline();renderInspector();applyMaskDefault();applySequentialDefaults();}
function denoiseUnavailable(){return config.denoiseDisabledReason||state.denoiseSplitDisabledReason||'';}
function renderTypes(){const proposed=new Set(nextJobTypeIds(offeredNextJobs().defs,config.layout));const draftTypes=new Set([!selected?type:undefined,workspaceFeed?.draft()?.type,...pinnedPanel.jobs().map(j=>j.type)]);if(!document.querySelector('.port-legend')){document.querySelector('.sidebar-footer').prepend(portLegend());setupPortColumns(config.layout);}const q=$('#job-search').value.toLowerCase();$('#job-types').replaceChildren();config.layout.forEach((l,i)=>{if(!(l.name==='Denoise tomograms'&&denoiseUnavailable())&&!$('#show-all-job-types').checked&&!proposed.has(l.id)&&!draftTypes.has(l.id)&&!(state.availableJobTypes||config.layout.filter(x=>['Screening','Import','Import tilt series'].includes(x.name)).map(x=>x.id)).includes(l.id))return;const imports=state.jobs.filter(j=>j.status==='Succeeded'&&['Yes','No'].includes(j.importMovies));if(!$('#show-all-job-types').checked&&!proposed.has(l.id)&&!draftTypes.has(l.id)&&config.mode!=='tomo'&&l.name==='Motion correction'&&imports.length&&imports.every(j=>j.importMovies==='No'))return;if(!l.name.toLowerCase().includes(q))return;const b=el('button',undefined,'job-type'+(l.id===type?' active':'')+(state.jobs.some(j=>j.type===l.id&&j.status==='Succeeded')?' has-success':''));b.setAttribute('aria-pressed',String(l.id===type));if(state.jobs.some(j=>j.type===l.id&&j.status==='Succeeded'))b.title='At least one job of this type finished successfully';b.append(jobTypeIcon(l.name),el('span',l.name,'job-type-name'));appendPorts(b,l.id,config.mode);if(l.name==='Denoise tomograms'&&denoiseUnavailable()){b.disabled=true;b.title=denoiseUnavailable();b.classList.add('denoise-unavailable');}const healthReason=healthBlock(l.name,state.executableHealth);if(healthReason){b.disabled=true;b.title=(b.classList.contains('denoise-unavailable')?b.title+' · ':'')+healthReason;}b.classList.toggle('potential-next',potentialConnection(type,l.id,config.mode));if(potentialConnection(type,l.id,config.mode))b.title+=(b.title?' · ':'')+'Shares a possible input family with the selected job type; check job options and file requirements.';b.onclick=()=>prepareJobDraft(l.id);$('#job-types').append(b);});}
$('#job-search').oninput=()=>renderTypes();
$('#show-all-job-types').onchange=()=>renderTypes();
function tabMap(){if(currentLayout().custom)return currentLayout().tabs;const l=currentLayout(),keys=new Set(schema().options.map(f=>f.key)),tabs={};const used=new Set();for(const [name,list]of Object.entries(l.tabs)){const found=list.filter(k=>keys.has(k)&&!used.has(k));found.forEach(k=>used.add(k));if(found.length)tabs[name]=found;}
 if(l.name==='Auto-picking'&&values.do_topaz==='Yes'){for(const name of Object.keys(tabs))tabs[name]=tabs[name].filter(k=>!['use_gpu','gpu_ids'].includes(k));tabs.Topaz=[...(tabs.Topaz||[]),...['use_gpu','gpu_ids'].filter(k=>keys.has(k))];}
 const running=['nr_mpi','nr_threads','do_queue','queuename','qsub',...schema().options.filter(f=>f.key.startsWith('qsub_extra')).map(f=>f.key),'qsubscript','min_dedicated','other_args'].filter(k=>keys.has(k));running.forEach(k=>used.add(k));const extra=[...keys].filter(k=>!used.has(k));if(extra.length)tabs['Other options']=extra;tabs.Running=running;return ctfPreviewTabs(tabs,l.name,!!selected);}
let ctfPowerRule=null,ctfPowerSerial=0;
async function applyCtfPowerRule(){
 const serial=++ctfPowerSerial,jobType=type,input=values.input_star_mics,job=selected;
 ctfPowerRule=null;
 if((copiedDraft&&!selected)||!config?.initialized||currentLayout().name!=='CTF estimation')return;
 try{const rule=await api('ctf-power-spectra?'+new URLSearchParams({input:input||''}));
  if(!config?.initialized||serial!==ctfPowerSerial||type!==jobType||values.input_star_mics!==input||selected!==job)return;
  ctfPowerRule={...rule,input};if(!selected&&!copiedDraft&&!editedInputDefaults.get(type)?.has('use_given_ps')&&rule.value){values.use_given_ps=rule.value;drafts.set(type,{...values});const control=$('#f-use_given_ps');if(control)control.value=rule.value;workspaceChanged();}if(rule.disabled){values.use_given_ps='No';drafts.set(type,{...values});const control=$('#f-use_given_ps');if(control)control.value='No';}syncDisabled();
 }catch(e){if(config?.initialized&&serial===ctfPowerSerial&&type===jobType&&values.input_star_mics===input&&selected===job){ctfPowerRule=null;syncDisabled();notify('Could not check upstream power spectra: '+e.message,true);}}
}
let reconstructionDefaultSerial=0;
let reconstructionSplitRule=null;
async function applyReconstructionDefaults(){
 const request=++reconstructionDefaultSerial;
 reconstructionSplitRule=null;
 if(workspaceFeed||selected||copiedDraft||!config?.initialized||config.mode!=='tomo'||currentLayout().name!=='Reconstruct tomograms'||!values.in_tiltseries)return;
 const input=values.in_tiltseries,editor=values,jobType=type;
 try{const result=await api('motion-output-defaults?'+new URLSearchParams({input}));if(request!==reconstructionDefaultSerial||selected||copiedDraft||values!==editor||values.in_tiltseries!==input||type!==jobType)return;
 reconstructionSplitRule=result.values?.generate_split_tomograms==='No'?{input,source:result.source}:null;
 for(const [key,value]of Object.entries(result.values||{})){if(key!=='generate_split_tomograms'&&editedInputDefaults.get(type)?.has(key))continue;values[key]=value;const field=$('#f-'+key);if(field)field.value=value;}
 drafts.set(type,{...values});syncDisabled();workspaceChanged();
 }catch(e){console.warn('Motion correction defaults:',e.message);}
}
let cryocareTrainingDefaultSerial=0;
async function applyCryocareTrainingDefault(){
 const request=++cryocareTrainingDefaultSerial;
 if(workspaceFeed||selected||copiedDraft||!config?.initialized||config.mode!=='tomo'||currentLayout().name!=='Denoise tomograms'||values.do_cryocare_train!=='Yes'||!values.in_tomoset||editedInputDefaults.get(type)?.has('tomograms_for_training'))return;
 const input=values.in_tomoset,editor=values,jobType=type;
 try{const result=await api('cryocare-training-defaults?'+new URLSearchParams({input}));if(request!==cryocareTrainingDefaultSerial||selected||copiedDraft||values!==editor||values.in_tomoset!==input||values.do_cryocare_train!=='Yes'||type!==jobType||editedInputDefaults.get(type)?.has('tomograms_for_training')||!result.value)return;
 values.tomograms_for_training=result.value;const field=$('#f-tomograms_for_training');if(field)field.value=result.value;drafts.set(type,{...values});workspaceChanged();
 }catch(e){console.warn('CryoCare training defaults:',e.message);}
}
function disabledField(key){if(key==='use_gpu'&&currentLayout().name==='3D classification'&&values.dont_skip_align==='No')return true;if(key==='generate_split_tomograms'&&currentLayout().name==='Reconstruct tomograms'&&reconstructionSplitRule?.input===values.in_tiltseries)return true;if(key==='box'&&currentLayout().name==='CTF estimation'&&values.use_given_ps==='Yes')return true;if(pinnedId&&(pinnedTbd.has(key)||(pinnedSeed?.continuation&&['fn_cont','fn_checkpoint'].includes(key))))return true;if(typeof key!=='string')return true;if(key==='tomogram_thickness'&&currentLayout().name==='Align tilt-series'&&values.do_imod_fiducials==='Yes'&&values.do_imod_patchtrack==='No')return true;if(key==='use_gpu'&&currentLayout().name==='Auto-picking'&&values.do_topaz==='Yes'&&values.do_topaz_train==='Yes')return true;if(key==='nr_mpi'&&currentLayout().name==='2D classification'&&values.do_grad==='Yes')return true;if(key==='continue_manual'&&currentLayout().name==='Auto-picking'&&values.do_topaz==='Yes'&&values.do_topaz_train==='Yes')return true;if(key==='use_given_ps'&&currentLayout().name==='CTF estimation'&&ctfPowerRule?.input===values.input_star_mics&&ctfPowerRule.disabled)return true;if(config.readonly)return true;const rule=currentLayout().fields?.[key];const cont=!!pinnedSeed?.continuation||isContinuation(current(),selectedIsContinuation);if(rule?.toggle==='TOGGLE_ALWAYS_DEACTIVATE'||(rule?.toggle==='TOGGLE_DEACTIVATE'&&cont)||(rule?.toggle==='TOGGLE_REACTIVATE'&&!cont))return true;
 if(rule?.when?.some(c=>values[c.key]!==c.value))return true;
 if(['queuename','qsub','qsubscript','min_dedicated'].includes(key)||key.startsWith('qsub_extra'))return values.do_queue!=='Yes';
 if(key==='do_queue'&&['Import','Import tilt series','Exclude tilt-images','Pick tomograms','Manual picking','Subset selection'].includes(currentLayout().name))return true;
 return false;}
function highlightPendingInputs(){
 const job=current(),pending=job?.status==='Scheduled'?(job.manualRequirements||[]).filter(r=>!r.exists):[];
 for(const input of document.querySelectorAll('#parameters input,#parameters select')){
  const key=input.name||input.id.replace(/^f-/,''),requirement=pending.find(r=>r.field===key&&r.file===input.value);
  input.classList.toggle('manual-input-pending',!!requirement);
  if(requirement)input.setAttribute('aria-description','Manual preparation pending: '+requirement.instruction);
  else input.removeAttribute('aria-description');
 }
}
function applyReferenceGreyscaleDefault(){
 if(workspaceFeed||selected||copiedDraft||pinnedId||config.readonly||!['3D classification','3D auto-refine'].includes(currentLayout().name)||editedInputDefaults.get(type)?.has('ref_correct_greyscale'))return;
 const suggestion=referenceGreyscaleDefault(values.fn_ref,state.jobs,config.layout,config.project);
 if(values.ref_correct_greyscale===suggestion)return;
 values.ref_correct_greyscale=suggestion;
 const input=$('#f-ref_correct_greyscale');if(input)input.value=suggestion;
 drafts.set(type,{...values});workspaceChanged();
}
const samplingInputSignatures=new WeakMap();
function applyAngularSamplingDefault(){
 if(workspaceFeed||selected||copiedDraft||config.readonly||!['3D classification','3D auto-refine'].includes(currentLayout().name))return;
 const reference=referenceResolution(pinnedId?(values.fn_ref||'').replace(/\$\{([^}]+)\}/g,(m,id)=>state.pinned?.committed?.[id]||m):values.fn_ref,state.jobs,config.project);
 const signature=JSON.stringify([values.fn_ref,reference?.value,values.particle_diameter,values.ini_high]);
 const previous=samplingInputSignatures.get(values);samplingInputSignatures.set(values,signature);
 if(previous===signature||(previous===undefined&&(pinnedId||editedInputDefaults.get(type)?.has('sampling'))))return;
 const suggestion=referenceSamplingDefault(reference?.value,values.particle_diameter,schema().options.find(f=>f.key==='sampling')?.choices||[],values.ini_high);
 if(!suggestion)return;
 const input=$('#f-sampling');if(input)input.title=`Default from max(reference resolution, initial low-pass) and particle diameter: angular interval ≤ ${suggestion.limit.toPrecision(5)} degrees.`;
 if(values.sampling===suggestion.value)return;
 values.sampling=suggestion.value;if(input)input.value=suggestion.value;drafts.set(type,{...values});workspaceChanged();
}
function showReferenceResolution(){
 const input=$('#f-fn_ref'),row=input?.closest('.field');if(!row)return;
 const info=referenceResolution(input.value,state.jobs,config.project);
 let badge=row.querySelector('.reference-resolution');
 if(!info){badge?.remove();row.classList.remove('reference-resolution-field');return;}
 if(!badge){badge=el('span',undefined,'reference-resolution');row.querySelector('.file-input').before(badge);}
 badge.textContent=info.text;badge.title=info.title;badge.classList.toggle("resolution-near-nyquist",!!info.nearNyquist);row.classList.add('reference-resolution-field');
}
function syncDisabled(){const dose=$('#f-dose_per_frame');if(dose&&currentLayout().name==='Motion correction'){dose.classList.toggle('missing-import-angpix',!String(values.dose_per_frame??'').trim());dose.placeholder='Enter dose per frame';dose.setAttribute('aria-required','true');}const pixel=$('#f-angpix');if(pixel&&['Import','Import tilt series'].includes(currentLayout().name)){const missing=!String(values.angpix??'').trim();pixel.classList.toggle('missing-import-angpix',missing);pixel.placeholder='Enter pixel size (Å)';pixel.setAttribute('aria-required','true');}if(currentLayout().name==='3D classification'){classificationAlignmentGpu(currentLayout(),values);const alignedGpu=$('#f-use_gpu');if(alignedGpu){alignedGpu.value=values.use_gpu;alignedGpu.title=values.dont_skip_align==='No'?'GPU use is disabled when image alignment is skipped.':'';}}if(currentLayout().name==='CTF estimation'&&!selected&&values.use_given_ps==='Yes'){values.box='512';const box=$('#f-box'),select=$('#f-box-select');if(box)box.value='512';if(select)select.value='512';}applyReferenceGreyscaleDefault();applyAngularSamplingDefault();showReferenceResolution();const topazTraining=topazTrainingGpu(currentLayout(),values);const topazGpu=$('#f-use_gpu');if(topazTraining&&topazGpu){topazGpu.value='Yes';topazGpu.title='RELION requires GPU use for Topaz training. Leave GPU IDs blank for automatic selection.';}const training=polishingTrainingResources(currentLayout(),values,config.executionDefaults||{});for(const key of ['nr_mpi','nr_threads']){const input=$('#f-'+key);if(input&&training){input.value=values[key];input.title='Training uses one MPI process and the project CPU count as threads.';}}highlightConnection();if(currentLayout().name==='Import'){const label=document.querySelector('label[for="f-fn_in_other"]'),f=schema().options.find(f=>f.key==='fn_in_other');if(label&&f){label.querySelector('.field-input-icon')?.remove();label.prepend(inputSymbol(f,values));}}if(currentLayout().id===7&&dominantIs3D){values.do_class_ranker='No';const ranker=$('#f-do_class_ranker');if(ranker){ranker.value='No';ranker.title='The automatic class ranker supports 2D classes only.';}}if(!copiedDraft)normalizeClassification(currentLayout(),values);const mpi=$('#f-nr_mpi');if(mpi&&currentLayout().name==='2D classification'&&values.do_grad==='Yes'){mpi.value='1';mpi.title='Gradient optimisation does not support MPI; one process is required.';}if(!copiedDraft)pickingGpu(currentLayout(),values,config.executionDefaults||{});const gpu=$('#f-use_gpu');if(gpu&&currentLayout().name==='Auto-picking'&&values.do_log==='Yes'){gpu.value='No';gpu.title='Laplacian-of-Gaussian picking does not support GPUs.';}if(currentLayout().name==='Auto-picking'&&values.do_topaz==='Yes'&&values.do_topaz_train==='Yes'){values.continue_manual='No';const input=$('#f-continue_manual');if(input){input.value='No';input.title='Topaz training produces a model, not particle picks, so it cannot be continued manually.';}}if(['Import','Import tilt series'].includes(currentLayout().name)&&!selected&&detectedFrames.has(values[importFrameFields().pattern])){values[importFrameFields().flag]=detectedFrames.get(values[importFrameFields().pattern]);const input=$('#f-'+importFrameFields().flag);if(input){input.value=values[importFrameFields().flag];input.title='Set automatically from the detected frame count. Change the raw input pattern to detect again.';}}const raw=$('#f-fn_in_raw');if(raw&&currentLayout().name==='Import'){const mismatch=(values.is_multiframe==='No'&&/movie/i.test(raw.value))||(values.is_multiframe==='Yes'&&/micrograph/i.test(raw.value));raw.classList.toggle('movie-name-mismatch',mismatch);raw.title=mismatch?(values.is_multiframe==='No'?'A folder named Micrographs would fit better your files (they are not movies).':'A folder named Movies would fit better your files (they are movies).'):'';}const frameHint=$('#inline-frame-hint'),frameResult=detectedFrameHints.get(values[importFrameFields().pattern]);if(frameHint){frameHint.textContent=frameResult?.text||'';frameHint.title=frameResult?.title||'';}highlightPendingInputs();for(const button of $$('#tabs > button[role=tab]')){button.hidden=currentLayout().name==='Auto-picking'&&button.textContent==='Amyloid'&&values.do_amyloid!=='Yes';button.disabled=!executableTabEnabled(currentLayout(),values,button.textContent);button.setAttribute('aria-disabled',String(button.disabled));}for(const row of $$('#parameters .field[data-key]')){row.querySelector('.ctf-power-note')?.remove();if(row.dataset.key==='use_given_ps'&&ctfPowerRule?.disabled&&ctfPowerRule.input===values.input_star_mics){const note=el('small',ctfPowerRule.reason,'ctf-power-note');note.id='ctf-power-note';row.append(note);row.querySelector('select')?.setAttribute('aria-describedby',note.id);}else if(row.dataset.key==='use_given_ps')row.querySelector('select')?.removeAttribute('aria-describedby');row.hidden=(currentLayout().name==='Align tilt-series'&&!showAlignmentField(values,row.dataset.key))||(!config.cluster&&['do_queue','queuename','qsub','qsubscript','min_dedicated'].includes(row.dataset.key))||(currentLayout().id===7&&row.dataset.key==='do_dominant_3d'&&!dominantIs3D&&values.do_dominant_3d!=='Yes')||(currentLayout().id===20&&currentLayout().fields?.[row.dataset.key]?.when?.some(c=>['do_param_optim','do_polish','do_own_params'].includes(c.key)&&values[c.key]!==c.value))||(['queuename','qsub','qsubscript','min_dedicated'].includes(row.dataset.key)&&values.do_queue==='No')||(currentLayout().id===58&&currentLayout().fields?.[row.dataset.key]?.when?.some(c=>values[c.key]!==c.value))||!showClassificationField(currentLayout(),values,row.dataset.key)||!showImportField(currentLayout(),values,row.dataset.key)||!showTopazMode(currentLayout(),values,row.dataset.key)||(currentLayout().name==='Motion correction'&&values.do_own_motioncor==='Yes'&&['fn_motioncor2_exe','gpu_ids','other_motioncor2_args'].includes(row.dataset.key));const disabled=(training&&['nr_mpi','nr_threads'].includes(row.dataset.key))||(currentLayout().id===7&&row.dataset.key==='do_class_ranker'&&dominantIs3D)||disabledField(row.dataset.key)||(currentLayout().name==='Auto-picking'&&values.do_log==='Yes'&&row.dataset.key==='use_gpu');row.querySelectorAll('input,select,.browse,.halve').forEach(x=>x.disabled=disabled||(x.id==='f-'+importFrameFields().flag&&['Import','Import tilt series'].includes(currentLayout().name)&&!selected&&detectedFrames.has(values[importFrameFields().pattern]))||(x.classList.contains('halve')&&busy));}if(currentLayout().name==='Align tilt-series')for(const key of alignmentMethods){const input=$('#f-'+key);if(input){const reason=healthBlock('Align tilt-series',state.executableHealth,key==='do_aretomo2'?'AreTomo2':'IMOD');input.disabled=busy||disabledField(key)||!!reason;input.title=reason||'';}}}
function classificationRadioGroup(){
 const row=el('div',undefined,'field picking-mode-row');row.dataset.key='do_em';row.setAttribute('role','radiogroup');row.setAttribute('aria-label','2D optimisation method');row.append(el('span','Optimisation method','picking-mode-title'));
 for(const [key,title] of [['do_em','Expectation maximisation (EM)'],['do_grad','Gradient optimisation']]){
  const option=el('div',undefined,'picking-mode-option'),label=el('label'),radio=el('input');radio.type='radio';radio.name='classification-method';radio.id='f-'+key;radio.value=key;radio.checked=values[key]==='Yes';label.htmlFor=radio.id;label.append(radio,document.createTextNode(title));
  radio.onchange=()=>{if(!radio.checked)return;values.do_em=key==='do_em'?'Yes':'No';values.do_grad=key==='do_grad'?'Yes':'No';
   const next=workstationDefaults(currentLayout(),schema(),values,config.executionDefaults||{});values.nr_mpi=key==='do_grad'?'1':next.nr_mpi;values.nr_threads=next.nr_threads;
   drafts.set(type,{...values});renderEditor();};
  option.append(label);row.append(option);
 }return row;
}
function alignmentRadioGroup(){
 const row=el('div',undefined,'field picking-mode-row');row.dataset.key='alignment-method';row.setAttribute('role','radiogroup');row.setAttribute('aria-label','Alignment method');
 for(const [key,label] of [['do_imod_fiducials','IMOD fiducials'],['do_imod_patchtrack','IMOD patch tracking'],['do_aretomo2','AreTomo2']]){
  const option=el('label',undefined,'picking-mode-option'),radio=el('input');radio.type='radio';radio.name='alignment-method';radio.id='f-'+key;radio.checked=values[key]==='Yes';radio.onchange=()=>{if(!radio.checked)return;selectAlignmentMethod(values,key);drafts.set(type,{...values});renderEditor();};option.append(radio,document.createTextNode(label));row.append(option);
 }return row;
}
function pickingRadioGroup(keys, title, groupName){
 const row=el('div',undefined,'field picking-mode-row');row.dataset.key=keys[0];row.setAttribute('role','radiogroup');row.setAttribute('aria-label',title);row.append(el('span',title,'picking-mode-title'));
 const labels={do_amyloid:'Amyloid',do_refs:'References',do_log:'Laplacian of Gaussian',do_topaz:'Topaz',do_topaz_train:'Train',do_topaz_pick:'Pick'};
 for(const key of keys){const definition=schema().options.find(f=>f.key===key),option=el('div',undefined,'picking-mode-option'),label=el('label'),radio=el('input');radio.type='radio';radio.id='f-'+key;radio.name=groupName;radio.value=key;radio.checked=values[key]==='Yes';label.htmlFor=radio.id;label.append(radio,document.createTextNode(labels[key]));radio.onchange=()=>{if(!radio.checked)return;values[key]='Yes';selectPickingMethod(currentLayout(),values,key);pickingGpu(currentLayout(),values,config.executionDefaults||{},key);selectTopazMode(currentLayout(),values,key);for(const method of [...pickingMethodsFor(currentLayout()),...topazModes]){const input=$('#f-'+method);if(input)input.checked=values[method]==='Yes';}drafts.set(type,{...values});renderEditor();};const help=el('button','?','help');help.type='button';help.setAttribute('aria-label','Help: '+definition.label);help.onclick=()=>modal(definition.label,definition.help);option.append(label,help);row.append(option);}
 return row;
}
function cryocareRadioGroup(){
 const row=el('div',undefined,'field picking-mode-row');row.dataset.key='do_cryocare_train';row.setAttribute('role','radiogroup');row.setAttribute('aria-label','CryoCare mode');row.append(el('span','CryoCare mode','picking-mode-title'));
 for(const [key,title] of [['do_cryocare_train','Training'],['do_cryocare_predict','Prediction']]){const option=el('label',undefined,'picking-mode-option'),radio=el('input');radio.type='radio';radio.name='cryocare-mode';radio.id='f-'+key;radio.checked=values[key]==='Yes';radio.onchange=()=>{if(!radio.checked)return;values.do_cryocare_train=key==='do_cryocare_train'?'Yes':'No';values.do_cryocare_predict=key==='do_cryocare_predict'?'Yes':'No';drafts.set(type,{...values});syncDisabled();applyCryocareTrainingDefault();};option.append(radio,document.createTextNode(title));row.append(option);}return row;
}
function polishingRadioGroup(){
 const row=el('div',undefined,'field picking-mode-row');row.dataset.key='do_param_optim';row.setAttribute('role','radiogroup');row.setAttribute('aria-label','Bayesian polishing mode');row.append(el('span','Mode','picking-mode-title'));
 for(const [key,title] of [['do_param_optim','Train'],['do_polish','Polish']]){const option=el('div',undefined,'picking-mode-option'),label=el('label'),radio=el('input');radio.type='radio';radio.name='polishing-mode';radio.id='f-'+key;radio.checked=values[key]==='Yes';radio.onchange=()=>{if(!radio.checked)return;values.do_param_optim=key==='do_param_optim'?'Yes':'No';values.do_polish=key==='do_polish'?'Yes':'No';drafts.set(type,{...values});syncDisabled();};label.append(radio,document.createTextNode(title));const definition=schema().options.find(f=>f.key===key),help=el('button','?','help');help.type='button';help.setAttribute('aria-label','Help: '+title);help.onclick=()=>modal(definition.label,definition.help);option.append(label,help);row.append(option);}return row;
}
let dominantInputFile='',dominantIs3D=false;
async function updateDominantInput(){
 if(currentLayout().id!==7)return;const file=values.fn_model||'';if(file===dominantInputFile)return;dominantInputFile=file;dominantIs3D=false;
 try{if(file){const info=await api('dominant-input?file='+encodeURIComponent(file));if(file!==values.fn_model||currentLayout().id!==7)return;dominantIs3D=info.is3D;}}catch{}
 if(dominantIs3D){values.do_class_ranker='No';const ranker=$('#f-do_class_ranker');if(ranker)ranker.value='No';}syncDisabled();
}
const motionNyquist=new Map(),motionNyquistRequests=new Map();
function motionNyquistHint(){
 if(currentLayout().name!=='Motion correction'||!values.input_star_mics)return '';
 const input=values.input_star_mics,known=motionNyquist.get(input);if(known!==undefined){const bin=Number(values.bin_factor)||1;return known===null?'':`Nyquist: ${Number((known*bin).toFixed(3))}Å`;}
 if(!motionNyquistRequests.has(input))motionNyquistRequests.set(input,api('motion-nyquist?'+new URLSearchParams({input})).then(result=>{motionNyquist.set(input,result.nyquist);motionNyquistRequests.delete(input);if(currentLayout().name==='Motion correction'&&values.input_star_mics===input)renderEditor();}).catch(()=>{motionNyquist.set(input,null);motionNyquistRequests.delete(input);}));
 return '';
}
document.addEventListener('change',event=>{if(event.target?.id==='f-bin_factor'){const note=$('#motion-nyquist-hint');if(note)note.textContent=motionNyquistHint();}});
document.addEventListener('input',event=>{const key=event.target?.name;if(currentLayout().name!=='CTF estimation'||!['resmin','resmax'].includes(key))return;const value=Number(event.target.value),other=key==='resmin'?'resmax':'resmin',otherValue=Number(values[other]);if(!Number.isFinite(value)||!Number.isFinite(otherValue))return;if(key==='resmin'&&value<=otherValue){values.resmin=String(otherValue+.5);event.target.value=values.resmin;}if(key==='resmax'&&value>=otherValue){values.resmax=String(Math.max(Number(event.target.min)||1,otherValue-.5));event.target.value=values.resmax;}const paired=$('#f-'+other);if(paired){paired.value=values[other];if(other==='resmax')paired.max=String(Number(values.resmin)-.5);else paired.min=String(Number(values.resmax)+.5);}for(const k of ['resmin','resmax']){const output=document.querySelector('output[for="f-'+k+'"]');if(output)output.textContent=values[k]+' Å';}drafts.set(type,{...values});});
const continuationDefaultAttempts=new WeakSet();
async function applyContinuationDefault(){
 if(workspaceFeed||!selected||current()?.status!=='Succeeded'||currentLayout().name!=='3D auto-refine'||values.fn_cont?.trim()||continuationDefaultAttempts.has(values))return;
 const target=values,job=selected,jobType=type;continuationDefaultAttempts.add(target);
 try{
  const result=await api('inputs?'+new URLSearchParams({type:String(jobType),field:'fn_cont',job,iterations:'yes'}));
  if(values!==target||selected!==job||current()?.status!=='Succeeded'||values.fn_cont?.trim())return;
  const file=result.entries.filter(e=>e.available&&e.job===job&&/^run_it\d+_optimiser\.star$/.test(e.name)).sort((a,b)=>Number(b.name.match(/_it(\d+)/)[1])-Number(a.name.match(/_it(\d+)/)[1]))[0];
  if(!file)return;
  values.fn_cont=file.path;const input=$('#f-fn_cont');if(input)input.value=file.path;drafts.set(type,{...values});workspaceChanged();
 }catch(e){continuationDefaultAttempts.delete(target);console.warn('Could not find continuation default:',e.message);}
}
function renderEditor(){if(currentLayout().name==='Align tilt-series')selectAlignmentMethod(values);if(!selected&&!pinnedSeed?.continuation&&'fn_cont' in values)values.fn_cont='';if(workspaceFeed&&config.initialized&&(config.demo||config.readonly||config.executionRevision)){rememberSelection();renderTypes();workspaceFeed.open(workspaceSnapshot());return;}disposeCtfPreview?.();disposeCtfPreview=null;disposeLogPreview?.();disposeLogPreview=null;rememberSelection();updateDominantInput();if(currentLayout().id===20&&values.do_param_optim===values.do_polish){values.do_param_optim='No';values.do_polish='Yes';}if(currentLayout().id===58&&values.do_cryocare_train===values.do_cryocare_predict){values.do_cryocare_train='Yes';values.do_cryocare_predict='No';}if(!copiedDraft)normalizeClassification(currentLayout(),values);if(currentLayout().name==='Auto-picking'){const method=pickingMethodsFor(currentLayout()).find(key=>values[key]==='Yes')||'do_log';values[method]='Yes';selectPickingMethod(currentLayout(),values,method);selectTopazMode(currentLayout(),values,'');drafts.set(type,{...values});}applyCtfPowerRule();applyReconstructionDefaults();applyCryocareTrainingDefault();applyContinuationDefault();const splitDefault=motionSplitDefault(currentLayout(),values);if(!selected&&!copiedDraft&&splitDefault&&!editedInputDefaults.get(type)?.has('do_float16'))values.do_float16=splitDefault;applyExtractionInversion();if(currentLayout().name==='Import'&&values.do_raw===values.do_other){values.do_raw='Yes';values.do_other='No';drafts.set(type,{...values});}disposeMaskViewer?.();disposeMaskViewer=null;renderTypes();$('#job-title').textContent=currentLayout().name;$('#job-title-icon').replaceChildren(jobTypeIcon(currentLayout().name));$('#editor-selected-name').textContent=current()?.name||'';$('#editor-selected-name').hidden=!current();$('#editor-mode').textContent=selected?(current()?.status==='Scheduled'?(selectedIsContinuation?'SCHEDULED CONTINUATION':'SCHEDULED JOB'):currentLayout().custom?'EXISTING JOB · RERUN':'EXISTING JOB'):'DRAFT';
 const tabs=tabMap();if(!tabs[tab]||!executableTabEnabled(currentLayout(),values,tab))tab=Object.keys(tabs).find(name=>executableTabEnabled(currentLayout(),values,name));$('.editor-footer').append($('#run').closest('.run-actions'));$('#tabs').replaceChildren();for(const name of Object.keys(tabs)){const b=el('button',name,name===tab?'active':'');b.setAttribute('role','tab');b.setAttribute('aria-selected',String(name===tab));b.onclick=()=>{tab=name;renderEditor();};$('#tabs').append(b);}
 $('#parameters').classList.toggle('binarisation-parameters',currentLayout().name==='Mask creation'&&tab==='Binarisation');
 const fieldKeys=[...tabs[tab]];if(currentLayout().name==='3D auto-refine'&&tab==='I/O'&&fieldKeys.includes('fn_mask')&&!fieldKeys.includes('do_solvent_fsc'))fieldKeys.splice(fieldKeys.indexOf('fn_mask')+1,0,'do_solvent_fsc');if(tab==='I/O'&&showContinuationTools()){const key=iterationKey(currentLayout()),at=fieldKeys.indexOf('fn_cont');if(at>=0&&schema().options.some(f=>f.key===key))fieldKeys.splice(at+1,0,key);}
 $('#fields').replaceChildren();$('#fields').classList.remove('ctf-live-fields');if(currentLayout().name==='Import'&&fieldKeys.includes('do_raw')){
 const row=el('div',undefined,'field import-mode-row');row.dataset.key='do_raw';row.setAttribute('role','radiogroup');row.setAttribute('aria-label','Import mode');
 for(const key of importMethods){const definition=schema().options.find(f=>f.key===key),option=el('div',undefined,'import-mode-option'),label=el('label'),radio=el('input');radio.type='radio';radio.id='f-'+key;radio.name='import-mode';radio.value=key;radio.checked=values[key]==='Yes';label.htmlFor=radio.id;label.append(radio,document.createTextNode(key==='do_raw'?'Import raw movies/micrographs':'Import other node types'));radio.onchange=()=>{if(!radio.checked)return;values[key]='Yes';selectImportMethod(currentLayout(),values,key);drafts.set(type,{...values});syncDisabled();applySequentialDefaults();};const help=el('button','?','help');help.type='button';help.setAttribute('aria-label','Help: '+definition.label);help.onclick=()=>modal(definition.label,definition.help);option.append(label,help);row.append(option);}
 $('#fields').append(row);
 }for(const key of fieldKeys){if(currentLayout().name==='Align tilt-series'&&alignmentMethods.includes(key)){if(key===alignmentMethods[0])$('#fields').append(alignmentRadioGroup());continue;}if(currentLayout().id===20&&['do_param_optim','do_polish'].includes(key)){if(key==='do_param_optim')$('#fields').append(polishingRadioGroup());continue;}if(currentLayout().id===58&&['do_cryocare_train','do_cryocare_predict'].includes(key)){if(key==='do_cryocare_train')$('#fields').append(cryocareRadioGroup());continue;}if(ctfAlwaysOn.includes(currentLayout().name)&&key==='do_ctf_correction')continue;if(currentLayout().name==='2D classification'&&['do_em','do_grad'].includes(key)){if(key==='do_em')$('#fields').append(classificationRadioGroup());continue;}if(currentLayout().name==='Auto-picking'){const group=pickingMethodsFor(currentLayout()).includes(key)?pickingMethodsFor(currentLayout()):topazModes.includes(key)?topazModes:null;if(group){if(key===group[0])$('#fields').append(pickingRadioGroup(group,group===pickingMethodsFor(currentLayout())?'Picking method':'Topaz mode',group===pickingMethodsFor(currentLayout())?'picking-method':'topaz-mode'));continue;}}if(currentLayout().name==='Import'&&importMethods.includes(key))continue;if(!showPickingField(currentLayout(),key,current(),selectedIsContinuation))continue;const f=schema().options.find(x=>x.key===key);if(!f)continue;const row=el('div',undefined,'field');row.dataset.key=key;const shortCtf=currentLayout().name==='CTF estimation'&&!selected?{resmin:'Min res. (Å)',resmax:'Max res. (Å)',dfmin:'Min defocus (Å)',dfmax:'Max defocus (Å)'}:{};const label=el('label',shortCtf[key]||f.label);label.htmlFor='f-'+key;const inputIcon=inputSymbol(f,values);if(inputIcon)label.prepend(inputIcon);const voltage=currentLayout().name==='Import'&&key==='kV';const binning=currentLayout().name==='Motion correction'&&key==='bin_factor';const field=el(voltage||binning||f.type===4||f.type===5?'select':'input');field.id='f-'+key;field.name=key;
 const ctfBox=currentLayout().name==='CTF estimation'&&key==='box',ctfResolution=currentLayout().name==='CTF estimation'&&['resmin','resmax'].includes(key);if(ctfBox){const list=el('datalist');list.id='ctf-box-options';for(const value of ['256','512','1024','2048']){const opt=el('option');opt.value=value;list.append(opt);}field.setAttribute('list',list.id);field.after(list);}else if(voltage||binning||f.type===4||f.type===5){for(const value of voltage?['80','100','120','200','300']:binning?['1','2','4','8','16']:f.type===5?['Yes','No']:f.choices){const opt=el('option',f.choiceLabels?.[value]||value);opt.value=value;field.append(opt);}}else {field.type=ctfResolution?'range':'text';if(ctfResolution){field.min='1';field.max='100';field.step='0.5';}else if(f.type===6)field.inputMode='decimal';field.autocomplete='off';}
 if(binning&&!['1','2','4','8','16'].includes(String(values[key]??f.default))){const legacy=el('option',String(values[key])+' (saved value — choose a listed factor)');legacy.value=String(values[key]);legacy.disabled=true;field.append(legacy);}
 if(key==='sampling'&&['3D classification','3D auto-refine'].includes(currentLayout().name)&&[15,30].includes(parseFloat(values[key]))){if(selected||copiedDraft){const legacy=el('option',values[key]+' (saved, obsolete)');legacy.value=values[key];legacy.disabled=true;field.append(legacy);}else values[key]='7.5 degrees';}
 field.value=values[key]??f.default;if(pinnedId&&pinnedTbd.has(key))field.title='TBD: resolved from project computing defaults at batch preview.';field.oninput=()=>{if(!editedInputDefaults.has(type))editedInputDefaults.set(type,new Set());editedInputDefaults.get(type).add(key);if(currentLayout().name==='Auto-picking'&&values.do_log==='Yes'&&['log_diam_min','log_diam_max'].includes(key)&&field.value.trim()){const other=Number(values[key==='log_diam_min'?'log_diam_max':'log_diam_min']),n=Number(field.value);if(Number.isFinite(n)&&Number.isFinite(other)&&other>0)field.value=String(key==='log_diam_min'?Math.min(n,other):Math.max(n,other));}values[key]=field.value;if(key==='dont_skip_align'&&currentLayout().name==='3D classification'){classificationAlignmentGpu(currentLayout(),values,true);const gpu=$('#f-use_gpu');if(gpu)gpu.value=values.use_gpu;}if(currentLayout().name==='3D auto-refine'&&key==='fn_mask'&&field.value.trim()){values.do_solvent_fsc='Yes';const solvent=$('#f-do_solvent_fsc');if(solvent)solvent.value='Yes';}if(key==='fn_model'){if(!selected)classSelectionDefaults(currentLayout(),schema(),values);dominantInputFile='';updateDominantInput();}if(key==='node_type')document.querySelectorAll('.wildcard-hint').forEach(h=>h.remove());if(key==='do_even_odd_split'){const suggested=motionSplitDefault(currentLayout(),values);if(suggested){values.do_float16=suggested;const control=$('#f-do_float16');if(control)control.value=suggested;}}if(key==='in_tiltseries')applyReconstructionDefaults();if(key==='in_tomoset')applyCryocareTrainingDefault();if(key==='input_star_mics')applyCtfPowerRule();if(key==='coords_suffix')applyExtractionInversion();selectImportMethod(currentLayout(),values,key);if(currentLayout().name==='Import')for(const method of importMethods){const input=$('#f-'+method);if(input)input.value=values[method]??schema().options.find(f=>f.key===method)?.default;}selectPickingMethod(currentLayout(),values,key);pickingGpu(currentLayout(),values,config.executionDefaults||{},key);selectTopazMode(currentLayout(),values,key);if(currentLayout().name==='Auto-picking')for(const mode of topazModes){const input=$('#f-'+mode);if(input)input.checked=values[mode]==='Yes';}selectLocalResolutionMethod(currentLayout(),values,key);if(currentLayout().name==='Local resolution')for(const method of localResolutionMethods){const input=$('#f-'+method);if(input)input.value=values[method]??schema().options.find(f=>f.key===method)?.default;}if(currentLayout().name==='Auto-picking')for(const method of pickingMethodsFor(currentLayout())){const input=$('#f-'+method);if(input)input.checked=values[method]==='Yes';}drafts.set(type,{...values});if(key==='particle_diameter'){manualMasks.set(type,values.fn_img);++maskRevision;maskNotes.delete(type);showMaskNote();}if(key==='fn_img'){++maskRevision;maskNotes.delete(type);clearTimeout(maskTimer);maskTimer=setTimeout(applyMaskDefault,300);}syncDisabled();};const help=el('button','?','help');help.type='button';help.title='Help: '+f.label;help.setAttribute('aria-label','Help: '+f.label);help.onclick=()=>modal(f.label,f.help);
 if(key==='fn_cont'){
  let previous=values.fn_cont||'';
  field.addEventListener('change',()=>{
   if(disabledField(key))return;
   const changed=increaseContinuationIterations(currentLayout(),values,previous);previous=values.fn_cont||'';
   if(changed){const iterations=$('#f-'+changed);if(iterations)iterations.value=values[changed];drafts.set(type,{...values});workspaceChanged();}
  });
 }
let control=field;if(ctfBox){const select=el('select');select.id='f-box-select';for(const value of ['256','512','1024','2048']){const option=el('option',value);option.value=value;select.append(option);}select.value=field.value;select.oninput=()=>{field.value=select.value;field.oninput?.();};field.hidden=true;const wrap=el('span',undefined,'ctf-box-select');wrap.append(field,select);control=wrap;}else if(ctfResolution){field.max='50';field.value=String(Math.min(50,Math.round(Number(field.value)*2)/2));values[key]=field.value;const value=el('output',field.value+' Å','ctf-resolution-value');value.htmlFor=field.id;field.addEventListener('input',()=>{value.textContent=field.value+' Å';});const wrap=el('span',undefined,'ctf-resolution-slider');wrap.append(field,value);control=wrap;}else if(f.type===2||f.type===3){const wrap=el('div',undefined,'file-input');const browse=el('button','…','browse');browse.title=f.type===3?'Choose matching project input':'Browse matching files';browse.setAttribute('aria-label','Browse '+f.label);browse.onclick=()=>browseFiles(f,field);wrap.append(field,browse);control=wrap;}
 if(showContinuationTools()&&['Sampling','Helix'].includes(tab)&&halfFields.has(key)){
  const wrap=el('div',undefined,'numeric-shortcut'),button=el('button','÷2','halve');button.type='button';button.title='Divide '+f.label.replace(/:.*$/,'')+' by 2';button.setAttribute('aria-label',button.title);
  button.onclick=()=>{if(disabledField(key)||busy)return;try{field.value=halfValue(field.value);field.oninput();}catch(e){notify(e.message,true);}};
  wrap.append(field,button);control=wrap;
 }
 if(['Import','Import tilt series'].includes(currentLayout().name)&&key===importFrameFields().flag){const shell=el('span',undefined,'input-hint-shell frame-hint-shell'),hint=el('span','','input-match-hint frame-hint');hint.id='inline-frame-hint';hint.setAttribute('role','status');shell.append(field,hint);control=shell;}if(binning){const hint=motionNyquistHint();if(hint){const shell=el('span',undefined,'binning-hint-shell'),note=el('small',hint,'motion-nyquist-hint');note.id='motion-nyquist-hint';shell.append(field,note);control=shell;}}row.append(label,control,help);$('#fields').append(row);if(key==='qsubscript')submissionChoices(field);if(key==='other_args'){const jobType=type;attachCliCompletion(field,()=>api('cli-options?'+new URLSearchParams({type:jobType,variant:values.do_class_ranker==='Yes'?'ranker':values.fn_model?'display':values.do_resmap==='Yes'?'resmap':''})));}if(!selected&&[2,3].includes(f.type))watchPath(field,row,/_exe$/.test(key)||key==='fn_resmap');if((currentLayout().name==='Import'&&['fn_in_raw','fn_in_other'].includes(key))||(currentLayout().name==='Import tilt series'&&['movie_files','mdoc_files'].includes(key)))watchImportPattern(field,key);if(['Import','Import tilt series'].includes(currentLayout().name)&&key===importFrameFields().pattern){let checkedPattern=field.value;field.addEventListener('input',()=>{++frameRevision;detectedFrames.delete(field.value);detectedFrameHints.delete(field.value);syncDisabled();});field.addEventListener('change',()=>{if(field.value===checkedPattern)return;checkedPattern=field.value;detectedFrames.delete(field.value);detectedFrameHints.delete(field.value);frameRequests.delete(field.value);syncDisabled();showFrameHint();});}}
 if(currentLayout().name==='CTF estimation'&&!selected&&tab==='Preview')$('#fields').classList.add('ctf-live-fields');
 showMaskNote();syncDisabled();setButtons();showFrameHint();
 if(currentLayout().name==='CTF estimation'&&!selected&&tab==='Preview')disposeCtfPreview=mountCtfPreview({container:$('#fields'),session:ctfSession,getValues:()=>({...values}),token,el,disabled:config.readonly||config.demo||!config.initialized});
 if(currentLayout().name==='Auto-picking'&&tab==='Laplacian'&&values.do_log==='Yes')disposeLogPreview=mountLogPreview({container:$('#fields'),file:values.fn_input_autopick,token,getValues:()=>({...values}),min:$('#f-log_diam_min'),max:$('#f-log_diam_max'),el});
 if(currentLayout().name==='Mask creation'&&tab==='Binarisation')disposeMaskViewer=mountMaskViewer({container:$('#fields'),input:values.fn_in,threshold:$('#f-inimask_threshold'),token,readonly:disabledField('inimask_threshold'),onChange:()=>$('#f-inimask_threshold').oninput()});}
$('#parameters').onsubmit=e=>e.preventDefault();
let refinementThumbIteration=null;
let refinementThumbJob='',refinementThumbTime=0,refinementThumbBusy=false,refinementThumbAxis='Z',refinementThumbSlice=null,refinementThumbRevision=0;
async function updateRefinementThumbnail(){
 if(workspaceFeed)return;
 let canvas=$('#refinement-thumbnail');
 const name=selected,eligible=['3D auto-refine','3D classification','3D initial reference','Mask creation','Reconstruct particle'].includes(config.layout.find(l=>l.id===current()?.type)?.name);
 if(!canvas){canvas=el('span');canvas.id='refinement-thumbnail';canvas.hidden=true;canvas.setAttribute('aria-label','Central slice of latest refinement half-map');const wrap=el('span',undefined,'refinement-thumbnail-wrap'),buttons=el('span',undefined,'refinement-thumbnail-axes');
 const slider=el('input');slider.type='range';slider.id='refinement-thumbnail-slice';slider.min='0';slider.max='0';slider.step='1';slider.setAttribute('aria-label','Refinement preview slice');slider.oninput=()=>{refinementThumbSlice=Number(slider.max)>0?Number(slider.value)/Number(slider.max):0;refinementThumbRevision++;refinementThumbTime=0;slider.title=refinementThumbAxis+' slice '+(Number(slider.value)+1)+' of '+(Number(slider.max)+1);updateRefinementThumbnail();};
 wrap.hidden=true;wrap.append(slider,canvas,buttons);$('#editor-selected-name').after(wrap);
 for(const axis of ['X','Y','Z']){const b=el('button',axis.toLowerCase());b.type='button';b.title='View '+axis+' slices';b.setAttribute('aria-label',b.title);b.setAttribute('aria-pressed',String(axis===refinementThumbAxis));b.onclick=()=>{refinementThumbAxis=axis;refinementThumbSlice=null;refinementThumbRevision++;refinementThumbTime=0;for(const button of buttons.children)button.setAttribute('aria-pressed',String(button===b));updateRefinementThumbnail();};buttons.append(b);}}
 const wrap=canvas.parentElement;
 if(!eligible){wrap.hidden=true;canvas.hidden=true;refinementThumbJob='';return;}
 if(refinementThumbJob!==name){canvas.hidden=true;refinementThumbJob=name;refinementThumbSlice=null;refinementThumbIteration=null;refinementThumbRevision++;refinementThumbTime=0;}
 if(refinementThumbBusy||Date.now()-refinementThumbTime<10000)return;
 const axis=refinementThumbAxis,revision=refinementThumbRevision,slice=refinementThumbSlice;
 refinementThumbBusy=true;refinementThumbTime=Date.now();
 try{
  const payload=await api('refinement-thumbnail?'+new URLSearchParams({job:name,axis,...(slice===null?{}:{slice:String(slice)}),...(refinementThumbIteration===null?{}:{iteration:String(refinementThumbIteration)})}));
  if(selected!==name||refinementThumbJob!==name||revision!==refinementThumbRevision)return;
  const images=payload.images||(payload.file?[payload]:[]),data=images[0];
  if(!data){canvas.replaceChildren(el('small',refinementThumbIteration===null?'Maps not ready':'Iteration '+refinementThumbIteration+': maps unavailable'));canvas.hidden=false;wrap.hidden=false;return;}
  const slider=$('#refinement-thumbnail-slice'),count=data.dimensions[{X:0,Y:1,Z:2}[axis]];
  slider.max=String(count-1);slider.value=String(data.slice);slider.disabled=count<2;slider.title=axis+' slice '+(data.slice+1)+' of '+count;
  slider.setAttribute('aria-valuetext',slider.title);
  const container=canvas,fragment=document.createDocumentFragment();
  for(const data of images){
  const canvas=el('canvas');canvas.width=64;canvas.height=64;
  canvas.setAttribute('aria-label',data.classNumber?'Class '+data.classNumber+' slice':'Refinement slice');
  const sorted=data.pixels.filter(Number.isFinite).sort((a,b)=>a-b);
  const low=data.mask?0:sorted[Math.floor(sorted.length*.02)]||0,high=data.mask?1:sorted[Math.floor(sorted.length*.98)]??low;
  const small=document.createElement('canvas');small.width=data.width;small.height=data.height;
  const ctx=small.getContext('2d'),img=ctx.createImageData(data.width,data.height);
  data.pixels.forEach((v,i)=>{const gray=high>low?Math.round(Math.max(0,Math.min(1,(v-low)/(high-low)))*255):127;img.data.set([gray,gray,gray,255],i*4);});
  ctx.putImageData(img,0,0);const c=canvas.getContext('2d');c.fillStyle='#000';c.fillRect(0,0,64,64);
  const scale=Math.min(64/data.width,64/data.height),w=data.width*scale,h=data.height*scale;
  c.drawImage(small,(64-w)/2,(64-h)/2,w,h);canvas.title=data.file+' — '+axis+' slice '+(data.slice+1)+' of '+count;
  if(data.classNumber){const item=el('span',undefined,'refinement-thumbnail-class');const label=el('small',String(data.classNumber));label.style.color=classColor(data.classNumber);item.append(canvas,label);fragment.append(item);}else fragment.append(canvas);
  }
  container.replaceChildren(fragment);container.hidden=false;wrap.hidden=false;
 }catch{if(selected===name&&revision===refinementThumbRevision){canvas.hidden=true;wrap.hidden=true;}}finally{refinementThumbBusy=false;if(revision!==refinementThumbRevision){refinementThumbTime=0;updateRefinementThumbnail();}}
}
async function openNextTemplate(definition,source){
 const result=await api('next-job-template?'+new URLSearchParams({job:source.name,file:definition.file}));
 const template=result.template,box=el('div');
 box.append(el('p',template.steps.map(s=>s.title).join(' → ')));
 box.append(el('p',result.action==='template-draft'?'Review the inputs, then create an editable job draft.':'Review the inputs, then create editable pinned drafts. Nothing is run or scheduled.'));
 for(const [key,value]of Object.entries(template.inputs||{})){
  const row=el('label',key+(result.optionalInputs?.includes(key)?' (optional)':''),'ideal-binding'),input=el('input');
  input.value=value;input.oninput=()=>template.inputs[key]=input.value.trim();row.append(input);box.append(row);
 }
 modal(definition.label,box,[{label:result.action==='template-draft'?'Create draft':'Create pinned drafts',primary:true,run:async()=>{
  if(Object.entries(template.inputs||{}).some(([k,v])=>!result.optionalInputs?.includes(k)&&!v))throw Error('Fill required inputs before creating drafts.');
  if(result.action==='template-draft'){
   const step=template.steps[0],target=config.layout.find(l=>l.label===step.type),v={};
   for(const [k,value]of Object.entries(step.values)){
    if(value==='TBD')continue;
    v[k]=value.replace(/\$\{input:([A-Za-z][A-Za-z0-9_]*)\}/g,(_,key)=>template.inputs[key]);
   }
   prepareJobDraft(target.id,source,v);
  }else await pinnedPanel.convert(template);
  $('#dialog').close();
 }}]);
}
function offeredNextJobs(){
 const source=nextJobSource(state.jobs,selected),context=source?nextContext(source,values,state.jobs):null;
 const defs=source?(config.nextJobs?.definitions?.[source.type]||[]).filter(d=>{
  if(!nextCondition(d.when,context))return false;
  if(d.target===58&&denoiseUnavailable())return false;
  if(d.action==='continue-manual')return canContinueAutopick(source,values,config.layout.find(l=>l.id===source.type));
  if(d.action==='continue-with-mask')return source.status==='Succeeded'&&!!source.maskRefinement;
  return true;
 }):[];
 return {source,defs};
}
function syncPipelineNextJobs(){
 const holder=document.querySelector('.pipeline-next-jobs');if(!holder||!nextJobPrompt)return;
 holder.replaceChildren();holder.hidden=nextJobPrompt.hidden;
 for(const original of nextJobPrompt.querySelectorAll('.next-job-button')){
  const copy=original.cloneNode(true);copy.onclick=()=>original.click();holder.append(copy);
 }
}
function updateNextJobPrompt(){
 if(!nextJobButton||!config)return;
 const {source,defs}=offeredNextJobs();
 const show=defs.length>0&&config.initialized&&!config.readonly&&markedJobs.size<=1;
 renderTypes();const changed=nextJobPrompt.hidden===show;nextJobPrompt.hidden=!show;
 const key=JSON.stringify([source?.name,defs,busy,show]);
 if(nextJobPrompt.dataset.definitions!==key){
  nextJobPrompt.dataset.definitions=key;nextJobPrompt.replaceChildren();
  for(const d of defs){
   const button=el('button',undefined,'next-job-button');
   button.type='button';
   const icons=el('span',undefined,'next-job-icons');
   for(const [i,name]of (d.iconNames||['External']).entries()){
    if(i)icons.append(el('span','→','next-job-chain-arrow'));
    const icon=jobTypeIcon(name);icon.title=name;icons.append(icon);
   }
   const down=el('span','↓','next-job-down');down.setAttribute('aria-hidden','true');
   const add=el('span','+','next-job-plus');add.setAttribute('aria-hidden','true');button.append(add,icons,down);button.title=d.label;button.setAttribute('aria-label',d.label);button.disabled=busy;
   button.onclick=async()=>{if(busy)return;const latest=state.jobs.find(j=>j.name===source.name);if(!latest)return;
    try{
     if(d.action==='draft')prepareJobDraft(d.target,latest,d.values);
     else if(d.action==='continue-manual')await workspaceFeed.continueManually(latest.name);
     else if(d.action==='continue-with-mask'){
      const verified=await api('mask-refinement?'+new URLSearchParams({job:latest.name}));
      markedJobs=new Set([verified.job]);selectionAnchor=verified.job;jobCursor=verified.job;await workspaceFeed.continueWithMask(verified.job,latest.name);
     }else await openNextTemplate(d,latest);
    }catch(e){notify(e.message,true);}
   };nextJobPrompt.append(button);
  }
 }
 syncPipelineNextJobs();
 if(changed)window.dispatchEvent(new Event('relion-next-job-layout'));
}
function compactSavedEditor(){
 const job=current(),compact=!!selected&&(!job?.alias||job.alias==='None');
 const footer=$('.editor-footer'),alias=$('.alias'),tabs=$('#tabs'),actions=$('#run').closest('.run-actions');
 alias.hidden=compact;footer.hidden=compact;tabs.classList.toggle('with-run-actions',compact);
 const target=compact?tabs:footer;if(actions.parentElement!==target)target.append(actions);
}
function setButtons(){if(!config)return;syncExecutionMode();updateRefinementThumbnail();updateNextJobPrompt();compactSavedEditor();workspaceFeed?.selection([...markedJobs]);$('#execution-defaults').disabled=busy;syncDisabled();const running=current()?.status==='Running';for(const id of ['run','schedule','new-job'])$('#'+id).disabled=busy||workspaceMissing||config.readonly||!config.initialized||(id!=='new-job'&&running&&!(id==='run'&&['Manual picking','Pick tomograms','Exclude tilt-images'].includes(currentLayout().name)));const hasScheduled=state.jobs.some(j=>j.status==='Scheduled');$('#scheduler').disabled=busy||config.readonly||!config.initialized||!hasScheduled;$('#scheduler').title=hasScheduled?'Choose scheduled jobs to run':'No scheduled jobs';$('#check-command').disabled=busy||workspaceMissing||!config.initialized;$('#job-action').disabled=busy||!config.initialized;for(const option of $('#job-action').options){if(option.value)option.disabled=option.value==='pinned-add'?config.readonly:option.value.startsWith('pinned-')?![...markedJobs].some(n=>n.startsWith('Pinned/')):!selected&&!['delete','delete-recursive','reschedule-offset'].includes(option.value);}const count=trashTargets(markedJobs,selected).length;$('#job-action option[value=delete]').textContent='Move to Trash'+(count>1?' ('+count+' jobs)':'');$('#trash').disabled=busy||!config.initialized;if(['Screening','Pick tomograms','Exclude tilt-images'].includes(currentLayout().name)){$('#schedule').disabled=true;$('#schedule').title='Interactive jobs must be run and finished before scheduling downstream work.';}else $('#schedule').title='';$('#run').textContent=selected&&current()?.status!=='Scheduled'?(currentLayout().custom&&currentLayout().name!=='Screening'?'Run again':'Continue!'):'Run!';$('#run').title='';if(currentLayout().id===58&&denoiseUnavailable()){for(const id of ['run','schedule','check-command']){$('#'+id).disabled=true;$('#'+id).title=denoiseUnavailable();}}const healthReason=healthBlock(currentLayout().name,state.executableHealth)|| (currentLayout().name==='Align tilt-series'?healthBlock(currentLayout().name,state.executableHealth,values.do_aretomo2==='Yes'?'AreTomo2':'IMOD'):'');if(healthReason)for(const id of ['run','schedule']){$('#'+id).disabled=true;$('#'+id).title=healthReason;}$('#alias').disabled=busy||config.readonly||!!selected;if(pinnedId){$('#alias').closest('label').hidden=true;$('#new-job').hidden=true;$('#editor-mode').textContent='PINNED DRAFT';$('#editor-selected-name').textContent=pinnedId;$('#editor-selected-name').hidden=false;$('#run').textContent='Run pinned drafts';$('#schedule').textContent='Schedule pinned drafts';}}
const jobSectionScroll=new Map();
function renderPipeline(){updateViewSwitch();refreshTree();workspaceFeed?.sync([...state.jobs].sort(comparePipelineJobs));const scheduler=$('#scheduler-status');if(scheduler){scheduler.hidden=!state.scheduler;scheduler.replaceChildren();for(const process of state.scheduler?.processes||[]){const button=el('button',(process.active?'● On':'○ '+process.status)+(process.pid?' · '+process.pid:''),'scheduler-indicator');button.classList.toggle('alive',!!process.active);button.title=process.name+'\n'+(process.jobs||'')+'\n'+process.line;button.onclick=()=>{const body=el('div');for(const line of [process.name,'Status: '+process.status,'PID: '+(process.pid||'unknown'),'Jobs: '+(process.jobs||'unknown'),'Started: '+(process.started||'unknown'),process.ended?'Exited: '+process.ended+' · code '+process.exitCode+(process.signal?' · '+process.signal:''):'',process.marker&&!process.active?'A stale RUNNING marker remains. This does not mean the process is alive.':'','Log: '+(process.file||process.log||'unavailable')])if(line)body.append(el('p',line));body.append(el('pre',process.recent||process.line));modal('Scheduler status',body);};scheduler.append(button);}}markedJobs=new Set([...markedJobs].filter(n=>[...state.jobs,...pinnedPanel.jobs()].some(j=>j.name===n)));if(markedJobs.size!==1||!markedJobs.has(fullConnectionJob))fullConnectionJob=null;$('#selection-count').textContent=markedJobs.size+' selected';const provisional=config.initialized?draftJob(workspaceFeed?.draft(),config.layout,config.catalog):null;const connectionJobs=[...state.jobs,...(provisional?[provisional]:[]),...pinnedPanel.jobs()];const holder=$('#job-lists');const hadDraft=!!holder.querySelector('.draft-job-row');for(const list of holder.querySelectorAll('.job-section-list')){jobSectionScroll.set(list.dataset.section,list.scrollTop);jobSectionHorizontalScroll.set(list.dataset.section,list.scrollLeft);}const restoreFocus=holder.contains(document.activeElement);holder.replaceChildren();{const label='Jobs',sectionKey='all';const jobs=[...state.jobs].sort(comparePipelineJobs);const section=el('section',undefined,'job-section');
 const list=el('div',undefined,'job-section-list');list.dataset.section=sectionKey;list.setAttribute('aria-label',label);section.append(list);if(!jobs.length&&!provisional)list.append(el('div','No '+label.toLowerCase()+'.','empty'));for(const j of jobs){const b=el('button',undefined,'job-row'+(j.name===selected?' active':'')+(markedJobs.has(j.name)?' marked':''));b.append(el('span',undefined,'dot '+j.status));const name=el('span',j.alias!=='None'?j.alias.split('/').filter(Boolean).at(-1):j.name.split('/')[0]);name.append(el('small',j.name));name.classList.add('job-name');const typeIcon=jobTypeIcon(config.layout.find(l=>l.id===j.type)?.name||'External');typeIcon.classList.add('pipeline-type-icon');typeIcon.title=config.layout.find(l=>l.id===j.type)?.name||'External';name.prepend(typeIcon);const info=el('span',undefined,'job-key-info');const summary=(j.keyInfo||'').match(/^(\d+ particles)\s+(.+)$/);if(j.keyInfoDetail){if(j.keyInfo)info.append(el('span',j.keyInfo));info.append(el('small',j.keyInfoDetail));}else if(summary){info.append(el('span',summary[1]),el('small',summary[2]));}else info.textContent=j.keyInfo||'';info.title=[j.keyInfo,j.keyInfoDetail].filter(Boolean).join(' · ');if(j.resolutionNyquist){info.title+=' — '+j.resolutionNyquist.title;if(j.resolutionNyquist.near)(j.keyInfoDetail?info.lastElementChild:info).classList.add('resolution-near-nyquist');}b.append(name,info,el('span',j.status==='Succeeded'?'Done':j.status,'status-word'));if(j.status==='Scheduled'&&j.manualRequirements?.some(r=>!r.exists)){const note=el('small','⚠ Manual input pending','manual-required');name.append(note);info.title=j.manualRequirements.filter(r=>!r.exists).map(r=>r.file+' — '+r.instruction).join('\n');}if(j.status==='Running'){const progress=j.progress||{fraction:null,label:'Running — completion time unknown'},bar=el('span',undefined,'job-progress'+(progress.fraction===null?' indeterminate':'')),fill=el('span');bar.setAttribute('role','progressbar');bar.setAttribute('aria-label',progress.label);bar.title=progress.label;if(progress.fraction!==null){bar.setAttribute('aria-valuemin','0');bar.setAttribute('aria-valuemax','100');bar.setAttribute('aria-valuenow',String(Math.round(progress.fraction*100)));fill.style.width=(progress.fraction*100)+'%';}bar.append(fill);b.append(bar);}b.title=j.name;b.dataset.job=j.name;b.setAttribute('aria-pressed',String(markedJobs.has(j.name)));b.onfocus=()=>{jobCursor=j.name;for(const row of holder.querySelectorAll('.job-row'))row.tabIndex=row===b?0:-1;};b.onclick=e=>{
 if(busy)return;
 const order=[...document.querySelectorAll('.job-row:not(.draft-job-row)')].map(row=>row.dataset.job);
 fullConnectionJob=nextConnectionFocus(fullConnectionJob,markedJobs,j.name,e);activeConnection=null;++loadSerial;const previous=markedJobs.size?markedJobs:new Set(selected?[selected]:[]);const next=selectRows(previous,selectionAnchor||selected,j.name,order,e);markedJobs=next.selected;selectionAnchor=next.anchor;jobCursor=j.name;
 if(!markedJobs.size){selected=null;selectedIsContinuation=false;if(!workspaceFeed){if('fn_cont' in values)values.fn_cont='';$('#alias').value='';renderEditor();renderInspector();}}
 renderPipeline();if(markedJobs.has(j.name))selectJob(j.name);else if(selected&&!markedJobs.has(selected))selectJob([...markedJobs].at(-1));
 };list.append(b);}
 const assigned=pipelineJobNumber(state);if(assigned>0){const divider=el('div',undefined,'pipeline-number-divider');divider.setAttribute('role','separator');divider.setAttribute('aria-label','Last allocated job number: '+assigned);divider.title='Last allocated job number: '+assigned+'. Next job: '+(assigned+1)+'. Deleted jobs do not decrease this counter.';divider.append(el('span','J'+assigned));list.append(divider);}const pipelineNext=el('div',undefined,'pipeline-next-jobs');pipelineNext.hidden=true;list.append(pipelineNext);
 if(provisional){const row=el('button',undefined,'job-row draft-job-row'+(!selected?' active':''));row.type='button';row.dataset.job=DRAFT_JOB;row.title='Provisional job — not run or scheduled';row.append(el('span',undefined,'dot Draft'));const name=el('span',undefined,'job-name');const icon=jobTypeIcon(provisional.title);icon.classList.add('pipeline-type-icon');name.append(icon,document.createTextNode(provisional.title),el('small','Provisional · not submitted'));row.append(name,el('span','','job-key-info'),el('span','Draft','status-word'));row.onclick=()=>{if(!busy)workspaceFeed?.focusDraft();};list.append(row);}
 pinnedPanel.rows(list,(name,e)=>{fullConnectionJob=nextConnectionFocus(fullConnectionJob,markedJobs,name,e);const order=[...list.querySelectorAll('.job-row:not(.draft-job-row)')].map(r=>r.dataset.job);const next=selectRows(markedJobs,selectionAnchor,name,order,e);markedJobs=next.selected;selectionAnchor=next.anchor;jobCursor=name;renderPipeline();if(markedJobs.has(name))pinnedPanel.focus(name);});
 holder.append(section);}renderJobConnections(holder,connectionJobs,provisional&&!selected&&![...markedJobs].some(n=>n.startsWith('Pinned/'))?[DRAFT_JOB]:[...markedJobs],edge=>{if(edge.target===DRAFT_JOB){workspaceFeed?.focusDraft();return;}if([edge.source,edge.target].some(n=>n.startsWith('Pinned/'))){const name=jobCursor===edge.target?edge.source:edge.target;markedJobs=new Set([name]);jobCursor=name;renderPipeline();if(!pinnedPanel.focus(name))selectJob(name);return;}activateConnection(edge);},fullConnectionJob,$('#hide-unrelated').checked);for(const list of holder.querySelectorAll('.job-section-list')){list.scrollTop=jobSectionScroll.get(list.dataset.section)||0;list.scrollLeft=jobSectionHorizontalScroll.get(list.dataset.section)||0;}const rows=[...holder.querySelectorAll('.job-row')];if(!rows.some(row=>row.dataset.job===jobCursor))jobCursor=rows.find(row=>markedJobs.has(row.dataset.job))?.dataset.job||rows.find(row=>row.dataset.job===selected)?.dataset.job||rows[0]?.dataset.job||null;for(const row of rows)row.tabIndex=row.dataset.job===jobCursor?0:-1;if(restoreFocus)rows.find(row=>row.dataset.job===jobCursor)?.focus({preventScroll:true});if(provisional&&!hadDraft)requestAnimationFrame(()=>holder.querySelector('.draft-job-row')?.scrollIntoView({block:'nearest'}));$('#job-count').textContent=state.jobs.length+' jobs'+(provisional?' + draft':'')+((state.pinned?.pins.length)?' + '+state.pinned.pins.length+' pinned':'');paintCandidateHover();setButtons();}
$('#job-lists').addEventListener('keydown',e=>{
 const row=e.target.closest('.job-row');if(!row||row.classList.contains('draft-job-row')||e.altKey)return;
 const order=[...$('#job-lists').querySelectorAll('.job-row:not(.draft-job-row)')].map(row=>row.dataset.job);
 const next=navigateRows(markedJobs,selectionAnchor,row.dataset.job,order,e);if(!next)return;
 e.preventDefault();if(busy)return;
 markedJobs=next.selected;selectionAnchor=next.anchor;jobCursor=next.cursor;renderPipeline();
 [...$('#job-lists').querySelectorAll('.job-row')].find(row=>row.dataset.job===jobCursor)?.scrollIntoView({block:'nearest'});
 if(next.inspect)selectJob(jobCursor);
});
let activeConnection=null,connectionNavigationSerial=0;const consumeConnectionNavigation=connectionNavigation();
function canonicalConnectionFile(file){if(typeof file!=='string')return '';const alias=state.jobs.filter(j=>j.alias&&j.alias!=='None').sort((a,b)=>b.alias.length-a.alias.length).find(j=>file.startsWith(j.alias));return (alias?alias.name+file.slice(alias.alias.length):file).replace(/^\.\//,'');}
function previousAlignmentProducer(file){const target=canonicalConnectionFile(file);if(!target)return null;return state.jobs.find(job=>config.layout.find(item=>item.id===job.type)?.name==='Align tilt-series'&&((job.outputs||[]).some(output=>canonicalConnectionFile(output)===target)||target.startsWith(canonicalConnectionFile(job.name))));}
function highlightConnection(){workspaceFeed?.connection(activeConnection);
 document.querySelectorAll('.connection-file-highlight').forEach(e=>{e.classList.remove('connection-file-highlight','connection-file-warning');});
 if(!activeConnection||![activeConnection.source,activeConnection.target].includes(selected))return;
 const matches=value=>activeConnection.files.some(f=>canonicalConnectionFile(f)===canonicalConnectionFile(value));
 const warning=['Failed','Aborted'].includes(current()?.status);
 for(const input of document.querySelectorAll('#parameters input,#parameters select'))if(matches(input.value)){input.classList.add('connection-file-highlight');input.classList.toggle('connection-file-warning',warning);}
 for(const node of document.querySelectorAll('#node-list [data-node-file]'))if(matches(node.dataset.nodeFile)){node.classList.add('connection-file-highlight');node.classList.toggle('connection-file-warning',warning);}
}
async function activateConnection(edge){
 if(busy)return;edge={...edge,navigationId:++connectionNavigationSerial};activeConnection=edge;const name=selected===edge.source?edge.target:edge.source;
 const job=state.jobs.find(j=>j.name===name);if(!job)return;
 markedJobs=new Set([name]);selectionAnchor=name;jobCursor=name;await selectJob(name);if(selected!==name||activeConnection!==edge)return;
 const field=Object.entries(values).find(([key,value])=>activeConnection.files.some(f=>canonicalConnectionFile(f)===canonicalConnectionFile(value)));
 if(field){const matchingTab=Object.entries(tabMap()).find(([,keys])=>keys.includes(field[0]));if(matchingTab){tab=matchingTab[0];renderEditor();}}
 highlightConnection();[...document.querySelectorAll('.job-row')].find(r=>r.dataset.job===name)?.scrollIntoView({block:'nearest',inline:'nearest'});
 document.querySelector('#node-list .connection-file-highlight')?.scrollIntoView({block:'nearest',inline:'nearest'});
}
function appendConnectionNode(node,file,kind){node.dataset.nodeFile=file;node.dataset.nodeKind=kind;const icon=nodeSymbol(file,state.nodes.find(n=>n.name===file)?.type||'',kind);if(node.classList.contains('map-node'))node.insertBefore(icon,node.querySelector('.map-open'));else{const content=el('div',undefined,'inspector-node-content');content.append(...node.childNodes);node.append(content,icon);node.classList.add('inspector-file-node');}$('#node-list').append(node);} 
async function selectJob(name){if(busy)return;if(pinnedPanel.focus(name))return;const serial=++loadSerial;if(workspaceFeed?.findJob(name))return;try{const data=await api('job?name='+encodeURIComponent(name));if(serial!==loadSerial)return;if(!config.layout.some(x=>x.id===data.type))throw Error('This pipeline contains a non-SPA job.');drafts.set(type,{...values});if(data.type!==type)tab=null;selected=name;selectedIsContinuation=!!data.isContinue;inspectedSavedModes.set(name,data.values.do_cryocare_train==='Yes');type=data.type;values={...newDefaults(type),...data.values};$('#alias').value=current()?.alias==='None'?'':(current()?.alias.split('/').filter(Boolean).at(-1)||'');renderEditor();renderPipeline();renderInspector();}catch(e){notify(e.message,true);}}
function renderInspector(){const j=current();$('#node-list').replaceChildren();if(!j){loadLog();$('#node-list').append(el('div','Select a pipeline job to inspect its files.','empty'));$('#log').textContent='Select a job to view its raw output.';return;}for(const r of j.manualRequirements||[]){const notice=el('div',undefined,'manual-input-notice');notice.append(el('strong',r.exists?'Manual input present':'Manual preparation pending'),el('p',r.file),el('p',r.instruction));if(!r.exists)notice.append(el('small','RELION waits for this file before starting the dependent job.'));$('#node-list').append(notice);}if((currentLayout().name==='Manual picking'||(currentLayout().name==='Auto-picking'&&values.continue_manual==='Yes'))&&j.status==='Running'){const link=el('a','Resume browser picking ↗','node-button');link.href='/picker.html#'+new URLSearchParams({job:j.name,token,theme:document.documentElement.dataset.theme||'light'});link.target='_blank';link.rel='noopener noreferrer';$('#node-list').append(link);}if(config.mode==='tomo'&&currentLayout().name==='Exclude tilt-images'&&j.status==='Running'){const link=el('a','Resume browser tilt exclusion ↗','node-button');link.href='/excluder.html#'+new URLSearchParams({job:j.name,edit:'1',token,theme:document.documentElement.dataset.theme||'light'});link.target='_blank';link.rel='noopener noreferrer';$('#node-list').append(link);}if(config.mode==='tomo'&&currentLayout().name==='Pick tomograms'&&j.status==='Running'){const link=el('a','Resume browser tomogram picking ↗','node-button');link.href='/tomo_pick.html#'+new URLSearchParams({job:j.name,edit:'1',token,theme:document.documentElement.dataset.theme||'light'});link.target='_blank';link.rel='noopener noreferrer';$('#node-list').append(link);}if(config.mode!=='tomo'&&currentLayout().name==='Subset selection'&&j.status==='Running'){const link=el('a','Resume browser selection ↗','node-button');link.href='/gallery.html#'+new URLSearchParams({selection:j.name,token,theme:document.documentElement.dataset.theme||'light'});link.target='_blank';link.rel='noopener noreferrer';$('#node-list').append(link);}if(currentLayout().name==='Screening'){const link=el('a',j.status==='Running'?'Resume screening gallery ↗':'View screening selection ↗','node-button');link.href='/gallery.html#'+new URLSearchParams({screening:j.name,token,theme:document.documentElement.dataset.theme||'light'});link.target='_blank';link.rel='noopener noreferrer';$('#node-list').append(link);}for(const [kind,files]of [['Input',j.inputs],['Output',currentLayout().id===58&&inspectedSavedModes.get(j.name)?[...j.outputs.filter(f=>!/(?:^|\/)tomograms\.star$/i.test(f)&&!f.endsWith('/denoising_model.tar.gz')),j.name+'denoising_model.tar.gz']:j.outputs]])for(const originalFile of files){const intermediate=kind==='Output'&&j.status==='Running'&&j.intermediateMaps?.[originalFile];const file=intermediate||originalFile;if(kind==='Output'&&['Scheduled','Running'].includes(j.status)&&!intermediate){
 const hint='Output actions are available after this job finishes.';
 if(isMapNode(file,state.nodes)||/\.(cif|mmcif)$/i.test(file)){const row=el('div',undefined,'map-node output-pending'),label=el('div');label.append(el('small','OUTPUT'),el('span',file));const open=el('span','↗','map-open');open.setAttribute('aria-disabled','true');row.title=hint;row.append(label,open);appendConnectionNode(row,file,kind);}
 else{const row=el('div',undefined,'node-button output-pending');row.append(el('span','OUTPUT'),document.createTextNode(file));row.title=hint;row.setAttribute('aria-disabled','true');appendConnectionNode(row,file,kind);}continue;
 }if(kind==='Output'&&currentLayout().id===58&&/\.tar\.gz$/i.test(file)){const row=el('div',undefined,'node-button');row.append(el('span','OUTPUT'),document.createTextNode(file));row.title='Trained cryoCARE model archive — used as input for Prediction; no visualization available.';appendConnectionNode(row,file,kind);continue;}if(currentLayout().name==='Screening'&&/\.mrc$/i.test(file)&&state.nodes.some(n=>n.name===file&&n.type==='Image2D.mrc')){const b=el('button','OUTPUT · '+file+' — download gain reference','node-button');b.onclick=()=>task(()=>downloadMap(file,token));appendConnectionNode(b,file,kind);continue;}if(currentLayout().name==='Screening'&&state.nodes.some(n=>n.name===file&&n.type==='Directory')){const row=el('div','OUTPUT · '+file+' — ready for Import','node-button');appendConnectionNode(row,file,kind);continue;}if(currentLayout().name==='Screening'&&file.endsWith('/copy_selected.sh')){const b=el('button','Download '+file,'node-button');b.onclick=()=>task(async()=>{const response=await fetch('/api/screening-script?job='+encodeURIComponent(j.name),{headers:{'X-Relion-Token':token}});if(!response.ok)throw Error((await response.json()).error);const url=URL.createObjectURL(await response.blob()),a=el('a');a.href=url;a.download='copy_selected.sh';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});appendConnectionNode(b,file,kind);continue;}if(isMapNode(file,state.nodes)||/\.(cif|mmcif)$/i.test(file)){
 const row=el('div',undefined,'map-node');const label=el('div');label.append(el('small',intermediate?'OUTPUT · LATEST AVAILABLE ITERATION':kind.toUpperCase()));
 const link=el('a',file);link.href='#';link.title='Download file';link.onclick=e=>{e.preventDefault();task(()=>downloadMap(file,token));};label.append(link);
 const open=el('a','↗','map-open');open.href=mapViewerURL(file,token,document.documentElement.dataset.theme||'light');open.onclick=()=>{open.href=mapViewerURL(file,token,document.documentElement.dataset.theme||'light');};open.target='_blank';open.rel='noopener noreferrer';open.title='Open in 3D viewer in a new tab';open.setAttribute('aria-label','Open '+file+' in 3D viewer (new tab)');row.append(label,open);appendConnectionNode(row,file,kind);continue;
 }if(/\.sav$/i.test(file)){const row=el('div',undefined,'node-button');row.append(el('span',kind.toUpperCase()),document.createTextNode(file));row.title='Trained Topaz model for picking';appendConnectionNode(row,file,kind);continue;}if(/\.pdf$/i.test(file)){const link=el('a',undefined,'node-button');link.append(el('span',kind.toUpperCase()),document.createTextNode(file+' ↗'));link.target='_blank';link.rel='noopener noreferrer';const setURL=()=>{link.href='/pdf-viewer.html#'+new URLSearchParams({file,token,theme:document.documentElement.dataset.theme||'light'});};setURL();link.onclick=setURL;link.title='Open PDF in a new browser tab';appendConnectionNode(link,file,kind);continue;}if(config.mode==='tomo'&&currentLayout().id===55&&kind==='Output'&&/(?:^|\/)aligned_tilt_series\.star$/i.test(file)){const link=el('a',undefined,'node-button');link.append(el('span',kind.toUpperCase()),document.createTextNode(file+' ↗'));link.href='/tomo_pick.html#'+new URLSearchParams({file,job:j.name,aligned:'1',token,theme:document.documentElement.dataset.theme||'light'});link.target='_blank';link.rel='noopener noreferrer';link.title='Inspect output tilt stacks as Z slices';appendConnectionNode(link,file,kind);continue;}if(config.mode==='tomo'&&/(?:^|\/)[^/]*tilt_series(?:_ctf)?\.star$/i.test(file)){const link=el('a',undefined,'node-button');link.append(el('span',kind.toUpperCase()),document.createTextNode(file+' ↗'));link.href='/excluder.html#'+new URLSearchParams({file,token,theme:document.documentElement.dataset.theme||'light'});link.target='_blank';link.rel='noopener noreferrer';link.title='Inspect tilt-series images in the browser';appendConnectionNode(link,file,kind);continue;}if(kind==='Output'&&currentLayout().id===4&&/(?:^|\/)autopick\.star$/i.test(file)){const link=el('a',undefined,'node-button');link.append(el('span',kind.toUpperCase()),document.createTextNode(file+' ↗'));const setURL=()=>{link.href='/picker.html#'+new URLSearchParams({job:j.name,readonly:'1',token,theme:document.documentElement.dataset.theme||'light'});};setURL();link.onclick=setURL;link.target='_blank';link.rel='noopener noreferrer';link.title='Inspect picked particles (read-only)';appendConnectionNode(link,file,kind);continue;}const b=el('button',undefined,'node-button');b.append(el('span',kind.toUpperCase()),document.createTextNode(file));if(/\.star$/i.test(file)&&((config.mode==='tomo'&&(/(?:^|\/)tomograms\.star$/i.test(file)||([59,7,51,9].includes(currentLayout().id)&&/(?:^|\/)particles\.star$/i.test(file))))||(kind==='Output'&&[56,58].includes(currentLayout().id)&&/tomograms\.star$/i.test(file))||/^(OptimiserData|ProcessData\.star\.relion\.optimiser(?:\.|$)|Image2DGroupMetadata|ParticleGroupMetadata|MicrographGroupMetadata)/.test(state.nodes.find(n=>n.name===file)?.type||''))){const link=el('a',undefined,'node-button');link.append(el('span',kind.toUpperCase()),document.createTextNode(file+' ↗'));link.target='_blank';link.rel='noopener noreferrer';const setURL=()=>{link.href=(config.mode==='tomo'&&(/(?:^|\/)tomograms\.star$/i.test(file)||([59,7,51,9].includes(currentLayout().id)&&/(?:^|\/)particles\.star$/i.test(file)))?'/tomo_pick.html#':'/gallery.html#')+new URLSearchParams({file,job:j.name,token,theme:document.documentElement.dataset.theme||'light'});};setURL();link.onclick=setURL;link.title=link.href.includes('/tomo_pick.html#')?'Open tomograms and particle coordinates':currentLayout().id===58?'Open denoised tomogram slices in the browser gallery':currentLayout().id===56?'Open reconstructed tomogram slices in the browser gallery':'Open interactive 2D gallery';appendConnectionNode(link,file,kind);continue;}b.title='Open native viewer on workstation';b.onclick=()=>task(async()=>{try{await api('display',{job:j.name,file});}catch(e){console.warn('Viewer request failed (see server terminal):',e.message);}});appendConnectionNode(b,file,kind);}if(!j.inputs.length&&!j.outputs.length)$('#node-list').append(el('div','No registered input/output nodes.','empty'));highlightConnection();loadLog();}
const convergenceScaled=$('#convergence-scaled');
try{convergenceScaled.checked=localStorage.getItem('relion-convergence-scaled')!=='false';}catch{}
function applyConvergenceScale(){
 $('#convergence').classList.toggle('unscaled',!convergenceScaled.checked);
}
convergenceScaled.onchange=()=>{
 applyConvergenceScale();
 try{localStorage.setItem('relion-convergence-scaled',String(convergenceScaled.checked));}catch{}
};
applyConvergenceScale();
async function loadLog(canApply=()=>true){const available=['2D classification','3D classification','3D auto-refine'].includes(config.layout.find(l=>l.id===current()?.type)?.name);$('[data-log=convergence]').hidden=!available;if(!available&&logKind==='convergence')logKind='stdout';$$('[data-log]').forEach(b=>b.classList.toggle('active',b.dataset.log===logKind));$('#convergence-scale-control').hidden=logKind!=='convergence';$('#convergence').hidden=logKind!=='convergence';$('#log').hidden=logKind==='convergence';if(!selected)return;if(logKind==='convergence'){const name=selected;try{const data=await api('convergence?job='+encodeURIComponent(name));if(canApply()&&selected===name&&logKind==='convergence'){const box=$('#convergence'),old=box.querySelector('.convergence-plot')?.scrollLeft||0;drawConvergence(box,data,{iteration:refinementThumbIteration,onIteration:config.layout.find(l=>l.id===current()?.type)?.name==='3D classification'?iteration=>{
 refinementThumbIteration=iteration;refinementThumbRevision++;refinementThumbTime=0;updateRefinementThumbnail();loadLog(canApply);
}:null});for(const plot of box.querySelectorAll('.convergence-plot'))plot.scrollLeft=old;}}catch(e){if(canApply()&&selected===name&&logKind==='convergence')$('#convergence').textContent=e.message;}return;}const name=selected,kind=logKind;try{const r=await api(`log?job=${encodeURIComponent(name)}&kind=${kind}`);if(!canApply()||selected!==name||logKind!==kind)return;const box=$('#log'),position=box.scrollTop,bottom=box.scrollHeight-position-box.clientHeight<30;const text=['stdout','stderr'].includes(kind)?terminalText(r.text):r.text;const job=current(),jobType=config.layout.find(l=>l.id===job?.type)?.name;const content=document.createDocumentFragment();for(const part of iterationLogParts(text||'(empty)',job,jobType,kind,r.iterationFiles||[])){if(!part.file){content.append(document.createTextNode(part.text));continue;}const link=el('a',part.text,'iteration-map-link');const setURL=()=>{link.href=part.viewer==='gallery'?'/gallery.html#'+new URLSearchParams({file:part.file,job:job.name,token,theme:document.documentElement.dataset.theme||'light'}):mapViewerURL(part.file,token,document.documentElement.dataset.theme||'light');};setURL();link.onclick=setURL;link.target='_blank';link.rel='noopener noreferrer';link.title='Open '+part.file+(part.viewer==='gallery'?' in the 2D gallery':' in the 3D viewer');content.append(link);}box.replaceChildren(content);box.scrollTop=bottom?box.scrollHeight:position;}catch(e){if(canApply()&&selected===name)$('#log').textContent=e.message;}}
$$('[data-log]').forEach(b=>b.onclick=()=>{logKind=b.dataset.log;$$('[data-log]').forEach(x=>x.classList.toggle('active',x===b));loadLog();});
$('#copy-log').onclick=async()=>{
 try{
  const text=$('#log').textContent;
  if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(text);
  else{const input=document.createElement('textarea');input.value=text;input.style.position='fixed';input.style.opacity='0';document.body.append(input);try{input.select();if(!document.execCommand('copy'))throw Error('Select the log text and copy it with Ctrl+C.');}finally{input.remove();}}
  notify('Copied.');
 }catch(e){notify(e.message,true);}
};
let stateUpdateSerial=0;
async function update(refresh=false,canApply=()=>true,suppliedState=null){const serial=++stateUpdateSerial;const next=suppliedState||await api(refresh&&!config.readonly?'refresh':'state',refresh&&!config.readonly?{}:undefined);if(serial!==stateUpdateSerial||!canApply())return;const hadTools=type!==undefined&&showContinuationTools(),previousStatus=current()?.status,previousManual=JSON.stringify(current()?.manualRequirements),previousMaps=JSON.stringify(current()?.intermediateMaps),previousHealth=JSON.stringify(state.executableHealth);state=next;
 if(next.executionMode&&config.cluster!==(next.executionMode==='cluster')){
  const fresh=await api('config');config.cluster=fresh.cluster;config.submissionScripts=fresh.submissionScripts;config.executionDefaults=fresh.executionDefaults;
  renderEditor();
 }
 syncExecutionMode();workspaceFeed?.state(next);if(type!==undefined&&previousHealth!==JSON.stringify(state.executableHealth))renderEditor();workspaceMissing=embeddedWorkspace&&!!selected&&!current();renderTypes();applySequentialDefaults();highlightPendingInputs();showReferenceResolution();applyAngularSamplingDefault();const size=state.projectSize;$('#project-size').hidden=!size;$('#project-size').textContent=size?(size.value?'· '+size.value+' used · '+(size.free||'unknown')+' free'+(size.pending?' (updating…)':''):size.error?'· Size unavailable':'· Measuring size…'):'';rememberCompletions();if(type!==undefined&&(hadTools!==showContinuationTools()||(!workspaceFeed&&previousStatus!==current()?.status)))renderEditor();$('#connection').textContent='● Connected';$('#connection').dataset.status='connected';$('#connection').title='';renderPipeline();if(selected){if(!current()){if(embeddedWorkspace){$('#editor-selected-name').textContent=selected+' · removed from pipeline';$('#node-list').textContent='This job is no longer in the pipeline. Restore it from Trash to use it again.';setButtons();}else{++loadSerial;selected=null;$('#alias').value='';if(!workspaceFeed)renderEditor();renderInspector();}}else if(previousStatus!==current().status||previousManual!==JSON.stringify(current()?.manualRequirements)||previousMaps!==JSON.stringify(current()?.intermediateMaps))renderInspector();else await loadLog(canApply);}}
$('#refresh').onclick=()=>task(async()=>{await update(true);await workspaceFeed?.refresh();});
function showRefreshState(){
 $('#pause-refresh').textContent=refreshPaused?'Resume auto-refresh':'Pause auto-refresh';
 $('#pause-refresh').setAttribute('aria-pressed',String(refreshPaused));
 $('#refresh-status').textContent=refreshPaused?'Auto-refresh paused':'Auto-refresh · 5 s';
}
async function poll(){
 if(refreshPaused||polling||busy||!config?.initialized||(embeddedWorkspace&&!workspaceVisible))return;
 const generation=refreshGeneration,canApply=()=>!refreshPaused&&generation===refreshGeneration&&(!embeddedWorkspace||workspaceVisible);
 polling=true;
 try{await update(!embeddedWorkspace&&!config.readonly&&!config.demo,canApply);}
 catch(e){if(canApply()){$('#connection').textContent='● Connection error';$('#connection').dataset.status='error';$('#connection').title=e.message;}}
 finally{polling=false;}
}
$('#pause-refresh').onclick=()=>{
 refreshPaused=!refreshPaused;++refreshGeneration;
 sessionStorage.setItem('relion-refresh-paused',String(refreshPaused));workspaceFeed?.pause(refreshPaused);showRefreshState();
 if(!refreshPaused)poll();
};
showRefreshState();

function verificationContent(verification){const sourceType=type,sourceValues=values;const content=el('div');for(const item of verification.report){const row=el('p');row.append(el('strong',item.severity.toUpperCase()+': '),document.createTextNode((item.job?item.job+' · ':'')+item.file+' — '+item.message));content.append(row);if(item.field==='fn_gain_ref'&&currentLayout().name==='Motion correction'&&!item.step)for(const file of item.gainCandidates||[]){const button=el('button','Use '+file);button.type='button';button.onclick=async()=>{let converted;try{converted=await api('motion-gain-reference?'+new URLSearchParams({file}));}catch(error){notify('Gain conversion failed: '+error.message,true);return;}if(type!==sourceType||values!==sourceValues){notify('The editor changed; review the current job.',true);return;}values.fn_gain_ref=converted.path;drafts.set(type,{...values});$('#dialog').close();tab=Object.entries(tabMap()).find(([,keys])=>keys.includes('fn_gain_ref'))?.[0]||tab;renderEditor();workspaceChanged();notify('Gain reference filled. Review it, then submit again to verify the updated inputs.');};content.append(button);}}return content;}
function showVerification(result,proceed){const content=verificationContent(result.verification);content.prepend(el('p',result.verification.scheduler?'The scheduler will honour the minimum start delay, then verify inputs and wait for running producers to succeed before each job. It stops if a producer fails or required inputs remain missing.':'Review these input issues before submitting. Pending inputs are expected from earlier scheduled or running jobs.'));modal('Input verification',content,[{label:'Cancel',run:async()=>$('#dialog').close()},{label:result.verification.scheduler?'Acknowledge and start scheduler':'Proceed anyway',primary:true,run:async()=>{$('#dialog').close();await proceed();}}]);}
async function uniqueContinuationForPreview(){
 if(!selected||!schema().options.some(f=>f.key==='fn_cont')||values.fn_cont?.trim()||(current()?.status==='Scheduled'&&!selectedIsContinuation))return;
 const editor=values,job=selected,jobType=type;
 const result=await api('inputs?'+new URLSearchParams({type:String(jobType),field:'fn_cont',job}));
 if(values!==editor||selected!==job||type!==jobType)throw Error('The selected job changed while looking for its continuation file. Check the command again.');
 if(values.fn_cont?.trim()||result.truncated)return;
 const candidates=[...new Set(result.entries.filter(e=>e.available&&e.job===job&&!e.directory).map(e=>e.path))];
 if(candidates.length!==1)return;
 return candidates[0];
}
async function submit(action,duplicateApproval,verificationApproval,alignmentApproval){if(pinnedId){workspaceChanged();return window.parent.relionPinSubmit?.(pinnedId,action);}if(['run','schedule'].includes(action)&&currentLayout().name==='Align tilt-series'){const input=values.in_tiltseries||'',source=previousAlignmentProducer(input);if(source&&alignmentApproval!==input){const content=el('div');content.append(el('p','This input was produced by another Align tilt-series job:'),el('p',source.name+' · '+input),el('p','Using an alignment output as input to another alignment is unusual. Confirm that you intend to align these tilt images again.'));modal('Check Align tilt-series input',content,[{label:'Cancel',run:()=>$('#dialog').close()},{label:'Use this input',primary:true,run:async()=>{$('#dialog').close();await submit(action,duplicateApproval,verificationApproval,input);}}]);return;}}await task(async()=>{const previewContinuation=action==='preview'?await uniqueContinuationForPreview():undefined;if(action!=='preview'&&!selected&&!pinnedSeed?.continuation&&'fn_cont' in values)values.fn_cont='';clearTimeout(maskTimer);const prepared={type,selected,input:values.fn_img};await applyMaskDefault();await applyCtfPowerRule();if(type!==prepared.type||selected!==prepared.selected||values.fn_img!==prepared.input)throw Error('The input changed while preparing the job. Review it and submit again.');const commandValues=action==='preview'?{...values,...(!selected&&!pinnedSeed?.continuation&&'fn_cont' in values?{fn_cont:''}:previewContinuation?{fn_cont:previewContinuation}:{})}:values;const result=await api(action,{type,values:commandValues,duplicateApproval,verificationApproval,executionRevision:config.executionRevision,existing:selected||'',alias:$('#alias').value.trim()});if(result.configurationWarning){
 const context={type,selected};modal(result.title||'Motion correction settings',result.message,[{label:'Cancel',run:async()=>$('#dialog').close()},{label:result.actionLabel||'Apply fixes and continue',primary:true,run:async()=>{
  if(type!==context.type||selected!==context.selected)throw Error('The selected job changed. Review its settings and submit again.');
  values={...values,...result.changes};drafts.set(type,{...values});renderEditor();$('#dialog').close();await submit(action,duplicateApproval,verificationApproval,alignmentApproval);
 }}]);return;
 }if(result.verificationWarning){showVerification(result,()=>submit(action,duplicateApproval,result.approval,alignmentApproval));return;}if(result.duplicateWarning){const content=el('div');content.append(el('p','An identical job has already been executed. Run again only if you intend to repeat it.'));for(const match of result.matches)content.append(el('p',match.name+' · '+match.status+(match.alias&&match.alias!=='None'?' · '+match.alias:'')));modal('Identical job already exists',content,[{label:'Cancel',run:async()=>$('#dialog').close()},{label:action==='schedule'?'Schedule anyway':'Run anyway',primary:true,run:async()=>{$('#dialog').close();await submit(action,result.approval,verificationApproval,alignmentApproval);}}]);return;}if(action==='preview'){const content=el('div');content.append(el('p','Command generated by RELION. Preview does not execute it.'),el('pre',result.command));if(config.demo)content.firstChild.textContent='Demonstration mode';if(result.verification?.report.length)content.append(verificationContent(result.verification));if(result.checks?.length){content.append(el('h3','Executable resolution'));for(const check of result.checks)content.append(el('div',check.name+' → '+(check.path|| (check.required?'NOT FOUND in PATH':'deferred to queue worker'))));}modal('Check command',content);return;}if(result.browserScreening){const link=el('a','Open screening gallery ↗');link.href='/gallery.html#'+new URLSearchParams({screening:result.name,token,theme:document.documentElement.dataset.theme||'light'});link.target='_blank';link.rel='noopener noreferrer';modal('Screen data collection',link);}if(result.browserExclusion){const link=el('a','Open tilt-image excluder ↗');link.href='/excluder.html#'+new URLSearchParams({job:result.name,edit:'1',token,theme:document.documentElement.dataset.theme||'light'});link.target='_blank';link.rel='noopener noreferrer';modal('Exclude tilt-images',link);}if(result.browserTomo){const link=el('a','Open tomogram picking editor ↗');link.href='/tomo_pick.html#'+new URLSearchParams({job:result.name,edit:'1',token,theme:document.documentElement.dataset.theme||'light'});link.target='_blank';link.rel='noopener noreferrer';modal('Pick tomograms',link);}if(result.browserPicking){const link=el('a','Open manual picker ↗');link.href='/picker.html#'+new URLSearchParams({job:result.name,token,theme:document.documentElement.dataset.theme||'light'});link.target='_blank';link.rel='noopener noreferrer';modal('Manual picking',link);}if(result.browserSelection){const link=el('a','Open selection gallery ↗');link.href='/gallery.html#'+new URLSearchParams({selection:result.name,token,theme:document.documentElement.dataset.theme||'light'});link.target='_blank';link.rel='noopener noreferrer';modal('Select images',link);}if(result.name){selected=result.name;copiedDraft=false;workspaceChanged();}notify(result.warning||`${action==='schedule'?'Scheduled':'Submitted'} ${result.name}`);await update();if(result.name)await selectJobAfterTask(result.name);});}
async function selectJobAfterTask(name){const data=await api('job?name='+encodeURIComponent(name));selected=name;selectedIsContinuation=!!data.isContinue;inspectedSavedModes.set(name,data.values.do_cryocare_train==='Yes');type=data.type;savedJobDefaults.set(type,{...data.values});values={...newDefaults(type),...data.values};renderEditor();renderPipeline();renderInspector();}
async function continueRefinementWithMask(maskJob){
 if(busy||config.readonly)return;
 const job=selected,editor=values,target=await api('mask-refinement?'+new URLSearchParams({job:maskJob}));
 if(selected!==job||values!==editor||target.job!==job||busy)throw Error('The selected refinement changed; please try again.');
 if(values.fn_mask?.trim())throw Error('This refinement editor already has a mask. Review it and use Continue! manually.');
 if(!values.fn_cont?.trim()){
  const result=await api('inputs?'+new URLSearchParams({type:String(type),field:'fn_cont',job,iterations:'yes'}));
  if(selected!==job||values!==editor||busy)return;
  const file=result.entries.find(e=>e.available&&e.job===job);
  if(!file)throw Error('No ready continuation optimiser was found for '+job);
  if(!values.fn_cont?.trim())values.fn_cont=file.path;
 }
 if(values.fn_mask?.trim())throw Error('The mask input changed while preparing continuation. Review it and use Continue! manually.');
 values.fn_mask=target.mask;values.do_solvent_fsc='Yes';tab='I/O';drafts.set(type,{...values});renderEditor();workspaceChanged();
 await $('#run').onclick();
}
async function continueAutopickManually(name){
 if(busy||selected!==name||config.readonly)return;
 await update();
 if(selected!==name||busy)return;
 if(!canContinueAutopick(current(),values,currentLayout()))throw Error('Manual continuation is available only for finished Auto-picking jobs that produced picks, not Topaz training jobs.');
 values.continue_manual='Yes';drafts.set(type,{...values});renderEditor();workspaceChanged();
 // Reuse Continue!, including input verification and other-running-job warnings.
 await $('#run').onclick();
}
$('#run').onclick=async()=>{if(pinnedId){workspaceChanged();return window.parent.relionPinSubmit?.(pinnedId,'run');}
 const name=selected,action=name&&current()?.status!=='Scheduled'?'continue':'run';
 if(!name){await submit(action);return;}
 try{const latest=await api('state');if(selected!==name)return;const running=latest.jobs.filter(j=>j.status==='Running'&&j.name!==name);
 if(running.length){const message=running.map(j=>j.name).join(', ')+(running.length===1?' is running.':' are running.')+'\n\nAre you sure you want to '+(action==='continue'?'continue':'run')+' '+name+' now?';modal('Other jobs are running',message,[{label:'Cancel',run:async()=>$('#dialog').close()},{label:action==='continue'?'Continue anyway':'Run anyway',primary:true,run:async()=>{$('#dialog').close();if(selected!==name){notify('The selected job changed. Review it and try again.',true);return;}await submit(action);}}]);return;}
 await submit(action);
 }catch(e){notify(e.message,true);}
};$('#schedule').onclick=()=>submit('schedule');$('#check-command').onclick=()=>submit('preview');$('#new-job').onclick=()=>{ctfSession=ctfPreviewSession();if(embeddedWorkspace){window.parent.relionFeedNew?.(workspaceId,workspaceSnapshot());return;}copiedDraft=true;workspaceFeed?.newDraft();++loadSerial;selected=null;selectedIsContinuation=false;$('#alias').value='';renderEditor();renderPipeline();renderInspector();};
let candidateHoverJob=null;
function paintCandidateHover(scroll=false){
 const rows=[...$('#job-lists').querySelectorAll('.job-row')];
 for(const row of rows)row.classList.toggle('candidate-job-highlight',row.dataset.job===candidateHoverJob);
 const row=rows.find(row=>row.dataset.job===candidateHoverJob);
 if(scroll&&row){const result=centerPipelineRow(row);if(result)jobSectionScroll.set(result.list.dataset.section,result.top);}
}
window.relionCandidateHover=(file,job)=>{
 if(embeddedWorkspace){window.parent.relionCandidateHover?.(file,job);return;}
 let name=null;
 if(file){
  let value=file;if(config?.project&&value.startsWith(config.project.replace(/\/$/,'')+'/'))value=value.slice(config.project.replace(/\/$/,'').length+1);
  value=canonicalConnectionFile(value);
  name=state.jobs.find(j=>j.name===job)?.name||state.jobs.find(j=>(j.outputs||[]).some(f=>canonicalConnectionFile(f)===value))?.name||[...state.jobs].sort((a,b)=>b.name.length-a.name.length).find(j=>value.startsWith(j.name))?.name||null;
 }
 const changed=name!==candidateHoverJob;candidateHoverJob=name;paintCandidateHover(changed);
};
$('#dialog').addEventListener('close',()=>window.relionCandidateHover(null));
async function browseFiles(field,input,exotic=false,browseContext=null){
 window.relionCandidateHover(null);
 const continuation=field.key==='fn_cont',jobType=browseContext?.type??type,modelAngeloSequence=config.layout.find(l=>l.id===jobType)?.name==='ModelAngelo building'&&['p_seq','d_seq','r_seq','fn_lib'].includes(field.key),typed=!exotic&&!modelAngeloSequence&&(field.type===3||continuation);let folder=field.key==='care_denoising_model'&&state.jobs.some(j=>j.name.startsWith('Denoise/'))?'Denoise':'.',entries=[],serial=0,timer;
 const initial=input.value.slice(0,input.value.lastIndexOf('/'));if(!typed&&!exotic&&input.value.includes('/')&&!/[?*{}]/.test(initial))folder=initial||'/';
 const content=el('div'),search=el('input'),nodes=el('div'),summary=el('p','Loading…','input-summary');
 search.placeholder=typed?'Search filenames or job aliases':'Filter by filename';search.setAttribute('aria-label',search.placeholder);
 content.append(el('p',continuation?'Latest ready continuation file from this job only.':typed?'Matching files for this input. Outputs from scheduled jobs can be selected before they are produced.':field.pattern||'Choose an input file.'));
 if(config.layout.find(l=>l.id===jobType)?.name==='Subset selection'&&['fn_mic','fn_data'].includes(field.key)){
  const toggle=el('button',exotic?'Back to pipeline inputs':'Browse alien/exotic .star files','browse-exotic');
  toggle.type='button';toggle.onclick=()=>{clearTimeout(timer);++serial;browseFiles(field,input,!exotic,browseContext);};content.append(toggle);
  if(exotic)content.firstChild.textContent='Browse any .star file inside this project. Input-column checks still apply when launching the job.';
 }
 let pathInput;
 if(!typed){pathInput=el('input');pathInput.placeholder='Project-relative directory';pathInput.setAttribute('aria-label','Directory');pathInput.value=folder;content.append(pathInput);}
 const sortLabel=el('label',undefined,'input-sort-label'),sort=el('select');sort.setAttribute('aria-label','Sort input candidates by');
 for(const [value,text] of [['number','Job number'],['type','Job type and job number']]){const option=el('option',text);option.value=value;sort.append(option);}
 sort.value='number';sortLabel.append(document.createTextNode('Sort by '),sort);sort.title='Newest jobs first; job types are grouped alphabetically';
 content.append(search,sortLabel,summary,nodes);
 const exoticToggle=content.querySelector('.browse-exotic');if(exoticToggle){const footer=el('div',undefined,'browse-exotic-footer');footer.append(exoticToggle);content.append(footer);}
 const choose=item=>{if(browseContext?.onChoose){browseContext.onChoose(item.path);$('#dialog').close();return;}values[field.key]=item.path;input.value=item.path;input.oninput?.();$('#dialog').close();input.dispatchEvent(new Event('change',{bubbles:true}));};
 const show=()=>{
  window.relionCandidateHover(null);nodes.replaceChildren();const visible=sortInputCandidates(typed?entries:entries.filter(e=>e.name.toLowerCase().includes(search.value.toLowerCase())),sort.value,state.jobs,config.layout);
  if(!typed&&folder!=='.'&&folder!=='/'){const up=el('button','↑ Parent folder','file-row');up.onclick=()=>{const parent=folder.split('/').filter(Boolean).slice(0,-1).join('/');folder=folder.startsWith('/')?'/'+parent:parent||'.';load();};nodes.append(up);}
  for(const item of visible){
   const button=el('button',undefined,'file-row input-candidate');
   const candidateType=candidateJobType(item,state.jobs,config.layout);
   if(candidateType){button.classList.add('candidate-typed');button.style.setProperty('--candidate-hue',candidateType.hue);button.dataset.jobType=candidateType.name;}
   button.title=(candidateType?candidateType.name+' · ':'')+item.path;
   button.append(el('strong',(item.directory?'▣  ':'')+item.name));
   if(typed){button.append(el('span',item.path,'candidate-path'));button.append(el('span',(item.alias&&item.alias!==item.job?item.alias+' · ':'')+(item.available?'Available':(item.reason?'Not ready · '+item.reason:'Expected output · '+item.status)),'candidate-detail'));}
   if(field.key==='fn_ref'&&!item.directory){const info=referenceResolution(item.path,state.jobs,config.project);if(info){const badge=el('span',info.text,'candidate-resolution');badge.title=info.title;badge.classList.toggle('resolution-near-nyquist',!!info.nearNyquist);button.append(badge);}}
   if(!item.directory){const reveal=()=>window.relionCandidateHover(item.path,item.job),clear=()=>window.relionCandidateHover(null);button.addEventListener('pointerenter',reveal);button.addEventListener('pointerleave',clear);button.addEventListener('focus',reveal);button.addEventListener('blur',clear);}
   button.onclick=()=>{if(item.directory){folder=item.path;load();}else choose(item);};nodes.append(button);
  }
  if(!visible.length)nodes.append(el('p',continuation?'No matching continuation files found for this job type.':typed?'No matching inputs found. Run or schedule an upstream job, or use Import for an existing dataset. You can also enter a file path directly in the input field.':'No files match this input format in this folder.','empty'));
 };
 const load=async()=>{
  const request=++serial;summary.textContent='Loading…';
  try{
   if(pathInput)pathInput.value=folder;
   const params=new URLSearchParams({type:String(jobType),field:field.key,path:folder,job:continuation?(browseContext?.job??selected??''):'',q:typed?search.value:''});
   if(exotic)params.set('mode','exotic');
   const result=await api('inputs?'+params);
   if(request!==serial)return;entries=result.entries;
   summary.textContent=(result.demo?'Demonstration · ':'')+entries.length+(typed?' matching input(s)':' file(s) / folder(s)')+(!entries.length&&typed&&config.layout.find(l=>l.id===jobType)?.name==='Motion correction'&&field.key==='input_star_mics'?' (you might have imported micrographs, not movies)':'')+(result.truncated?' · Partial list; refine your search or open a more specific folder.':'');show();
  }catch(e){if(request===serial){nodes.replaceChildren();summary.textContent=e.message;}}
 };
 sort.onchange=show;
 if(pathInput)pathInput.onchange=()=>{folder=pathInput.value||'.';load();};
 search.oninput=()=>{if(typed){clearTimeout(timer);timer=setTimeout(load,180);}else show();};
 modal('Choose input · '+field.label,content);await load();
}
$('#job-action').onchange=async e=>{const action=e.target.value;e.target.value='';if(!action||busy)return;if(action==='pinned-add'){if(embeddedWorkspace)window.parent.relionAddPinned?.();else await idealPanel.addPinned();return;}if(action.startsWith('pinned-')){if(embeddedWorkspace)window.parent.relionPinnedAction?.(action);else await pinnedPanel.action(action);return;}if([...markedJobs].some(n=>n.startsWith('Pinned/'))){notify('Use the pinned-draft actions for this selection.',true);return;}const job=selected;
 if(action==='reschedule-offset'){if(config.readonly){notify('Server is read-only',true);return;}const jobs=trashTargets(markedJobs,selected);const body=el('div');body.append(el('p','Create scheduled copies at job number + N, then move the originals to Trash. Only Scheduled jobs are accepted. Review all input changes before confirming.'));const label=el('label','Job-number offset N: '),offset=el('input');offset.type='number';offset.min='1';offset.step='1';offset.value='10';label.append(offset);body.append(label);modal('re-schedule+N',body,[{label:'Preview changes',primary:true,run:async()=>{const plan=await api('reschedule-plan',{jobs,n:Number(offset.value)});const view=el('div');view.append(el('p','These replacements will be scheduled; all originals will then move to Trash. Shared inputs not listed below remain unchanged.'));for(const item of plan.items){view.append(el('h3',item.source+' → '+item.target));for(const change of item.changes)view.append(el('p',change.field+': '+change.from+' → '+change.to));}modal('Confirm re-schedule+'+plan.n,view,[{label:'Cancel',run:async()=>$('#dialog').close()},{label:'Re-schedule '+plan.items.length+' jobs',primary:true,run:async()=>{await task(async()=>{const result=await api('reschedule',{plan:plan.id});$('#dialog').close();markedJobs.clear();selected=null;await update();renderInspector();notify('Scheduled '+result.created.length+' replacements. Originals moved to Trash.');});}}]);}}]);return;}
 if(action==='delete'||action==='delete-recursive'){if(config.readonly){notify('Server is read-only',true);return;}const jobs=trashTargets(markedJobs,selected);if(!jobs.length)return;try{await confirmTrash('delete',{jobs,recursive:action==='delete-recursive'});}catch(e){notify(e.message,true);}return;}
 if(!job)return;
 if(action==='note'){try{const r=await api('log?job='+encodeURIComponent(job)+'&kind=note');const area=el('textarea');area.value=r.text;area.setAttribute('aria-label','Job note');if(r.truncated){notify('Note is too large for this editor; edit note.txt on the workstation.',true);return;}modal('Edit note · '+job,area,[{label:'Save note',primary:true,run:async()=>{await api('note',{job,text:area.value});$('#dialog').close();loadLog();}}]);}catch(e){notify(e.message,true);}return;}
 if(config.readonly){notify('Server is read-only',true);return;}
 if(action==='alias'){const input=el('input');input.value=current()?.alias==='None'?'':current()?.alias.split('/').filter(Boolean).at(-1);input.setAttribute('aria-label','Alias');modal('Set job alias',input,[{label:'Save alias',primary:true,run:async()=>{await api('action',{action,job,alias:input.value});$('#dialog').close();await update();}}]);return;}
 const descriptions={abort:'Request RELION to abort this job. This is cooperative; it does not kill a queue allocation.', 'mark-success':'Force the job status to finished. This does not verify scientific results.', 'mark-failed':'Force the job status to failed. This does not terminate its processes.', 'gentle-clean':'Remove intermediate files using RELION’s gentle cleanup.', 'harsh-clean':'Permanently remove intermediate files using RELION’s harsh cleanup. Some continuation paths may no longer be possible.'};
 modal('Confirm job action',job+'\n\n'+descriptions[action],[{label:'Cancel',run:()=>$('#dialog').close()},{label:'Confirm',primary:true,run:async()=>{await api('action',{action,job});$('#dialog').close();await update();renderInspector();}}]);};
async function startScheduler(payload){
 const r=await api('scheduler',payload);
 if(r.verificationWarning){showVerification(r,()=>startScheduler({...payload,verificationApproval:r.approval}));return;}
 if(r.duplicateWarning){const content=el('div');content.append(el('p','These scheduled jobs match previously executed jobs:'));for(const m of r.matches)content.append(el('p',m.scheduledJob+' → '+m.name+' · '+m.status));modal('Identical jobs already exist',content,[{label:'Cancel',run:async()=>$('#dialog').close()},{label:'Start anyway',primary:true,run:async()=>startScheduler({...payload,duplicateApproval:r.approval})}]);return;}
 $('#dialog').close();notify(`${r.message}\n${r.log}`);
}
$('#hide-unrelated').onchange=()=>renderPipeline();
$('#scheduler').onclick=()=>{const jobs=state.jobs.filter(j=>j.status==='Scheduled');if(!jobs.length||busy||config.readonly||!config.initialized)return;const content=el('div');content.append(el('p','Run selected jobs in pipeline order. RELION waits for each job and its required inputs.'));const checks=[];for(const j of jobs){const label=el('label',undefined,'schedule-choice'),check=el('input');check.type='checkbox';check.value=j.name;check.checked=true;checks.push(check);label.append(check,document.createTextNode(j.name));content.append(label);}const controls={};for(const [key,label,value]of [['repeat','Repeats',1],['wait','Minimum minutes between repeats',0],['before','Minutes before first job',0]]){const l=el('label',label),input=el('input');input.type='number';input.min=key==='repeat'?'1':'0';input.value=value;controls[key]=input;l.append(input);content.append(l);}content.append(el('p','The scheduler continues if you close the browser. Repeated schedules use RELION’s RUNNING_PIPELINER marker; scheduler-stop controls are not yet included here.','warning-text'));modal('Run scheduled jobs',content,[{label:'Start scheduler',primary:true,run:async()=>{await startScheduler({jobs:checks.filter(x=>x.checked).map(x=>x.value),...Object.fromEntries(Object.entries(controls).map(([k,v])=>[k,Number(v.value)]))});}}]);};
async function start(){try{config=await api('config');syncExecutionMode();if(config.nextJobs?.errors?.length)notify('Next-job definitions: '+config.nextJobs.errors.join('; '),true);document.querySelector('.section-label span').textContent=config.mode==='tomo'?'STA':'SPA';if(config.mode==='tomo'){const tutorial=document.querySelector('.workspace-footer a');tutorial.href='https://relion.readthedocs.io/en/release-5.0/STA_tutorial/index.html';tutorial.textContent='Open the STA tutorial ↗';}document.title='RelionDeLuxe: '+config.project.replace(/[\\/]+$/,'').split(/[\\/]/).pop();$('#pause-refresh').hidden=!config.debug;$('#refresh').hidden=!config.debug;if(!config.debug){refreshPaused=false;sessionStorage.removeItem('relion-refresh-paused');}showRefreshState();completionKey='relion-completed:'+config.project;try{completedJobs=new Set(JSON.parse(localStorage.getItem(completionKey)||'[]'));}catch{completedJobs=new Set();}$('#project').textContent=config.project;$('#mode').textContent=config.demo?'DEMO · NO COMPUTATION':config.readonly?'READ ONLY':(config.mode==='tomo'?'STA':'SPA');idealPanel.load();$('#schema-info').textContent=`${config.layout.filter(l=>!l.custom).length} ${config.mode==='tomo'?'STA':'SPA'} job types + ${config.layout.filter(l=>l.custom).length} add-on · RELION owns the pipeline`;


 if(!config.initialized){modal('Initialize RELION project',`Create a RELION project in:\n${config.project}\n\nThis creates default_pipeline.star and the project marker using RELION.`,[{label:'Initialize project',primary:true,run:async()=>{await api('init',{});config.initialized=true;enforceSetupGate();$('#dialog').close();setButtons();await update();await applyCtfPowerRule();}}]);}
 state=await api('state');workspaceFeed?.sync([...state.jobs].sort(comparePipelineJobs));
 const seed=embeddedWorkspace?(pinnedId?window.parent.relionPinSeed?.(pinnedId):window.parent.relionFeedSeed?.(workspaceId)):null;
 if(pinnedId&&!seed)throw Error('Pinned draft no longer exists.');
 if(pinnedId){markedJobs=new Set(['Pinned/'+pinnedId+'/']);pinnedSeed=seed.pin;pinnedTbd=new Set(Object.keys(seed.values).filter(k=>seed.values[k]==='TBD'));}
 let failures=[];
 if(seed?.needsLoad){const data=await api('job?name='+encodeURIComponent(seed.selected));seed.type=data.type;seed.values=data.values;seed.selectedIsContinuation=!!data.isContinue;const alias=state.jobs.find(j=>j.name===seed.selected)?.alias;seed.alias=!alias||alias==='None'?'':alias.split('/').filter(Boolean).at(-1);}
 if(seed){seededInputFields=[...(seed.seededInputFields||[])];copiedDraft=!!seed.copiedDraft;for(const [t,v] of seed.defaults||[])savedJobDefaults.set(t,v);type=seed.type;selected=seed.selected;selectedIsContinuation=seed.selectedIsContinuation;values={...seed.values};if(config.mode==='tomo'&&schema().options.some(f=>f.key==='in_particles')&&!schema().options.some(f=>f.key==='fn_img'))delete values.fn_img;if(pinnedId){const defaults=newDefaults(type);for(const key of pinnedTbd)values[key]=defaults[key]??'';manualMasks.set(type,values.fn_img);}tab=seed.tab;$('#alias').value=seed.alias||'';if(selected)inspectedSavedModes.set(selected,values.do_cryocare_train==='Yes');renderEditor();}
 else {
 const newest=[...state.jobs].sort((a,b)=>Number(b.name.match(/job(\d+)/)?.[1]||0)-Number(a.name.match(/job(\d+)/)?.[1]||0));
 const latest=new Map();for(const job of newest)if(!latest.has(job.type)&&config.layout.some(l=>l.id===job.type))latest.set(job.type,job);
 failures=[];for(const [t,job] of latest){try{const data=await api('job?name='+encodeURIComponent(job.name));savedJobDefaults.set(t,{...data.values});}catch(e){failures.push(job.name);}}
 let previous;if(config.initialized&&state.jobs.length)try{previous=JSON.parse(localStorage.getItem(selectionKey())||'null');}catch{}
 type=config.layout.some(l=>l.id===previous?.type)?previous.type:(newest.find(j=>config.layout.some(l=>l.id===j.type))?.type??(config.layout.find(l=>l.name===(config.mode==='tomo'?'Import tilt series':'Import'))||config.layout[0]).id);
 values=newDefaults(type);
 if(previous?.job&&state.jobs.some(j=>j.name===previous.job&&j.type===type))await selectJob(previous.job);
 else renderEditor();

 }
 await update();renderInspector();applyMaskDefault();
 if(failures.length)notify('Could not load previous defaults from: '+failures.join(', '),true);
 enforceSetupGate();
 workspaceReady=true;
 if(!embeddedWorkspace&&selected&&workspaceFeed){markedJobs=new Set([selected]);jobCursor=selected;renderPipeline();workspaceFeed.revealInitialSelection(selected);}
 if(embeddedWorkspace){
  window.relionWorkspace={snapshot:workspaceSnapshot,active:isActive=>{$('#job-title').classList.toggle('selected-job-sheen',isActive);},replacePinned:p=>{if(!pinnedId)return;pinnedSeed=p;const incoming={...p.values};if(JSON.stringify(workspaceSnapshot().values)===JSON.stringify(incoming))return;pinnedTbd=new Set(Object.keys(incoming).filter(k=>incoming[k]==='TBD'));const defaults=newDefaults(type);values={...defaults,...incoming};for(const key of pinnedTbd)values[key]=defaults[key]??'';renderEditor();},continueManually:continueAutopickManually,continueWithMask:continueRefinementWithMask,selectTab:name=>{tab=name;renderEditor();},visibility:v=>{workspaceVisible=v;++refreshGeneration;if(v)poll();},theme:t=>{document.documentElement.dataset.theme=t;$('#theme').value=t;},defaults:(v,r)=>{const revised=r!==config.executionRevision;config.executionDefaults={...v};config.executionRevision=r;for(const [t,d] of drafts){applyWorkstation(t,d);alignmentCpuDefault(config.layout.find(l=>l.id===t),d,config.executionDefaults,config.cluster,editedInputDefaults.get(t)?.has('other_args'));}if(!selected&&(!copiedDraft||revised)){applyWorkstation(type,values);alignmentCpuDefault(currentLayout(),values,config.executionDefaults,config.cluster,editedInputDefaults.get(type)?.has('other_args'));drafts.set(type,{...values});renderEditor();}},connection:edge=>{activeConnection=edge;if(consumeConnectionNavigation(edge,selected)){const field=Object.entries(values).find(([,value])=>edge.files.some(f=>canonicalConnectionFile(f)===canonicalConnectionFile(value)));const match=field&&Object.entries(tabMap()).find(([,keys])=>keys.includes(field[0]));if(match&&match[0]!==tab){tab=match[0];renderEditor();}}highlightConnection();},selection:names=>{markedJobs=new Set(names);setButtons();},refresh:()=>update(),state:next=>update(false,()=>true,next)};
  if(pinnedId)window.parent.relionPinReady?.(pinnedId);else window.parent.relionFeedReady?.(workspaceId);
 }
 setInterval(poll,5000);
 }catch(e){$('#connection').textContent='● Disconnected';$('#job-title').textContent='Connection required';notify(e.message,true);}finally{await finishInitialLoading();}}
start();

async function confirmTrash(kind,request){
 const plan=await api(kind==='delete'?'delete-plan':'restore-plan',request);
 const content=el('div');content.append(el('p',kind==='delete'?'Move the following jobs and their directories to RELION Trash:':'Restore the following jobs, their directories and pipeline connections:'));
 const list=el('ul');for(const j of plan.jobs)list.append(el('li',j.name+' — '+j.status+(j.alias!=='None'?' · '+j.alias:'')));content.append(list);
 for(const reason of plan.blocked)content.append(el('p',reason,'dialog-error'));
 const actions=[{label:'Cancel',run:()=>$('#dialog').close()}];
 if(!plan.blocked.length&&!config.readonly)actions.push({label:kind==='delete'?'Move '+plan.jobs.length+' job(s) to Trash':'Restore '+plan.jobs.length+' job(s)',primary:true,run:async()=>{
  await api(kind==='delete'?'delete':'undelete',{plan:plan.id});$('#dialog').close();await update();renderInspector();notify(kind==='delete'?'Jobs moved to Trash.':'Jobs restored.');
 }});
 modal(kind==='delete'?'Confirm deletion':'Confirm undelete',content,actions);
}
$('#trash').onclick=()=>task(async()=>{
 const result=await api('trash');const content=el('div');
 const actions=el('div',undefined,'trash-cleanup-actions');for(const [action,label]of [['gentle','Gently clean all jobs'],['harsh','Harshly clean all jobs'],['empty','Empty trash']]){const button=el('button',label);button.disabled=config.readonly||config.demo;button.onclick=async()=>{try{const plan=action==='empty'?null:await api('project-cleanup',{action});const message=action==='empty'?'Permanently delete everything in this project’s Trash directory? Deleted jobs can no longer be undeleted.':`${label} for ${plan.jobs.length} successfully finished jobs?\n${plan.jobs.join('\n')}\n\nRELION moves cleaned files to Trash. ${action==='harsh'?'Harsh cleaning removes additional files; jobs marked NO_HARSH_CLEAN are excluded.':''}`;modal(label,message,[{label:'Cancel',run:async()=>$('#dialog').close()},{label,run:async()=>{await api('project-cleanup',{action,confirm:true,jobs:plan?.jobs});$('#dialog').close();notify(action==='empty'?'Trash emptied.':'Cleanup finished; files remain in Trash until emptied.');await update();}}]);}catch(e){notify(e.message,true);}};actions.append(button);}content.append(actions);

 if(!result.entries.length)content.append(el('p','Trash contains no deleted job groups or cleaned job files.'));
 for(const entry of result.entries){if(entry.kind==='cleaned'){const details=el('details');details.append(el('summary',entry.job+' · Cleaned files'),el('p','This job remains in the pipeline. These files were moved to Trash by cleanup.'),el('pre',entry.directory+'\n'+entry.contents.join('\n')));content.append(details);continue;}const button=el('button',entry.manifest,'file-row');button.onclick=async()=>{try{await confirmTrash('restore',{manifest:entry.manifest});}catch(e){notify(e.message,true);}};content.append(button);}
 modal('Trash · deleted jobs and cleaned files',content);
});


const pinnedPanel=mountPinnedDrafts({api,el,modal,notify,getState:()=>state,getConfig:()=>config,getDraft:()=>workspaceFeed?.draft(),discardDraft:()=>{workspaceFeed?.discardDraft();renderPipeline();},getSelection:()=>[...markedJobs],setSelection:names=>{markedJobs=new Set(names);renderPipeline();},refresh:()=>update(),startScheduler,icon:jobTypeIcon,browse:(layout,field,value,onChoose)=>browseFiles(field,{value},false,{type:layout.id,onChoose})});
if(!embeddedWorkspace){
 window.relionPinSeed=id=>pinnedPanel.seed(id);
 window.relionPinChanged=(id,snapshot)=>pinnedPanel.changed(id,snapshot);
 window.relionPinActivate=id=>pinnedPanel.activate(id);
 window.relionPinReady=id=>pinnedPanel.ready(id);
 window.relionPinSubmit=(id,action)=>{pinnedPanel.activate(id);return pinnedPanel.action(action==='run'?'pinned-run':action==='preview'?'pinned-check':'pinned-schedule');};
}
if(!embeddedWorkspace)window.relionPinnedAction=action=>pinnedPanel.action(action);
const idealPanel=mountIdealPipeline({api,modal,el,notify,task,getConfig:()=>config,getSelection:()=>[...markedJobs].filter(n=>!n.startsWith('Pinned/')),refresh:()=>update(),convertPinned:template=>pinnedPanel.convert(template)});
if(!embeddedWorkspace)window.relionAddPinned=()=>idealPanel.addPinned();

// Resize the central editor/inspector split without replacing log contents.
{
 const workspace=document.querySelector('.workspace'),inspector=document.querySelector('.inspector');
 const grip=document.createElement('div');grip.className='inspector-resizer';grip.tabIndex=0;grip.setAttribute('role','separator');grip.setAttribute('aria-orientation','horizontal');grip.setAttribute('aria-label','Resize editor and inspector');grip.title='Drag to resize editor / inspector. Arrow keys adjust; double-click resets.';inspector.before(grip);
 let ratio=.65;try{ratio=Number(localStorage.getItem('relion-inspector-split'))||ratio;}catch{}
 const apply=()=>{ratio=Math.max(.25,Math.min(.8,ratio));workspace.style.setProperty('--editor-share',ratio+'fr');workspace.style.setProperty('--inspector-share',(1-ratio)+'fr');grip.setAttribute('aria-valuenow',Math.round(ratio*100));grip.setAttribute('aria-valuemin','25');grip.setAttribute('aria-valuemax','80');};
 const save=()=>{try{localStorage.setItem('relion-inspector-split',ratio);}catch{}};apply();
 const size=()=>{if(!embeddedWorkspace&&innerWidth<=900){workspace.style.removeProperty('height');return;}workspace.style.height=Math.max(0,innerHeight-workspace.getBoundingClientRect().top)+'px';};
 window.addEventListener('resize',size);
 for(const selector of ['.topbar','.projectbar']){const bar=document.querySelector(selector);if(bar)new ResizeObserver(size).observe(bar);}
 requestAnimationFrame(size);

 grip.onpointerdown=e=>{if(e.button!==0)return;e.preventDefault();grip.setPointerCapture(e.pointerId);const start=e.clientY,editor=workspace.querySelector('.editor'),height=editor.getBoundingClientRect().height+inspector.getBoundingClientRect().height,initial=editor.getBoundingClientRect().height/Math.max(1,height);grip.classList.add('dragging');grip.onpointermove=e=>{ratio=initial+(e.clientY-start)/Math.max(1,height);apply();};};
 const stop=()=>{grip.onpointermove=null;grip.classList.remove('dragging');save();};grip.onpointerup=e=>{if(grip.hasPointerCapture(e.pointerId))grip.releasePointerCapture(e.pointerId);stop();};grip.onpointercancel=stop;grip.onlostpointercapture=stop;
 grip.onkeydown=e=>{if(!['ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();ratio+=e.key==='ArrowUp'?-.02:.02;apply();save();};grip.ondblclick=()=>{ratio=.65;apply();save();};
}

if(!embeddedWorkspace){
 nextJobPrompt=el('div',undefined,'next-job-prompt');nextJobPrompt.hidden=true;
 nextJobButton=el('button',undefined,'next-job-button');nextJobButton.type='button';nextJobButton.id='next-job';
 workspaceFeed=createWorkspaceFeed({root:document.querySelector('.workspace'),footer:document.querySelector('.workspace-footer'),
 onActivate:(d,fromEntry,centerRow)=>{seededInputFields=[...(d.seededInputFields||[])];copiedDraft=!!d.copiedDraft;if(fromEntry&&d.selected&&!markedJobs.has(d.selected))markedJobs=new Set([d.selected]);for(const [t,v] of d.defaults||[])savedJobDefaults.set(t,{...v});type=d.type;selected=d.selected;selectedIsContinuation=d.selectedIsContinuation;values={...d.values};tab=d.tab;$('#alias').value=d.alias||'';rememberSelection();renderTypes();renderPipeline();if(centerRow&&d.selected){const row=[...$('#job-lists').querySelectorAll('.job-row')].find(r=>r.dataset.job===d.selected);const result=centerPipelineRow(row);if(result)jobSectionScroll.set(result.list.dataset.section,result.top);}},
 onNew:d=>{copiedDraft=true;type=d.type;selected=null;selectedIsContinuation=false;values={...d.values};tab=d.tab;$('#alias').value='';renderEditor();},
 onBusy:value=>{busy=value;setButtons();},onChanged:()=>{update().catch(e=>notify(e.message,true));}
 });
 document.querySelector('.workspace-footer').before(nextJobPrompt);
}else{
 document.addEventListener('pointerdown',()=>{if(workspaceReady)pinnedId?window.parent.relionPinActivate?.(pinnedId):window.parent.relionFeedActivate?.(workspaceId,'pointerdown');},true);
 document.addEventListener('focusin',()=>{if(workspaceReady)pinnedId?window.parent.relionPinActivate?.(pinnedId):window.parent.relionFeedActivate?.(workspaceId,'focusin');});
 // Capture completed input handlers, without re-rendering either workspace.
 for(const event of ['input','change'])document.addEventListener(event,()=>{if(workspaceReady){if(pinnedId){workspaceChanged();window.parent.relionPinActivate?.(pinnedId);}else window.parent.relionFeedActivate?.(workspaceId,'input');}});
}



function refreshTree(){
 if(!treeFrame||!config)return;
 const jobs=[...state.jobs].sort(comparePipelineJobs),edges=hierarchyConnections(jobs);
 const retained=new Set(edges.map(e=>JSON.stringify([e.source,e.target])));
 const retrospective=jobConnections(jobs).filter(e=>!retained.has(JSON.stringify([e.source,e.target])));
 treeFrame.contentWindow?.relionTree?.update({retrospective,steps:jobs.map(j=>({
  id:j.name,title:config.layout.find(l=>l.id===j.type)?.name||j.name,
  alias:j.alias&&j.alias!=='None'?j.alias:'',
  icon:jobTypeIcon(config.layout.find(l=>l.id===j.type)?.name||'External').innerHTML,
  status:j.status,keyInfo:j.keyInfo||'',keyInfoDetail:j.keyInfoDetail||'',
  resolutionInfo:j.resolutionInfo||'',
  dependencies:[...new Set(edges.filter(e=>e.target===j.name&&e.source!==j.name).map(e=>e.source))]
 }))},selected);
}
if(!embeddedWorkspace){
 treeFrame=document.createElement('iframe');treeFrame.className='tree-workspace';treeFrame.title='Job dependency tree';treeFrame.src='/tree-atlas.html';treeFrame.hidden=true;
 document.querySelector('.workspace-feed').after(treeFrame);
 window.relionTreeReady=()=>{syncTreeTheme();refreshTree();};
 new MutationObserver(syncTreeTheme).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
 window.relionTreeSelect=name=>{
  if(busy)return;
  markedJobs=new Set([name]);jobCursor=name;
  selectJob(name).catch(e=>notify(e.message,true));
 };
 for(const radio of document.querySelectorAll('[name="job-view"]'))radio.onchange=()=>{
  treeMode=radio.value==='tree';document.documentElement.classList.toggle('tree-mode',treeMode);
  treeFrame.hidden=!treeMode;
  if(treeMode){refreshTree();requestAnimationFrame(()=>treeFrame.contentWindow?.relionTree?.center());}
  else if(selected){
   const name=selected;
   requestAnimationFrame(()=>requestAnimationFrame(()=>{
    if(!treeMode&&selected===name)workspaceFeed?.revealInitialSelection(name);
   }));
  }
  window.dispatchEvent(new Event('resize'));
 };
}

function syncTreeTheme(){
 if(!treeFrame)return;
 const styles=getComputedStyle(document.documentElement);
 const keys=['--bg','--panel','--soft','--input','--text','--muted','--line','--accent','--accent-soft','--shadow'];
 treeFrame.contentWindow?.relionTree?.theme(Object.fromEntries(keys.map(key=>[key,styles.getPropertyValue(key).trim()])),styles.colorScheme,styles.fontFamily);
}

function syncExecutionMode(){
 if(!config)return;
 for(const radio of document.querySelectorAll('[name="execution-mode"]')){
  radio.checked=radio.value===(config.cluster?'cluster':'workstation');
  radio.disabled=busy||config.readonly;
 }
}
for(const radio of document.querySelectorAll('[name="execution-mode"]'))radio.onchange=async()=>{
 if(!radio.checked||busy)return;
 try{
  for(const r of document.querySelectorAll('[name="execution-mode"]'))r.disabled=true;
  await api('execution-mode',{mode:radio.value});
  await update();
  $('#execution-defaults').click();
 }catch(e){notify(e.message,true);}finally{syncExecutionMode();}
};

function updateViewSwitch(){
 const banner=$('#banner');
 const visible=!embeddedWorkspace&&state.jobs.length>=5;
 if(banner.hidden===!visible)return;
 banner.hidden=!visible;
 if(!visible&&treeMode)document.querySelector('[name="job-view"][value="cards"]').click();
 requestAnimationFrame(()=>window.dispatchEvent(new Event('resize')));
}
