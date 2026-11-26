// Selection indices remain stable while order/page changes.
export function toggleScreeningSelection(chosen,ordered,index,anchor,shift){
 const next=new Set(chosen);
 if(shift&&anchor!==null&&ordered.includes(anchor)){
  const a=ordered.indexOf(anchor),b=ordered.indexOf(index),add=next.has(anchor);
  if(b<0)return {chosen:next,anchor};
  for(const i of ordered.slice(Math.min(a,b),Math.max(a,b)+1))if(add)next.add(i);else next.delete(i);
 }else{if(next.has(index))next.delete(index);else next.add(index);anchor=index;}
 return {chosen:next,anchor};
}

// Keep manifest indices unchanged: the image/save endpoints use the original rows.
export function screeningCandidates(rows,indices=[]){
 const candidates=rows.filter(row=>row.error!=='No matching full-size file');
 const allowed=new Set(candidates.map(row=>row.index));
 return {rows:candidates,excluded:rows.length-candidates.length,chosen:new Set(indices.filter(i=>Number.isInteger(i)&&allowed.has(i)))};
}
