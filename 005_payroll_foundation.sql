-- ==========================================
-- 005_payroll_foundation.sql
-- ==========================================

CREATE TABLE IF NOT EXISTS public.payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'direct_deposit', 'check', etc.
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.employee_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    amount_cents INT NOT NULL,
    payment_date DATE NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.comp_adjustment_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.employee_comp_adjustments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    type_id UUID REFERENCES public.comp_adjustment_types(id),
    amount_cents INT NOT NULL,
    reason TEXT,
    applied_to_payment_id UUID REFERENCES public.employee_payments(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.holding_account_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    transaction_type TEXT NOT NULL, -- 'credit', 'debit'
    amount_cents INT NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comp_adjustment_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_comp_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.holding_account_ledger ENABLE ROW LEVEL SECURITY;

-- Note: RLS here is kept restricted to users with direct capabilities or admin roles.
-- Crew should not view this directly unless exposed via specific safe-read helpers in the backend.

CREATE POLICY "Admin payroll control: payment_methods" ON public.payment_methods FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admin payroll control: employee_payments" ON public.employee_payments FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admin payroll control: comp_adjustments" ON public.employee_comp_adjustments FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admin payroll control: holding_ledger" ON public.holding_account_ledger FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
