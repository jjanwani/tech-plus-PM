import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { IssueDetail } from '@/components/issues/issue-detail'
import type {
  Issue,
  Project,
  IssueStatus,
  ProjectMember,
  Sprint,
  Label,
  Comment,
  ActivityEntry,
  Attachment,
  Profile,
} from '@/types'

export default async function IssueDetailPage({
  params,
}: {
  params: Promise<{ projectId: string; issueId: string }>
}) {
  const { projectId, issueId } = await params
  const supabase = await getSupabaseServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [
    { data: currentUserProfile },
    { data: issue },
    { data: project },
    { data: statuses },
    { data: members },
    { data: sprints },
    { data: labels },
    { data: comments },
    { data: activityEntries },
    { data: attachments },
    { data: watchers },
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),

    supabase
      .from('issues')
      .select(
        `*,
        status:issue_statuses(id,name,color,is_done,position),
        assignee:profiles!assignee_id(id,full_name,avatar_url,email,role,is_admin,is_active,created_at,updated_at),
        reporter:profiles!reporter_id(id,full_name,avatar_url,email,role,is_admin,is_active,created_at,updated_at),
        labels:issue_labels(label:labels(id,name,color)),
        children:issues!parent_id(id,issue_key,title,type,status_id,priority,project_id,status:issue_statuses(id,name,color,is_done)),
        sprint:sprints(id,name,status)`
      )
      .eq('id', issueId)
      .single(),

    supabase.from('projects').select('*').eq('id', projectId).single(),

    supabase
      .from('issue_statuses')
      .select('*')
      .eq('project_id', projectId)
      .order('position'),

    supabase
      .from('project_members')
      .select('*, profile:profiles(id,full_name,avatar_url,email,role,is_admin,is_active,created_at,updated_at)')
      .eq('project_id', projectId),

    supabase
      .from('sprints')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at'),

    supabase.from('labels').select('*').eq('project_id', projectId),

    supabase
      .from('comments')
      .select('*, author:profiles!author_id(id,full_name,avatar_url,email,role,is_admin,is_active,created_at,updated_at)')
      .eq('issue_id', issueId)
      .order('created_at'),

    supabase
      .from('activity_log')
      .select('*, actor:profiles!actor_id(id,full_name,avatar_url,email,role,is_admin,is_active,created_at,updated_at)')
      .eq('issue_id', issueId)
      .order('created_at', { ascending: false }),

    supabase
      .from('attachments')
      .select('*, uploader:profiles!uploaded_by(id,full_name,avatar_url)')
      .eq('issue_id', issueId)
      .order('created_at'),

    supabase
      .from('issue_watchers')
      .select('profile:profiles(id,full_name,avatar_url,email,role,is_admin,is_active,created_at,updated_at)')
      .eq('issue_id', issueId),
  ])

  if (!issue) notFound()
  if (!project) notFound()

  // Normalize
  const normalizedIssue: Issue = {
    ...issue,
    labels: ((issue.labels ?? []) as Array<{ label: Label }>).map((il) => il.label),
  }

  const watcherProfiles: Profile[] = (watchers ?? [])
    .map((w: { profile: unknown }) => w.profile as Profile)
    .filter(Boolean)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Back link bar */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-gray-200 bg-white flex-shrink-0">
        <Link
          href={`/projects/${projectId}/board`}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#1e3a5f] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Board
        </Link>
      </div>

      {/* Issue detail */}
      <div className="flex-1 overflow-hidden">
        <IssueDetail
          issue={normalizedIssue}
          project={project as Project}
          statuses={(statuses ?? []) as IssueStatus[]}
          members={(members ?? []) as ProjectMember[]}
          sprints={(sprints ?? []) as Sprint[]}
          labels={(labels ?? []) as Label[]}
          comments={(comments ?? []) as Comment[]}
          activityEntries={(activityEntries ?? []) as ActivityEntry[]}
          attachments={(attachments ?? []) as Attachment[]}
          watchers={watcherProfiles}
          currentUser={currentUserProfile as Profile}
        />
      </div>
    </div>
  )
}
