-- Legacy tokens cannot be assumed to belong to the current OAuth application.
-- Keep the owner and encrypted token; reconnect securely through the existing flow.
alter table public.google_business_connections add column oauth_client_id text;
comment on column public.google_business_connections.oauth_client_id is 'OAuth client that issued the encrypted refresh token. NULL requires reconnection.';
