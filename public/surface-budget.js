// Marching cubes emits at most five triangles (15 indices) per crossing cell.
// Bound each draw below browser limits; smoothing does not simplify topology.
export function exceedsSurfaceBudget(data,nx,ny,nz,level,budget=12000000){
 let active=0;const plane=nx*ny;
 for(let z=0;z<nz-1;z++)for(let y=0;y<ny-1;y++)for(let x=0;x<nx-1;x++){
  const i=x+nx*y+plane*z,above=data[i]>=level;
  if(((data[i+1]>=level)!==above||(data[i+nx]>=level)!==above||(data[i+nx+1]>=level)!==above||(data[i+plane]>=level)!==above||(data[i+plane+1]>=level)!==above||(data[i+plane+nx]>=level)!==above||(data[i+plane+nx+1]>=level)!==above)&&++active*15>budget)return true;
 }
 return false;
}
export function boundedVolume(volume,level){
 let {data,nx,ny,nz}=volume,factor=1;
 while(exceedsSurfaceBudget(data,nx,ny,nz,level)){
  const ax=Math.max(1,Math.floor(nx/2)),ay=Math.max(1,Math.floor(ny/2)),az=Math.max(1,Math.floor(nz/2));
  const next=new Float32Array(ax*ay*az);
  for(let z=0;z<az;z++)for(let y=0;y<ay;y++)for(let x=0;x<ax;x++){
   let sum=0,n=0;for(let dz=0;dz<2&&2*z+dz<nz;dz++)for(let dy=0;dy<2&&2*y+dy<ny;dy++)for(let dx=0;dx<2&&2*x+dx<nx;dx++){sum+=data[2*x+dx+nx*(2*y+dy+ny*(2*z+dz))];n++;}
   next[x+ax*(y+ay*z)]=sum/n;
  }
  data=next;nx=ax;ny=ay;nz=az;factor*=2;
 }
 return {data,nx,ny,nz,factor};
}
