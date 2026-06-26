# Baesys — System Improvement Checklist

Here is a list of recommended features, optimizations, and technical enhancements to take **Baesys** to the next level:

---

## 🚀 Recommended Feature Additions

### 1. 💳 Digital Payments Integration
- [ ] **GCash / Maya Integration**: Add a payment gateway (via PayMongo or Xendit) allowing residents to pay document fees directly upon request.
- [ ] **Transaction History Tracker**: Include invoice generation and official receipt logging for paid clearances.

### 2. 📱 SMS Notification Service
- [ ] **SMS API Integration**: Integrate Twilio or Semaphore SMS gateway.
- [ ] **Auto-Alerts**: Send instant SMS alerts to residents when their document request status updates to `Ready for Pickup` or when clinic appointments are confirmed.

### 3. 🗺️ Purok GIS Map & Analytics
- [ ] **GIS / OpenStreetMap Integration**: Embed an interactive map showing Purok boundary lines, public landmarks, and pinned household locations.
- [ ] **Demographic Graphs**: Add visual charts (using Recharts or Chart.js) on the admin dashboard representing age distribution, gender ratios, and employment rates per Purok.

### 4. 🖨️ Drag-and-Drop Document Builder
- [ ] **Visual Template Editor**: Allow administrators to design document templates (Clearance, Indigency) visually, inserting placeholders like `{first_name}`, `{date}`, and official signatures.

### 5. 📹 Virtual Hearing Room
- [ ] **Jitsi Meet Integration**: Add virtual video rooms for dispute mediation and Lupon hearings directly in the Admin Blotter dashboard, facilitating remote arbitration.

---

## 🛠️ Technical Enhancements & Optimization

- [ ] **Data Export Utilities**: Add buttons to export resident registries, household catalogs, and financial summaries as Excel (`.xlsx`) or CSV files.
- [ ] **Dynamic QR Code Checkpoint Scanner**: Create a dedicated, lightweight mobile-scanner route for barangay watchmen (`tanods`) to scan resident Digital IDs instantly via camera.
- [ ] **Role-Based Row Level Security (RLS)**: Enforce strict Postgres RLS policies in Supabase so residents can never fetch other residents' documents or private profiles.
- [ ] **Image Compression Interceptor**: Automatically compress profile picture uploads client-side before sending to Supabase Storage to optimize load speeds and bandwidth.