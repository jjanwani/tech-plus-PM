-- PENDING INVITES
-- Lets an admin/manager pre-provision access for someone before they've
-- ever signed in. Profiles only exist after a real Google OAuth sign-in
-- (see handle_new_user() below), so invites are keyed by email and are
-- consumed automatically the first time that email signs in.
CREATE TABLE pending_invites (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email        TEXT NOT NULL,
  project_id   UUID REFERENCES projects(id) ON DELETE CASCADE,
  role         user_role,
  is_admin     BOOLEAN,
  invited_by   UUID NOT NULL REFERENCES profiles(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(email, project_id)
);

-- Only one pending org-wide (project_id IS NULL) invite per email.
CREATE UNIQUE INDEX idx_pending_invites_global_email ON pending_invites(email) WHERE project_id IS NULL;
CREATE INDEX idx_pending_invites_project ON pending_invites(project_id);

ALTER TABLE pending_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pending_invites_select" ON pending_invites
  FOR SELECT TO authenticated USING (
    auth_is_admin()
    OR auth_user_role() IN ('vp_operations', 'president')
    OR (project_id IS NOT NULL AND is_project_member(project_id) AND project_member_role(project_id) IN ('project_manager', 'consulting_manager'))
  );

CREATE POLICY "pending_invites_manage" ON pending_invites
  FOR ALL TO authenticated USING (
    auth_is_admin()
    OR auth_user_role() IN ('vp_operations', 'president')
    OR (project_id IS NOT NULL AND is_project_member(project_id) AND project_member_role(project_id) IN ('project_manager', 'consulting_manager'))
  );

-- Consume pending invites when the invited person signs in for the first time.
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_global_invite RECORD;
BEGIN
  IF NEW.email NOT LIKE '%@umich.edu' THEN
    RAISE EXCEPTION 'Only @umich.edu email addresses are allowed';
  END IF;

  INSERT INTO profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );

  SELECT * INTO v_global_invite FROM pending_invites WHERE email = NEW.email AND project_id IS NULL;
  IF FOUND THEN
    UPDATE profiles
    SET role = COALESCE(v_global_invite.role, role),
        is_admin = COALESCE(v_global_invite.is_admin, is_admin)
    WHERE id = NEW.id;
  END IF;

  INSERT INTO project_members (project_id, user_id, role)
  SELECT pi.project_id, NEW.id, COALESCE(pi.role, 'new_analyst')
  FROM pending_invites pi
  WHERE pi.email = NEW.email AND pi.project_id IS NOT NULL
  ON CONFLICT (project_id, user_id) DO UPDATE SET role = EXCLUDED.role;

  DELETE FROM pending_invites WHERE email = NEW.email;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
