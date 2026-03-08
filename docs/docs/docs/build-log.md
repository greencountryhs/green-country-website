# Build Log

This file records significant implementation steps and decisions.

---

## Initial Architecture Definition

Defined product roadmap and architecture for contractor management system.

Key decisions:

• Capability-based permission model  
• Crew terminology replacing Employee in UI  
• Modular architecture for tasks, payroll, and projects  
• Push Back / Pull Forward scheduling terminology  

---

## Pending Implementation

Next development slices:

1. Login UX improvements
2. Capability permission system
3. Crew dashboard shell
4. Manager inbox system
5. Task engine foundation
6. Payroll expansion foundation

---

## Notes

## Permissions, Notes, and Task Foundations Added

Added migrations for permissions, projects, notes, tasks, and payroll foundation.

Implemented:
- login error/loading improvements
- forgot password flow
- capability helper foundation
- crew dashboard shell
- notes/inbox foundation

---

## Tasks Engine and Operational Reports Included

Completed implementation of Slice 5 and Slice 6 according to the AI Dev Guidelines.

Implemented:
- `006_time_entry_edits.sql` for auditable time tracking edits (`edited_at`, `edited_by`, `edit_reason`, `manual_entry`).
- Crew Today's Tasks Page & task completion log endpoints.
- Admin overview for Tasks (`/dashboard/tasks/admin`).
- Reports V1 Dashboard (`/dashboard/reports`) separated from Payroll.
- Post clock-in redirect to `dashboard/tasks`.
- UI terminology scrubbed to ensure `Crew` is used over `Employee`.

Next target:
- Payroll UI Expansion (Phase 7) or Project Financial Tracking (Phase 8).

Future work:

Project cost tracking  
Estimate planning tools  
Administrative AI assistant
