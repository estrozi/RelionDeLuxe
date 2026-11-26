// RELION's locally filtered density and the matching resolution (Å) volume.
export function localResolutionFile(file){
 return /(^|\/)relion_locres_filtered\.mrc$/i.test(file)?file.replace(/relion_locres_filtered\.mrc$/i,'relion_locres.mrc'):null;
}
export function resolutionRange(data){
 let min=Infinity,max=-Infinity;
 for(const v of data)if(Number.isFinite(v)&&v>0){min=Math.min(min,v);max=Math.max(max,v);}
 if(!Number.isFinite(min))throw Error('No positive finite local-resolution values.');
 return [min,max===min?min+0.01:max];
}
// Sample in the color volume's coordinates, independently of surface downsampling.
export function sampleResolution(volume,position){
 const e=volume.inverseMatrix.elements,{x,y,z}=position;
 const p=[e[0]*x+e[4]*y+e[8]*z+e[12],e[1]*x+e[5]*y+e[9]*z+e[13],e[2]*x+e[6]*y+e[10]*z+e[14]];
 const dims=[volume.nx,volume.ny,volume.nz];
 if(p.some((v,i)=>!Number.isFinite(v)||v<0||v>dims[i]-1))return NaN;
 const lo=p.map(Math.floor),hi=lo.map((v,i)=>Math.min(v+1,dims[i]-1)),t=p.map((v,i)=>v-lo[i]);
 let sum=0;
 for(let z=0;z<2;z++)for(let y=0;y<2;y++)for(let x=0;x<2;x++){
  const w=(x?t[0]:1-t[0])*(y?t[1]:1-t[1])*(z?t[2]:1-t[2]);if(!w)continue;
  const v=volume.data[((z?hi[2]:lo[2])*volume.ny+(y?hi[1]:lo[1]))*volume.nx+(x?hi[0]:lo[0])];
  if(!Number.isFinite(v)||v<=0)return NaN;
  sum+=w*v;
 }
 return sum;
}
export function resolutionColor(value,min,max){
 if(!Number.isFinite(value)||value<=0)return 0x888888;
 const t=Math.max(0,Math.min(1,(value-min)/(max-min)));
 const pale=Math.round(255*(t<0.5?2*t:2*(1-t)));
 return t<0.5?(pale<<16)|(pale<<8)|255:(255<<16)|(pale<<8)|pale;
}
