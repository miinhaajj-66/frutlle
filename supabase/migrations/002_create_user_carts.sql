-- ============================================================================
-- FRUTLLE E-COMMERCE: USER CART ISOLATION & PERSISTENCE MIGRATION
-- Migration Version: 002 (Production Hardened)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Create user_carts table
-- Confirmed relationships: public.users(id) [UUID]
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_carts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT uq_user_carts_user UNIQUE (user_id)
);

-- Performance and lookup index
CREATE INDEX IF NOT EXISTS idx_user_carts_user_id ON public.user_carts (user_id);

-- ----------------------------------------------------------------------------
-- 2. Row Level Security (RLS) - Minimum Privilege
-- ----------------------------------------------------------------------------
ALTER TABLE public.user_carts ENABLE ROW LEVEL SECURITY;

-- Clean existing policies for idempotency
DROP POLICY IF EXISTS "Users can only select their own cart" ON public.user_carts;
DROP POLICY IF EXISTS "Users can only insert their own cart" ON public.user_carts;
DROP POLICY IF EXISTS "Users can only update their own cart" ON public.user_carts;
DROP POLICY IF EXISTS "Users can only delete their own cart" ON public.user_carts;
DROP POLICY IF EXISTS "Deny anon access to user_carts" ON public.user_carts;

-- Authenticated users can only read their own cart
CREATE POLICY "Users can only select their own cart" ON public.user_carts
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- Authenticated users can only insert their own cart
CREATE POLICY "Users can only insert their own cart" ON public.user_carts
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Authenticated users can only update their own cart
CREATE POLICY "Users can only update their own cart" ON public.user_carts
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Authenticated users can only delete their own cart
CREATE POLICY "Users can only delete their own cart" ON public.user_carts
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- NOTE: Anonymous / unauthenticated callers have NO policies granted and are completely blocked by RLS.
-- Direct queries using SUPABASE_SERVICE_ROLE_KEY bypass RLS for trusted backend server operations.

-- ----------------------------------------------------------------------------
-- 3. Automatic updated_at Trigger
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS update_user_carts_modtime ON public.user_carts;
CREATE TRIGGER update_user_carts_modtime
    BEFORE UPDATE ON public.user_carts
    FOR EACH ROW EXECUTE PROCEDURE public.update_modified_column();
