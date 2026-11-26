// RELION's angular distributions use numeric RGB colors and cylinders in map coordinates.
export function angularDistributionFiles(file){
 if(!/_class\d+\.mrc$/i.test(file))return [];
 const stem=file.replace(/\.mrc$/i,'');return [stem+'_angdist.bild',...(/_half[12]_class/.test(stem)?[stem.replace(/_half[12]_class/,'_class')+'_angdist.bild']:[])];
}
export function parseBild(text){let color=[1,1,1];const cylinders=[];for(const line of text.split(/\r?\n/)){const tokens=line.trim().split(/\s+/),command=tokens.shift();if(!command||command.startsWith('#'))continue;if(command==='.color'){const values=tokens.map(Number);if(values.length!==3||values.some(v=>!Number.isFinite(v)||v<0||v>1))throw Error('Invalid BILD RGB color');color=values;}else if(command==='.cylinder'){const v=tokens.map(Number);if(v.length!==7||v.some(x=>!Number.isFinite(x))||v[6]<=0)throw Error('Invalid BILD cylinder');cylinders.push({start:v.slice(0,3),end:v.slice(3,6),radius:v[6],color:[...color]});if(cylinders.length>200000)throw Error('Too many BILD cylinders');}else if(!command.startsWith('.comment'))throw Error('Unsupported BILD command: '+command);}return cylinders;}

// Keep each cylinder mesh well below browser per-draw index limits.
export function addAngularDistribution(stage,NGL,cylinders){
 const components=[];
 try{for(let offset=0;offset<cylinders.length;offset+=1000){
  const shape=new NGL.Shape('Angular distribution '+(components.length+1),{disableImpostor:true});
  for(const c of cylinders.slice(offset,offset+1000))shape.addCylinder(c.start,c.end,c.color,c.radius);
  const component=stage.addComponentFromObject(shape);components.push(component);component.addRepresentation('buffer');
 }}catch(e){for(const component of components)stage.removeComponent(component);throw e;}
 return {setVisibility(visible){for(const component of components)component.setVisibility(visible);}};
}
