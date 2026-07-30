-- Remove the Sprints feature entirely: the Board/Backlog/Overview/Reports no
-- longer reference sprints in any way, so drop the underlying data too
-- (including the currently-saved Stitchi sprint).

DROP VIEW IF EXISTS project_summaries;

ALTER TABLE issues DROP COLUMN IF EXISTS sprint_id;

DROP TABLE IF EXISTS sprint_burndown CASCADE;
DROP TABLE IF EXISTS sprint_velocity CASCADE;
DROP TABLE IF EXISTS sprints CASCADE;
DROP TYPE IF EXISTS sprint_status;

CREATE VIEW project_summaries AS
SELECT
  p.id, p.name, p.key, p.type, p.client_name, p.semester, p.term, p.year, p.is_archived,
  COUNT(DISTINCT i.id) FILTER (WHERE i.resolved_at IS NULL) AS open_issues,
  COUNT(DISTINCT i.id) AS total_issues,
  COUNT(DISTINCT pm.user_id) AS member_count
FROM projects p
LEFT JOIN issues i ON i.project_id = p.id
LEFT JOIN project_members pm ON pm.project_id = p.id
GROUP BY p.id;
