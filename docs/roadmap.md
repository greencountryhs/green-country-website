Contractor Management System – Product Roadmap

This document defines the development roadmap for the contractor management platform.

The goal of this system is to provide a structured operations platform for managing:

crews

daily work execution

communication between managers and crew

time tracking

operational reporting

projects

payroll and compensation

future estimating and job cost analysis

Development will follow clear implementation slices so the system remains stable and extensible.

The roadmap corresponds directly with the architecture defined in docs/architecture.md.

Core Product Vision

The system should eventually support the following operational areas:

Crew Management

Track crew members, roles, and permissions.

Task Execution

Provide daily task lists and structured checklists for crews.

Communication

Allow managers to send notes and instructions to crew members.

Time Tracking

Track hours worked and maintain reliable records.

Operational Reporting

Allow administrators to review and correct time entries.

Project Management

Track clients, projects, and job-related context.

Payroll Management

Track compensation, payment methods, and adjustments.

Financial Insight

Provide tools to understand job profitability.

Operational Automation

Introduce administrative AI tools to assist with planning and reporting.

Product Terminology

The system uses crew-focused language.

User-facing terms:

Crew
Crew Member
Crew Lead
Manager

The database table employees remains unchanged internally for compatibility.

Scheduling Language

Administrative scheduling uses directional terms:

Push Back 1 Day
Push Back X Days
Pull Forward 1 Day
Pull Forward X Days

Ambiguous terms like "move" or "advance" should not be used.

Development Philosophy

The platform should be built according to the following principles:

Build in small, stable slices

Preserve existing working systems

Prefer modular architecture

Use capability-based permissions

Avoid large multi-purpose features early

Keep operational tools simple and reliable

Separate operational reporting from payroll calculations

Phase 1 – Authentication & Permissions

Goal: Establish reliable authentication and a flexible permission model.

Features:

improved login UX

loading states for login submission

visible invalid credential errors

password reset functionality

capability-based authorization helpers

Database migration:

001_permissions_foundation.sql

Tables introduced:

roles
capabilities
role_capabilities
employee_roles

Phase 2 – Crew Dashboard

Goal: Create a workspace for crew members.

Route:

/dashboard/crew

Crew dashboard components:

Today's tasks overview

Personal notes area

Manager inbox

Unread message notifications

Project overview card

Database migration:

003_notes_foundation.sql

Tables used:

employee_notes
manager_notes
manager_note_reads
project_notes

Phase 3 – Task Engine Foundation

Goal: Introduce a structured task system.

Features:

reusable task templates

daily task assignments

structured checklist progression

timestamped completion logging

Supported checklist modes:

full checklist
section-by-section
single-step progression

Database migration:

004_tasks_foundation.sql

Tables introduced:

task_templates
task_template_sections
task_template_items
task_assignments
task_assignment_targets
task_item_logs

Phase 4 – Payroll & Project Backbone

Goal: Introduce the underlying structures needed for project tracking and compensation.

Database migrations:

002_projects_backbone.sql
005_payroll_foundation.sql

Tables introduced:

clients
projects

payment_methods
employee_payments
comp_adjustment_types
employee_comp_adjustments
holding_account_ledger

At this stage, full payroll UI is intentionally deferred.

Phase 5 – Task Engine UI

Goal: Enable crew members to actively work through daily task lists.

Crew interface route:

/dashboard/tasks

Admin overview route:

/dashboard/tasks/admin

Features:

today's task assignments

checklist progression UI

full / section / single display modes

timestamped progress tracking

redirect to tasks after clock-in

This phase turns the task system into a working operational tool.

Phase 6 – Operational Reports (Reports V1)

Goal: Provide administrators with operational visibility into crew activity.

Route:

/dashboard/reports

Reports include:

hours by pay period

recent time entries

missing clock-outs

weekly crew totals

Filtering options:

crew member

date range

Admin correction tools:

edit clock-in time

edit clock-out time

add correction notes

create manual time entries

Database migration:

006_time_entry_edits.sql

Fields added to time_entries:

edited_at
edited_by
edit_reason
manual_entry

Reports remain operational tools, not payroll payout systems.

Phase 7 – Payroll UI Expansion

Goal: Provide administrative interfaces for payroll management.

Features planned:

payroll summaries

payment entry forms

compensation adjustments

holding account tracking

payment method tracking

Payroll remains restricted to authorized administrators.

Phase 8 – Project Financial Tracking

Goal: Provide job cost visibility and profitability insights.

Planned features:

material cost tracking

subcontractor cost tracking

permit tracking

client payments

job revenue tracking

margin calculations

This phase enables analysis of project profitability.

Phase 9 – Estimate Planning Tools

Goal: Provide structured estimate planning tools.

Features may include:

labor cost estimation

material cost estimation

permit planning

margin forecasting

reusable estimate templates

Phase 10 – Administrative AI Assistant

Goal: Introduce automation tools to assist managers.

AI assistant capabilities may include:

generating task lists

scheduling work across days

summarizing crew activity

highlighting missing clock-outs

analyzing project margins

AI actions should always require human confirmation before execution.

Long-Term Vision

The completed platform should function as a comprehensive operations system for contractors that integrates:

crew management
daily execution
time tracking
project tracking
financial awareness
operational insights

while remaining simple enough for daily field use.

Maintenance Practices

When major architectural changes occur:

update docs/architecture.md

update docs/roadmap.md

log the change in docs/build-log.md

This keeps documentation aligned with the actual system.
