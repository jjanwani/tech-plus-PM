-- handle_new_user() compared NEW.email against pending_invites.email (and
-- the @umich.edu domain check) with case-sensitive equality/LIKE. Google
-- doesn't guarantee an all-lowercase email is what Supabase stores, and
-- invite emails are hand-typed by admins, so any casing mismatch either
-- raises "Only @umich.edu email addresses are allowed" for a legitimate
-- @umich.edu account (domain check) or silently fails to consume a pending
-- invite (email match). Normalize both sides with lower() so sign-in for
-- pending-invited users is no longer sensitive to how the address was typed.

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_global_invite RECORD;
  v_contact_invite RECORD;
BEGIN
  IF lower(NEW.email) NOT LIKE '%@umich.edu' THEN
    RAISE EXCEPTION 'Only @umich.edu email addresses are allowed';
  END IF;

  -- Prefer a global invite's full_name, else the earliest project invite's.
  SELECT full_name, phone_number, grad_year, college INTO v_contact_invite
  FROM pending_invites
  WHERE lower(email) = lower(NEW.email)
  ORDER BY project_id IS NULL DESC, created_at ASC
  LIMIT 1;

  INSERT INTO profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', v_contact_invite.full_name, split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );

  IF v_contact_invite.phone_number IS NOT NULL
     OR v_contact_invite.grad_year IS NOT NULL
     OR v_contact_invite.college IS NOT NULL THEN
    UPDATE profiles
    SET phone_number = v_contact_invite.phone_number,
        grad_year = v_contact_invite.grad_year,
        college = v_contact_invite.college
    WHERE id = NEW.id;
  END IF;

  SELECT * INTO v_global_invite FROM pending_invites WHERE lower(email) = lower(NEW.email) AND project_id IS NULL;
  IF FOUND THEN
    UPDATE profiles
    SET role = COALESCE(v_global_invite.role, role),
        is_admin = COALESCE(v_global_invite.is_admin, is_admin)
    WHERE id = NEW.id;
  END IF;

  INSERT INTO project_members (project_id, user_id, role)
  SELECT pi.project_id, NEW.id, COALESCE(pi.role, 'new_analyst')
  FROM pending_invites pi
  WHERE lower(pi.email) = lower(NEW.email) AND pi.project_id IS NOT NULL
  ON CONFLICT (project_id, user_id) DO UPDATE SET role = EXCLUDED.role;

  DELETE FROM pending_invites WHERE lower(email) = lower(NEW.email);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
