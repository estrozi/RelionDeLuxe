export const pickingMethods = ['do_refs', 'do_log', 'do_topaz'];
const amyloidMethods=[...pickingMethods,'do_amyloid'];
export function pickingMethodsFor(layout){return layout.tabs?.Amyloid?amyloidMethods:pickingMethods;}

// A deliberate Yes selects this method and clears the two alternatives.
export function selectPickingMethod(layout, values, key) {
  const methods=pickingMethodsFor(layout);
  if (layout.name !== 'Auto-picking' || !methods.includes(key)) return;
  if (values[key] !== 'Yes') {
    if (!methods.some(method => values[method] === 'Yes')) values[key] = 'Yes';
    return;
  }
  for (const other of methods) if (other !== key) values[other] = 'No';
}

export function isContinuation(job, scheduledContinuation = false) {
  return !!job && (job.status !== 'Scheduled' || scheduledContinuation);
}

export function showPickingField(layout, key, job, scheduledContinuation = false) {
  return layout.name !== 'Auto-picking' || key !== 'continue_manual' || isContinuation(job, scheduledContinuation);
}

export const localResolutionMethods = ['do_resmap_locres', 'do_relion_locres'];
export function selectLocalResolutionMethod(layout, values, key) {
  if (layout.name !== 'Local resolution' || !localResolutionMethods.includes(key) || values[key] !== 'Yes') return;
  for (const other of localResolutionMethods) if (other !== key) values[other] = 'No';
}

export const importMethods = ['do_raw', 'do_other'];
export function selectImportMethod(layout, values, key) {
  if (layout.name !== 'Import' || !importMethods.includes(key)) return;
  for (const other of importMethods) if (other !== key) values[other] = values[key] === 'Yes' ? 'No' : 'Yes';
}
export function showImportField(layout, values, key) {
  if (layout.name !== 'Import') return true;
  return !(layout.fields?.[key]?.when || []).some(rule => importMethods.includes(rule.key) && values[rule.key] !== rule.value);
}

export const topazModes = ['do_topaz_train', 'do_topaz_pick'];
export function selectTopazMode(layout, values, key) {
  if(layout.name!=='Auto-picking')return;
  if(topazModes.includes(key)){
    const other=topazModes.find(k=>k!==key);
    values[other]=values[key]==='Yes'?'No':'Yes';
  }
  if(values.do_topaz==='Yes'&&values.do_topaz_train===values.do_topaz_pick){values.do_topaz_train='No';values.do_topaz_pick='Yes';}
}
export function pickingTabEnabled(layout, values, tab) {
 if(layout.name==='Subset selection'&&tab==='Class options')return !!String(values.fn_model||'').trim();
  if(layout.name!=='Auto-picking')return true;
  const method={Laplacian:'do_log',Laplace:'do_log',References:'do_refs',autopicking:'do_refs',Helix:'do_refs',Topaz:'do_topaz','Refs 1':'do_refs','Refs 2':'do_refs',Amyloid:'do_amyloid'}[tab];
  return !method||values[method]==='Yes';
}
export function showTopazMode(layout, values, key){
 return layout.name!=='Auto-picking'||!topazModes.includes(key)||values.do_topaz==='Yes';
}

// These file fields belong to alternative algorithms; retained values do not
// imply a dependency unless the selected algorithm actually consumes them.
export function unusedPickingInputs(layout,values){
 if(layout.name!=='Auto-picking')return [];
 const active={
  fn_refs_autopick:values.do_refs==='Yes'&&values.do_ref3d!=='Yes',
  fn_ref3d_autopick:values.do_refs==='Yes'&&values.do_ref3d==='Yes',
  topaz_model:values.do_topaz==='Yes'&&values.do_topaz_pick==='Yes',
  topaz_train_parts:values.do_topaz==='Yes'&&values.do_topaz_train==='Yes'&&values.do_topaz_train_parts==='Yes',
  topaz_train_picks:values.do_topaz==='Yes'&&values.do_topaz_train==='Yes'&&values.do_topaz_train_parts!=='Yes'
 };
 return Object.keys(active).filter(key=>!active[key]);
}

export const alignmentMethods=['do_imod_fiducials','do_imod_patchtrack','do_aretomo2'];
export function selectAlignmentMethod(values,key){
 const chosen=alignmentMethods.includes(key)?key:alignmentMethods.find(k=>values[k]==='Yes')||alignmentMethods[0];
 for(const k of alignmentMethods)values[k]=k===chosen?'Yes':'No';
}
export function showAlignmentField(values,key){
 if(key==='fn_batchtomo_exe')return values.do_imod_fiducials==='Yes'||values.do_imod_patchtrack==='Yes';
 if(key==='fn_aretomo_exe')return values.do_aretomo2==='Yes';
 if(key==='fiducial_diameter')return values.do_imod_fiducials==='Yes';
 if(key==='tomogram_thickness')return values.do_imod_patchtrack==='Yes'||values.do_aretomo2==='Yes';
 if(['patch_size','patch_overlap'].includes(key))return values.do_imod_patchtrack==='Yes';
 if(['do_aretomo_tiltcorrect','do_aretomo_ctf','other_aretomo_args','gpu_ids'].includes(key))return values.do_aretomo2==='Yes';
 if(key==='aretomo_tiltcorrect_angle')return values.do_aretomo2==='Yes'&&values.do_aretomo_tiltcorrect==='Yes';
 if(key==='do_aretomo_reconstruct')return values.do_aretomo2==='Yes';
 if(['do_skip_aretomo_align','aretomo_VolZ','aretomo_OutBin'].includes(key))return values.do_aretomo2==='Yes'&&values.do_aretomo_reconstruct==='Yes';
 if(key==='do_aretomo_phaseshift')return values.do_aretomo2==='Yes'&&values.do_aretomo_ctf==='Yes';
 return true;
}
