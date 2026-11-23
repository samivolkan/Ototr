create function public.seo_schedule_status() returns jsonb language sql security definer set search_path='' as $$
select jsonb_build_object('active',coalesce((select active from cron.job where jobname='ototr-seo-gbp-hourly'),false),'schedule','17 * * * *');
$$;
revoke all on function public.seo_schedule_status() from public,anon,authenticated;
grant execute on function public.seo_schedule_status() to service_role;
update public.seo_report_cache set enabled=true where source='gbp';
select cron.schedule('ototr-seo-gbp-hourly','17 * * * *','select app_private.dispatch_seo_sync()');
