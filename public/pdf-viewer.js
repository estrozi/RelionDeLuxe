const params=new URLSearchParams(location.hash.slice(1)),file=params.get('file')||'',token=params.get('token')||sessionStorage.getItem('relion-token')||'';
if(token)sessionStorage.setItem('relion-token',token);params.delete('token');history.replaceState(null,'',location.pathname+'#'+params);
document.documentElement.dataset.theme=params.get('theme')||'light';document.querySelector('#filename').textContent=file;document.title=file.split('/').pop()+' · RelionDeLuxe';
const controller=new AbortController();let url;window.addEventListener('pagehide',()=>{controller.abort();if(url)URL.revokeObjectURL(url);},{once:true});
try{
 const response=await fetch('/api/pdf?file='+encodeURIComponent(file),{headers:{'X-Relion-Token':token},signal:controller.signal});
 if(!response.ok)throw Error((await response.json()).error||'Could not load PDF');
 url=URL.createObjectURL(new Blob([await response.arrayBuffer()],{type:'application/pdf'}));
 const download=document.querySelector('#download');download.href=url;download.download=file.split('/').pop();download.hidden=false;
 const frame=document.querySelector('#pdf');frame.src=url+'#zoom=page-fit&view=Fit';frame.hidden=false;document.querySelector('#status').remove();
}catch(e){if(e.name!=='AbortError'){const status=document.querySelector('#status');status.hidden=false;status.textContent='PDF unavailable: '+e.message;}}
