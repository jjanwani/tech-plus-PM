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

export interface PendingInvite {
  id: string
  email: string
  project_id: string | null
  role: UserRole | null
  is_admin: boolean | null
  invited_by: string
  created_at: string
  inviter?: Profile
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

export type AdminFileCategory =
  | 'receipts'
  | 'powerpoints'
  | 'photos_events'
  | 'forms_applications'
  | 'flyers'
  | 'excel_sheets_trackers'
  | 'emails'

export const ADMIN_FILE_CATEGORIES: AdminFileCategory[] = [
  'receipts',
  'powerpoints',
  'photos_events',
  'forms_applications',
  'flyers',
  'excel_sheets_trackers',
  'emails',
]

export const ADMIN_FILE_CATEGORY_LABELS: Record<AdminFileCategory, string> = {
  receipts: 'Receipts',
  powerpoints: 'Powerpoints',
  photos_events: 'Photos/Events',
  forms_applications: 'Forms/Applications',
  flyers: 'Flyers',
  excel_sheets_trackers: 'Excel Sheets & Trackers',
  emails: 'Emails',
}

export interface AdminFile {
  id: string
  category: AdminFileCategory
  file_name: string
  file_url: string
  uploaded_by: string | null
  created_at: string
  uploader?: Profile
}

export type ClientApplicationStatus =
  | 'initial_outreach'
  | 'applied'
  | 'interview_set_up'
  | 'interview_complete'
  | 'offer_sent'
  | 'offer_accepted'

export const CLIENT_STATUS_ORDER: ClientApplicationStatus[] = [
  'initial_outreach',
  'applied',
  'interview_set_up',
  'interview_complete',
  'offer_sent',
  'offer_accepted',
]

export const CLIENT_STATUS_LABELS: Record<ClientApplicationStatus, string> = {
  initial_outreach: 'Initial Outreach',
  applied: 'Applied',
  interview_set_up: 'Interview Set Up',
  interview_complete: 'Interview Complete',
  offer_sent: 'Offer Sent',
  offer_accepted: 'Offer Accepted',
}

export interface Client {
  id: string
  company: string
  type: ProjectType
  status: ClientApplicationStatus
  industry: string | null
  description: string | null
  size: string | null
  location: string | null
  contact_name: string | null
  contact_email: string | null
  phone_number: string | null
  assigned_manager_id: string | null
  date_contacted: string | null
  source: string | null
  notes: string | null
  created_by: string
  created_at: string
  updated_at: string
  assigned_manager?: Profile
}

export interface Deliverable {
  id: string
  project_id: string
  title: string
  description: string | null
  link_url: string | null
  file_path: string | null
  file_name: string | null
  file_url: string | null
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
  file_path: string
  file_name: string
  file_url: string
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
