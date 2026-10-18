-- Runtime API state is encrypted before insertion and accessible only through
-- authenticated, owner-checked API routes. Do not expose these tables to clients.
BEGIN;
CREATE TABLE IF NOT EXISTS public.app_records (
  namespace text NOT NULL,
  key text NOT NULL,
  value text NOT NULL,
  PRIMARY KEY(namespace,key)
);
CREATE TABLE IF NOT EXISTS public.rate_limits (
  key text PRIMARY KEY,
  window_id bigint NOT NULL,
  count integer NOT NULL
);
CREATE TABLE IF NOT EXISTS public.revoked_accounts (user_id text PRIMARY KEY);
ALTER TABLE public.app_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revoked_accounts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.app_records,public.rate_limits,public.revoked_accounts FROM PUBLIC,anon,authenticated;

-- Protect legacy typed tables too. A child row cannot claim a different owner
-- from its parent, even when a client supplies its own user_id.
ALTER TABLE public.reports ADD CONSTRAINT reports_id_owner UNIQUE(id,user_id);
ALTER TABLE public.reminders ADD CONSTRAINT reminders_id_owner UNIQUE(id,user_id);
ALTER TABLE public.conversations ADD CONSTRAINT conversations_id_owner UNIQUE(id,user_id);
ALTER TABLE public.report_observations ADD CONSTRAINT observations_parent_owner
  FOREIGN KEY(report_id,user_id) REFERENCES public.reports(id,user_id) ON DELETE CASCADE;
ALTER TABLE public.report_chunks ADD CONSTRAINT chunks_parent_owner
  FOREIGN KEY(report_id,user_id) REFERENCES public.reports(id,user_id) ON DELETE CASCADE;
ALTER TABLE public.processing_jobs ADD CONSTRAINT jobs_parent_owner
  FOREIGN KEY(report_id,user_id) REFERENCES public.reports(id,user_id) ON DELETE CASCADE;
ALTER TABLE public.messages ADD CONSTRAINT messages_parent_owner
  FOREIGN KEY(conversation_id,user_id) REFERENCES public.conversations(id,user_id) ON DELETE CASCADE;
ALTER TABLE public.reminder_completions ADD CONSTRAINT completions_parent_owner
  FOREIGN KEY(reminder_id,user_id) REFERENCES public.reminders(id,user_id) ON DELETE CASCADE;

DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['profiles','health_logs','reminders','reminder_completions','reports','report_observations','report_chunks','conversations','messages','saved_plans','logged_meals','processing_jobs']
  LOOP
    EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY(user_id) REFERENCES auth.users(id) ON DELETE CASCADE',table_name,table_name||'_auth_owner');
  END LOOP;
END $$;
REVOKE INSERT,UPDATE,DELETE ON public.processing_jobs FROM anon,authenticated;
COMMENT ON TABLE public.app_records IS 'Canonical API state; API-only access, encrypted values. Legacy typed tables are not the API runtime store.';
COMMIT;
