-- ==========================================
-- 006_time_entry_edits.sql
-- ==========================================

-- Add audit columns to time_entries
ALTER TABLE public.time_entries 
ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ NULL,
ADD COLUMN IF NOT EXISTS edited_by UUID REFERENCES public.profiles(id) NULL,
ADD COLUMN IF NOT EXISTS edit_reason TEXT NULL,
ADD COLUMN IF NOT EXISTS manual_entry BOOLEAN NOT NULL DEFAULT false;

-- We already have RLS on time_entries from the initial Supabase setup. 
-- Ensure Admins have full access if not already present.
CREATE POLICY "Admins can manage all time entries" 
ON public.time_entries 
FOR ALL 
USING (EXISTS (
    SELECT 1 FROM public.employee_roles er 
    JOIN public.role_capabilities rc ON er.role_id = rc.role_id 
    WHERE er.employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()) 
    AND rc.capability_id = 'view_time_reports'
) OR EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
));

-- Create the operational report view
CREATE OR REPLACE VIEW public.time_entry_report_view AS
SELECT 
    t.id,
    t.employee_id,
    e.display_name AS employee_name,
    t.clock_in,
    t.clock_out,
    DATE(t.clock_in) AS work_date,
    DATE_TRUNC('week', t.clock_in)::DATE AS week_start,
    CASE 
        WHEN t.clock_out IS NOT NULL THEN 
            EXTRACT(EPOCH FROM (t.clock_out - t.clock_in)) / 3600.0 
        ELSE 0 
    END AS duration_hours,
    t.clock_out IS NULL AS missing_clock_out,
    t.manual_entry,
    t.edited_at IS NOT NULL AS was_edited
FROM public.time_entries t
JOIN public.employees e ON t.employee_id = e.id;
