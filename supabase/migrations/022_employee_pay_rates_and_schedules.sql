-- ==========================================
-- 022_employee_pay_rates_and_schedules.sql
-- Per-employee effective-dated hourly rates and pay schedules.
-- Payday is always Friday. period_start_weekday sets a sliding 7-day work
-- window (end = start+6), e.g. Fri–Thu → Thu–Wed → Wed–Tue during a taper.
-- Apply manually in Supabase when approved — do not assume auto-deploy.
-- ==========================================

CREATE TABLE IF NOT EXISTS public.employee_pay_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    pay_rate_cents INT NOT NULL CHECK (pay_rate_cents >= 0),
    effective_from DATE NOT NULL,
    note TEXT,
    changed_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (employee_id, effective_from)
);

CREATE INDEX IF NOT EXISTS employee_pay_rates_employee_effective_idx
    ON public.employee_pay_rates (employee_id, effective_from DESC);

CREATE TABLE IF NOT EXISTS public.employee_pay_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    -- 0=Sunday … 6=Saturday (matches JS getUTCDay / Chicago calendar day)
    period_start_weekday SMALLINT NOT NULL CHECK (period_start_weekday BETWEEN 0 AND 6),
    effective_from DATE NOT NULL,
    note TEXT,
    changed_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (employee_id, effective_from)
);

CREATE INDEX IF NOT EXISTS employee_pay_schedules_employee_effective_idx
    ON public.employee_pay_schedules (employee_id, effective_from DESC);

ALTER TABLE public.employee_pay_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_pay_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin manage employee_pay_rates" ON public.employee_pay_rates;
CREATE POLICY "Admin manage employee_pay_rates"
    ON public.employee_pay_rates
    FOR ALL
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Crew read own employee_pay_rates" ON public.employee_pay_rates;
CREATE POLICY "Crew read own employee_pay_rates"
    ON public.employee_pay_rates
    FOR SELECT
    USING (
        employee_id IN (
            SELECT id FROM public.employees WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Admin manage employee_pay_schedules" ON public.employee_pay_schedules;
CREATE POLICY "Admin manage employee_pay_schedules"
    ON public.employee_pay_schedules
    FOR ALL
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Crew read own employee_pay_schedules" ON public.employee_pay_schedules;
CREATE POLICY "Crew read own employee_pay_schedules"
    ON public.employee_pay_schedules
    FOR SELECT
    USING (
        employee_id IN (
            SELECT id FROM public.employees WHERE user_id = auth.uid()
        )
    );

-- Baseline history from current employees.pay_rate_cents (legacy company calendar = Friday start).
INSERT INTO public.employee_pay_rates (employee_id, pay_rate_cents, effective_from, note)
SELECT e.id, COALESCE(e.pay_rate_cents, 0), DATE '2000-01-01', 'Initial rate (migrated)'
FROM public.employees e
WHERE NOT EXISTS (
    SELECT 1 FROM public.employee_pay_rates r WHERE r.employee_id = e.id
);

INSERT INTO public.employee_pay_schedules (employee_id, period_start_weekday, effective_from, note)
SELECT e.id, 5, DATE '2000-01-01', 'Initial schedule Fri–Thu (migrated)'
FROM public.employees e
WHERE NOT EXISTS (
    SELECT 1 FROM public.employee_pay_schedules s WHERE s.employee_id = e.id
);
