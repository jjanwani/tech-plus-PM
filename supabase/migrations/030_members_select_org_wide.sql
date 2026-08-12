-- The org chart (visible to every authenticated user) needs to read
-- project_members across ALL projects, not just ones the viewer leads or
-- belongs to. Membership rosters aren't sensitive — every project's Team
-- tab already shows its own full roster to any member — so make
-- members_select match the existing profiles_select policy (readable by
-- any authenticated user). Write access (members_manage) is unchanged.

DROP POLICY IF EXISTS "members_select" ON project_members;

CREATE POLICY "members_select" ON project_members
  FOR SELECT TO authenticated USING (TRUE);

-- Same reasoning for projects: the org chart's embedded project:projects(...)
-- join would otherwise come back NULL (and get filtered out) for any
-- project the viewer isn't already a member of. Project name/key/type
-- aren't sensitive; write access (projects_insert/update/etc.) is unchanged.
DROP POLICY IF EXISTS "projects_select" ON projects;

CREATE POLICY "projects_select" ON projects
  FOR SELECT TO authenticated USING (TRUE);
