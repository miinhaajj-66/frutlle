-- ============================================================================
-- FRUTLLE E-COMMERCE: FINAL HARDENED COUPONS & REDEMPTIONS MIGRATION
-- Migration Version: 001 (Final Schema-Verified)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Create coupons table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255),
    description TEXT,
    discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value DECIMAL(10, 2) NOT NULL CHECK (discount_value > 0),
    minimum_order_amount DECIMAL(10, 2) DEFAULT 0 CHECK (minimum_order_amount >= 0),
    maximum_discount_amount DECIMAL(10, 2),
    starts_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    usage_limit INTEGER,
    per_customer_limit INTEGER DEFAULT 1,
    usage_count INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'draft')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Idempotent performance indexes
CREATE INDEX IF NOT EXISTS idx_coupons_code ON public.coupons (UPPER(code));
CREATE INDEX IF NOT EXISTS idx_coupons_status ON public.coupons (status);

-- ----------------------------------------------------------------------------
-- 2. Create coupon_redemptions table
-- Confirmed relationships: public.users(id) [UUID], public.orders(id) [UUID]
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.coupon_redemptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coupon_id UUID NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    discount_applied DECIMAL(10, 2) NOT NULL CHECK (discount_applied >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Idempotent unique constraint: Ensure an order can NEVER redeem more than one coupon
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_coupon_redemptions_order'
    ) THEN
        ALTER TABLE public.coupon_redemptions 
            ADD CONSTRAINT uq_coupon_redemptions_order UNIQUE (order_id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_user ON public.coupon_redemptions (user_id);
CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_order ON public.coupon_redemptions (order_id);
CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_coupon_user ON public.coupon_redemptions (coupon_id, user_id);

-- ----------------------------------------------------------------------------
-- 3. Row Level Security (RLS) - Minimum Privilege
-- ----------------------------------------------------------------------------
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;

-- Clean existing policies for idempotency
DROP POLICY IF EXISTS "Allow anon read active coupons" ON public.coupons;
DROP POLICY IF EXISTS "Allow authenticated read active coupons" ON public.coupons;
DROP POLICY IF EXISTS "Allow admin full access to coupons" ON public.coupons;
DROP POLICY IF EXISTS "Allow public read access to active coupons" ON public.coupons;
DROP POLICY IF EXISTS "Allow public read active coupons" ON public.coupons;
DROP POLICY IF EXISTS "Allow users to read their own redemptions" ON public.coupon_redemptions;
DROP POLICY IF EXISTS "Allow admin full access to redemptions" ON public.coupon_redemptions;

-- Public / Anonymous can ONLY view active, currently valid coupons
CREATE POLICY "Allow public read active coupons" ON public.coupons
    FOR SELECT
    TO anon, authenticated
    USING (
        status = 'active'
        AND (starts_at IS NULL OR starts_at <= NOW())
        AND (expires_at IS NULL OR expires_at >= NOW())
    );

-- Authenticated users can only inspect their own redemption history
CREATE POLICY "Allow users to read their own redemptions" ON public.coupon_redemptions
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- NOTE: All coupon mutations (INSERT, UPDATE, DELETE) and redemptions occur strictly
-- through the Express backend using SUPABASE_SERVICE_ROLE_KEY, which safely bypasses RLS.
-- Direct mutations via anon or regular authenticated PostgREST are completely blocked.

-- ----------------------------------------------------------------------------
-- 4. Automatic updated_at Trigger
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_modified_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_coupons_modtime ON public.coupons;
CREATE TRIGGER update_coupons_modtime
    BEFORE UPDATE ON public.coupons
    FOR EACH ROW EXECUTE PROCEDURE public.update_modified_column();

-- ----------------------------------------------------------------------------
-- 5. Hardened Transactional Coupon Redemption Function
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.apply_coupon(
    p_coupon_code VARCHAR,
    p_user_id UUID,
    p_order_id UUID,
    p_subtotal DECIMAL DEFAULT NULL
) 
RETURNS JSON 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_coupon public.coupons%ROWTYPE;
    v_order public.orders%ROWTYPE;
    v_discount DECIMAL(10, 2);
    v_actual_subtotal DECIMAL(10, 2);
    v_subtotal_after_discount DECIMAL(10, 2);
    v_new_total DECIMAL(10, 2);
    v_customer_redemptions INT;
    v_existing_redemption UUID;
BEGIN
    -- 1. Input Validation
    IF p_coupon_code IS NULL OR TRIM(p_coupon_code) = '' THEN
        RETURN json_build_object('success', false, 'message', 'Coupon code is required.');
    END IF;

    IF p_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'User ID is required.');
    END IF;

    IF p_order_id IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'Order ID is required.');
    END IF;

    -- 2. Verify User exists in public.users
    IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_user_id) THEN
        RETURN json_build_object('success', false, 'message', 'User account does not exist.');
    END IF;

    -- 3. Lock and Verify the Order (Never trust client-supplied data)
    SELECT * INTO v_order 
    FROM public.orders 
    WHERE id = p_order_id 
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'Order not found.');
    END IF;

    -- 4. Enforce Order Ownership (prevent unauthorized users from applying coupons to other users' orders)
    IF v_order.user_id IS DISTINCT FROM p_user_id THEN
        RETURN json_build_object('success', false, 'message', 'Unauthorized: Order does not belong to specified user.');
    END IF;

    -- 5. Validate Order Status (Only 'Pending' orders can redeem coupons)
    IF v_order.status NOT IN ('Pending') THEN
        RETURN json_build_object('success', false, 'message', 'Coupon cannot be applied to an order with status: ' || v_order.status);
    END IF;

    -- 6. Enforce Single Redemption Per Order (Idempotency check)
    SELECT id INTO v_existing_redemption
    FROM public.coupon_redemptions
    WHERE order_id = p_order_id;

    IF FOUND THEN
        RETURN json_build_object('success', false, 'message', 'A coupon has already been redeemed for this order.');
    END IF;

    -- 7. Find and Lock the Coupon
    SELECT * INTO v_coupon 
    FROM public.coupons 
    WHERE UPPER(code) = UPPER(TRIM(p_coupon_code)) AND status = 'active'
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'Coupon not found or inactive.');
    END IF;

    -- 8. Validate Date Range
    IF v_coupon.starts_at IS NOT NULL AND v_coupon.starts_at > NOW() THEN
        RETURN json_build_object('success', false, 'message', 'Coupon is not yet active.');
    END IF;
  
    IF v_coupon.expires_at IS NOT NULL AND v_coupon.expires_at < NOW() THEN
        RETURN json_build_object('success', false, 'message', 'Coupon has expired.');
    END IF;

    -- 9. Authoritative Subtotal Verification
    -- Derived strictly from database v_order.items_price, completely ignoring any client parameter
    v_actual_subtotal := COALESCE(v_order.items_price, 0);

    IF v_actual_subtotal < COALESCE(v_coupon.minimum_order_amount, 0) THEN
        RETURN json_build_object(
            'success', false, 
            'message', 'Minimum order amount of $' || v_coupon.minimum_order_amount || ' not reached (actual subtotal: $' || v_actual_subtotal || ').'
        );
    END IF;

    -- 10. Validate Global Usage Limit
    IF v_coupon.usage_limit IS NOT NULL AND v_coupon.usage_count >= v_coupon.usage_limit THEN
        RETURN json_build_object('success', false, 'message', 'Coupon usage limit has been reached.');
    END IF;

    -- 11. Validate Per-Customer Limit
    IF v_coupon.per_customer_limit IS NOT NULL THEN
        SELECT COUNT(*) INTO v_customer_redemptions 
        FROM public.coupon_redemptions 
        WHERE coupon_id = v_coupon.id AND user_id = p_user_id;

        IF v_customer_redemptions >= v_coupon.per_customer_limit THEN
            RETURN json_build_object('success', false, 'message', 'You have reached the redemption limit for this coupon.');
        END IF;
    END IF;

    -- 12. Calculate Discount Amount Exactly
    IF v_coupon.discount_type = 'percentage' THEN
        v_discount := ROUND((v_actual_subtotal * (v_coupon.discount_value / 100.0)), 2);
        IF v_coupon.maximum_discount_amount IS NOT NULL AND v_discount > v_coupon.maximum_discount_amount THEN
            v_discount := v_coupon.maximum_discount_amount;
        END IF;
    ELSE
        v_discount := v_coupon.discount_value;
        IF v_discount > v_actual_subtotal THEN
            v_discount := v_actual_subtotal;
        END IF;
    END IF;

    -- 13. Atomically Recalculate and Update Order Total in public.orders
    v_subtotal_after_discount := GREATEST(0, v_actual_subtotal - v_discount);
    v_new_total := ROUND(v_subtotal_after_discount + COALESCE(v_order.tax_price, 0) + COALESCE(v_order.shipping_price, 0), 2);

    UPDATE public.orders 
    SET total_price = v_new_total,
        updated_at = NOW()
    WHERE id = p_order_id;

    -- 14. Atomically Record Redemption
    INSERT INTO public.coupon_redemptions (coupon_id, user_id, order_id, discount_applied)
    VALUES (v_coupon.id, p_user_id, p_order_id, v_discount);

    -- 15. Atomically Increment Coupon Usage Count
    UPDATE public.coupons 
    SET usage_count = usage_count + 1,
        updated_at = NOW() 
    WHERE id = v_coupon.id;

    -- 16. Return Detailed Confirmation Payload
    RETURN json_build_object(
        'success', true, 
        'discount_applied', v_discount,
        'final_total', v_new_total,
        'coupon_id', v_coupon.id,
        'code', v_coupon.code
    );
END;
$$;

-- ----------------------------------------------------------------------------
-- 6. Permissions Hardening
-- Restrict EXECUTE strictly to the trusted backend service_role
-- ----------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.apply_coupon(VARCHAR, UUID, UUID, DECIMAL) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.apply_coupon(VARCHAR, UUID, UUID, DECIMAL) FROM anon;
REVOKE ALL ON FUNCTION public.apply_coupon(VARCHAR, UUID, UUID, DECIMAL) FROM authenticated;

GRANT EXECUTE ON FUNCTION public.apply_coupon(VARCHAR, UUID, UUID, DECIMAL) TO service_role;
