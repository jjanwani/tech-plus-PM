-- PROJECT NOTES
-- A private scratchpad per (project, user) — visible only to its author.
CREATE TABLE project_notes (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  body        TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

CREATE TRIGGER set_updated_at_project_notes BEFORE UPDATE ON project_notes FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE project_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "project_notes_own" ON project_notes
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- FAVORITES
-- Lets a user star a template or an admin file for quick access from their
-- dashboard. Polymorphic by item_type; no FK on item_id since it points at
-- different tables depending on item_type.
CREATE TYPE favorite_item_type AS ENUM ('template', 'admin_file');

CREATE TABLE favorites (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  item_type  favorite_item_type NOT NULL,
  item_id    UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, item_type, item_id)
);

ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "favorites_own" ON favorites
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
