# Contractor Management System – Product Roadmap

This document defines the long-term direction of the contractor management application.  
The goal is to build a modular operations platform for managing crews, tasks, payroll, projects, and job cost tracking.

The roadmap is organized by implementation phases to keep development focused and avoid overbuilding.

---

# Core Product Vision

The system should eventually support:

• Crew management  
• Daily task planning and execution  
• Crew communication and manager instructions  
• Time tracking and payroll  
• Project tracking  
• Job cost and margin analysis  
• Estimate planning  
• Administrative automation tools (AI assistant)

The system should prioritize **clarity, operational efficiency, and simplicity** over feature volume.

---

# Terminology Decisions

User-facing language should use:

Crew  
Crew Member  
Crew Lead  
Manager  

Avoid using “Employee” in the UI even though the database table remains `employees`.

Scheduling language:

Push Back 1 Day  
Push Back X Days  
Pull Forward 1 Day  
Pull Forward X Days

Avoid ambiguous words like:

move  
advance  
forward

---

# Phase 1 – Authentication & Crew Foundation

Goals:
Improve login UX and establish permission architecture.

Features:
- Login loading states
- Invalid credential error feedback
- Password reset flow
- Capability-based permission system
- Crew management interface
- UI language update (Employee → Crew)

Database foundations:
- roles
- capabilities
- role_capabilities
- employee_roles

---

# Phase 2 – Crew Dashboard & Communication

Goals:
Create a workspace for crew members.

Crew dashboard will include:

• Today's Tasks  
• Personal Notes (measurements/reminders)  
• Manager Inbox  
• Unread note notification  
• Project Overview  

Manager communication system:

Managers can post notes that appear in crew inboxes.  
Crew members receive an unread notification until the note is opened.

---

# Phase 3 – Task Engine

Goals:
Provide structured daily work guidance.

Features:
- Task templates
- Scheduled assignments
- Checklist progression
- Section or step-by-step task display
- Timestamped completion logs
- Post clock-in task redirect

Task display modes:

Full checklist  
Section-by-section reveal  
Single-step progression

Admin scheduling actions:

Push Back 1 Day  
Push Back X Days  
Pull Forward 1 Day  
Pull Forward X Days

---

# Phase 4 – Payroll Expansion

Goals:
Support real-world payroll operations.

Features:
- Weekly payroll summary
- Multiple payment methods
- Split payments
- Payroll adjustments
  - bonuses
  - meals
  - per diem
  - reimbursements
- Holding account ledger
- Crew-facing "My Hours" view

Crew members should see:
• their logged hours

Crew members should NOT see:
• full payroll details
• other crew payroll
• payment methods used

---

# Phase 5 – Project Backbone

Goals:
Introduce client and project tracking.

Features:
- Client records
- Project records
- Project notes
- Crew-visible project overview

This phase establishes the structure needed for future cost tracking.

---

# Phase 6 – Job Cost & Margin Tracking

Goals:
Understand real job profitability.

Track:

Client payments  
Materials  
Subcontractors  
Permits  
Equipment rentals  
Labor cost  

Enable margin calculation:

Revenue  
– Labor  
– Materials  
– Subcontractors  
= Profit

---

# Phase 7 – Estimate Planning Tools

Future planning tool to support:

- estimating labor
- estimating materials
- permit planning
- cost category templates
- margin forecasting

---

# Phase 8 – Administrative AI Assistant

Future tool to help managers:

Create task lists  
Generate work plans  
Summarize crew activity  
Analyze payroll data  
Review job profitability  

AI should always present suggestions before executing changes.

---

# Design Principles

1. Keep modules separate
2. Avoid large multi-purpose tables
3. Prefer capability checks over role-only permissions
4. Build in phases
5. Protect financial and payroll data carefully
6. Maintain clear terminology for crew members
