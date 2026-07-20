-- Add the Stitchi team roster and update Rohit Bhattiprolu's role.
-- Profiles only exist for people who have already signed in at least once
-- (Google OAuth creates the profile row), so anyone not found here still
-- needs to log in before they can be added — see the report query at the
-- bottom of this script.
DO $$
DECLARE
  v_project_id UUID;
BEGIN
  SELECT id INTO v_project_id FROM projects WHERE key = 'STITCHI';

  IF v_project_id IS NULL THEN
    RAISE EXCEPTION 'Stitchi project (key STITCHI) not found — run migration 010 first';
  END IF;

  INSERT INTO project_members (project_id, user_id, role)
  SELECT v_project_id, p.id, roster.role::user_role
  FROM profiles p
  JOIN (VALUES
    ('zayaant@umich.edu',  'project_manager'),
    ('pranjalm@umich.edu', 'senior_analyst'),
    ('alexowen@umich.edu', 'new_analyst'),
    ('etut@umich.edu',     'new_analyst'),
    ('andreawu@umich.edu', 'new_analyst')
  ) AS roster(email, role) ON roster.email = p.email
  ON CONFLICT (project_id, user_id) DO UPDATE SET role = EXCLUDED.role;
END $$;

UPDATE profiles
SET role = 'consulting_manager', is_admin = TRUE
WHERE email = 'rbhattip@umich.edu';

-- Anyone listed below with no profile hasn't signed into the app yet —
-- have them log in once with their @umich.edu Google account, then re-run
-- just the block above for them.
SELECT email AS not_yet_signed_in
FROM (VALUES
  ('zayaant@umich.edu'),
  ('pranjalm@umich.edu'),
  ('alexowen@umich.edu'),
  ('etut@umich.edu'),
  ('andreawu@umich.edu'),
  ('rbhattip@umich.edu')
) AS wanted(email)
WHERE NOT EXISTS (SELECT 1 FROM profiles p WHERE p.email = wanted.email);
