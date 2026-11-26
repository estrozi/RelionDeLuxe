export function isMapNode(file,nodes){
 if(!/\.(mrc|map)$/i.test(file))return false;
 const type=nodes.find(n=>n.name===file)?.type||'';
 return !type||/^(DensityMap|Mask3D)(\.|$)/.test(type);
}
export function mapViewerURL(file,token,theme){
 return '/map-viewer.html#'+new URLSearchParams({file,token,theme});
}
export async function downloadMap(file,token){
 const response=await fetch('/api/map-download?file='+encodeURIComponent(file),{headers:{'X-Relion-Token':token}});
 if(!response.ok)throw Error((await response.json()).error||'Download failed');
 const url=URL.createObjectURL(await response.blob()),a=document.createElement('a');
 a.href=url;a.download=file.split('/').pop();document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
}
