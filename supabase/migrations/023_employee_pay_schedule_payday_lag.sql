-- ==========================================
-- 023_employee_pay_schedule_payday_lag.sql
-- Payday is always Friday, but which Friday is configurable.
-- payday_lag_weeks = 0 → first Friday after period end (legacy: end Thu 9th, pay Fri 10th)
-- payday_lag_weeks = 1 → skip that Friday, pay the next (new: end Wed 8th, pay Fri 17th)
-- Apply manually in Supabase when approved — do not assume auto-deploy.
-- ==========================================

ALTER TABLE public.employee_pay_schedules
    ADD COLUMN IF NOT EXISTS payday_lag_weeks SMALLINT NOT NULL DEFAULT 0
        CHECK (payday_lag_weeks >= 0 AND payday_lag_weeks <= 4);

COMMENT ON COLUMN public.employee_pay_schedules.payday_lag_weeks IS
    '0 = first Friday after period end; 1 = Friday of the following week; etc.';
