# MANARAH - Private School Management System

## Overview

Manarah is a web-based private school management system designed to manage students, teachers, sessions, payments, and attendance using QR codes.

The goal is to build a clean, simple, human-written codebase (not over-engineered), using a REST API architecture.

---

## Core Principles

* Keep code simple and readable
* Avoid over-engineering
* Realistic structure like a solo developer project
* Prepare for scalability but do not overbuild
* Write modular but not overly abstract code

---

## Tech Stack

* Frontend: React.js
* Backend: Node.js (Express)
* Database: PostgreSQL (or SQLite for dev)
* API: REST

---

## Features

### 1. Authentication & Roles

* Login / Logout
* Roles:

  * Admin (full access)
  * Staff (limited)
* Simple JWT authentication

---

### 2. Academic Structure

Hierarchy:

* Levels:

  * Primary (1–5)
  * Middle School (1–4)
  * Secondary (1–3)
  * Workshop (custom)

* Each level contains:

  * Years
  * Groups (A, B, C...)

---

### 3. Modules (Subjects)

* Create modules (Math, Arabic, Physics...)
* Assign to Level + Year

---

### 4. Teachers

* CRUD teachers
* Assign:

  * Modules
  * Levels + Years
* Salary rules:

  * Default earning per student
  * Override by level/module

---

### 5. Students

* CRUD students
* Assign:

  * Level + Year
  * Group
* Status:

  * Active / Suspended / Archived
* Actions:

  * Promote year
  * Transfer group
* Filters:

  * Level / Year / Payment status

---

### 6. Sessions System

#### Session Types:

* One-time
* Recurring:

  * Daily
  * Weekly
  * Custom

#### Session Fields:

* Teacher
* Module
* Level + Year + Group
* Time (supports 06:00 → after midnight)

#### Behavior:

* Multiple sessions can run in parallel (different groups)

#### Views:

* Daily (default: today)
* Weekly

---

### 7. Attendance System (QR-based)

* Each student has a QR code

* Attendance "ping" window:

  * Starts:

    * Manually OR
    * Automatically 15 minutes before session
  * Ends when session finishes

* If student does NOT scan:
  → Automatically marked ABSENT

---

### 8. Payment System

#### Default:

* 1 payment = 4 sessions

#### Options:

* Per session
* Monthly pack
* Full year
* Custom

#### Tracking:

* Sessions paid (e.g. 2/4)
* Remaining sessions

#### Revenue Split:

* Student pays X
* Teacher gets Y
* School gets Z

Supports:

* Global default
* Override per:

  * Teacher
  * Level
  * Module

---

### 9. Notifications System

* Payment reminders
* Session reminders
* Attendance alerts

(Simple in-app notifications for now)

---

### 10. Absence Tracking

* Automatic based on QR
* View attendance history
* Attendance rate per student

---

### 11. Documents & Export

* Export:

  * Students list (PDF)
  * Teachers list (PDF)
  * Payments reports (PDF)

* Generate:

  * Payment receipt (student)
  * Teacher payment receipt

---

### 12. Groups System

* Students belong to groups (A, B...)
* Sessions are linked to groups
* Enables parallel classes

---

### 13. Expense Tracking

* Track:

  * Rent
  * Bills
  * Other costs

---

### 14. Teacher Payroll

* Monthly summary
* Based on sessions & payments

---

### 15. Audit Log

* Track actions:

  * Payments created
  * Student modified
  * Session updated

---

### 16. Multi-language (Preparation Only)

* App should be structured to support i18n
* For now:

  * English only
* Prepare translation structure

---

### 17. Dashboard (Coming Soon)

* Placeholder only
* No implementation yet

---

## Non-Goals (IMPORTANT)

* No microservices
* No complex architecture
* No unnecessary design patterns
* No overuse of abstractions

---

## Expected Output

* Clean REST API
* Simple React frontend
* Organized folders
* Human-like code (not AI-style)
