-- SEMESTER STRUCTURING
CREATE TYPE project_term AS ENUM ('fall', 'winter');

ALTER TABLE projects
  ADD COLUMN term project_term,
  ADD COLUMN year INTEGER;

DROP VIEW IF EXISTS project_summaries;

CREATE VIEW project_summaries AS
SELECT
  p.id, p.name, p.key, p.type, p.client_name, p.semester, p.term, p.year, p.is_archived,
  COUNT(DISTINCT i.id) FILTER (WHERE i.resolved_at IS NULL) AS open_issues,
  COUNT(DISTINCT i.id) AS total_issues,
  COUNT(DISTINCT pm.user_id) AS member_count,
  MAX(s.end_date) AS current_sprint_end
FROM projects p
LEFT JOIN issues i ON i.project_id = p.id
LEFT JOIN project_members pm ON pm.project_id = p.id
LEFT JOIN sprints s ON s.project_id = p.id AND s.status = 'active'
GROUP BY p.id;

-- DELIVERABLES
CREATE TABLE deliverables (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id        UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title             TEXT NOT NULL,
  description       TEXT,
  link_url          TEXT,
  onedrive_item_id  TEXT,
  onedrive_web_url  TEXT,
  due_date          DATE,
  responsible_id    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  is_complete       BOOLEAN NOT NULL DEFAULT FALSE,
  created_by        UUID NOT NULL REFERENCES profiles(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_deliverables_project ON deliverables(project_id);

ALTER TABLE deliverables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deliverables_select" ON deliverables
  FOR SELECT TO authenticated USING (
    auth_is_admin()
    OR auth_user_role() IN ('vp_operations', 'president')
    OR (auth_user_role() = 'vp_internal' AND (SELECT type FROM projects WHERE id = project_id) = 'internal')
    OR (auth_user_role() = 'vp_external' AND (SELECT type FROM projects WHERE id = project_id) = 'external')
    OR is_project_member(project_id)
  );

CREATE POLICY "deliverables_manage" ON deliverables
  FOR ALL TO authenticated USING (
    auth_is_admin()
    OR auth_user_role() IN ('vp_operations', 'president')
    OR (is_project_member(project_id) AND project_member_role(project_id) IN ('project_manager', 'consulting_manager'))
  );
