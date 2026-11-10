/*
 * Server-only Looker signed embed service reference.
 * Never bundle this file into the browser and never expose Looker credentials.
 */
const DASHBOARDS = {
  ceo: process.env.LOOKER_DASHBOARD_CEO,
  region: process.env.LOOKER_DASHBOARD_REGION,
  branch: process.env.LOOKER_DASHBOARD_BRANCH,
  finance: process.env.LOOKER_DASHBOARD_FINANCE,
  reviews: process.env.LOOKER_DASHBOARD_REVIEWS,
  franchise: process.env.LOOKER_DASHBOARD_FRANCHISE,
  hr: process.env.LOOKER_DASHBOARD_HR,
  quality: process.env.LOOKER_DASHBOARD_QUALITY,
  legal: process.env.LOOKER_DASHBOARD_LEGAL
};

const ROLE_POLICY = Object.freeze({
  CEO: {scope:'hq', dashboards:Object.keys(DASHBOARDS)},
  GM: {scope:'hq', dashboards:Object.keys(DASHBOARDS)},
  REGION_MANAGER: {scope:'region', dashboards:['region','branch','reviews','hr','quality']},
  BRANCH_MANAGER: {scope:'branch', dashboards:['branch','reviews','hr','quality']}
});

function resolveEmbedContext(user, dashboardKey){
  if(!user?.id || !user?.role) throw Object.assign(new Error('Kimliği doğrulanmış ERP kullanıcısı gerekli.'),{status:401});
  const policy=ROLE_POLICY[user.role];
  if(!policy || !policy.dashboards.includes(dashboardKey)) throw Object.assign(new Error('Bu pano için yetkiniz yok.'),{status:403});
  const dashboardId=DASHBOARDS[dashboardKey];
  if(!dashboardId) throw Object.assign(new Error('Looker dashboard kimliği yapılandırılmamış.'),{status:503});
  if(policy.scope==='region' && !user.regionId) throw Object.assign(new Error('Kullanıcı bölge kapsamı eksik.'),{status:403});
  if(policy.scope==='branch' && !user.branchId) throw Object.assign(new Error('Kullanıcı şube kapsamı eksik.'),{status:403});
  return {
    dashboardId,
    externalUserId:`erp:${user.id}`,
    externalGroupId:`ototr:${policy.scope}:${user.regionId||user.branchId||'hq'}`,
    userAttributes:{
      ototr_scope:policy.scope,
      ototr_region_id:policy.scope==='region'?String(user.regionId):'%',
      ototr_branch_id:policy.scope==='branch'?String(user.branchId):'%',
      locale:'tr_TR'
    },
    scopeLabel:policy.scope==='hq'?'Genel merkez':policy.scope==='region'?`Bölge · ${user.regionName||user.regionId}`:`Şube · ${user.branchName||user.branchId}`
  };
}

async function createSignedEmbedUrl({lookerApi,user,dashboardKey,lookerHost,embedDomain}){
  if(!/^https:\/\//.test(lookerHost||'')) throw new Error('LOOKER_HOST geçerli bir HTTPS adresi olmalı.');
  if(!/^https:\/\//.test(embedDomain||'')) throw new Error('ERP_EMBED_DOMAIN geçerli bir HTTPS adresi olmalı.');
  const context=resolveEmbedContext(user,dashboardKey);
  const targetUrl=`${lookerHost.replace(/\/$/,'')}/dashboards/${encodeURIComponent(context.dashboardId)}?embed_domain=${encodeURIComponent(embedDomain)}&sdk=2`;
  const result=await lookerApi.create_sso_embed_url({
    target_url:targetUrl,
    session_length:900,
    force_logout_login:true,
    external_user_id:context.externalUserId,
    first_name:user.firstName||'ERP',
    last_name:user.lastName||'Kullanıcısı',
    permissions:['access_data','see_looks','see_user_dashboards'],
    models:['ototr_analytics'],
    group_ids:[],
    external_group_id:context.externalGroupId,
    user_attributes:context.userAttributes
  });
  if(!result?.url) throw new Error('Looker imzalı URL üretmedi.');
  return {url:result.url,scopeLabel:context.scopeLabel};
}

module.exports={DASHBOARDS,ROLE_POLICY,resolveEmbedContext,createSignedEmbedUrl};
