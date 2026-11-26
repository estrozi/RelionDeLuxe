export const planeAxes=axis=>({X:[1,2,0],Y:[0,2,1],Z:[0,1,2]}[axis]);
export function moveSupport(s,axis,direction,step){
 if(!Number.isFinite(step)||step<=0)throw Error('Step must be positive');
 const axes=planeAxes(axis),moves={left:[0,-1],right:[0,1],up:[1,-1],down:[1,1]},move=moves[direction];
 if(!axes||!move)throw Error('Invalid movement direction');
 const delta=[0,0,0];delta[axes[move[0]]]=move[1]*step;
 const translate=p=>p.map((v,i)=>v+delta[i]);
 if(s.center)s.center=translate(s.center);if(s.points)s.points=s.points.map(translate);if(s.contours)s.contours=s.contours.map(c=>c.map(translate));
 // Translation preserves sample identities and the user’s exclusions.
}
export function excludeRectangle(supports,samples,item,start,end,depth,{keepOnly=false,preview=false,activeId=null}={}){
 const g=item.geometry,axes=planeAxes(g.axis),lo=start.map((v,i)=>Math.min(v,end[i])),hi=start.map((v,i)=>Math.max(v,end[i])),byId=new Map(supports.map(s=>[s.id,s])),changed=new Map();let total=0,insideCount=0;
 for(const p of samples){
  if(p.tomogram!==item.row.rlnTomoName||(activeId!==null&&p.element!==activeId))continue;
  const xyz=p.position.map((v,i)=>v/g.voxelSize[i]+g.dimensions[i]/2);
  const xy=[xyz[axes[0]]*item.scale,xyz[axes[1]]*item.scale];
  if(Math.abs(xyz[axes[2]]-g.slice)>depth)continue;
  total++;const inside=xy.every((v,i)=>v>=lo[i]&&v<=hi[i]);if(inside)insideCount++;if(keepOnly?inside:!inside)continue;
  const s=byId.get(p.element);if(!s)continue;
  if(!changed.has(s.id))changed.set(s.id,new Set(s.excludedSamples||[]));changed.get(s.id).add(p.sampleIndex);
 }
 if(preview)return {keep:insideCount,remove:total-insideCount};
 let count=0;
 for(const [id,set]of changed){const s=byId.get(id);count+=set.size-(s.excludedSamples?.length||0);s.excludedSamples=[...set].sort((a,b)=>a-b);}
 return count;
}

export function supportUndo(initial){
 let baseline=JSON.stringify(initial),previous=null;
 return {
  record(next){const text=JSON.stringify(next);if(text!==baseline){previous=baseline;baseline=text;}},
  available(){return previous!==null;},
  take(){if(previous===null)return null;const result=JSON.parse(previous);baseline=previous;previous=null;return result;}
 };
}

// Fit points use centered Angstroms, just like particle coordinates. Only
// points visible in the current slice/depth window are candidates for removal.
export function fitPointRectangle(points,item,start,end,depth){
 const g=item.geometry,axes=planeAxes(g.axis),lo=start.map((v,i)=>Math.min(v,end[i])),hi=start.map((v,i)=>Math.max(v,end[i]));
 return points.map((p,index)=>({index,v:p.map((v,i)=>v/g.voxelSize[i]+g.dimensions[i]/2)}))
  .filter(({v})=>Math.abs(v[axes[2]]-g.slice)<=depth&&v[axes[0]]>=lo[0]&&v[axes[0]]<=hi[0]&&v[axes[1]]>=lo[1]&&v[axes[1]]<=hi[1]).map(p=>p.index);
}
