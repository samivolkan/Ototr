import cron from 'node-cron';
import {runEscalationCheck} from '../services/escalation.js';
export function startCronJobs(){const task=cron.schedule('*/15 * * * *',()=>{try{runEscalationCheck();}catch{console.error('SLA job failed');}});return()=>task.stop();}

