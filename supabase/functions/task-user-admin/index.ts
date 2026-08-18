import {createClient} from 'npm:@supabase/supabase-js@2.112.3'
import {corsHeaders} from 'npm:@supabase/supabase-js@2.112.3/cors'

const allowedOrigins=new Set([
  'https://samivolkan.github.io',
  'http://127.0.0.1:4179',
  'http://127.0.0.1:4180',
  'http://localhost:4179',
  'http://localhost:4180'
])

function defaultKey(mapName:string,legacyName:string){
  const raw=Deno.env.get(mapName)
  if(raw){
    try{
      const environmentName=JSON.parse(raw)?.default
      const value=environmentName?Deno.env.get(environmentName):null
      if(value)return value
    }catch{/* Fall back to the legacy environment name. */}
  }
  return Deno.env.get(legacyName)??''
}

function responseHeaders(req:Request){
  const origin=req.headers.get('origin')??''
  return {
    ...corsHeaders,
    'Access-Control-Allow-Origin':allowedOrigins.has(origin)?origin:'https://samivolkan.github.io',
    'Content-Type':'application/json; charset=utf-8',
    'Vary':'Origin'
  }
}

function json(req:Request,status:number,body:Record<string,unknown>){
  return new Response(JSON.stringify(body),{status,headers:responseHeaders(req)})
}

function publicError(error:unknown){
  const message=error instanceof Error?error.message:String(error??'')
  const normalized=message.toLocaleLowerCase('tr-TR')
  if(normalized.includes('already')||normalized.includes('registered')||normalized.includes('duplicate')){
    return {status:409,message:'Bu e-posta adresiyle bir giriş hesabı zaten bulunuyor.'}
  }
  if(normalized.includes('denied')||normalized.includes('permission')||normalized.includes('42501')){
    return {status:403,message:'Bu işlem için yönetici yetkiniz bulunmuyor.'}
  }
  if(normalized.includes('password')){
    return {status:400,message:'Geçici şifre en az 8 karakter olmalıdır.'}
  }
  return {status:500,message:'Kullanıcı oluşturulamadı. Lütfen tekrar deneyin.'}
}

Deno.serve(async(req:Request)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:responseHeaders(req)})
  if(req.method!=='POST')return json(req,405,{error:'Yalnızca POST isteği desteklenir.'})

  const authorization=req.headers.get('Authorization')??''
  const token=authorization.startsWith('Bearer ')?authorization.slice(7):''
  if(!token)return json(req,401,{error:'Oturum doğrulanamadı.'})

  const supabaseUrl=Deno.env.get('SUPABASE_URL')??''
  const publishableKey=defaultKey('SUPABASE_PUBLISHABLE_KEYS','SUPABASE_ANON_KEY')
  const secretKey=defaultKey('SUPABASE_SECRET_KEYS','SUPABASE_SERVICE_ROLE_KEY')
  if(!supabaseUrl||!publishableKey||!secretKey){
    return json(req,500,{error:'Sunucu yapılandırması eksik.'})
  }

  try{
    const body=await req.json()
    const projectId=String(body?.projectId??'')
    const fullName=String(body?.fullName??'').trim()
    const email=String(body?.email??'').trim().toLocaleLowerCase('tr-TR')
    const password=String(body?.password??'')
    const role=String(body?.role??'')
    if(body?.action!=='create'||!projectId||!fullName||!email||!role){
      return json(req,400,{error:'Zorunlu alanları doldurun.'})
    }
    if(fullName.length>160||email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){
      return json(req,400,{error:'Ad soyad veya e-posta biçimi geçersiz.'})
    }
    if(password.length<8||password.length>128){
      return json(req,400,{error:'Geçici şifre 8–128 karakter olmalıdır.'})
    }

    const userClient=createClient(supabaseUrl,publishableKey,{
      global:{headers:{Authorization:authorization}},
      auth:{persistSession:false,autoRefreshToken:false}
    })
    const {data:{user},error:userError}=await userClient.auth.getUser(token)
    if(userError||!user)return json(req,401,{error:'Oturum doğrulanamadı.'})

    const {error:contextError}=await userClient.rpc('task_user_admin_context',{
      target_project_id:projectId
    })
    if(contextError)return json(req,403,{error:'Bu proje için kullanıcı yönetimi yetkiniz yok.'})

    const adminClient=createClient(supabaseUrl,secretKey,{
      auth:{persistSession:false,autoRefreshToken:false}
    })
    const {data:created,error:createError}=await adminClient.auth.admin.createUser({
      email,password,email_confirm:true,user_metadata:{full_name:fullName}
    })
    if(createError||!created.user)throw createError??new Error('Auth user was not created')

    const {data:registered,error:registerError}=await userClient.rpc('register_task_project_user',{
      target_project_id:projectId,
      target_auth_user_id:created.user.id,
      target_full_name:fullName,
      target_email:email,
      target_role:role
    })
    if(registerError){
      const {error:cleanupError}=await adminClient.auth.admin.deleteUser(created.user.id)
      if(cleanupError)console.error('task-user-admin cleanup failed',{authUserId:created.user.id})
      throw registerError
    }

    return json(req,201,{
      user:{
        id:registered?.id??null,
        fullName:registered?.full_name??fullName,
        email:registered?.email??email,
        role:registered?.role??role,
        isActive:registered?.is_active??true
      }
    })
  }catch(error){
    const safe=publicError(error)
    return json(req,safe.status,{error:safe.message})
  }
})
