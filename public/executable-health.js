export const healthKeys=['fn_ctffind_exe','fn_motioncor2_exe','fn_resmap','fn_batchtomo_exe','fn_aretomo_exe'];
export function healthBlock(name,checks={},tab=''){
 const bad=k=>checks[k]?.status==='fail';
 const keys={'CTF estimation':['fn_ctffind_exe'],'Motion correction':['fn_motioncor2_exe'],'Local resolution':['fn_resmap']};
 let failed=(keys[name]||[]).filter(bad);
 if(name==='Align tilt-series')failed=tab==='IMOD'?(bad('fn_batchtomo_exe')?['fn_batchtomo_exe']:[]):tab==='AreTomo2'?(bad('fn_aretomo_exe')?['fn_aretomo_exe']:[]):bad('fn_batchtomo_exe')&&bad('fn_aretomo_exe')?['fn_batchtomo_exe','fn_aretomo_exe']:[];
 return failed.map(k=>checks[k].message).join('\n');
}

export function healthImpact(key){
 return ({fn_ctffind_exe:'Disables CTF estimation.',fn_motioncor2_exe:'Disables Motion correction.',fn_resmap:'Disables Local resolution.',fn_batchtomo_exe:'Disables IMOD fiducial and patch-tracking methods in IMOD/AreTomo2. Align tilt-series is disabled if AreTomo also fails.',fn_aretomo_exe:'Disables the AreTomo2 method in IMOD/AreTomo2. Align tilt-series is disabled if IMOD also fails.'})[key]||'';
}
