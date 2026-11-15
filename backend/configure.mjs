import {randomBytes} from 'node:crypto';
import {existsSync,writeFileSync} from 'node:fs';
if(!existsSync(new URL('.env',import.meta.url)))writeFileSync(new URL('.env',import.meta.url),'JWT_SECRET='+randomBytes(48).toString('hex')+'\nDEMO_PASSWORD='+randomBytes(24).toString('base64url')+'\nCORS_ORIGIN=http://localhost:5173\nGBP_API_ENABLED=false\nOPENAI_ENABLED=false\n',{mode:0o600});
console.log('Local configuration ready; credentials are not logged.');
