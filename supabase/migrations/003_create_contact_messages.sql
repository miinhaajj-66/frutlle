-- ============================================================================
-- FRUTLLE E-COMMERCE: CONTACT MESSAGES MANAGEMENT MIGRATION
-- Migration Version: 003 (Production Hardened & RLS Secured)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Create contact_messages table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.contact_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    email VARCHAR(255) NOT NULL,
    subject VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Idempotent performance and search indexes
CREATE INDEX IF NOT EXISTS idx_contact_messages_created_at ON public.contact_messages (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_messages_is_read ON public.contact_messages (is_read);
CREATE INDEX IF NOT EXISTS idx_contact_messages_email ON public.contact_messages (email);

-- ----------------------------------------------------------------------------
-- 2. Row Level Security (RLS) - Principle of Least Privilege
-- ----------------------------------------------------------------------------
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

-- Clean existing policies for idempotency
DROP POLICY IF EXISTS "Allow public to insert contact messages" ON public.contact_messages;
DROP POLICY IF EXISTS "Deny direct public read of contact messages" ON public.contact_messages;
DROP POLICY IF EXISTS "Deny direct public update of contact messages" ON public.contact_messages;
DROP POLICY IF EXISTS "Deny direct public delete of contact messages" ON public.contact_messages;

-- Allow public / anonymous visitors to submit valid contact messages with sensible limits
CREATE POLICY "Allow public to insert contact messages" ON public.contact_messages
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (
        LENGTH(TRIM(name)) >= 2 AND LENGTH(TRIM(name)) <= 150
        AND LENGTH(TRIM(email)) >= 5 AND LENGTH(TRIM(email)) <= 255
        AND email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
        AND LENGTH(TRIM(subject)) >= 2 AND LENGTH(TRIM(subject)) <= 200
        AND LENGTH(TRIM(message)) >= 5 AND LENGTH(TRIM(message)) <= 5000
    );

-- NOTE: All admin reading, status updates, and deletions occur strictly through
-- the Express backend using SUPABASE_SERVICE_ROLE_KEY, which safely bypasses RLS
-- after verifying the administrator's JWT signature and database role.
-- Direct anon/authenticated client reads, updates, and deletes are denied by RLS default.

-- ----------------------------------------------------------------------------
-- 3. Automatic updated_at Trigger
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS update_contact_messages_modtime ON public.contact_messages;
CREATE TRIGGER update_contact_messages_modtime
    BEFORE UPDATE ON public.contact_messages
    FOR EACH ROW EXECUTE PROCEDURE public.update_modified_column();
