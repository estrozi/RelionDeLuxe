import {parentPort,workerData} from 'node:worker_threads';
import {particleStatistics} from './picking-statistics.mjs';
try{parentPort.postMessage({result:await particleStatistics(...workerData)});}catch(e){parentPort.postMessage({error:e.message});}
