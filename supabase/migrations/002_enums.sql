CREATE TYPE user_role AS ENUM (
  'new_analyst',
  'senior_analyst',
  'project_manager',
  'consulting_manager',
  'vp_internal',
  'vp_external',
  'vp_operations',
  'president'
);

CREATE TYPE project_type AS ENUM (
  'internal',
  'external'
);

CREATE TYPE issue_type AS ENUM (
  'epic',
  'story',
  'task',
  'subtask'
);

CREATE TYPE issue_priority AS ENUM (
  'critical',
  'high',
  'medium',
  'low'
);

CREATE TYPE notification_type AS ENUM (
  'mention',
  'assignment',
  'comment',
  'status_change',
  'sprint_start',
  'sprint_end',
  'watcher_update',
  'due_date_reminder'
);

CREATE TYPE sprint_status AS ENUM (
  'planning',
  'active',
  'completed'
);
