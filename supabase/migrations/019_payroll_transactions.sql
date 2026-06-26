-- ==========================================
-- 019_payroll_transactions.sql
-- Unified admin payroll payments/adjustments per Friday–Thursday pay period.
-- Legacy tables (employee_payments, employee_comp_adjustments) remain unused.
-- Apply manually in Supabase when approved — do not assume auto-deploy.
-- ==========================================

CREATE TABLE IF NOT EXISTS public.payroll_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    transaction_date DATE NOT NULL,
    pay_period_start DATE NOT NULL,
    pay_period_end DATE NOT NULL,
    payday DATE NOT NULL,
    entry_type TEXT NOT NULL CHECK (
        entry_type IN (
            'payment',
            'advance',
            'daily_pay',
            'reimbursement',
            'bonus',
            'deduction',
            'other'
        )
    ),
    amount_cents INT NOT NULL CHECK (amount_cents > 0),
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS payroll_transactions_payday_idx
    ON public.payroll_transactions (payday);

CREATE INDEX IF NOT EXISTS payroll_transactions_employee_payday_idx
    ON public.payroll_transactions (employee_id, payday);

ALTER TABLE public.payroll_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin payroll control: payroll_transactions" ON public.payroll_transactions;

CREATE POLICY "Admin payroll control: payroll_transactions"
    ON public.payroll_transactions
    FOR ALL
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
