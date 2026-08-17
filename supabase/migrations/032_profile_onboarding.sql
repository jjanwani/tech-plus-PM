-- Self-service profile completion: everyone must have a name, headshot,
-- and resume on file. New signups start incomplete (via the column
-- default) and get routed through /onboarding until they fill it in;
-- existing accounts are grandfathered in below so this doesn't suddenly
-- lock out people who are already active members.
ALTER TABLE profiles
  ADD COLUMN resume_url TEXT,
  ADD COLUMN resume_file_name TEXT,
  ADD COLUMN onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE profiles SET onboarding_completed = TRUE;

-- Headshots and resumes, same public-bucket pattern as templates/
-- deliverables/admin_files. Objects are stored at "{user_id}/filename" so
-- write access can be scoped to your own folder.
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', TRUE) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('resumes', 'resumes', TRUE) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "avatars_bucket_select" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'avatars');

CREATE POLICY "avatars_bucket_insert" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'avatars'
    AND (auth_is_admin() OR auth.uid()::text = (storage.foldername(name))[1])
  );

CREATE POLICY "avatars_bucket_update" ON storage.objects
  FOR UPDATE TO authenticated USING (
    bucket_id = 'avatars'
    AND (auth_is_admin() OR auth.uid()::text = (storage.foldername(name))[1])
  );

CREATE POLICY "avatars_bucket_delete" ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id = 'avatars'
    AND (auth_is_admin() OR auth.uid()::text = (storage.foldername(name))[1])
  );

CREATE POLICY "resumes_bucket_select" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'resumes');

CREATE POLICY "resumes_bucket_insert" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'resumes'
    AND (auth_is_admin() OR auth.uid()::text = (storage.foldername(name))[1])
  );

CREATE POLICY "resumes_bucket_update" ON storage.objects
  FOR UPDATE TO authenticated USING (
    bucket_id = 'resumes'
    AND (auth_is_admin() OR auth.uid()::text = (storage.foldername(name))[1])
  );

CREATE POLICY "resumes_bucket_delete" ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id = 'resumes'
    AND (auth_is_admin() OR auth.uid()::text = (storage.foldername(name))[1])
  );
