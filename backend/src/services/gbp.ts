import {HttpError} from '../auth/middleware.js';
// Live writes remain locked until the existing ERP identity and Google mapping are verified.
export async function replyToGbpReview():Promise<never>{throw new HttpError(503,'Canlı yayın adaptörü doğrulanmadı; gönderim yapılmadı');}
export const gbpConfigured=()=>false;

