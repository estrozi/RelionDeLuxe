import fs from 'node:fs/promises';
import path from 'node:path';
export function within(root, target) {
  const rel = path.relative(root, target);
  return rel === '' || (!rel.startsWith(`..${path.sep}`) && rel !== '..' && !path.isAbsolute(rel));
}
export async function readablePath(project, readRoots, relative) {
  if (typeof relative !== 'string' || relative.includes('\0')) throw new Error('Invalid path');
  const target = await fs.realpath(path.resolve(project, relative));
  if (![project, ...readRoots].some(root => within(root, target))) throw new Error('Path is outside configured read roots. For external movie symlinks, restart with --read-root /data/path.');
  return target;
}
export function jobPath(project, job) {
  if (typeof job !== 'string' || !/^[A-Za-z][A-Za-z0-9]*\/job\d+\/$/.test(job)) throw new Error('Invalid canonical job directory');
  return path.join(project, job);
}
export async function tail(file, maxBytes = 128 * 1024) {
  const h = await fs.open(file, 'r');
  try { const st = await h.stat(); const buf = Buffer.alloc(Math.min(st.size, maxBytes)); const {bytesRead} = await h.read(buf,0,buf.length,Math.max(0,st.size-buf.length));
    return {text:buf.subarray(0,bytesRead).toString('utf8'),truncated:st.size>maxBytes,size:st.size};
  } finally {await h.close();}
}
// The GUI log viewer requests the complete snapshot, without a tail byte limit.
export async function readLog(file){
 const data=await fs.readFile(file);
 return {text:data.toString('utf8'),size:data.length,truncated:false};
}
