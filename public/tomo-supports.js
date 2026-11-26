import {probeDomain,probeLongitude,probeLatitude} from './probe-domain.js';
// All support geometry is stored in centered Angstrom coordinates.
const add=(a,b)=>a.map((v,i)=>v+b[i]),sub=(a,b)=>a.map((v,i)=>v-b[i]),mul=(a,s)=>a.map(v=>v*s),dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],norm=a=>Math.hypot(...a);
const unit=a=>{const n=norm(a);if(n<1e-8)throw Error('Coincident points or degenerate surface');return mul(a,1/n);};
export function supportEuler(normal){
 // Local Z points along normal. Apply the same Y=90 pre-rotation as RELION.
 const z=unit(normal),x=unit(cross(Math.abs(z[2])<.9?[0,0,1]:[0,1,0],z)),y=cross(z,x);
 // inverse([x y z] * Ry(90)) = rows [-z,y,x].
 const m=[mul(z,-1),y,x],b=Math.acos(Math.max(-1,Math.min(1,m[2][2])));
 const a=Math.sin(b)>1e-8?Math.atan2(m[1][2],m[0][2]):Math.atan2(m[1][0],m[0][0]),c=Math.sin(b)>1e-8?Math.atan2(m[2][1],-m[2][0]):0;
 return [a,b,c].map(v=>v*180/Math.PI);
}
function resample(points,count){
 const p=[...points,points[0]],lengths=[0];for(let i=1;i<p.length;i++)lengths.push(lengths.at(-1)+norm(sub(p[i],p[i-1])));
 if(lengths.at(-1)<1e-8)throw Error('Empty contour');
 return Array.from({length:count},(_,i)=>{const d=i*lengths.at(-1)/count;let j=1;while(lengths[j]<d)j++;return add(p[j-1],mul(sub(p[j],p[j-1]),(d-lengths[j-1])/(lengths[j]-lengths[j-1])));});
}
export function insideVolume(position,geometry){
 if(!geometry)return true;
 const {dimensions,spacing}=geometry;
 if(!Array.isArray(dimensions)||!Array.isArray(spacing)||dimensions.length!==3||spacing.length!==3||dimensions.some(n=>!Number.isInteger(n)||n<1)||spacing.some(n=>!Number.isFinite(n)||n<=0))throw Error('Invalid tomogram bounds');
 return position.every((v,i)=>Number.isFinite(v)&&v/spacing[i]+dimensions[i]/2>=0&&v/spacing[i]+dimensions[i]/2<=dimensions[i]-1);
}
export function constrainSupports(supports,geometries){
 for(const s of supports){
  if(geometries){if(!geometries[s.tomogram])throw Error('Missing tomogram bounds: '+s.tomogram);s.volumeGeometry=geometries[s.tomogram];}
  if(!s.volumeGeometry)continue;
  if(s.type==='filaments'&&(s.points||[]).length<2)continue;
  if(s.type==='surfaces'&&((s.contours||[]).length<2||s.contours.some(c=>c.length<3)))continue;
  const excluded=new Set(s.excludedSamples||[]);
  sampleSupports([s],{onOutside:index=>excluded.add(index)});
  s.excludedSamples=[...excluded];
 }
 return supports;
}
export function sampleSupports(supports,{limit=200000,onOutside=()=>{},contains=()=>true}={}){
 if(!Array.isArray(supports)||supports.length>10000)throw Error('Invalid support list');
 const out=[],ids=new Set();
 for(const s of supports){
  if(!Number.isSafeInteger(s.id)||s.id<1||ids.has(s.id))throw Error('Support IDs must be unique positive integers');ids.add(s.id);
  if(typeof s.tomogram!=='string'||!s.tomogram)throw Error('Support has no tomogram');
  const excluded=new Set(s.excludedSamples||[]);if(excluded.size>200000||[...excluded].some(i=>!Number.isSafeInteger(i)||i<0))throw Error('Invalid excluded sample indices');
  let sampleIndex=0;
  const emit=(position,normal=null,track=null)=>{
   const index=sampleIndex++;if(index>=limit)throw Error('Too many sampled particles; increase spacing');
   if(excluded.has(index))return;
   if(!insideVolume(position,s.volumeGeometry)||!contains(position)){onOutside(index);return;}
   if(out.length>=limit)throw Error('Too many sampled particles; increase spacing');
   out.push({sampleIndex:index,position,normal,euler:normal?supportEuler(normal):null,type:s.type,element:s.id,tomogram:s.tomogram,track});
  };
  const point=p=>{if(!Array.isArray(p)||p.length!==3||!p.every(v=>Number.isFinite(v)&&Math.abs(v)<=1e9))throw Error('Invalid 3D coordinate');return p;};
  if(s.type==='particles'){for(const p of s.points||[])emit(point(p));continue;}
  const spacing=Number(s.spacing);if(!Number.isFinite(spacing)||spacing<=0)throw Error('Spacing must be positive');
  if(s.type==='spheres'){
   const center=point(s.center),r=Number(s.radius);if(!Number.isFinite(r)||r<=0)throw Error('Radius must be positive');
   if(s.sphereDirections!==undefined){
    if(!Array.isArray(s.sphereDirections)||s.sphereDirections.length>limit-out.length)throw Error('Invalid or excessive sphere particles');
    for(const direction of s.sphereDirections){const v=rotateSphereVector(unit(point(direction)),s.sphereRotation);emit(add(center,mul(v,r)),v);}continue;
   }
   const n=s.sphereSampleCount??Math.max(4,Math.ceil(4*Math.PI*r*r/(spacing*spacing)));if(!Number.isSafeInteger(n)||n<4)throw Error('Invalid fixed sphere sample count');if(n>limit-out.length)throw Error('Too many sphere samples; increase spacing');
   for(let i=0;i<n;i++){const z=1-2*(i+.5)/n,a=i*Math.PI*(3-Math.sqrt(5)),v=[Math.sqrt(1-z*z)*Math.cos(a),Math.sqrt(1-z*z)*Math.sin(a),z];const rotated=rotateSphereVector(v,s.sphereRotation);emit(add(center,mul(rotated,r)),rotated);}
  }else if(s.type==='filaments'){
   const p=(s.points||[]).map(point);if(p.length<2)throw Error('A filament needs at least two points');
   let length=0,next=0;
   for(let i=1;i<p.length;i++){const delta=sub(p[i],p[i-1]),n=norm(delta);if(n<1e-8)continue;for(;next<=length+n;next+=spacing)emit(add(p[i-1],mul(delta,(next-length)/n)),unit(delta),next);length+=n;}
   if(!length)throw Error('A filament must have nonzero length');
  }else if(s.type==='surfaces'){
   const contours=s.contours||[];if(contours.length>64||contours.some(c=>!Array.isArray(c)||c.length>256))throw Error('Use at most 64 contours with 256 vertices each per surface');if(contours.length<2)throw Error('A surface needs closed contours on at least two parallel slices');
   const axis={X:0,Y:1,Z:2}[s.axis];if(axis===undefined)throw Error('Surface axis is missing');
   for(const c of contours){if(c.length<3)throw Error('Each contour needs at least three vertices');for(const p of c)point(p);if(c.some(p=>Math.abs(p[axis]-c[0][axis])>1e-4))throw Error('Contour vertices must be on the same slice');}
   const uv=[0,1,2].filter(i=>i!==axis),area=c=>c.reduce((sum,p,i)=>sum+p[uv[0]]*c[(i+1)%c.length][uv[1]]-p[uv[1]]*c[(i+1)%c.length][uv[0]],0);
   const orient=(a,b,c)=>(b[uv[0]]-a[uv[0]])*(c[uv[1]]-a[uv[1]])-(b[uv[1]]-a[uv[1]])*(c[uv[0]]-a[uv[0]]);
   for(const c of contours)for(let i=0;i<c.length;i++)for(let j=i+2;j<c.length;j++){
    if(i===0&&j===c.length-1)continue;
    const a=c[i],b=c[(i+1)%c.length],d=c[j],e=c[(j+1)%c.length];
    if(orient(a,b,d)*orient(a,b,e)<0&&orient(d,e,a)*orient(d,e,b)<0)throw Error('Surface contour crosses itself');
   }
   const signs=contours.map(c=>Math.sign(area(c)));if(signs.some(v=>!v||v!==signs[0]))throw Error('Contours must have nonzero area and consistent winding');
   const sorted=[...contours].sort((a,b)=>a[0][axis]-b[0][axis]);const count=Math.min(512,Math.max(...sorted.map(c=>c.length),16));
   const rings=sorted.map(c=>resample(c,count)),seen=new Set();
   // Align contour starting vertices to reduce twisting. Contours must use the same winding.
   for(let j=1;j<rings.length;j++){
    if(Math.abs(sorted[j][0][axis]-sorted[j-1][0][axis])<1e-4)throw Error('Contours must lie on distinct slices');
    const prev=rings[j-1],cur=rings[j];let best=0,cost=Infinity;
    for(let offset=0;offset<count;offset++){let v=0;for(let k=0;k<count;k++)v+=norm(sub(prev[k],cur[(k+offset)%count]));if(v<cost){cost=v;best=offset;}}
    rings[j]=cur.map((_,k)=>cur[(k+best)%count]);
   }
   const triangle=(a,b,c)=>{
    const normal=unit(cross(sub(b,a),sub(c,a))),steps=Math.max(1,Math.ceil(Math.max(norm(sub(b,a)),norm(sub(c,a)),norm(sub(c,b)))/spacing));
    if(steps>1000)throw Error('Surface sampling too dense');
    for(let i=0;i<=steps;i++)for(let j=0;j<=steps-i;j++){const p=add(a,add(mul(sub(b,a),i/steps),mul(sub(c,a),j/steps))),key=p.map(v=>v.toFixed(5)).join(',');if(seen.has(key))continue;seen.add(key);emit(p,s.flip?mul(normal,-1):normal);}
   };
   for(let j=1;j<rings.length;j++)for(let k=0;k<count;k++){const n=(k+1)%count;triangle(rings[j-1][k],rings[j-1][n],rings[j][k]);triangle(rings[j-1][n],rings[j][n],rings[j][k]);}
  }else throw Error('Unknown support type');
 }
 return out;
}


// Unit quaternion persisted with the support; rotations preserve sample identities.
function sphereQuaternion(q=[1,0,0,0]){
 if(!Array.isArray(q)||q.length!==4||!q.every(Number.isFinite)||Math.hypot(...q)<1e-12)throw Error('Invalid sphere rotation');
 const n=Math.hypot(...q);return q.map(v=>v/n);
}
export function rotateSphereVector(v,q){
 const [w,...u]=sphereQuaternion(q),t=mul(cross(u,v),2);
 return add(v,add(mul(t,w),cross(u,t)));
}
export function rotateSphereSupport(s,pole,direction,degrees=5){
 if(s.type!=='spheres'||!['X','Y','Z'].includes(pole)||!['left','right','up','down'].includes(direction)||!Number.isFinite(degrees)||degrees<=0||degrees>180)throw Error('Invalid sphere rotation');
 const frame={X:[1,2,0],Y:[2,0,1],Z:[0,1,2]}[pole];
 const horizontal=direction==='left'||direction==='right',axis=frame[horizontal?2:1];
 const angle=degrees*Math.PI/180*(direction==='left'||direction==='up'?-1:1)/2;
 const u=[0,0,0];u[axis]=Math.sin(angle);
 const [w,...v]=sphereQuaternion(s.sphereRotation),a=Math.cos(angle);
 s.sphereRotation=sphereQuaternion([a*w-dot(u,v),...add(add(mul(v,a),mul(u,w)),cross(u,v))]);
}
export function sphereProjection(position,center,radius,pole){
 const v=position.map((x,i)=>(x-center[i])/radius),axes={X:[1,2,0],Y:[2,0,1],Z:[0,1,2]}[pole];
 return [(Math.atan2(v[axes[1]],v[axes[0]])/(2*Math.PI)+.5), (1-Math.max(-1,Math.min(1,v[axes[2]])))/2];
}

export function freezeSphereSampling(s){
 if(s.type==='spheres'&&s.sphereDirections===undefined&&s.sphereSampleCount===undefined)
  s.sphereSampleCount=Math.max(4,Math.ceil(4*Math.PI*Number(s.radius)**2/Number(s.spacing)**2));
}
export function resampleSphere(s){
 const n=Math.max(4,Math.ceil(4*Math.PI*Number(s.radius)**2/Number(s.spacing)**2));
 if(!Number.isSafeInteger(n)||n>200000)throw Error('Too many sphere particles; increase spacing');
 delete s.sphereDirections;delete s.sphereRotation;delete s.excludedSamples;s.sphereSampleCount=n;
}
export function projectionMinima(probe,invert=false){
 const {width,height,values,poleAxis}=probe,periodic=probeDomain(probe).width===1;
 const dirs=[];
 // Strict 8-neighbor minima; horizontal periodicity, no artificial polar neighbors.
 for(let y=1;y<height-1;y++)for(let x=periodic?0:1;x<(periodic?width:width-1);x++){
  const value=values[y*width+x];if(!Number.isFinite(value))continue;
  let minimum=true;
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
   if(!dx&&!dy)continue;const other=values[(y+dy)*width+(x+dx+width)%width];
   if(!Number.isFinite(other)||(invert?value<=other:value>=other))minimum=false;
  }
  if(!minimum)continue;
  const z=1-2*probeLatitude((y+.5)/height,probe),r=Math.sqrt(Math.max(0,1-z*z)),phi=2*Math.PI*(probeLongitude((x+.5)/width,probe)-.5),v=[r*Math.cos(phi),r*Math.sin(phi),z];
  dirs.push(poleAxis==='X'?[v[2],v[0],v[1]]:poleAxis==='Y'?[v[1],v[2],v[0]]:v);
 }
 return dirs;
}

export function withinBrush(point,start,end,radius=10){
 const d=end.map((v,i)=>v-start[i]),n=d[0]**2+d[1]**2;
 const t=n?Math.max(0,Math.min(1,((point[0]-start[0])*d[0]+(point[1]-start[1])*d[1])/n)):0;
 return Math.hypot(point[0]-start[0]-t*d[0],point[1]-start[1]-t*d[1])<=radius;
}
