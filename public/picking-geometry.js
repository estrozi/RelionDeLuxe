export function validateFilaments(points){
 if(points.length%2)throw Error('Finish the last filament with a second click, or undo/remove its start point before saving.');
 for(let i=0;i<points.length;i+=2)if(points[i].x===points[i+1].x&&points[i].y===points[i+1].y)throw Error('A filament must have two distinct endpoints.');
}
export function removePick(points,index,helical){
 const start=helical?index-index%2:index;
 points.splice(start,helical?2:1);
}

// Display-only FOM filtering; never removes or alters coordinate records.
export function visibleAtFom(point, threshold, enabled=true){
 if(!enabled||String(threshold).trim()==='')return true;
 const minimum=Number(threshold);
 return !Number.isFinite(minimum)||!Number.isFinite(point.fom)||point.fom>=minimum;
}
