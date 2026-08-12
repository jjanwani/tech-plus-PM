-- Restrict sign-up to people an admin/manager has explicitly added first.
-- handle_new_user() only ever fires once per auth.users row (on first
-- sign-in), so this has no effect on anyone who already has a profile —
-- it only blocks brand-new @umich.edu accounts that were never added via
-- Admin Users or a project's Team tab (i.e. that have no pending_invites
-- row waiting for them).

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_global_invite RECORD;
  v_contact_invite RECORD;
BEGIN
  IF lower(NEW.email) NOT LIKE '%@umich.edu' THEN
    RAISE EXCEPTION 'Only @umich.edu email addresses are allowed';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.pending_invites WHERE lower(email) = lower(NEW.email)) THEN
    RAISE EXCEPTION 'You must be added by an administrator before you can sign in.';
  END IF;

  -- Prefer a global invite's full_name, else the earliest project invite's.
  SELECT full_name, phone_number, grad_year, college INTO v_contact_invite
  FROM public.pending_invites
  WHERE lower(email) = lower(NEW.email)
  ORDER BY project_id IS NULL DESC, created_at ASC
  LIMIT 1;

  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', v_contact_invite.full_name, split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );

  IF v_contact_invite.phone_number IS NOT NULL
     OR v_contact_invite.grad_year IS NOT NULL
     OR v_contact_invite.college IS NOT NULL THEN
    UPDATE public.profiles
    SET phone_number = v_contact_invite.phone_number,
        grad_year = v_contact_invite.grad_year,
        college = v_contact_invite.college
    WHERE id = NEW.id;
  END IF;

  SELECT * INTO v_global_invite FROM public.pending_invites WHERE lower(email) = lower(NEW.email) AND project_id IS NULL;
  IF FOUND THEN
    UPDATE public.profiles
    SET role = COALESCE(v_global_invite.role, role),
        is_admin = COALESCE(v_global_invite.is_admin, is_admin)
    WHERE id = NEW.id;
  END IF;

  INSERT INTO public.project_members (project_id, user_id, role)
  SELECT pi.project_id, NEW.id, COALESCE(pi.role, 'new_analyst')
  FROM public.pending_invites pi
  WHERE lower(pi.email) = lower(NEW.email) AND pi.project_id IS NOT NULL
  ON CONFLICT (project_id, user_id) DO UPDATE SET role = EXCLUDED.role;

  DELETE FROM public.pending_invites WHERE lower(email) = lower(NEW.email);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
