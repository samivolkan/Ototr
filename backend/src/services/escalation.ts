import {computeSlaStatus} from './sla.js';
import {enqueue} from './notifications.js';
export function runEscalationCheck(){for(const row of computeSlaStatus())if(row.overdue)enqueue(row.reviewId,'sla_overdue');}

