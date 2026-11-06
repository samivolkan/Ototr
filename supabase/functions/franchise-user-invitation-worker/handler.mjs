const SAFE_ERROR_CODES=new Set(['auth_invite_failed','erp_link_failed','auth_cleanup_failed','unexpected_worker_error']);

export function safeErrorCode(value){
  const code=String(value||'').toLowerCase();
  return SAFE_ERROR_CODES.has(code)?code:'unexpected_worker_error';
}

export async function processInvitationBatch(requests,{invite,finish,cleanup}){
  const results=[];
  for(const request of requests){
    let authUserId;
    try{
      authUserId=await invite({email:request.normalized_email,displayName:request.display_name,erpRole:request.erp_role});
      if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(authUserId||''))throw Object.assign(new Error('Auth invite result invalid'),{safeCode:'auth_invite_failed'});
    }catch(error){
      const code=safeErrorCode(error?.safeCode||'auth_invite_failed');
      await finish({requestId:request.request_id,leaseToken:request.lease_token,success:false,authUserId:null,errorCode:code});
      results.push({requestId:request.request_id,ok:false,errorCode:code});
      continue;
    }
    try{
      await finish({requestId:request.request_id,leaseToken:request.lease_token,success:true,authUserId,errorCode:null});
      results.push({requestId:request.request_id,ok:true});
    }catch{
      let code='erp_link_failed';
      try{await cleanup(authUserId)}catch{code='auth_cleanup_failed'}
      await finish({requestId:request.request_id,leaseToken:request.lease_token,success:false,authUserId:null,errorCode:code});
      results.push({requestId:request.request_id,ok:false,errorCode:code});
    }
  }
  return results;
}
