-- ============================================================================
-- FRUTLLE E-COMMERCE: REAL-TIME ADMIN ORDER CANCELLATION ALERTS MIGRATION
-- Migration Version: 004 (Production Hardened & RLS Secured)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Create admin_notifications table
-- Confirmed relationships: public.orders(id) [UUID], public.users(id) [UUID]
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(50) NOT NULL DEFAULT 'order_cancellation',
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_read BOOLEAN NOT NULL DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 2. Idempotent uniqueness constraint
-- Enforce that an order can only ever have ONE notification of a specific type (e.g. order_cancellation)
-- Prevents duplicate alert records across concurrent customer cancellation attempts
-- ----------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_admin_notifications_order_type'
    ) THEN
        ALTER TABLE public.admin_notifications 
            ADD CONSTRAINT uq_admin_notifications_order_type UNIQUE (order_id, type);
    END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 3. High-performance lookup indexes
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_admin_notifications_created_at ON public.admin_notifications (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_is_read ON public.admin_notifications (is_read);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_order_id ON public.admin_notifications (order_id);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_type ON public.admin_notifications (type);

-- ----------------------------------------------------------------------------
-- 4. Row Level Security (RLS) - Principle of Least Privilege
-- ----------------------------------------------------------------------------
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

-- Clean existing policies for idempotency
DROP POLICY IF EXISTS "Deny public and customer direct access to admin notifications" ON public.admin_notifications;
DROP POLICY IF EXISTS "Allow authenticated admin direct select" ON public.admin_notifications;

-- By default, when RLS is enabled without permissive policies granted to anon or authenticated,
-- all direct public and customer client access is completely blocked.
-- All admin retrieval, unread count tallying, and read acknowledgement occur strictly through
-- the Express backend using SUPABASE_SERVICE_ROLE_KEY, which safely bypasses RLS after
-- verifying the administrator's JWT signature and database role.
-- Customers and anonymous visitors have NO access to this table.

-- ----------------------------------------------------------------------------
-- 5. Automatic updated_at Trigger
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS update_admin_notifications_modtime ON public.admin_notifications;
CREATE TRIGGER update_admin_notifications_modtime
    BEFORE UPDATE ON public.admin_notifications
    FOR EACH ROW EXECUTE PROCEDURE public.update_modified_column();
