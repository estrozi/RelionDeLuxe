export const tomogramColumns=['rlnTomoReconstructedTomogramDenoised','rlnTomoDenoisedTomogram','rlnTomoReconstructedTomogram','rlnTomoReconstructedTomogramHalf1','rlnTomoReconstructedTomogramHalf2'];
export function tomogramDisplaySize(width,height,availableWidth,availableHeight,mode){
 const scale=mode==='width'?Math.max(1,availableWidth)/width:mode==='height'?Math.max(1,availableHeight)/height:1;
 return {width:width*scale,height:height*scale,scale};
}

// Use the sphere center, or the bounding-box center of other support control points.
export function supportCenterSlice(s,geometry,axis){
 const a={X:0,Y:1,Z:2}[axis],n=geometry?.dimensions?.[a],spacing=geometry?.voxelSize?.[a];
 if(!s||!Number.isInteger(n)||n<1||!(spacing>0))return null;
 const points=s.center?[s.center]:s.points?.length?s.points:(s.contours||[]).flat();
 const values=points.map(p=>p?.[a]);if(!values.length||!values.every(Number.isFinite))return null;
 let min=Infinity,max=-Infinity;for(const v of values){min=Math.min(min,v);max=Math.max(max,v);}
 return Math.max(0,Math.min(n-1,Math.round((min/2+max/2)/spacing+n/2)));
}

export function sphereProbeSize(width,height){
 const w=Math.max(128,Math.min(1024,2*Math.floor(Math.min(Math.max(0,width),2*Math.max(0,height))/2)));
 return {width:w,height:w/2};
}

// Link equal-area projection latitude/longitude to a matching tomogram slice.
export function sphereSliceGuide(s,g,pole,longitude=null){
 if(s?.type!=='spheres'||g?.axis!==pole)return null;
 const a={X:0,Y:1,Z:2}[pole],r=Number(s.radius);
 if(!(r>0)||!s.center)return null;
 const d=(g.slice-g.dimensions[a]/2)*g.voxelSize[a]-s.center[a];
 if(Math.abs(d)>r)return null;
 const y=(1-d/r)/2,center=s.center.map((v,i)=>v/g.voxelSize[i]+g.dimensions[i]/2);
 const screen={X:[1,2],Y:[0,2],Z:[0,1]}[pole],frame={X:[1,2],Y:[2,0],Z:[0,1]}[pole];
 const start=screen.map(i=>center[i]);
 if(longitude===null)return {y,start};
 const angle=2*Math.PI*(longitude-.5),radius=Math.sqrt(Math.max(0,r*r-d*d)),delta=[0,0,0];
 delta[frame[0]]=radius*Math.cos(angle);delta[frame[1]]=radius*Math.sin(angle);
 return {y,start,end:screen.map(i=>center[i]+delta[i]/g.voxelSize[i])};
}
