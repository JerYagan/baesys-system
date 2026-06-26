# Baesys — Features and Modules

This document provides a detailed breakdown of the features and modules implemented in the **Baesys** Barangay Management System.

---

## 1. Resident Portal Module

The Resident Portal provides community members with a self-service dashboard to manage requests, profile details, appointments, and complaints.

### Key Features:
- **Authentication & Registration**: Online registration and secure login via Supabase Auth.
- **Self-Profile Management**: Update contact details, address, profile avatar, and civil status.
- **Virtual Digital ID Card**:
  - View real-time virtual Barangay ID card with unique secure hash, QR code, and expiry.
  - Downloadable/Printable PDF generation of the ID card.
- **Document Request system**:
  - Choose from active document types (Barangay Clearance, Certificate of Indigency, Good Moral, etc.).
  - Submit request details, upload supporting documents (if required), and note the purpose.
  - Live timeline tracker (Pending &rarr; Processing &rarr; Ready for Pickup &rarr; Completed/Rejected).
- **Blotter Complaint Filing**:
  - File incident reports against respondents with location, date, time, witnesses, and details.
  - Track hearing and mediation schedule history via case log timelines.
- **Clinic Scheduler**:
  - Browse active clinic services (General Consultation, Dental, Vaccinations, Maternal Care).
  - Select scheduled dates, allocate slot times, and reserve consultation appointments.
- **Notice Board**: Read broadcasts and informational community program announcements.

---

## 2. Admin & Staff Management Module

The administrative dashboard provides officials and staff with oversight of barangay catalog assets, requests, schedules, and analytics.

### Key Features:
- **Operations Dashboard**:
  - Real-time KPI metrics displaying total residents, households, pending document requests, and open blotter incidents.
  - Interactive System Activity Feed showing audit logs of recent operator actions.
  - Quick action shortcuts to register walk-ins, process requests, or broadcast announcements.
- **Resident Catalog Registry**:
  - Directory search and filtering of all registered residents.
  - Add walk-in residents with complete details, link to households, and generate account credentials.
  - Upload profile avatars and archive/restore resident profiles.
- **Household catalog**:
  - Household catalog categorized by Address and Purok.
  - Create and manage household units, listing all member relationships and designating the Household Head.
- **Officials Roster Manager**:
  - Roster of barangay officials, roles, terms, and active states.
  - Link officials directly to active resident records.
- **Document Request Queue**:
  - Centralized queue of all document requests.
  - Update status and insert notes/remarks (notified via resident notification panels).
  - Print/Generate official PDF certificates on-demand.
- **Blotter Mediation Registry**:
  - Log blotter cases, respondent details, and incident specifications.
  - Mediation Panel: Update case status (Filed, Under Mediation, Resolved, Referred to Court) and log hearing notes.
- **Clinic Appointment Manager**:
  - Generate daily slots and appointment schedules for clinic services.
  - Check-in patients, update status, and attach consultation notes.
- **Announcements Board**:
  - Create, publish, edit, and categorize announcements.
- **Community Programs Catalog**:
  - Create programs with date schedules and status tracking (Upcoming, Ongoing, Completed, Cancelled).

---

## 3. Core System & Settings Module

Provides administrative configuration, security audit logging, and global options.

### Key Features:
- **Global Settings Panel**: Configure official Barangay Name, Address, Contact details, email, office hours, and upload the official seal logo.
- **Document Type Catalog Manager**: Create, configure, update fees, edit processing days, and toggle active states for document certifications.
- **System Activity Audit Trail**: Filter, search, and audit all action logs made by operators.
- **Theme customizer**: Seamless toggle between Light Mode and Dark Mode layouts.
- **Database Engine**: Fully decoupled serverless system powered by Supabase (PostgreSQL, Storage Buckets, and Auth).
