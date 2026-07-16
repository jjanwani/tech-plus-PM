-- Seed the existing external client projects (previously tracked only as
-- OneDrive folders) as real projects. Idempotent: safe to re-run.
INSERT INTO projects (key, name, type, client_name)
VALUES
  ('STITCHI',    'Stitchi',              'external', 'Stitchi'),
  ('MODMAISON',  'Modern Maison Co',     'external', 'Modern Maison Co'),
  ('MICHCEN',    'Michigan Central',     'external', 'Michigan Central'),
  ('LOOKSTOR',   'Look Self Storage',    'external', 'Look Self Storage'),
  ('JUNCTION',   'Junction Party Store', 'external', 'Junction Party Store'),
  ('GOODCAKES',  'Good Cakes & Bakes',   'external', 'Good Cakes & Bakes'),
  ('GEOPRIME',   'GeoPrime',             'external', 'GeoPrime'),
  ('ESSPI',      'ESSPI',                'external', 'ESSPI'),
  ('DOWN2CHILL', 'Down2Chill',           'external', 'Down2Chill'),
  ('BOUNDARY',   'Boundary Shipbuilding','external', 'Boundary Shipbuilding')
ON CONFLICT (key) DO NOTHING;

-- Give each of these projects the default Kanban statuses, same as the
-- normal project-creation flow, so their boards aren't empty.
DO $$
DECLARE
  proj RECORD;
BEGIN
  FOR proj IN
    SELECT id FROM projects WHERE key IN (
      'STITCHI', 'MODMAISON', 'MICHCEN', 'LOOKSTOR', 'JUNCTION',
      'GOODCAKES', 'GEOPRIME', 'ESSPI', 'DOWN2CHILL', 'BOUNDARY'
    )
  LOOP
    IF NOT EXISTS (SELECT 1 FROM issue_statuses WHERE project_id = proj.id) THEN
      PERFORM seed_default_statuses(proj.id);
    END IF;
  END LOOP;
END $$;
