-- Attendance and strike tracking, shown on the (now merged) Users tab.
--
-- Attendance: an "event" (e.g. a weekly meeting) is logged with a date;
-- only people who were ABSENT get a row in attendance_records (present
-- people are simply not recorded). Each absence starts unexcused; an
-- authorized person can mark it excused.
--
-- Strikes: a flat log of strikes issued to a person. Permission to issue
-- one is rank-based — mirrors the existing frontend ROLE_HIERARCHY
-- (src/lib/utils/permissions.ts) exactly, so "only vp_external,
-- vp_internal, vp_operations, or president can strike a consulting_manager"
-- falls out naturally from "issuer's rank must exceed the target's rank".

-- Mirrors ROLE_WEIGHT in src/lib/utils/permissions.ts exactly (vp_internal
-- and vp_external are intentionally tied).
CREATE OR REPLACE FUNCTION role_rank(p_role user_role)
RETURNS INT AS $$
  SELECT CASE p_role
    WHEN 'new_analyst' THEN 0
    WHEN 'senior_analyst' THEN 1
    WHEN 'project_manager' THEN 2
    WHEN 'consulting_manager' THEN 3
    WHEN 'vp_internal' THEN 4
    WHEN 'vp_external' THEN 4
    WHEN 'vp_operations' THEN 5
    WHEN 'president' THEN 6
  END;
$$ LANGUAGE SQL IMMUTABLE;

CREATE TABLE attendance_events (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title       TEXT NOT NULL,
  event_date  DATE NOT NULL,
  created_by  UUID NOT NULL REFERENCES profiles(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE attendance_records (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id    UUID NOT NULL REFERENCES attendance_events(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  is_excused  BOOLEAN NOT NULL DEFAULT FALSE,
  excused_by  UUID REFERENCES profiles(id),
  excused_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

CREATE INDEX idx_attendance_records_user ON attendance_records(user_id);

CREATE TABLE strikes (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  issued_by   UUID NOT NULL REFERENCES profiles(id),
  reason      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_strikes_user ON strikes(user_id);

ALTER TABLE attendance_events  ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE strikes            ENABLE ROW LEVEL SECURITY;

-- Attendance is org-wide operational tracking: managed by admins and
-- VP Operations/President, visible to everyone at project_manager+ (so
-- managers can see their people's records) plus each person for themself.
CREATE POLICY "attendance_events_select" ON attendance_events
  FOR SELECT TO authenticated USING (
    auth_is_admin()
    OR auth_user_role() IN ('project_manager','consulting_manager','vp_internal','vp_external','vp_operations','president')
  );

CREATE POLICY "attendance_events_manage" ON attendance_events
  FOR ALL TO authenticated USING (
    auth_is_admin() OR auth_user_role() IN ('vp_operations','president')
  );

CREATE POLICY "attendance_records_select" ON attendance_records
  FOR SELECT TO authenticated USING (
    user_id = auth.uid()
    OR auth_is_admin()
    OR auth_user_role() IN ('project_manager','consulting_manager','vp_internal','vp_external','vp_operations','president')
  );

CREATE POLICY "attendance_records_manage" ON attendance_records
  FOR ALL TO authenticated USING (
    auth_is_admin() OR auth_user_role() IN ('vp_operations','president')
  );

CREATE POLICY "strikes_select" ON strikes
  FOR SELECT TO authenticated USING (
    user_id = auth.uid()
    OR auth_is_admin()
    OR auth_user_role() IN ('project_manager','consulting_manager','vp_internal','vp_external','vp_operations','president')
  );

CREATE POLICY "strikes_manage" ON strikes
  FOR ALL TO authenticated USING (
    auth_is_admin()
    OR role_rank(auth_user_role()) > role_rank((SELECT role FROM profiles WHERE id = strikes.user_id))
  );
