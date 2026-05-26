-- Allow internal report audit triggers to write append-only audit rows while
-- keeping report_audit_logs closed to direct app inserts through RLS.

alter function public.audit_report_child_mutation() security definer;
alter function public.audit_report_child_mutation() set search_path = public;

revoke all on function public.audit_report_child_mutation() from public;
revoke all on function public.audit_report_child_mutation() from anon;
revoke all on function public.audit_report_child_mutation() from authenticated;
