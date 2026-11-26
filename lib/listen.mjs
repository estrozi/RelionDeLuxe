import net from 'node:net';
import {terminalConfirm} from './terminal-confirm.mjs';
function bind(server,port,host){return new Promise((resolve,reject)=>{const fail=e=>{server.removeListener('listening',ok);reject(e);};const ok=()=>{server.removeListener('error',fail);resolve();};server.once('error',fail);server.once('listening',ok);server.listen(port,host);});}
export async function listenWithPortPrompt(server,port,host,{confirm}={}){
 for(;;){
  try{await bind(server,port,host);return port;}catch(e){if(e.code!=='EADDRINUSE')throw Error(`Cannot listen on ${host}:${port}: ${e.message}`);}
  let next=port+1;
  for(;next<=65535;next++){const probe=net.createServer();try{await bind(probe,next,host);await new Promise(resolve=>probe.close(resolve));break;}catch(e){if(e.code!=='EADDRINUSE')throw Error(`Cannot check port ${next}: ${e.message}`);}}
  if(next>65535)throw Error('No higher port is available. Choose another port with --port.');
  const ask=confirm||async function(){
   if(!process.stdin.isTTY)throw Error(`Port ${port} is already in use. Restart with --port ${next}, or use an interactive terminal to choose another port.`);
   return terminalConfirm(`Port ${port} is already in use. Use the next available port (${next})?`);
  };
  if(!await ask({port,next,host}))throw Error('Startup cancelled; no server was started.');
  port=next; // Retry binding: another process may have taken it since the probe.
 }
}
