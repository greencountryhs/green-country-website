-- ==========================================
-- 020_time_clock_events.sql
-- Audit log for clock-in/out attempts and outcomes.
-- Apply manually in Supabase when approved — do not assume auto-deploy.
-- ==========================================

CREATE TABLE IF NOT EXISTS public.time_clock_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    time_entry_id UUID REFERENCES public.time_entries(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL CHECK (
        event_type IN (
            'clock_in_attempt',
            'clock_in_success',
            'clock_in_failed',
            'clock_out_attempt',
            'clock_out_success',
            'clock_out_failed'
        )
    ),
    source TEXT CHECK (source IN ('crew_self', 'admin', 'bulk')),
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS time_clock_events_employee_created_idx
    ON public.time_clock_events (employee_id, created_at DESC);

CREATE INDEX IF NOT EXISTS time_clock_events_created_idx
    ON public.time_clock_events (created_at DESC);

ALTER TABLE public.time_clock_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read time_clock_events" ON public.time_clock_events;
CREATE POLICY "Admins read time_clock_events"
    ON public.time_clock_events
    FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Employees read own time_clock_events" ON public.time_clock_events;
CREATE POLICY "Employees read own time_clock_events"
    ON public.time_clock_events
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.employees e
            WHERE e.user_id = auth.uid() AND e.id = time_clock_events.employee_id
        )
    );

DROP POLICY IF EXISTS "Authenticated insert time_clock_events" ON public.time_clock_events;
CREATE POLICY "Authenticated insert time_clock_events"
    ON public.time_clock_events
    FOR INSERT
    WITH CHECK (
        user_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );
