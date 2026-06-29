export type UserRole =
  | 'new_analyst'
  | 'senior_analyst'
  | 'project_manager'
  | 'consulting_manager'
  | 'vp_internal'
  | 'vp_external'
  | 'vp_operations'
  | 'president'

export type ProjectType = 'internal' | 'external'
export type ProjectTerm = 'fall' | 'winter'
export type IssueType = 'epic' | 'story' | 'task' | 'subtask'
export type IssuePriority = 'critical' | 'high' | 'medium' | 'low'
export type SprintStatus = 'planning' | 'active' | 'completed'
export type NotificationType =
  | 'mention'
  | 'assignment'
  | 'comment'
  | 'status_change'
  | 'sprint_start'
  | 'sprint_end'
  | 'watcher_update'
  | 'due_date_reminder'

export interface Profile {
  id: string
  email: string
  full_name: string
  avatar_url: string | null
  role: UserRole
  is_admin: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Project {
  id: string
  key: string
  name: string
  description: string | null
  type: ProjectType
  client_name: string | null
  semester: string | null
  term: ProjectTerm | null
  year: number | null
  is_archived: boolean
  owner_id: string | null
  onedrive_folder_id: string | null
  created_at: string
  updated_at: string
  // joined
  owner?: Profile
  members?: ProjectMember[]
}

export interface ProjectMember {
  id: string
  project_id: string
  user_id: string
  role: UserRole
  joined_at: string
  profile?: Profile
}

export interface IssueStatus {
  id: string
  project_id: string
  name: string
  color: string
  position: number
  is_default: boolean
  is_done: boolean
  created_at: string
}

export interface Sprint {
  id: string
  project_id: string
  name: string
  goal: string | null
  status: SprintStatus
  start_date: string | null
  end_date: string | null
  completed_at: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface Label {
  id: string
  project_id: string
  name: string
  color: string
}

export interface Issue {
  id: string
  issue_key: string
  project_id: string
  sprint_id: string | null
  parent_id: string | null
  status_id: string
  type: IssueType
  priority: IssuePriority
  title: string
  description: string | null
  story_points: number | null
  assignee_id: string | null
  reporter_id: string
  start_date: string | null
  due_date: string | null
  resolved_at: string | null
  position: number
  created_at: string
  updated_at: string
  // joined
  status?: IssueStatus
  assignee?: Profile
  reporter?: Profile
  labels?: Label[]
  children?: Issue[]
  sprint?: Sprint
  _count?: { comments: number; attachments: number }
}

export interface Comment {
  id: string
  issue_id: string
  author_id: string
  body: string
  edited_at: string | null
  created_at: string
  updated_at: string
  author?: Profile
}

export interface ActivityEntry {
  id: string
  issue_id: string
  actor_id: string
  action: string
  old_value: Record<string, unknown> | null
  new_value: Record<string, unknown> | null
  created_at: string
  actor?: Profile
}

export interface Attachment {
  id: string
  issue_id: string
  uploaded_by: string
  file_name: string
  file_size: number | null
  mime_type: string | null
  onedrive_item_id: string
  onedrive_web_url: string
  onedrive_download_url: string | null
  created_at: string
  uploader?: Profile
}

export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  body: string | null
  issue_id: string | null
  project_id: string | null
  actor_id: string | null
  is_read: boolean
  read_at: string | null
  created_at: string
  issue?: Pick<Issue, 'id' | 'issue_key' | 'title'>
  project?: Pick<Project, 'id' | 'name' | 'key'>
  actor?: Pick<Profile, 'id' | 'full_name' | 'avatar_url'>
}

export interface Deliverable {
  id: string
  project_id: string
  title: string
  description: string | null
  link_url: string | null
  onedrive_item_id: string | null
  onedrive_web_url: string | null
  due_date: string | null
  responsible_id: string | null
  is_complete: boolean
  created_by: string
  created_at: string
  updated_at: string
  responsible?: Profile
}

export interface Template {
  id: string
  name: string
  description: string | null
  project_type: ProjectType | null
  onedrive_item_id: string
  onedrive_web_url: string
  created_by: string | null
  created_at: string
  updated_at: string
  creator?: Profile
}

export interface SprintBurndown {
  snapshot_date: string
  remaining_points: number
  completed_points: number
  total_points: number
}

export interface SprintVelocity {
  sprint_id: string
  committed_points: number
  completed_points: number
  completed_at: string
  sprint?: Sprint
}

export interface ProjectSummary {
  id: string
  name: string
  key: string
  type: ProjectType
  client_name: string | null
  semester: string | null
  term: ProjectTerm | null
  year: number | null
  is_archived: boolean
  open_issues: number
  total_issues: number
  member_count: number
  current_sprint_end: string | null
}

const TERM_CODE: Record<ProjectTerm, string> = { fall: 'FA', winter: 'WN' }

export function semesterCode(term: ProjectTerm | null, year: number | null): string | null {
  if (!term || !year) return null
  return `${TERM_CODE[term]}${String(year).slice(-2)}`
}

export const ROLE_HIERARCHY: UserRole[] = [
  'new_analyst',
  'senior_analyst',
  'project_manager',
  'consulting_manager',
  'vp_internal',
  'vp_external',
  'vp_operations',
  'president',
]

export const ROLE_LABELS: Record<UserRole, string> = {
  new_analyst: 'New Analyst',
  senior_analyst: 'Senior Analyst',
  project_manager: 'Project Manager',
  consulting_manager: 'Consulting Manager',
  vp_internal: 'VP Internal',
  vp_external: 'VP External',
  vp_operations: 'VP Operations',
  president: 'President',
}
