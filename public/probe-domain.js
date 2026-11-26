// Crop to sampled valid coverage; longitude is periodic and may cross ±180°.
export function cropProbe(probe){
 const {width:w,height:h,values}=probe,columns=Array(w).fill(false);let top=h,bottom=-1;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(Number.isFinite(values[y*w+x])){columns[x]=true;top=Math.min(top,y);bottom=Math.max(bottom,y);}
 if(bottom<0)return {...probe,domain:{x:0,width:1,y:0,height:1}};
 let gap=0,end=0;
 for(let x=0;x<w;x++)if(columns[x]){let n=0;while(n<w&&!columns[(x+1+n)%w])n++;if(n>gap){gap=n;end=(x+1+n)%w;}}
 const width=w-gap,height=bottom-top+1,result=[];
 for(let y=top;y<=bottom;y++)for(let x=0;x<width;x++)result.push(values[y*w+(end+x)%w]);
 return {...probe,width,height,values:result,missing:result.filter(v=>!Number.isFinite(v)).length,domain:{x:end/w,width:width/w,y:top/h,height:height/h}};
}
export const probeDomain=p=>p?.domain||{x:0,width:1,y:0,height:1};
export function probePoint(xy,probe){const d=probeDomain(probe);return [((xy[0]-d.x+1)%1)/d.width,(xy[1]-d.y)/d.height];}
export function probeLongitude(x,probe){const d=probeDomain(probe);return d.x+x*d.width;}
export function probeLatitude(y,probe){const d=probeDomain(probe);return d.y+y*d.height;}
