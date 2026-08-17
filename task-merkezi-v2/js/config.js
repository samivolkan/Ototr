export function getConfig(){const c=window.OTOTR_SUPABASE_CONFIG||{};return {url:c.url||'',publishableKey:c.publishableKey||c.anonKey||'',configured:Boolean(c.url&&(c.publishableKey||c.anonKey))}}
