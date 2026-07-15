-- Replace the (unconfigured) OneDrive/Microsoft Graph file storage for
-- templates and deliverables with Supabase Storage.

INSERT INTO storage.buckets (id, name, public)
VALUES ('templates', 'templates', TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('deliverables', 'deliverables', TRUE)
ON CONFLICT (id) DO NOTHING;

-- TEMPLATES bucket: same permission rule as the templates table (global, not project-scoped)
CREATE POLICY "templates_bucket_select" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'templates');

CREATE POLICY "templates_bucket_insert" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'templates'
    AND (
      auth_is_admin()
      OR auth_user_role() IN ('vp_operations','president','vp_internal','vp_external','consulting_manager')
    )
  );

CREATE POLICY "templates_bucket_update" ON storage.objects
  FOR UPDATE TO authenticated USING (
    bucket_id = 'templates'
    AND (
      auth_is_admin()
      OR auth_user_role() IN ('vp_operations','president','vp_internal','vp_external','consulting_manager')
    )
  );

CREATE POLICY "templates_bucket_delete" ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id = 'templates'
    AND (
      auth_is_admin()
      OR auth_user_role() IN ('vp_operations','president','vp_internal','vp_external','consulting_manager')
    )
  );

-- DELIVERABLES bucket: objects are stored at "{project_id}/{filename}",
-- so permission mirrors the deliverables_manage table policy per-project.
CREATE POLICY "deliverables_bucket_select" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'deliverables');

CREATE POLICY "deliverables_bucket_insert" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'deliverables'
    AND (
      auth_is_admin()
      OR auth_user_role() IN ('vp_operations','president')
      OR project_member_role(((storage.foldername(name))[1])::uuid) IN ('project_manager','consulting_manager')
    )
  );

CREATE POLICY "deliverables_bucket_update" ON storage.objects
  FOR UPDATE TO authenticated USING (
    bucket_id = 'deliverables'
    AND (
      auth_is_admin()
      OR auth_user_role() IN ('vp_operations','president')
      OR project_member_role(((storage.foldername(name))[1])::uuid) IN ('project_manager','consulting_manager')
    )
  );

CREATE POLICY "deliverables_bucket_delete" ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id = 'deliverables'
    AND (
      auth_is_admin()
      OR auth_user_role() IN ('vp_operations','president')
      OR project_member_role(((storage.foldername(name))[1])::uuid) IN ('project_manager','consulting_manager')
    )
  );

-- TEMPLATES table: drop the OneDrive columns, add Supabase Storage columns.
-- Left nullable at the DB level (the API always populates them) so this
-- migration can't fail against a table that already has rows.
ALTER TABLE templates
  DROP COLUMN onedrive_item_id,
  DROP COLUMN onedrive_web_url,
  ADD COLUMN file_path TEXT,
  ADD COLUMN file_name TEXT,
  ADD COLUMN file_url  TEXT;

-- DELIVERABLES table: same swap; file attachment was already optional.
ALTER TABLE deliverables
  DROP COLUMN onedrive_item_id,
  DROP COLUMN onedrive_web_url,
  ADD COLUMN file_path TEXT,
  ADD COLUMN file_name TEXT,
  ADD COLUMN file_url  TEXT;
