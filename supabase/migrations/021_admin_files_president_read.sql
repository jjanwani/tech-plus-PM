-- Let the president role read (not manage) Admin Files, so they can browse
-- and favorite documents from their dashboard even without is_admin set.
DROP POLICY "admin_files_select" ON admin_files;
CREATE POLICY "admin_files_select" ON admin_files
  FOR SELECT TO authenticated USING (auth_is_admin() OR auth_user_role() = 'president');

DROP POLICY "admin_files_bucket_select" ON storage.objects;
CREATE POLICY "admin_files_bucket_select" ON storage.objects
  FOR SELECT TO authenticated USING (
    bucket_id = 'admin-files' AND (auth_is_admin() OR auth_user_role() = 'president')
  );
