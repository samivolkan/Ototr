import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
import nodemailer from 'npm:nodemailer@10.1.2';
Deno.serve(async req=>{
  const expected=Deno.env.get('KOKPIT_MAIL_TOKEN');
  if(req.method!=='POST'||!expected||req.headers.get('Authorization')!==`Bearer ${expected}`)
    return Response.json({error:'Yetkisiz'},{status:401});
  if(!['SMTP_HOST','SMTP_USER','SMTP_PASS','SMTP_FROM'].every(k=>Deno.env.get(k)))
    return Response.json({error:'SMTP yapılandırılmadı'},{status:503});
  const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
  const {data:jobs,error}=await db.rpc('kokpit_mail_claim');
  if(error) return Response.json({error:'Kuyruk okunamadı'},{status:500});
  const port=Number(Deno.env.get('SMTP_PORT')||465);
  const transport=nodemailer.createTransport({host:Deno.env.get('SMTP_HOST'),port,secure:port===465,requireTLS:port!==465,
    auth:{user:Deno.env.get('SMTP_USER'),pass:Deno.env.get('SMTP_PASS')},connectionTimeout:10000,socketTimeout:20000});
  let sent=0,failed=0;
  for(const job of jobs||[]){
    let success=false;
    try{
      await transport.sendMail({from:Deno.env.get('SMTP_FROM'),to:job.recipient,
        subject:'OTOTR · İş tamamlandı',text:`“${job.title}” işi tamamlandı.\n\nERP: https://samivolkan.github.io/Ototr/kokpit/`,
        messageId:`<kokpit-${job.id}@ototr.com>`}); success=true;sent++;
    }catch{failed++} // Never return SMTP credentials, recipients or provider errors.
    const ack=await db.rpc('kokpit_mail_ack',{mail_id:job.id,success});
    if(ack.error)failed++;
  }
  transport.close();
  return Response.json({sent,failed},{status:failed?502:200});
});
