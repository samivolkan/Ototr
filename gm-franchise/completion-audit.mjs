import{access,readFile}from'node:fs/promises';import{pathToFileURL}from'node:url';
export const VALID_STATUSES=Object.freeze(['PASS','EXTERNAL_PENDING','USER_APPROVAL_PENDING']);
export async function auditCompletion(matrix,rootUrl=new URL('../',import.meta.url)){
 const errors=[],ids=new Set();
 if(matrix?.schemaVersion!==1||!Array.isArray(matrix?.requirements)||matrix.requirements.length!==28)errors.push('requirement_catalog_incomplete');
 for(const item of matrix?.requirements||[]){if(ids.has(item.id))errors.push(`duplicate:${item.id}`);ids.add(item.id);if(!VALID_STATUSES.includes(item.status))errors.push(`status:${item.id}`);if(!item.owner)errors.push(`owner:${item.id}`);if(!item.evidence)errors.push(`evidence:${item.id}`);else try{await access(new URL(item.evidence,rootUrl));}catch{errors.push(`missing_evidence:${item.id}`);}}
 const pending=(matrix?.requirements||[]).filter(x=>x.status!=='PASS').map(x=>({id:x.id,status:x.status,requirement:x.requirement,owner:x.owner}));
 return Object.freeze({status:errors.length?'INVALID':pending.length?'NO_GO':'COMPLETE',localRequirementsPassed:(matrix?.requirements||[]).filter(x=>x.status==='PASS').length,totalRequirements:matrix?.requirements?.length||0,errors:Object.freeze(errors),pending:Object.freeze(pending)});
}
export async function loadCompletionAudit(url=new URL('./requirements-evidence.json',import.meta.url)){return auditCompletion(JSON.parse(await readFile(url,'utf8')));}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const result=await loadCompletionAudit();console.log(JSON.stringify(result,null,2));if(result.status!=='COMPLETE')process.exitCode=2;}
