import fs from 'node:fs/promises';
import {localPath} from './screening.mjs';
// Append-only audit, separate from RELION's potentially rewritten run.out.
export async function recordPickingHistory(project,job,event,details={}){
 const record={version:1,time:new Date().toISOString(),event,...details};
 try{
  await fs.appendFile(await localPath(project,job+'manual-cleaning-history.jsonl'),JSON.stringify(record)+'\n');
  const summary={...record};delete summary.before;delete summary.after;
  await fs.appendFile(await localPath(project,job+'run.out'),'[Manual cleaning] '+JSON.stringify(summary)+'\n');
 }catch(error){console.warn('Manual cleaning history could not be written: '+error.message);}
}
