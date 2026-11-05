-- Franchise staging advisor hardening.
-- Trigger functions are never callable RPCs; business RPCs keep their claim-aware guards.
revoke execute on function public.franchise_sync_access_scope() from public, anon, authenticated;
revoke execute on function public.franchise_revoke_access_scope() from public, anon, authenticated;
revoke execute on function public.supersede_franchise_board_on_score_change() from public, anon, authenticated;

-- Add a covering index for every single/multi-column FK on the new franchise tables.
-- Existing equivalent indexes are preserved and duplicate indexes are not created.
do $$
declare
  fk record;
  index_name text;
begin
  for fk in
    select
      c.oid as table_oid,
      n.nspname as schema_name,
      c.relname as table_name,
      con.conname as constraint_name,
      con.conkey as key_columns,
      string_agg(quote_ident(a.attname), ', ' order by k.ordinality) as column_list
    from pg_constraint con
    join pg_class c on c.oid = con.conrelid
    join pg_namespace n on n.oid = c.relnamespace
    join unnest(con.conkey) with ordinality as k(attnum, ordinality) on true
    join pg_attribute a on a.attrelid = c.oid and a.attnum = k.attnum
    where con.contype = 'f'
      and n.nspname = 'public'
      and c.relname like 'franchise\_%' escape '\'
      and not exists (
        select 1
        from pg_index i
        where i.indrelid = c.oid
          and i.indisvalid
          and (i.indkey::smallint[])[0:cardinality(con.conkey)-1] = con.conkey
      )
    group by c.oid, n.nspname, c.relname, con.conname, con.conkey
  loop
    index_name := left(fk.table_name || '_' || fk.constraint_name || '_idx', 63);
    execute format(
      'create index if not exists %I on %I.%I (%s)',
      index_name,
      fk.schema_name,
      fk.table_name,
      fk.column_list
    );
  end loop;
end
$$;
