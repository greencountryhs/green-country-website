# AI change log

## 2026-07-13

- **Simplified company payroll calendar:** Removed per-employee pay-schedule/lag controls. Everyone uses one hard-coded calendar: Thursday–Wednesday work window, paid the Friday of the following week (e.g. period ending the 8th → paid the 17th). Kept admin pay-rate editing with history. The unused `employee_pay_schedules` table (from 022/023) can remain in Supabase; the app no longer reads or writes it.

## 2026-07-10

- **Per-employee pay rates & schedules:** Admins can amend hourly rates (with effective date, note, and history) and pay schedules from the employee profile. Schedules use a sliding 7-day work window plus a Friday payday lag (`0` = Friday right after period end / legacy Fri–Thu ending 9th → pay 10th; `1` = Friday of the following week / new Thu–Wed ending 8th → pay 17th). Payroll and My Pay resolve each person’s window and rate as-of the period. New hires seed onto the new-system schedule. Migrations: `022_employee_pay_rates_and_schedules.sql`, `023_employee_pay_schedule_payday_lag.sql` (apply in Supabase).

## 2026-04-22

- **Homepage hero image:** Replaced the plain text-only hero on the public homepage with a full-bleed `background-image` of the provided interior (kitchen / beam / open area) photo at `public/images/hero-home-kitchen.png`. The hero `section` was moved out of the `.page` width wrapper so the image can span the main content area; layout, CTAs, and copy are unchanged. Added a subtle directional `::before` gradient overlay (stronger toward the bright window side) plus scoped light text and badge styles in `app/globals.css` for readability. Desktop background position is ~28% horizontal; ~20% on narrow screens to keep the kitchen and beam in frame.
