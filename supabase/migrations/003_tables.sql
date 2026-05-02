-- PROFILES
CREATE TABLE profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email           TEXT NOT NULL UNIQUE,
  full_name       TEXT NOT NULL,
  avatar_url      TEXT,
  role            user_role NOT NULL DEFAULT 'new_analyst',
  is_admin        BOOLEAN NOT NULL DEFAULT FALSE,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  onboarded_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- PROJECTS
CREATE TABLE projects (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key                 TEXT NOT NULL UNIQUE,
  name                TEXT NOT NULL,
  description         TEXT,
  type                project_type NOT NULL,
  client_name         TEXT,
  semester            TEXT,
  is_archived         BOOLEAN NOT NULL DEFAULT FALSE,
  owner_id            UUID REFERENCES profiles(id),
  onedrive_folder_id  TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- PROJECT MEMBERS
CREATE TABLE project_members (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role        user_role NOT NULL,
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

CREATE INDEX idx_project_members_user    ON project_members(user_id);
CREATE INDEX idx_project_members_project ON project_members(project_id);

-- ISSUE STATUSES
CREATE TABLE issue_statuses (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  color       TEXT NOT NULL DEFAULT '#6B7280',
  position    INTEGER NOT NULL DEFAULT 0,
  is_default  BOOLEAN NOT NULL DEFAULT FALSE,
  is_done     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, name)
);

CREATE INDEX idx_issue_statuses_project ON issue_statuses(project_id);

-- SPRINTS
CREATE TABLE sprints (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  goal          TEXT,
  status        sprint_status NOT NULL DEFAULT 'planning',
  start_date    DATE,
  end_date      DATE,
  completed_at  TIMESTAMPTZ,
  created_by    UUID REFERENCES profiles(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sprints_project ON sprints(project_id);

-- LABELS
CREATE TABLE labels (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  color       TEXT NOT NULL DEFAULT '#6B7280',
  UNIQUE(project_id, name)
);

-- ISSUES
CREATE TABLE issues (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  issue_key      TEXT NOT NULL UNIQUE,
  project_id     UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  sprint_id      UUID REFERENCES sprints(id) ON DELETE SET NULL,
  parent_id      UUID REFERENCES issues(id) ON DELETE SET NULL,
  status_id      UUID NOT NULL REFERENCES issue_statuses(id),
  type           issue_type NOT NULL DEFAULT 'task',
  priority       issue_priority NOT NULL DEFAULT 'medium',
  title          TEXT NOT NULL,
  description    TEXT,
  story_points   INTEGER CHECK (story_points >= 0),
  assignee_id    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reporter_id    UUID NOT NULL REFERENCES profiles(id),
  start_date     DATE,
  due_date       DATE,
  resolved_at    TIMESTAMPTZ,
  position       FLOAT NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  search_vector  TSVECTOR
);

CREATE INDEX idx_issues_project  ON issues(project_id);
CREATE INDEX idx_issues_sprint   ON issues(sprint_id);
CREATE INDEX idx_issues_assignee ON issues(assignee_id);
CREATE INDEX idx_issues_status   ON issues(status_id);
CREATE INDEX idx_issues_parent   ON issues(parent_id);
CREATE INDEX idx_issues_search   ON issues USING GIN(search_vector);
CREATE INDEX idx_issues_key      ON issues(issue_key);

-- ISSUE LABELS
CREATE TABLE issue_labels (
  issue_id  UUID NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  label_id  UUID NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
  PRIMARY KEY(issue_id, label_id)
);

-- COMMENTS
CREATE TABLE comments (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  issue_id    UUID NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  author_id   UUID NOT NULL REFERENCES profiles(id),
  body        TEXT NOT NULL,
  edited_at   TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_comments_issue ON comments(issue_id);

-- COMMENT MENTIONS
CREATE TABLE comment_mentions (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  comment_id        UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  mentioned_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  UNIQUE(comment_id, mentioned_user_id)
);

-- ACTIVITY LOG
CREATE TABLE activity_log (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  issue_id    UUID NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  actor_id    UUID NOT NULL REFERENCES profiles(id),
  action      TEXT NOT NULL,
  old_value   JSONB,
  new_value   JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_activity_log_issue   ON activity_log(issue_id);
CREATE INDEX idx_activity_log_created ON activity_log(created_at DESC);

-- WATCHERS
CREATE TABLE issue_watchers (
  issue_id    UUID NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY(issue_id, user_id)
);

-- ATTACHMENTS
CREATE TABLE attachments (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  issue_id              UUID NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  uploaded_by           UUID NOT NULL REFERENCES profiles(id),
  file_name             TEXT NOT NULL,
  file_size             BIGINT,
  mime_type             TEXT,
  onedrive_item_id      TEXT NOT NULL,
  onedrive_web_url      TEXT NOT NULL,
  onedrive_download_url TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_attachments_issue ON attachments(issue_id);

-- NOTIFICATIONS
CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type        notification_type NOT NULL,
  title       TEXT NOT NULL,
  body        TEXT,
  issue_id    UUID REFERENCES issues(id) ON DELETE SET NULL,
  project_id  UUID REFERENCES projects(id) ON DELETE SET NULL,
  actor_id    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  is_read     BOOLEAN NOT NULL DEFAULT FALSE,
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user   ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;

-- TEMPLATES
CREATE TABLE templates (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name              TEXT NOT NULL,
  description       TEXT,
  project_type      project_type,
  onedrive_item_id  TEXT NOT NULL,
  onedrive_web_url  TEXT NOT NULL,
  created_by        UUID REFERENCES profiles(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- SPRINT BURNDOWN SNAPSHOTS
CREATE TABLE sprint_burndown (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sprint_id        UUID NOT NULL REFERENCES sprints(id) ON DELETE CASCADE,
  snapshot_date    DATE NOT NULL,
  remaining_points INTEGER NOT NULL DEFAULT 0,
  completed_points INTEGER NOT NULL DEFAULT 0,
  total_points     INTEGER NOT NULL DEFAULT 0,
  UNIQUE(sprint_id, snapshot_date)
);

CREATE INDEX idx_burndown_sprint ON sprint_burndown(sprint_id);

-- SPRINT VELOCITY
CREATE TABLE sprint_velocity (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sprint_id        UUID NOT NULL UNIQUE REFERENCES sprints(id) ON DELETE CASCADE,
  project_id       UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  committed_points INTEGER NOT NULL DEFAULT 0,
  completed_points INTEGER NOT NULL DEFAULT 0,
  completed_at     DATE NOT NULL
);

CREATE INDEX idx_velocity_project ON sprint_velocity(project_id);

-- ISSUE COUNTERS
CREATE TABLE issue_counters (
  project_id     UUID PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
  current_value  INTEGER NOT NULL DEFAULT 0
);

-- PROJECT SUMMARIES VIEW
CREATE VIEW project_summaries AS
SELECT
  p.id, p.name, p.key, p.type, p.client_name, p.semester, p.is_archived,
  COUNT(DISTINCT i.id) FILTER (WHERE i.resolved_at IS NULL) AS open_issues,
  COUNT(DISTINCT i.id) AS total_issues,
  COUNT(DISTINCT pm.user_id) AS member_count,
  MAX(s.end_date) AS current_sprint_end
FROM projects p
LEFT JOIN issues i ON i.project_id = p.id
LEFT JOIN project_members pm ON pm.project_id = p.id
LEFT JOIN sprints s ON s.project_id = p.id AND s.status = 'active'
GROUP BY p.id;
