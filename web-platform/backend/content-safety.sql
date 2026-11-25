revoke all on public.website_content from authenticated;
grant select,insert,update on public.website_content to authenticated;
alter table public.website_content add constraint website_details_object check (jsonb_typeof(details)='object');
alter table public.website_content add constraint website_maps_safe check (coalesce(details->>'mapsUrl','')='' or details->>'mapsUrl' ~ '^https://(www\.)?(google\.com/maps|maps\.google\.com/|maps\.app\.goo\.gl/)');
