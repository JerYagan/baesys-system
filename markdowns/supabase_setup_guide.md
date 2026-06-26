# Supabase Setup Guide for Baesys

This guide details the steps to set up your Supabase project, including database schemas, default seed data, and configuring Supabase Storage for profile picture uploads.

---

## 💾 1. Database Setup

To set up the database tables, views, and initial seed values:

1. Go to your **Supabase Dashboard** ➔ Select your project.
2. Click on the **SQL Editor** tab in the left sidebar.
3. Click **New query** (or **New blank query**).
4. Copy the contents of the schema migration file:
   - [001_supabase_schema.sql](file:///d:/xampp-b/htdocs/baesys-barangay/database/supabase_migrations/001_supabase_schema.sql)
5. Paste it into the editor and click **Run** (or press `Ctrl + Enter`).
6. Create another **New query** and copy the contents of the seed data file:
   - [002_supabase_seed.sql](file:///d:/xampp-b/htdocs/baesys-barangay/database/supabase_migrations/002_supabase_seed.sql)
7. Paste and click **Run** to seed administrative accounts, settings, document types, and clinic services.

---

## 🪣 2. Storage Setup (Avatars Bucket)

Follow these steps to create and configure the storage bucket for profile pictures:

### Step A: Create the Bucket
1. Go to the **Storage** tab in the left sidebar of the Supabase Dashboard.
2. Click **New bucket** (or **Create a new bucket**).
3. Set the **Bucket Name** to: `avatars`
4. Toggle the **Public** option **ON** (so public URLs can be generated and accessed by everyone).
5. Click **Save** / **Create bucket**.

### Step B: Configure Security Policies (RLS)
To allow users and administrators to upload and modify profile pictures, you must add storage policies:

1. Click on the newly created `avatars` bucket.
2. Click on **Policies** (or **Configuration** ➔ **Policies**).
3. Under the **avatars** bucket, click **New Policy** to create policies:

#### Policy 1: Allow Public Read Access
- **Policy name**: `Allow public read`
- **Allowed operations**: `SELECT`
- **Target roles**: `public`
- **Expression (using SQL editor)**:
  ```sql
  true
  ```

#### Policy 2: Allow Uploads (Authenticated Users)
- **Policy name**: `Allow authenticated uploads`
- **Allowed operations**: `INSERT`
- **Target roles**: `authenticated`
- **Expression (using SQL editor)**:
  ```sql
  true
  ```

#### Policy 3: Allow Update/Upsert (Owner or Admin)
- **Policy name**: `Allow update`
- **Allowed operations**: `UPDATE`
- **Target roles**: `authenticated`
- **Expression (using SQL editor)**:
  ```sql
  true
  ```

*Note: For a simple local/community setup, letting all authenticated users `INSERT` and `UPDATE` records in the `avatars` bucket is sufficient. You can restrict folders to specific user IDs if higher isolation is needed.*
