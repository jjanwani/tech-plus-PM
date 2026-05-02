-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email NOT LIKE '%@umich.edu' THEN
    RAISE EXCEPTION 'Only @umich.edu email addresses are allowed';
  END IF;
  INSERT INTO profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Update search vector on issue upsert
CREATE OR REPLACE FUNCTION update_issue_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.issue_key, '')), 'A');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER issues_search_vector_update
  BEFORE INSERT OR UPDATE ON issues
  FOR EACH ROW EXECUTE FUNCTION update_issue_search_vector();

-- Generate issue key atomically
CREATE OR REPLACE FUNCTION generate_issue_key(p_project_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_counter     INTEGER;
  v_project_key TEXT;
BEGIN
  INSERT INTO issue_counters (project_id, current_value)
  VALUES (p_project_id, 1)
  ON CONFLICT (project_id) DO UPDATE
    SET current_value = issue_counters.current_value + 1
  RETURNING current_value INTO v_counter;

  SELECT key INTO v_project_key FROM projects WHERE id = p_project_id;
  RETURN v_project_key || '-' || v_counter::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Activity log trigger
CREATE OR REPLACE FUNCTION log_issue_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status_id IS DISTINCT FROM NEW.status_id THEN
    INSERT INTO activity_log (issue_id, actor_id, action, old_value, new_value)
    VALUES (NEW.id, auth.uid(), 'status_changed',
      jsonb_build_object('status_id', OLD.status_id),
      jsonb_build_object('status_id', NEW.status_id));
  END IF;

  IF OLD.assignee_id IS DISTINCT FROM NEW.assignee_id THEN
    INSERT INTO activity_log (issue_id, actor_id, action, old_value, new_value)
    VALUES (NEW.id, auth.uid(), 'assignee_changed',
      jsonb_build_object('assignee_id', OLD.assignee_id),
      jsonb_build_object('assignee_id', NEW.assignee_id));
  END IF;

  IF OLD.priority IS DISTINCT FROM NEW.priority THEN
    INSERT INTO activity_log (issue_id, actor_id, action, old_value, new_value)
    VALUES (NEW.id, auth.uid(), 'priority_changed',
      jsonb_build_object('priority', OLD.priority),
      jsonb_build_object('priority', NEW.priority));
  END IF;

  IF OLD.sprint_id IS DISTINCT FROM NEW.sprint_id THEN
    INSERT INTO activity_log (issue_id, actor_id, action, old_value, new_value)
    VALUES (NEW.id, auth.uid(), 'sprint_changed',
      jsonb_build_object('sprint_id', OLD.sprint_id),
      jsonb_build_object('sprint_id', NEW.sprint_id));
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER issue_activity_logger
  AFTER UPDATE ON issues
  FOR EACH ROW EXECUTE FUNCTION log_issue_activity();

-- Seed default statuses for new project
CREATE OR REPLACE FUNCTION seed_default_statuses(p_project_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO issue_statuses (project_id, name, color, position, is_default, is_done) VALUES
    (p_project_id, 'Backlog',     '#6B7280', 0, FALSE, FALSE),
    (p_project_id, 'To Do',       '#3B82F6', 1, TRUE,  FALSE),
    (p_project_id, 'In Progress', '#F59E0B', 2, FALSE, FALSE),
    (p_project_id, 'In Review',   '#8B5CF6', 3, FALSE, FALSE),
    (p_project_id, 'Done',        '#10B981', 4, FALSE, TRUE);

  INSERT INTO issue_counters (project_id, current_value)
  VALUES (p_project_id, 0)
  ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Compute burndown snapshot
CREATE OR REPLACE FUNCTION compute_burndown_snapshot(p_sprint_id UUID)
RETURNS VOID AS $$
DECLARE
  v_remaining     INTEGER;
  v_completed     INTEGER;
  v_total         INTEGER;
  v_done_statuses UUID[];
BEGIN
  SELECT ARRAY(
    SELECT id FROM issue_statuses
    WHERE project_id = (SELECT project_id FROM sprints WHERE id = p_sprint_id)
      AND is_done = TRUE
  ) INTO v_done_statuses;

  SELECT
    COALESCE(SUM(CASE WHEN status_id != ALL(v_done_statuses) THEN COALESCE(story_points,0) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN status_id = ANY(v_done_statuses) THEN COALESCE(story_points,0) ELSE 0 END), 0),
    COALESCE(SUM(COALESCE(story_points,0)), 0)
  INTO v_remaining, v_completed, v_total
  FROM issues WHERE sprint_id = p_sprint_id;

  INSERT INTO sprint_burndown (sprint_id, snapshot_date, remaining_points, completed_points, total_points)
  VALUES (p_sprint_id, CURRENT_DATE, v_remaining, v_completed, v_total)
  ON CONFLICT (sprint_id, snapshot_date) DO UPDATE
    SET remaining_points = EXCLUDED.remaining_points,
        completed_points = EXCLUDED.completed_points,
        total_points     = EXCLUDED.total_points;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Compute velocity on sprint completion
CREATE OR REPLACE FUNCTION compute_sprint_velocity(p_sprint_id UUID)
RETURNS VOID AS $$
DECLARE
  v_project_id    UUID;
  v_committed     INTEGER;
  v_completed     INTEGER;
  v_done_statuses UUID[];
BEGIN
  SELECT project_id INTO v_project_id FROM sprints WHERE id = p_sprint_id;

  SELECT ARRAY(
    SELECT id FROM issue_statuses
    WHERE project_id = v_project_id AND is_done = TRUE
  ) INTO v_done_statuses;

  SELECT
    COALESCE(SUM(COALESCE(story_points,0)), 0),
    COALESCE(SUM(CASE WHEN status_id = ANY(v_done_statuses) THEN COALESCE(story_points,0) ELSE 0 END), 0)
  INTO v_committed, v_completed
  FROM issues WHERE sprint_id = p_sprint_id;

  INSERT INTO sprint_velocity (sprint_id, project_id, committed_points, completed_points, completed_at)
  VALUES (p_sprint_id, v_project_id, v_committed, v_completed, CURRENT_DATE)
  ON CONFLICT (sprint_id) DO UPDATE
    SET completed_points = EXCLUDED.completed_points,
        committed_points = EXCLUDED.committed_points;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- updated_at triggers
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_profiles  BEFORE UPDATE ON profiles  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_projects  BEFORE UPDATE ON projects  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_issues    BEFORE UPDATE ON issues    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_comments  BEFORE UPDATE ON comments  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_sprints   BEFORE UPDATE ON sprints   FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_templates BEFORE UPDATE ON templates FOR EACH ROW EXECUTE FUNCTION set_updated_at();
