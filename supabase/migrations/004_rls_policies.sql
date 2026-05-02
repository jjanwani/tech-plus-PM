ALTER TABLE profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects        ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE issue_statuses  ENABLE ROW LEVEL SECURITY;
ALTER TABLE sprints         ENABLE ROW LEVEL SECURITY;
ALTER TABLE labels          ENABLE ROW LEVEL SECURITY;
ALTER TABLE issues          ENABLE ROW LEVEL SECURITY;
ALTER TABLE issue_labels    ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments        ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log    ENABLE ROW LEVEL SECURITY;
ALTER TABLE issue_watchers  ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments     ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications   ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates       ENABLE ROW LEVEL SECURITY;
ALTER TABLE sprint_burndown ENABLE ROW LEVEL SECURITY;
ALTER TABLE sprint_velocity ENABLE ROW LEVEL SECURITY;
ALTER TABLE issue_counters  ENABLE ROW LEVEL SECURITY;

-- Helper functions
CREATE OR REPLACE FUNCTION auth_user_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION auth_is_admin()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(is_admin, FALSE) FROM profiles WHERE id = auth.uid();
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_project_member(p_project_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM project_members
    WHERE project_id = p_project_id AND user_id = auth.uid()
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION project_member_role(p_project_id UUID)
RETURNS user_role AS $$
  SELECT role FROM project_members
  WHERE project_id = p_project_id AND user_id = auth.uid();
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- PROFILES
CREATE POLICY "profiles_select" ON profiles
  FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_admin_update" ON profiles
  FOR UPDATE TO authenticated USING (auth_is_admin());

CREATE POLICY "profiles_insert_service" ON profiles
  FOR INSERT TO service_role WITH CHECK (TRUE);

-- PROJECTS
CREATE POLICY "projects_select" ON projects
  FOR SELECT TO authenticated USING (
    auth_is_admin()
    OR auth_user_role() IN ('vp_operations', 'president')
    OR (auth_user_role() = 'vp_internal' AND type = 'internal')
    OR (auth_user_role() = 'vp_external' AND type = 'external')
    OR is_project_member(id)
  );

CREATE POLICY "projects_insert" ON projects
  FOR INSERT TO authenticated
  WITH CHECK (
    auth_is_admin()
    OR auth_user_role() IN ('project_manager','consulting_manager','vp_internal','vp_external','vp_operations','president')
  );

CREATE POLICY "projects_update" ON projects
  FOR UPDATE TO authenticated USING (
    auth_is_admin()
    OR auth_user_role() IN ('vp_operations', 'president')
    OR (auth_user_role() IN ('project_manager','consulting_manager') AND is_project_member(id))
  );

CREATE POLICY "projects_delete" ON projects
  FOR DELETE TO authenticated USING (
    auth_is_admin() OR auth_user_role() IN ('vp_operations', 'president')
  );

-- PROJECT MEMBERS
CREATE POLICY "members_select" ON project_members
  FOR SELECT TO authenticated USING (
    user_id = auth.uid()
    OR auth_is_admin()
    OR auth_user_role() IN ('vp_operations','president','vp_internal','vp_external')
    OR EXISTS (
      SELECT 1 FROM project_members pm2
      WHERE pm2.project_id = project_members.project_id
        AND pm2.user_id = auth.uid()
        AND pm2.role IN ('project_manager','consulting_manager')
    )
  );

CREATE POLICY "members_manage" ON project_members
  FOR ALL TO authenticated USING (
    auth_is_admin()
    OR auth_user_role() IN ('vp_operations','president')
    OR (project_member_role(project_id) IN ('project_manager','consulting_manager'))
  );

-- ISSUES
CREATE POLICY "issues_select" ON issues
  FOR SELECT TO authenticated USING (
    auth_is_admin()
    OR auth_user_role() IN ('vp_operations','president')
    OR (auth_user_role() = 'vp_internal' AND (SELECT type FROM projects WHERE id = project_id) = 'internal')
    OR (auth_user_role() = 'vp_external' AND (SELECT type FROM projects WHERE id = project_id) = 'external')
    OR (
      is_project_member(project_id)
      AND (
        (auth_user_role() = 'new_analyst' AND assignee_id = auth.uid())
        OR auth_user_role() != 'new_analyst'
      )
    )
  );

CREATE POLICY "issues_insert" ON issues
  FOR INSERT TO authenticated
  WITH CHECK (
    auth_is_admin()
    OR auth_user_role() IN ('vp_operations','president','vp_internal','vp_external')
    OR (is_project_member(project_id) AND auth_user_role() != 'new_analyst')
  );

CREATE POLICY "issues_update" ON issues
  FOR UPDATE TO authenticated USING (
    auth_is_admin()
    OR auth_user_role() IN ('vp_operations','president','vp_internal','vp_external')
    OR (is_project_member(project_id) AND auth_user_role() != 'new_analyst')
    OR (assignee_id = auth.uid() AND is_project_member(project_id))
  );

CREATE POLICY "issues_delete" ON issues
  FOR DELETE TO authenticated USING (
    auth_is_admin()
    OR auth_user_role() IN ('vp_operations','president')
    OR (is_project_member(project_id) AND project_member_role(project_id) IN ('project_manager','consulting_manager'))
  );

-- COMMENTS
CREATE POLICY "comments_select" ON comments
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM issues i WHERE i.id = issue_id)
  );

CREATE POLICY "comments_insert" ON comments
  FOR INSERT TO authenticated WITH CHECK (author_id = auth.uid());

CREATE POLICY "comments_update" ON comments
  FOR UPDATE TO authenticated USING (author_id = auth.uid() OR auth_is_admin());

CREATE POLICY "comments_delete" ON comments
  FOR DELETE TO authenticated USING (author_id = auth.uid() OR auth_is_admin());

-- NOTIFICATIONS
CREATE POLICY "notifications_own" ON notifications
  FOR ALL TO authenticated USING (user_id = auth.uid());

-- ACTIVITY LOG
CREATE POLICY "activity_select" ON activity_log
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM issues i WHERE i.id = issue_id)
  );

CREATE POLICY "activity_insert_service" ON activity_log
  FOR INSERT TO service_role WITH CHECK (TRUE);

-- ATTACHMENTS
CREATE POLICY "attachments_select" ON attachments
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM issues i WHERE i.id = issue_id)
  );

CREATE POLICY "attachments_insert" ON attachments
  FOR INSERT TO authenticated WITH CHECK (uploaded_by = auth.uid());

CREATE POLICY "attachments_delete" ON attachments
  FOR DELETE TO authenticated USING (uploaded_by = auth.uid() OR auth_is_admin());

-- TEMPLATES
CREATE POLICY "templates_select" ON templates
  FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "templates_manage" ON templates
  FOR ALL TO authenticated USING (
    auth_is_admin()
    OR auth_user_role() IN ('vp_operations','president','vp_internal','vp_external','consulting_manager')
  );

-- ISSUE STATUSES
CREATE POLICY "issue_statuses_select" ON issue_statuses
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id)
  );

CREATE POLICY "issue_statuses_manage" ON issue_statuses
  FOR ALL TO authenticated USING (
    auth_is_admin()
    OR auth_user_role() IN ('vp_operations','president')
    OR (is_project_member(project_id) AND project_member_role(project_id) IN ('project_manager','consulting_manager'))
  );

-- SPRINTS
CREATE POLICY "sprints_select" ON sprints
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id)
  );

CREATE POLICY "sprints_manage" ON sprints
  FOR ALL TO authenticated USING (
    auth_is_admin()
    OR auth_user_role() IN ('vp_operations','president')
    OR (is_project_member(project_id) AND project_member_role(project_id) IN ('project_manager','consulting_manager'))
  );

-- WATCHERS
CREATE POLICY "watchers_select" ON issue_watchers
  FOR SELECT TO authenticated USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM issues i WHERE i.id = issue_id)
  );

CREATE POLICY "watchers_manage" ON issue_watchers
  FOR ALL TO authenticated USING (user_id = auth.uid());

-- LABELS
CREATE POLICY "labels_select" ON labels
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id)
  );

CREATE POLICY "labels_manage" ON labels
  FOR ALL TO authenticated USING (
    auth_is_admin()
    OR auth_user_role() IN ('vp_operations','president')
    OR (is_project_member(project_id) AND project_member_role(project_id) IN ('project_manager','consulting_manager'))
  );

-- ISSUE LABELS
CREATE POLICY "issue_labels_select" ON issue_labels
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM issues i WHERE i.id = issue_id)
  );

CREATE POLICY "issue_labels_manage" ON issue_labels
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM issues i WHERE i.id = issue_id)
  );

-- COMMENT MENTIONS
CREATE POLICY "comment_mentions_select" ON comment_mentions
  FOR SELECT TO authenticated USING (
    mentioned_user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM comments c WHERE c.id = comment_id)
  );

CREATE POLICY "comment_mentions_insert_service" ON comment_mentions
  FOR INSERT TO service_role WITH CHECK (TRUE);

-- BURNDOWN & VELOCITY
CREATE POLICY "burndown_select" ON sprint_burndown
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM sprints s WHERE s.id = sprint_id)
  );

CREATE POLICY "velocity_select" ON sprint_velocity
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id)
  );

-- ISSUE COUNTERS
CREATE POLICY "counters_select" ON issue_counters
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id)
  );

CREATE POLICY "counters_service" ON issue_counters
  FOR ALL TO service_role WITH CHECK (TRUE);
