-- Rework the client application tracker: replace the 3-item checklist with
-- a 6-stage pipeline (matching the org's actual tracking sheet) and a much
-- fuller field set. No client rows exist in production yet, so this is a
-- clean drop/recreate rather than an incremental ALTER.
DROP TABLE IF EXISTS clients CASCADE;

CREATE TYPE client_application_status AS ENUM (
  'initial_outreach',
  'applied',
  'interview_set_up',
  'interview_complete',
  'offer_sent',
  'offer_accepted'
);

CREATE TABLE clients (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company              TEXT NOT NULL,
  type                 project_type NOT NULL,
  status               client_application_status NOT NULL DEFAULT 'initial_outreach',
  industry             TEXT,
  description          TEXT,
  size                 TEXT,
  location             TEXT,
  contact_name         TEXT,
  contact_email        TEXT,
  phone_number         TEXT,
  assigned_manager_id  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  date_contacted       DATE,
  source               TEXT,
  notes                TEXT,
  created_by           UUID NOT NULL REFERENCES profiles(id),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_clients_assigned_manager ON clients(assigned_manager_id);
CREATE INDEX idx_clients_status ON clients(status);

CREATE TRIGGER set_updated_at_clients BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clients_select" ON clients
  FOR SELECT TO authenticated USING (
    auth_is_admin()
    OR auth_user_role() IN ('vp_operations', 'president', 'vp_external', 'consulting_manager')
    OR assigned_manager_id = auth.uid()
  );

CREATE POLICY "clients_insert" ON clients
  FOR INSERT TO authenticated WITH CHECK (
    auth_is_admin()
    OR auth_user_role() IN ('vp_operations', 'president', 'vp_external')
  );

CREATE POLICY "clients_update" ON clients
  FOR UPDATE TO authenticated USING (
    auth_is_admin()
    OR auth_user_role() IN ('vp_operations', 'president', 'vp_external')
    OR assigned_manager_id = auth.uid()
  );

CREATE POLICY "clients_delete" ON clients
  FOR DELETE TO authenticated USING (
    auth_is_admin()
    OR auth_user_role() IN ('vp_operations', 'president', 'vp_external')
  );
