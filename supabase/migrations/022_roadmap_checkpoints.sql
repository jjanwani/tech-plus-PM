-- ROADMAP CHECKPOINTS
-- Project-specific checkpoints (project_id set, scope null) are managed by that project's
-- PM/CM (or global admin/vp_operations/president).
-- Org-wide checkpoints (project_id null, scope 'internal'|'external') are managed by the
-- President or any VP, and automatically appear on every project of the matching type.

CREATE TABLE roadmap_checkpoints (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id      UUID REFERENCES projects(id) ON DELETE CASCADE,
  scope           project_type,
  title           TEXT NOT NULL,
  description     TEXT,
  checkpoint_date DATE NOT NULL,
  created_by      UUID NOT NULL REFERENCES profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (
    (project_id IS NOT NULL AND scope IS NULL) OR
    (project_id IS NULL AND scope IS NOT NULL)
  )
);

CREATE INDEX idx_roadmap_checkpoints_project ON roadmap_checkpoints(project_id);
CREATE INDEX idx_roadmap_checkpoints_scope ON roadmap_checkpoints(scope) WHERE project_id IS NULL;

CREATE TRIGGER set_updated_at_roadmap_checkpoints
  BEFORE UPDATE ON roadmap_checkpoints
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE roadmap_checkpoints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "roadmap_checkpoints_select" ON roadmap_checkpoints
  FOR SELECT TO authenticated USING (
    project_id IS NULL
    OR auth_is_admin()
    OR auth_user_role() IN ('vp_operations','president')
    OR (auth_user_role() = 'vp_internal' AND (SELECT type FROM projects WHERE id = project_id) = 'internal')
    OR (auth_user_role() = 'vp_external' AND (SELECT type FROM projects WHERE id = project_id) = 'external')
    OR is_project_member(project_id)
  );

CREATE POLICY "roadmap_checkpoints_manage" ON roadmap_checkpoints
  FOR ALL TO authenticated USING (
    (
      project_id IS NOT NULL AND (
        auth_is_admin()
        OR auth_user_role() IN ('vp_operations','president')
        OR (is_project_member(project_id) AND project_member_role(project_id) IN ('project_manager','consulting_manager'))
      )
    )
    OR (
      project_id IS NULL AND (
        auth_is_admin()
        OR auth_user_role() IN ('vp_operations','president','vp_internal','vp_external')
      )
    )
  )
  WITH CHECK (
    (
      project_id IS NOT NULL AND (
        auth_is_admin()
        OR auth_user_role() IN ('vp_operations','president')
        OR (is_project_member(project_id) AND project_member_role(project_id) IN ('project_manager','consulting_manager'))
      )
    )
    OR (
      project_id IS NULL AND (
        auth_is_admin()
        OR auth_user_role() IN ('vp_operations','president','vp_internal','vp_external')
      )
    )
  );
