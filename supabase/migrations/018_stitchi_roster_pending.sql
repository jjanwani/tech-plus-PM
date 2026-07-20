-- Add the Stitchi roster as pending team members (with contact/roster info),
-- unless they already have a profile (already signed in at least once), in
-- which case add them to the project directly and fill in any missing
-- contact fields.
DO $$
DECLARE
  v_project_id UUID;
  v_admin_id UUID;
  roster RECORD;
BEGIN
  SELECT id INTO v_project_id FROM projects WHERE key = 'STITCHI';
  IF v_project_id IS NULL THEN
    RAISE EXCEPTION 'Stitchi project (key STITCHI) not found — run migration 010 first';
  END IF;

  SELECT id INTO v_admin_id FROM profiles WHERE email = 'jjanwani@umich.edu';
  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'jjanwani@umich.edu has no profile yet — sign in once first';
  END IF;

  FOR roster IN
    SELECT * FROM (VALUES
      ('zayaant@umich.edu',  'Zayaan Turner',  'project_manager', '586-909-7292',   2028, 'Ross'),
      ('pranjalm@umich.edu', 'Pranjal Mhetre', 'senior_analyst',  '(609) 627-9936', 2029, 'LSA'),
      ('alexowen@umich.edu', 'Alex Owen',      'new_analyst',     '989-640-7556',   2026, 'Kinesiology'),
      ('etut@umich.edu',     'Ethan Tuttle',   'new_analyst',     '6165601117',     2028, 'LSA'),
      ('andreawu@umich.edu', 'Andrea Wu',      'new_analyst',     '9895986065',     2029, 'Engineering')
    ) AS t(email, full_name, role, phone_number, grad_year, college)
  LOOP
    IF EXISTS (SELECT 1 FROM profiles WHERE email = roster.email) THEN
      INSERT INTO project_members (project_id, user_id, role)
      SELECT v_project_id, id, roster.role::user_role FROM profiles WHERE email = roster.email
      ON CONFLICT (project_id, user_id) DO UPDATE SET role = EXCLUDED.role;

      UPDATE profiles
      SET phone_number = COALESCE(phone_number, roster.phone_number),
          grad_year = COALESCE(grad_year, roster.grad_year),
          college = COALESCE(college, roster.college)
      WHERE email = roster.email;
    ELSE
      INSERT INTO pending_invites (email, project_id, role, full_name, phone_number, grad_year, college, invited_by)
      VALUES (roster.email, v_project_id, roster.role::user_role, roster.full_name, roster.phone_number, roster.grad_year, roster.college, v_admin_id)
      ON CONFLICT (email, project_id) DO UPDATE
        SET role = EXCLUDED.role,
            full_name = EXCLUDED.full_name,
            phone_number = EXCLUDED.phone_number,
            grad_year = EXCLUDED.grad_year,
            college = EXCLUDED.college;
    END IF;
  END LOOP;
END $$;
