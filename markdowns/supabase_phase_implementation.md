# Supabase DB Phase Integration Plan

This document outlines the step-by-step roadmap for migrating each module in the **Baesys Barangay Management System** (both Resident and Admin sides) from PHP/MySQL APIs to direct Supabase Database (PostgreSQL) operations.

---

## 🛠️ Phase 0: Project Setup & Authentication
Setup environment, initialize Supabase SDK client, and migrate authentication flows.

- [x] Create `.env` configuration file in `frontend` containing Supabase URL and Anon/Publishable Key
- [x] Install `@supabase/supabase-js` SDK dependency in `frontend/package.json`
- [x] Create and configure [supabaseClient.js](file:///d:/xampp-b/htdocs/baesys-barangay/frontend/src/api/supabaseClient.js)
- [x] Refactor [auth.js](file:///d:/xampp-b/htdocs/baesys-barangay/frontend/src/api/auth.js) login, registration, logout, and token retrieval to use Supabase Auth
- [x] Set up auto-sync listener in [App.jsx](file:///d:/xampp-b/htdocs/baesys-barangay/frontend/src/App.jsx) to sync Supabase Auth session with the Zustand `useAuthStore`

---

## 👥 Phase 1: Resident Management & Profiles
Transition resident account creation, profiles, and Digital ID management to Supabase.

### Resident Side
- [x] Refactor `fetchProfile()` in `useResidentStore` to fetch from Supabase `residents` table
- [x] Migrate profile update forms to save data to Supabase `residents` table
- [x] Refactor `fetchDigitalId()` and `requestDigitalId()` to query/update the Digital ID columns in `residents`

### Admin Side
- [x] Refactor `fetchResidents()` in `useAdminStore` to fetch residents list from `residents` table in Supabase
- [x] Update Add Resident & Edit Resident forms to use Supabase client inserts and updates
- [x] Implement resident archive/unarchive toggles by setting the `is_archived` status in Supabase

---

## 🏠 Phase 2: Household Management
Transition household registers, addresses, and head-of-household assignments to Supabase.

### Admin Side
- [x] Refactor `fetchHouseholds()` in `useAdminStore` to fetch household list from `households` table in Supabase
- [x] Implement Add/Edit Household forms using Supabase inserts/updates
- [x] Implement assigning/updating Head of Household via foreign keys referencing `residents` table

---

## 📄 Phase 3: Document Requests
Transition barangay document clearance/indigency workflows and status trackers to Supabase.

### Resident Side
- [x] Refactor `fetchMyRequests()` in `useResidentStore` to fetch requests from `document_requests` table filtered by user
- [x] Migrate "New Request" form to insert data into `document_requests`
- [x] Implement document fee details querying from `document_types`

### Admin Side
- [x] Refactor `fetchRequests()` in `useAdminStore` to fetch all pending, processing, and completed requests
- [x] Update request details view to support updating request status and adding processing notes in Supabase
- [x] Transition `document_types` settings CRUD to Supabase table updates

---

## ⚖️ Phase 4: Blotter System
Transition incident filing, incident logs, and case tracking to Supabase.

### Resident Side
- [x] Refactor `fetchMyBlotters()` in `useResidentStore` to get complaints registered by the current user
- [x] Migrate "File a Complaint" form to insert records into `blotter_records` in Supabase

### Admin Side
- [x] Refactor `fetchBlotters()` in `useAdminStore` to fetch all blotter reports
- [x] Migrate incident editor and status updates to update `blotter_records`

---

## 🏥 Phase 5: Clinic Scheduling & Bookings
Transition clinic consultation listings, schedules, and resident appointments to Supabase.

### Resident Side
- [x] Refactor `fetchClinicServices()` to get active consultation types from `clinic_services`
- [x] Refactor `fetchClinicSchedules()` to get available schedules from `clinic_schedules`
- [x] Migrate appointment booking form to insert into `appointments`

### Admin Side
- [x] Implement Clinic schedules manager to add/edit/delete schedules in `clinic_schedules`
- [x] Implement booking list manager to view/update appointment statuses in `appointments`

---

## 📢 Phase 6: Announcements, Programs & Officials
Transition community updates, local projects, and barangay staff listings to Supabase.

### Resident/Public Side
- [x] Refactor public and resident newsfeeds to pull from `announcements` and `programs` tables
- [x] Refactor barangay official lists to pull from `officials` referencing active `residents`

### Admin Side
- [x] Migrate announcements manager CRUD to Supabase `announcements` table
- [x] Migrate programs manager CRUD to Supabase `programs` table
- [x] Migrate officials editor CRUD to Supabase `officials` table

---

## ⚙️ Phase 7: System Settings & Activity Logs
Transition administrative options, metadata, and audit trails to Supabase.

### Admin Side
- [x] Refactor Settings page to query and update configuration keys in `settings` table
- [x] Refactor Activity Log page to fetch chronological events from `activity_logs` table
