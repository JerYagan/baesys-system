# Baesys — Barangay Management System

Baesys is a modern, minimalist web application built to streamline operations and public service delivery for local barangay. It supports resident registration, household catalogs, official rosters, announcement boards, community programs, document requests with PDF generation, a blotter mediation registry, clinic booking schedules, and digital ID verification.

---

## 🛠️ Tech Stack & Architecture

- **Frontend**: React 19 + Vite 8
- **Styles**: Tailwind CSS v4 (Vanilla CSS system)
- **State Management**: Zustand
- **HTTP Client**: Axios
- **Backend & Database Services**: Supabase Serverless Stack
  - **Database**: PostgreSQL
  - **Authentication**: Supabase Auth
  - **Storage Buckets**: Avatars and Profile Uploads
- **Deployment Target**: Netlify with `dist` publish folder

---

## 📂 System Modules & Features

Detailed documentation of all system modules and pages can be found in the [markdowns](file:///d:/xampp-b/htdocs/baesys-barangay/markdowns) folder:
- **System Overview & Architecture**: See [baesys-overview.md](file:///d:/xampp-b/htdocs/baesys-barangay/markdowns/baesys-overview.md)
- **Features & Modules Details**: See [features_and_modules.md](file:///d:/xampp-b/htdocs/baesys-barangay/markdowns/features_and_modules.md)
- **Deployment & Developer Guides**: See [local_deployment_guide.md](file:///d:/xampp-b/htdocs/baesys-barangay/markdowns/local_deployment_guide.md)

### Summarized Core Features
1. **Resident Portal**: Self-profile updates, document requests with tracking timeline, blotter case filing, clinic slot booking, and virtual Barangay ID rendering.
2. **Administrative Directory**: Comprehensive resident registries, household catalogs, and active official rosters.
3. **Document Request System**: Staff queue review, status logging, and official letter clearance generation.
4. **Blotter Registry**: Dispute tracking, mediation hearings scheduler, and case notes audit logs.
5. **Notice Broadcasts**: Real-time program scheduler and announcement boards.
6. **Clinic Appointments**: Patient queue check-ins, slots generator, and consultations logger.
7. **Digital ID & Checkpoint**: Virtual secure IDs with QR scans and SHA-256 verification hash checks.

---

## 🚀 Local Development Setup

### 1. Clone & Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the root directory:
```text
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Run Development Server
```bash
npm run dev
```

---

## 🔑 Default Authentication Credentials

- **Role**: System Administrator
  - **Email**: `admin@baesys.local`
  - **Password**: `admin123`

- **Role**: Resident User
  - **Email**: `resident-test@gmail.com`
  - **Password**: `resident123`