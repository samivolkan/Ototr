-- Local migration-test contract only. Real Supabase provides these objects.
-- Never apply to a hosted Supabase project.
create table if not exists storage.buckets(
  id text primary key,
  name text not null,
  public boolean not null default false,
  file_size_limit bigint,
  allowed_mime_types text[]
);
create table if not exists storage.objects(
  id uuid primary key default gen_random_uuid(),
  bucket_id text not null references storage.buckets(id),
  name text not null,
  owner_id text
);
alter table storage.objects enable row level security;
create or replace function storage.foldername(name text)
returns text[] language sql immutable
as $$ select (string_to_array(name,'/'))[1:greatest(array_length(string_to_array(name,'/'),1)-1,0)] $$;
create or replace function auth.jwt()
returns jsonb language sql stable
as $$ select coalesce(nullif(current_setting('request.jwt.claims',true),'')::jsonb,'{}'::jsonb) $$;
create or replace function auth.uid()
returns uuid language sql stable
as $$ select nullif(auth.jwt()->>'sub','')::uuid $$;
