-- ==========================================
-- 021_payroll_transactions_crew_read.sql
-- Allow crew to read their own payroll_transactions (read-only).
-- Admin policy from 019 remains unchanged for full control.
-- Apply manually in Supabase when approved.
-- ==========================================

DROP POLICY IF EXISTS "Employees read own payroll_transactions" ON public.payroll_transactions;

CREATE POLICY "Employees read own payroll_transactions"
    ON public.payroll_transactions
    FOR SELECT
    USING (
        employee_id IN (
            SELECT id FROM public.employees WHERE user_id = auth.uid()
        )
    );
