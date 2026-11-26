// Resolve native error wording to actual fields, then use the current GUI layout.
const fields={
 'input STAR file':['input_star_mics','fn_in','fn_input_autopick','star_mics','fn_img'],
 '3D reference':['fn_ref3d_autopick'],references:['fn_refs_autopick'],reference:['fn_ref'],'input reference':['fn_ref'],
 'refined particles STAR file':['fndata_reextract'],'coordinate STAR file':['coords_suffix'],'continuation STAR file':['fn_cont'],
 'first or second input STAR file':['fn_part1','fn_part2','fn_mic1','fn_mic2','fn_mov1','fn_mov2'],
 'input optimiser.star':['fn_opt'],'input particle STAR file':['fn_data'],'input micrograph STAR file':['fn_mic'],
 'input PostProcess STAR file':['fn_post'],'input mask':['fn_mask'],'input half-map':['fn_in'],'external executable script':['fn_exe']
};
export function fieldError(message,layout,schema,values={}){
 if(!layout||!schema)return message;
 const effective={...Object.fromEntries(schema.options.map(f=>[f.key,f.default])),...layout.overrides,...values};
 return message.replace(/empty field for (?:the )?(.+?)(?=\.{3}|\.(?:\s|$)|$)/g,(original,description)=>{
  const candidates=(fields[description]||[]).filter(key=>schema.options.some(f=>f.key===key)&&!String(effective[key]??'').trim()&&!layout.fields?.[key]?.when?.some(c=>effective[c.key]!==c.value));
  const tabs=[...new Set(candidates.flatMap(key=>Object.entries(layout.tabs).filter(([,keys])=>keys.includes(key)).map(([tab])=>tab)))];
  return tabs.length===1?original+' ('+tabs[0]+' tab)':original;
 });
}
