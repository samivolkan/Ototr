-- Europe/Istanbul 03:10, independent of browser sessions.
create extension if not exists pg_cron;
select cron.schedule('isler24-overdue-daily','10 0 * * *',$$select app_private.isler24_daily();$$);
-- Mail delivery remains disabled until SMTP setup is authorized.
