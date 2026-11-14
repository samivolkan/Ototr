-- Seed the default approval policy for the existing OTOTR Google connection.
-- AI replies stay draft-only until an allowed admin publishes them.
insert into public.google_review_policies (connection_id, approver_roles, auto_reply_enabled, default_sla_hours)
values ('ototr-primary', array['CEO', 'GENERAL_MANAGER', 'GOOGLE_REVIEW_ADMIN', 'MARKETING_DIRECTOR'], false, 24)
on conflict (connection_id) do update set
  approver_roles = excluded.approver_roles,
  auto_reply_enabled = false,
  default_sla_hours = 24,
  updated_at = now();
