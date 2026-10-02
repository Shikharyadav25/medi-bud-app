-- =============================================================================
-- Medi Bud Initial Schema: Auth, RLS, pgvector(384), Jobs, and Observability
-- Date: 2026-10-02
-- Authors: Shreshth Gupta (Database/Security) & Medi Bud Engineering Team
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- 1. User Profiles (1 self-profile per account)
CREATE TABLE IF NOT EXISTS public.profiles (
    user_id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    age INTEGER NOT NULL CHECK (age >= 18 AND age <= 120),
    height_cm NUMERIC CHECK (height_cm > 0),
    weight_kg NUMERIC CHECK (weight_kg > 0),
    locale TEXT NOT NULL DEFAULT 'en' CHECK (locale IN ('en', 'hi')),
    goals TEXT[] NOT NULL DEFAULT '{}',
    dietary_preferences TEXT[] NOT NULL DEFAULT '{}',
    declared_allergens TEXT[] NOT NULL DEFAULT '{}',
    conditions TEXT[] NOT NULL DEFAULT '{}',
    medications TEXT[] NOT NULL DEFAULT '{}',
    version INTEGER NOT NULL DEFAULT 1,
    consent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Append-Only Health Logs with Idempotent Mutation ID
CREATE TABLE IF NOT EXISTS public.health_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    kind TEXT NOT NULL CHECK (kind IN ('water', 'sleep', 'activity')),
    value NUMERIC NOT NULL,
    unit TEXT NOT NULL,
    occurred_at TIMESTAMPTZ NOT NULL,
    timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    mutation_id UUID NOT NULL,
    payload_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_health_logs_user_mutation UNIQUE (user_id, mutation_id)
);
CREATE INDEX IF NOT EXISTS idx_health_logs_user_occurred ON public.health_logs(user_id, occurred_at DESC);

-- 3. Reminders (User-entered schedules)
CREATE TABLE IF NOT EXISTS public.reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    label TEXT NOT NULL,
    user_entered_schedule TEXT NOT NULL,
    timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_reminders_user ON public.reminders(user_id);

-- 4. Reminder Completions (Idempotent replay)
CREATE TABLE IF NOT EXISTS public.reminder_completions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    reminder_id UUID NOT NULL REFERENCES public.reminders(id) ON DELETE CASCADE,
    due_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ NOT NULL,
    mutation_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_reminder_completions_user_mutation UNIQUE (user_id, mutation_id)
);
CREATE INDEX IF NOT EXISTS idx_reminder_completions_user_reminder ON public.reminder_completions(user_id, reminder_id);

-- 5. Uploaded Lab Reports (Owner-scoped private bucket pointers)
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    object_key TEXT NOT NULL,
    filename TEXT NOT NULL,
    mime TEXT NOT NULL,
    checksum TEXT NOT NULL,
    report_date DATE,
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'review_needed', 'ready', 'failed')),
    error_message TEXT,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_reports_user_status ON public.reports(user_id, status) WHERE deleted_at IS NULL;

-- 6. Structured Report Observations (User confirmation required)
CREATE TABLE IF NOT EXISTS public.report_observations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    original_label TEXT NOT NULL,
    canonical_test TEXT NOT NULL,
    value_text TEXT NOT NULL,
    numeric_value NUMERIC,
    comparator TEXT,
    unit TEXT NOT NULL,
    reference_text TEXT,
    bounds_low NUMERIC,
    bounds_high NUMERIC,
    status TEXT NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed', 'confirmed', 'rejected')),
    page INTEGER NOT NULL DEFAULT 1,
    source_span TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_observations_report ON public.report_observations(report_id, status);
CREATE INDEX IF NOT EXISTS idx_observations_user_test ON public.report_observations(user_id, canonical_test, status);

-- 7. Report Text Chunks & Persistent 384-dim Vectors
CREATE TABLE IF NOT EXISTS public.report_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    page INTEGER NOT NULL DEFAULT 1,
    text TEXT NOT NULL,
    embedding vector(384),
    embedding_model TEXT NOT NULL DEFAULT 'sentence-transformers/all-MiniLM-L6-v2',
    corpus_version TEXT NOT NULL DEFAULT '1.0.0',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_report_chunks_user_report ON public.report_chunks(user_id, report_id);
CREATE INDEX IF NOT EXISTS idx_report_chunks_vector ON public.report_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_report_chunks_fts ON public.report_chunks USING gin (to_tsvector('english', text));

-- 8. Approved Educational Knowledge Sources & Chunks
CREATE TABLE IF NOT EXISTS public.knowledge_sources (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    publisher TEXT NOT NULL,
    version TEXT NOT NULL,
    access_date DATE NOT NULL,
    review_status TEXT NOT NULL,
    permitted_use TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.knowledge_chunks (
    id TEXT PRIMARY KEY,
    source_id TEXT NOT NULL REFERENCES public.knowledge_sources(id) ON DELETE CASCADE,
    section TEXT NOT NULL,
    text TEXT NOT NULL,
    embedding vector(384),
    embedding_model TEXT NOT NULL DEFAULT 'sentence-transformers/all-MiniLM-L6-v2',
    version TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_vector ON public.knowledge_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 50);
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_fts ON public.knowledge_chunks USING gin (to_tsvector('english', text));

-- 9. Conversations and Messages (History & Grounded Citations)
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    title TEXT NOT NULL DEFAULT 'Health Q&A',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_conversations_user ON public.conversations(user_id);

CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    text TEXT NOT NULL,
    mode TEXT NOT NULL DEFAULT 'extractive' CHECK (mode IN ('extractive', 'grounded_generation', 'rules')),
    citations_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id, created_at ASC);

-- 10. Curated Indian Food Catalogue
CREATE TABLE IF NOT EXISTS public.food_catalog (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    region TEXT NOT NULL,
    meal_slots TEXT[] NOT NULL,
    portion_basis TEXT NOT NULL,
    is_veg BOOLEAN NOT NULL DEFAULT true,
    ingredients TEXT[] NOT NULL,
    allergens TEXT[] NOT NULL DEFAULT '{}',
    calories NUMERIC NOT NULL,
    protein_g NUMERIC NOT NULL,
    carbs_g NUMERIC NOT NULL,
    fat_g NUMERIC NOT NULL,
    fiber_g NUMERIC NOT NULL,
    provenance TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 11. Saved 7-Day Indian Meal Plans
CREATE TABLE IF NOT EXISTS public.saved_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    preferences_snapshot JSONB NOT NULL,
    days_json JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_saved_plans_user ON public.saved_plans(user_id);

-- 12. Manual Meal Logs
CREATE TABLE IF NOT EXISTS public.logged_meals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    food_id TEXT REFERENCES public.food_catalog(id),
    food_name TEXT NOT NULL,
    meal_type TEXT NOT NULL,
    portions NUMERIC NOT NULL DEFAULT 1,
    calories NUMERIC NOT NULL,
    protein_g NUMERIC NOT NULL,
    carbs_g NUMERIC NOT NULL,
    fat_g NUMERIC NOT NULL,
    logged_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_logged_meals_user ON public.logged_meals(user_id, logged_at DESC);

-- 13. Persistent Asynchronous Processing Jobs (No Redis, Postgres transactional claims)
CREATE TABLE IF NOT EXISTS public.processing_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
    kind TEXT NOT NULL DEFAULT 'report_ocr',
    state TEXT NOT NULL DEFAULT 'queued' CHECK (state IN ('queued', 'running', 'completed', 'failed')),
    attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 3,
    available_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    lease_until TIMESTAMPTZ,
    error_code TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_jobs_claim ON public.processing_jobs(state, available_at) WHERE state = 'queued';

-- =============================================================================
-- Row Level Security (RLS) - Mandatory on 100% of User Tables
-- =============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminder_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logged_meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processing_jobs ENABLE ROW LEVEL SECURITY;

-- Public reference tables (Read-only for all authenticated & anon users)
ALTER TABLE public.knowledge_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read knowledge_sources" ON public.knowledge_sources FOR SELECT USING (true);
CREATE POLICY "Public read knowledge_chunks" ON public.knowledge_chunks FOR SELECT USING (true);
CREATE POLICY "Public read food_catalog" ON public.food_catalog FOR SELECT USING (true);

-- User Isolation Policies
CREATE POLICY "User owns profile" ON public.profiles FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "User owns health_logs" ON public.health_logs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "User owns reminders" ON public.reminders FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "User owns reminder_completions" ON public.reminder_completions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "User owns reports" ON public.reports FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "User owns report_observations" ON public.report_observations FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "User owns report_chunks" ON public.report_chunks FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "User owns conversations" ON public.conversations FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "User owns messages" ON public.messages FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "User owns saved_plans" ON public.saved_plans FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "User owns logged_meals" ON public.logged_meals FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "User owns processing_jobs" ON public.processing_jobs FOR ALL USING (auth.uid() = user_id);

-- Storage bucket access policies for private 'reports' bucket
-- Storage objects must match folder: reports/{user_id}/{filename}
-- Users can only read and write within their own user_id directory
INSERT INTO storage.buckets (id, name, public)
VALUES ('reports', 'reports', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload their own reports"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'reports' AND
    auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can read their own reports"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'reports' AND
    auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own reports"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'reports' AND
    auth.uid()::text = (storage.foldername(name))[1]
);
