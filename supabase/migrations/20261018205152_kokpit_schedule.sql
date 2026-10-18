-- Europe/Istanbul 03:05 = 00:05 UTC. Runs even when no browser is open.
create extension if not exists pg_cron;
select cron.schedule('kokpit-overdue-daily','5 0 * * *',$$select app_private.kokpit_daily();$$);
-- SMTP delivery intentionally deferred by the owner. No mail worker cron is installed.
