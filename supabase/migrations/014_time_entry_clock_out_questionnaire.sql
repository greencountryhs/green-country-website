-- End-of-day questionnaire fields (crew self clock-out). All nullable except follow-up default.

ALTER TABLE public.time_entries
  ADD COLUMN IF NOT EXISTS clock_out_work_summary text,
  ADD COLUMN IF NOT EXISTS clock_out_day_notes text,
  ADD COLUMN IF NOT EXISTS clock_out_supply_needs text,
  ADD COLUMN IF NOT EXISTS clock_out_blockers text,
  ADD COLUMN IF NOT EXISTS clock_out_follow_up_needed boolean NOT NULL DEFAULT false;
