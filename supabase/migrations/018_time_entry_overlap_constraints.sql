-- ==========================================
-- 018_time_entry_overlap_constraints.sql
-- Run overlap cleanup SQL in Supabase SQL Editor BEFORE applying this migration.
-- Do not apply until existing overlaps and duplicate open entries are resolved.
-- ==========================================

-- One open (unclosed) shift per employee
CREATE UNIQUE INDEX IF NOT EXISTS time_entries_one_open_shift_per_employee
ON public.time_entries (employee_id)
WHERE clock_out IS NULL;

-- Prevent overlapping shifts per employee (half-open [clock_in, clock_out))
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE public.time_entries
DROP CONSTRAINT IF EXISTS time_entries_no_overlap;

ALTER TABLE public.time_entries
ADD CONSTRAINT time_entries_no_overlap
EXCLUDE USING gist (
    employee_id WITH =,
    tstzrange(
        clock_in,
        COALESCE(clock_out, 'infinity'::timestamptz),
        '[)'
    ) WITH &&
);
