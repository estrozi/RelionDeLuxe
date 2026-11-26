export function projectedTomogramPicks(row,geometry,scale,halfWidth=2){
 if(!geometry||!row.tomoPicks)return {points:[],warning:''};
 const axes={X:[1,2,0],Y:[0,2,1],Z:[0,1,2]}[geometry.axis];
 const bin=Number(row.rlnTomoTomogramBinning),pixel=Number(row.rlnTomoTiltSeriesPixelSize);
 const spacing=geometry.voxelSize.map(v=>v>0?v:bin>0&&pixel>0?bin*pixel:0);
 if(row.tomoPickUnits==='angstrom'&&spacing.some(v=>!(v>0)))return {points:[],warning:'Missing voxel size: coordinates cannot be overlaid.'};
 if(row.tomoPickUnits==='unbinned-pixel'&&!(bin>0))return {points:[],warning:'Missing tomogram binning: legacy coordinates cannot be overlaid.'};
 const points=[],groups=[];let index=0;
 for(const pick of row.tomoPicks){
  const xyz=pick.map((v,i)=>row.tomoPickUnits==='angstrom'?v/spacing[i]+geometry.dimensions[i]/2:v/bin);
  if(Math.abs(xyz[axes[2]]-geometry.slice)<=halfWidth){points.push([xyz[axes[0]]*scale,xyz[axes[1]]*scale]);groups.push(row.tomoPickGroups?.[index]||null);}index++;
 }
 return {points,groups,warning:''};
}
