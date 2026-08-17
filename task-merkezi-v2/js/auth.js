const PORTAL_SESSION_KEY='ototr-dealer-supabase-session-v1';

function readPortalSession(){
  try{return JSON.parse(localStorage.getItem(PORTAL_SESSION_KEY)||'null')}
  catch{return null}
}

function savePortalSession(session,email=''){
  if(!session?.access_token||!session?.refresh_token)return;
  localStorage.setItem(PORTAL_SESSION_KEY,JSON.stringify({
    access_token:session.access_token,
    refresh_token:session.refresh_token,
    email:session.user?.email||email,
    expires_at:session.expires_at?session.expires_at*1000:Date.now()+3600000
  }));
}

export async function requireSession(client){
  const current=await client.auth.getSession();
  if(current.error)throw current.error;
  if(current.data.session)return current.data.session;
  const portalSession=readPortalSession();
  if(!portalSession?.access_token||!portalSession?.refresh_token)return null;
  const restored=await client.auth.setSession({
    access_token:portalSession.access_token,
    refresh_token:portalSession.refresh_token
  });
  if(restored.error){localStorage.removeItem(PORTAL_SESSION_KEY);return null}
  savePortalSession(restored.data.session,portalSession.email);
  return restored.data.session||null;
}

export async function signIn(client,email,password){
  const result=await client.auth.signInWithPassword({email:String(email||'').trim(),password:String(password||'')});
  if(!result.error)savePortalSession(result.data.session,email);
  return result;
}

export async function signOut(client){
  localStorage.removeItem(PORTAL_SESSION_KEY);
  return client.auth.signOut();
}
