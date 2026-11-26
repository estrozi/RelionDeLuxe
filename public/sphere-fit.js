// Geometric least squares in physical coordinates, initialized by an algebraic fit.
function solve(a,b){
 const n=b.length,m=a.map((row,i)=>[...row,b[i]]),scale=Math.max(...a.flat().map(Math.abs));
 for(let k=0;k<n;k++){
  let p=k;for(let i=k+1;i<n;i++)if(Math.abs(m[i][k])>Math.abs(m[p][k]))p=i;
  if(Math.abs(m[p][k])<1e-10*Math.max(scale,1))throw Error('Points are coplanar or nearly coplanar. Add points on different slices.');
  [m[k],m[p]]=[m[p],m[k]];const v=m[k][k];for(let j=k;j<=n;j++)m[k][j]/=v;
  for(let i=0;i<n;i++)if(i!==k){const f=m[i][k];for(let j=k;j<=n;j++)m[i][j]-=f*m[k][j];}
 }return m.map(row=>row[n]);
}
export function fitSphere(points){
 if(!Array.isArray(points)||points.length<4)throw Error('At least four non-coplanar points are required.');
 if(points.some(p=>!Array.isArray(p)||p.length!==3||!p.every(Number.isFinite)))throw Error('Invalid sphere fitting coordinates');
 const origin=[0,1,2].map(i=>points.reduce((s,p)=>s+p[i],0)/points.length);
 const scale=Math.sqrt(points.reduce((s,p)=>s+p.reduce((n,v,i)=>n+(v-origin[i])**2,0),0)/points.length);
 if(!(scale>0))throw Error('Choose distinct points on the sphere surface.');
 const ps=points.map(p=>p.map((v,i)=>(v-origin[i])/scale));
 let a=Array.from({length:4},()=>Array(4).fill(0)),b=Array(4).fill(0);
 for(const p of ps){const row=[...p.map(v=>2*v),1],q=p.reduce((s,v)=>s+v*v,0);for(let i=0;i<4;i++){b[i]+=row[i]*q;for(let j=0;j<4;j++)a[i][j]+=row[i]*row[j];}}
 const initial=solve(a,b);let x=[...initial.slice(0,3),Math.sqrt(initial[3]+initial.slice(0,3).reduce((s,v)=>s+v*v,0))];
 const error=x=>ps.reduce((s,p)=>s+(Math.hypot(...p.map((v,i)=>v-x[i]))-x[3])**2,0);
 let cost=error(x),lambda=1e-3;
 for(let step=0;step<150;step++){
  a=Array.from({length:4},()=>Array(4).fill(0));b=Array(4).fill(0);
  for(const p of ps){const d=x.slice(0,3).map((v,i)=>v-p[i]),length=Math.hypot(...d);if(length<1e-12)throw Error('Sphere fit is unstable; choose points spanning more of the surface.');const row=[...d.map(v=>v/length),-1],r=length-x[3];for(let i=0;i<4;i++){b[i]-=row[i]*r;for(let j=0;j<4;j++)a[i][j]+=row[i]*row[j];}}
  for(let i=0;i<4;i++)a[i][i]+=lambda;
  const delta=solve(a,b),next=x.map((v,i)=>v+delta[i]),nextCost=error(next);
  if(next[3]>0&&nextCost<=cost){const improvement=cost-nextCost;x=next;cost=nextCost;lambda=Math.max(1e-12,lambda/3);if(Math.hypot(...delta)<1e-9||improvement<1e-14)break;}else lambda*=10;
 }
 if(!x.every(Number.isFinite)||!(x[3]>0))throw Error('Could not fit a finite sphere.');
 return {center:x.slice(0,3).map((v,i)=>v*scale+origin[i]),radius:x[3]*scale,rms:Math.sqrt(cost/points.length)*scale};
}
