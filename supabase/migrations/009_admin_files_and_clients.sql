-- ADMIN FILES
-- A generic internal document library, grouped into fixed folders.
CREATE TYPE admin_file_category AS ENUM (
  'receipts',
  'powerpoints',
  'photos_events',
  'forms_applications',
  'flyers',
  'excel_sheets_trackers',
  'emails'
);

CREATE TABLE admin_files (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category     admin_file_category NOT NULL,
  file_name    TEXT NOT NULL,
  file_path    TEXT NOT NULL,
  file_size    INTEGER,
  mime_type    TEXT,
  uploaded_by  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_admin_files_category ON admin_files(category);

ALTER TABLE admin_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_files_select" ON admin_files
  FOR SELECT TO authenticated USING (auth_is_admin());

CREATE POLICY "admin_files_manage" ON admin_files
  FOR ALL TO authenticated USING (auth_is_admin());

-- Private bucket: these are internal admin documents (receipts, forms, etc.),
-- not publicly linkable like templates/deliverables. Access is via signed URLs.
INSERT INTO storage.buckets (id, name, public)
VALUES ('admin-files', 'admin-files', FALSE)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "admin_files_bucket_select" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'admin-files' AND auth_is_admin());

CREATE POLICY "admin_files_bucket_insert" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'admin-files' AND auth_is_admin());

CREATE POLICY "admin_files_bucket_update" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'admin-files' AND auth_is_admin());

CREATE POLICY "admin_files_bucket_delete" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'admin-files' AND auth_is_admin());

-- CLIENT APPLICATION TRACKER
-- A prospective/current client, assigned to a consulting manager, tracked
-- through a fixed 3-step checklist.
CREATE TABLE clients (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                    TEXT NOT NULL,
  contact_name            TEXT,
  contact_email           TEXT,
  notes                   TEXT,
  assigned_manager_id     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  outreach_email_done     BOOLEAN NOT NULL DEFAULT FALSE,
  outreach_email_done_at  DATE,
  interview_done          BOOLEAN NOT NULL DEFAULT FALSE,
  interview_done_at       DATE,
  evaluation_done         BOOLEAN NOT NULL DEFAULT FALSE,
  evaluation_done_at      DATE,
  created_by              UUID NOT NULL REFERENCES profiles(id),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_clients_assigned_manager ON clients(assigned_manager_id);

CREATE TRIGGER set_updated_at_clients BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clients_select" ON clients
  FOR SELECT TO authenticated USING (
    auth_is_admin()
    OR auth_user_role() IN ('vp_operations', 'president', 'vp_external', 'consulting_manager')
    OR assigned_manager_id = auth.uid()
  );

CREATE POLICY "clients_insert" ON clients
  FOR INSERT TO authenticated WITH CHECK (
    auth_is_admin()
    OR auth_user_role() IN ('vp_operations', 'president', 'vp_external')
  );

CREATE POLICY "clients_update" ON clients
  FOR UPDATE TO authenticated USING (
    auth_is_admin()
    OR auth_user_role() IN ('vp_operations', 'president', 'vp_external')
    OR assigned_manager_id = auth.uid()
  );

CREATE POLICY "clients_delete" ON clients
  FOR DELETE TO authenticated USING (
    auth_is_admin()
    OR auth_user_role() IN ('vp_operations', 'president', 'vp_external')
  );
