Contractor Management System – Architecture Plan

This document defines the technical architecture and phased implementation plan for the contractor management system.

The goal is to build a modular operations platform that supports:

crew management

daily task execution

communication between managers and crew

time tracking and operational reporting

project tracking

payroll and compensation tracking

future job cost and estimating tools

The architecture prioritizes clarity, modularity, and operational reliability over rapid feature expansion.

Existing Foundation (Preserved)

The following components already exist and will remain unchanged unless absolutely necessary.

Authentication

Supabase Auth remains the identity provider.

Existing tables

These tables remain intact:

profiles

employees

time_entries

Existing Row Level Security (RLS) policies on these tables remain unchanged.

Application structure

The project uses:

Next.js App Router

Supabase Postgres + RLS

Vercel deployment

Clock-in / Clock-out

The existing time tracking flow remains functional and will not be replaced.

Terminology

The database table employees will remain unchanged for compatibility.

However, UI terminology must use the following language:

Crew
Crew Member
Crew Lead
Manager

The term Employee should not appear in the UI.

Scheduling Terminology

Admin scheduling actions must use clear directional terms.

Allowed:

Push Back 1 Day
Push Back X Days
Pull Forward 1 Day
Pull Forward X Days

Avoid ambiguous terms like:

move
advance
forward

Permission Model

The system uses capability-based permissions.

Roles exist as bundles of capabilities but authorization decisions must check capabilities directly.

Roles

Default roles:

admin

manager

crew_lead

crew_member

Example capabilities

manage_crew
manage_tasks
assign_tasks
view_project_notes
post_manager_notes
view_payroll_summary
view_time_reports
record_payments
manage_comp_adjustments
view_job_costs
manage_estimates
view_all_projects
view_own_hours

Access checks must be implemented through helper functions rather than raw role checks.

Database Architecture

The database is organized into modular domains.

Identity & Permissions

Tables:

profiles
employees
roles
capabilities
role_capabilities
employee_roles

Purpose:

profiles → Supabase auth identity
employees → crew member record
roles → role bundles
capabilities → granular permissions
role_capabilities → capability mapping

Time Tracking

Table:

time_entries

Purpose:

Records clock-in and clock-out events.

Future modifications will support time corrections and manual entries.

Tasks System

Tables:

task_templates
task_template_sections
task_template_items
task_assignments
task_assignment_targets
task_item_logs

Purpose:

Templates define reusable work plans.

Assignments schedule tasks for specific days.

Targets determine which crew members receive a task.

Logs record timestamped completion events.

Supported display modes:

full checklist

section-by-section

single-step progression

Notes & Communication

Tables:

employee_notes
manager_notes
manager_note_reads
project_notes

Purpose:

employee_notes
Personal notes for crew members (measurements, reminders).

manager_notes
Instructions from managers.

manager_note_reads
Tracks recipients and read state.

project_notes
Notes attached to project context.

Projects

Tables:

clients
projects

Purpose:

clients store customer records.

projects represent jobs or work engagements.

This module will later support cost tracking and estimating.

Payroll Foundation

Tables:

payment_methods
employee_payments
comp_adjustment_types
employee_comp_adjustments
holding_account_ledger

Purpose:

Tracks compensation, adjustments, and holding balances.

Payroll UI will be implemented later.

Reports Foundation

Reports are operational tools, not payroll systems.

Reports focus on:

reviewing hours

correcting time entries

identifying missing clock-outs

weekly crew totals

Reports must remain separate from payroll payouts and compensation logic.

SQL Migrations

All migrations must live in:

supabase/migrations/

Migration order:

001_permissions_foundation.sql
002_projects_backbone.sql
003_notes_foundation.sql
004_tasks_foundation.sql
005_payroll_foundation.sql
006_time_entry_edits.sql
Time Entry Edit Migration

Migration 006_time_entry_edits.sql adds correction fields.

New fields in time_entries:

edited_at TIMESTAMPTZ
edited_by UUID
edit_reason TEXT
manual_entry BOOLEAN DEFAULT FALSE

Purpose:

Allow safe editing of time entries with audit information.

Application Structure

Recommended folder structure:

app/
  dashboard/
    crew/
    tasks/
    tasks/admin/
    reports/

components/
  dashboard/
  notes/
  tasks/

lib/
  auth/
  notes/
  tasks/
  payroll/
  projects/
Implementation Slices

Development should proceed in defined slices to minimize instability.

Slice 1 – Login & Permissions

Implement:

capability helpers in lib/auth

login error feedback

loading states

full Supabase password reset flow

Files:

lib/auth/capabilities.ts
lib/auth/getUserCapabilities.ts
lib/auth/hasCapability.ts
lib/auth/requireCapability.ts
Slice 2 – Crew Dashboard Shell

Route:

app/dashboard/crew/page.tsx

Components:

CrewDashboardShell
UnreadManagerNotesCard
PersonalNotesCard
ProjectOverviewCard
ManagerInboxList

Capabilities:

view personal notes

read manager inbox

show project overview

Slice 3 – Task Engine Foundation

Implement helpers in:

lib/tasks/

Functions:

getTodaysTasks
logTaskItem
getCurrentVisibleTaskItems

Implement scheduling logic for:

Push Back / Pull Forward

Slice 4 – Payroll & Project Backbone Foundation

Create foundational helpers for:

lib/payroll/
lib/projects/

Do not build full payroll UI yet.

Only backend access layers.

Slice 5 – Task Engine UI

Crew task interface:

app/dashboard/tasks/page.tsx

Admin overview:

app/dashboard/tasks/admin/page.tsx

Features:

today's tasks

checklist progression

full / section / single display modes

timestamped completion logs

redirect to tasks after clock-in

Slice 6 – Reports V1

Admin-only reports interface.

Route:

app/dashboard/reports/page.tsx

Capabilities required:

view_time_reports

Features:

hours by pay period

recent time entries

missing clock-outs

weekly crew totals

filtering by date and crew member

Admin actions:

edit clock-in

edit clock-out

add correction note

create manual time entry

Reports must remain separate from payroll payout logic.

Design Principles

Prefer capability checks over role checks

Keep modules independent

Avoid large multi-purpose tables

Use staged migrations

Protect payroll and financial data carefully

Keep UI terminology crew-focused

Avoid overbuilding early modules

Long-Term Roadmap

Future modules will include:

job cost tracking

permit tracking

estimate planning tools

margin analysis

administrative AI assistant

The AI assistant will assist with:

task creation

scheduling

reporting insights

operational summaries

AI actions should always require confirmation before execution.
