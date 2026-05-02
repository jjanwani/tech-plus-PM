'use client'

import { useState } from 'react'
import * as Tabs from '@radix-ui/react-tabs'
import { toast } from 'sonner'
import { cn } from '@/lib/utils/cn'
import { formatDate } from '@/lib/utils/date'
import { IssueTypeIcon } from './issue-type-icon'
import { PriorityBadge } from './priority-badge'
import { StatusBadge } from './status-badge'
import { AssigneePicker } from './assignee-picker'
import { IssueComments } from './issue-comments'
import { ActivityLog } from './activity-log'
import { AttachmentList } from './attachment-list'
import { WatcherList } from './watcher-list'
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

type ProfileLookup = Record<string, Profile>

interface IssueDetailProps {
  issue: Issue
  project: Project
  statuses: IssueStatus[]
  members: ProjectMember[]
  sprints: Sprint[]
  labels: Label[]
  comments: Comment[]
  activityEntries: ActivityEntry[]
  attachments: Attachment[]
  watchers: Profile[]
  currentUser: Profile
}

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
}

async function patchIssue(issueId: string, patch: Record<string, unknown>) {
  const res = await fetch(`/api/issues/${issueId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error ?? 'Failed to update issue')
  }
  return res.json()
}

export function IssueDetail({
  issue,
  project: _project,
  statuses,
  members,
  sprints,
  labels: allLabels,
  comments,
  activityEntries,
  attachments,
  watchers,
  currentUser,
}: IssueDetailProps) {
  const [currentIssue, setCurrentIssue] = useState<Issue>(issue)
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState(issue.title)
  const [editingDesc, setEditingDesc] = useState(false)
  const [descDraft, setDescDraft] = useState(issue.description ?? '')
  const [saving, setSaving] = useState(false)

  const membersLookup: ProfileLookup = Object.fromEntries(
    members.map((m) => [m.user_id, m.profile as Profile]).filter(([, p]) => p)
  )

  async function handleFieldChange(patch: Record<string, unknown>) {
    setSaving(true)
    try {
      const updated = await patchIssue(currentIssue.id, patch)
      setCurrentIssue((prev) => ({ ...prev, ...updated }))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setSaving(false)
    }
  }

  async function saveTitle() {
    if (titleDraft.trim() === currentIssue.title) { setEditingTitle(false); return }
    if (!titleDraft.trim()) return
    await handleFieldChange({ title: titleDraft.trim() })
    setEditingTitle(false)
  }

  async function saveDesc() {
    if (descDraft === (currentIssue.description ?? '')) { setEditingDesc(false); return }
    await handleFieldChange({ description: descDraft || null })
    setEditingDesc(false)
  }

  const currentLabels = currentIssue.labels ?? []
  const currentStatus = statuses.find((s) => s.id === currentIssue.status_id)

  async function toggleLabel(labelId: string) {
    const existing = currentLabels.map((l) => l.id)
    const labelIds = existing.includes(labelId)
      ? existing.filter((id) => id !== labelId)
      : [...existing, labelId]
    await handleFieldChange({ label_ids: labelIds })
    setCurrentIssue((prev) => ({
      ...prev,
      labels: allLabels.filter((l) => labelIds.includes(l.id)),
    }))
  }

  const inputClass = 'w-full px-2 py-1 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f] bg-white'
  const sidebarLabelClass = 'text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block'

  return (
    <div className="flex h-full overflow-hidden">
      {/* ---- Left panel (2/3) ---- */}
      <div className="flex-1 min-w-0 overflow-y-auto p-6 border-r border-gray-200">
        {/* Issue key + type */}
        <div className="flex items-center gap-2 mb-3">
          <IssueTypeIcon type={currentIssue.type} />
          <span className="text-xs font-mono text-gray-400 font-medium">{currentIssue.issue_key}</span>
          {saving && <span className="text-xs text-gray-400 italic">Saving...</span>}
        </div>

        {/* Title */}
        {editingTitle ? (
          <div className="mb-4">
            <input
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveTitle()
                if (e.key === 'Escape') { setEditingTitle(false); setTitleDraft(currentIssue.title) }
              }}
              className="w-full text-xl font-bold text-gray-900 border-b-2 border-[#1e3a5f] focus:outline-none bg-transparent pb-1"
              autoFocus
            />
          </div>
        ) : (
          <h1
            className="text-xl font-bold text-gray-900 mb-4 cursor-pointer hover:text-[#1e3a5f] transition-colors leading-snug"
            onClick={() => { setEditingTitle(true); setTitleDraft(currentIssue.title) }}
            title="Click to edit title"
          >
            {currentIssue.title}
          </h1>
        )}

        {/* Labels */}
        {allLabels.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {allLabels.map((label) => {
              const active = currentLabels.some((l) => l.id === label.id)
              return (
                <button
                  key={label.id}
                  onClick={() => toggleLabel(label.id)}
                  className={cn(
                    'px-2.5 py-0.5 rounded-full text-xs font-medium border transition-all',
                    active ? 'text-white border-transparent' : 'text-gray-500 border-gray-200 hover:border-gray-300 bg-white'
                  )}
                  style={active ? { background: label.color, borderColor: label.color } : undefined}
                >
                  {label.name}
                </button>
              )
            })}
          </div>
        )}

        {/* Description */}
        <div className="mb-6">
          <label className={sidebarLabelClass}>Description</label>
          {editingDesc ? (
            <div>
              <textarea
                value={descDraft}
                onChange={(e) => setDescDraft(e.target.value)}
                onBlur={saveDesc}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') { setEditingDesc(false); setDescDraft(currentIssue.description ?? '') }
                }}
                rows={5}
                className="w-full px-3 py-2 border border-[#1e3a5f] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 resize-none"
                autoFocus
              />
              <div className="flex gap-2 mt-2">
                <button onClick={saveDesc} className="px-3 py-1 bg-[#1e3a5f] text-white text-xs rounded-lg font-medium hover:bg-[#2d5a8e]">Save</button>
                <button onClick={() => { setEditingDesc(false); setDescDraft(currentIssue.description ?? '') }} className="px-3 py-1 border border-gray-200 text-gray-600 text-xs rounded-lg font-medium hover:bg-gray-50">Cancel</button>
              </div>
            </div>
          ) : (
            <div
              onClick={() => { setEditingDesc(true); setDescDraft(currentIssue.description ?? '') }}
              className="cursor-pointer rounded-lg px-3 py-2 hover:bg-gray-50 border border-transparent hover:border-gray-200 transition-all min-h-[60px]"
            >
              {currentIssue.description ? (
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{currentIssue.description}</p>
              ) : (
                <p className="text-sm text-gray-400 italic">Click to add a description...</p>
              )}
            </div>
          )}
        </div>

        {/* Child issues */}
        {currentIssue.children && currentIssue.children.length > 0 && (
          <div className="mb-6">
            <label className={sidebarLabelClass}>Child Issues ({currentIssue.children.length})</label>
            <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
              {currentIssue.children.map((child) => (
                <a
                  key={child.id}
                  href={`/projects/${child.project_id}/issues/${child.id}`}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 transition-colors"
                >
                  <IssueTypeIcon type={child.type} />
                  <span className="text-xs font-mono text-gray-400">{child.issue_key}</span>
                  <span className="text-sm text-gray-700 flex-1 truncate">{child.title}</span>
                  {child.status && (
                    <StatusBadge status={child.status} />
                  )}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Tabs: Comments | Activity */}
        <Tabs.Root defaultValue="comments">
          <Tabs.List className="flex border-b border-gray-200 mb-4">
            {['comments', 'activity'].map((tab) => (
              <Tabs.Trigger
                key={tab}
                value={tab}
                className={cn(
                  'px-4 py-2 text-sm font-medium capitalize border-b-2 -mb-px transition-colors',
                  'data-[state=active]:border-[#1e3a5f] data-[state=active]:text-[#1e3a5f]',
                  'data-[state=inactive]:border-transparent data-[state=inactive]:text-gray-500 data-[state=inactive]:hover:text-gray-700'
                )}
              >
                {tab}
              </Tabs.Trigger>
            ))}
          </Tabs.List>

          <Tabs.Content value="comments">
            <IssueComments
              issueId={currentIssue.id}
              initialComments={comments}
              members={members}
              currentUserId={currentUser.id}
            />
          </Tabs.Content>

          <Tabs.Content value="activity">
            <ActivityLog
              issueId={currentIssue.id}
              initialEntries={activityEntries}
              statuses={statuses}
              members={membersLookup}
            />
          </Tabs.Content>
        </Tabs.Root>
      </div>

      {/* ---- Right panel (1/3) sidebar ---- */}
      <div className="w-72 flex-shrink-0 overflow-y-auto p-5 space-y-5 bg-gray-50/40">

        {/* Status */}
        <div>
          <label className={sidebarLabelClass}>Status</label>
          <select
            value={currentIssue.status_id}
            onChange={(e) => handleFieldChange({ status_id: e.target.value })}
            className={inputClass}
          >
            {statuses.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          {currentStatus && (
            <div className="mt-1.5">
              <StatusBadge status={currentStatus} />
            </div>
          )}
        </div>

        {/* Priority */}
        <div>
          <label className={sidebarLabelClass}>Priority</label>
          <div className="flex items-center gap-2 mb-1">
            <PriorityBadge priority={currentIssue.priority} />
          </div>
          <select
            value={currentIssue.priority}
            onChange={(e) => handleFieldChange({ priority: e.target.value })}
            className={inputClass}
          >
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        {/* Assignee */}
        <div>
          <label className={sidebarLabelClass}>Assignee</label>
          <AssigneePicker
            members={members}
            value={currentIssue.assignee_id}
            onChange={(id) => handleFieldChange({ assignee_id: id })}
          />
        </div>

        {/* Reporter */}
        <div>
          <label className={sidebarLabelClass}>Reporter</label>
          <div className="flex items-center gap-2 px-2 py-1.5">
            {currentIssue.reporter?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={currentIssue.reporter.avatar_url}
                alt={currentIssue.reporter.full_name}
                className="w-5 h-5 rounded-full"
              />
            ) : (
              <div className="w-5 h-5 rounded-full bg-gray-300 text-gray-600 flex items-center justify-center text-xs">
                {currentIssue.reporter ? getInitials(currentIssue.reporter.full_name) : '?'}
              </div>
            )}
            <span className="text-sm text-gray-700">{currentIssue.reporter?.full_name ?? '—'}</span>
          </div>
        </div>

        {/* Sprint */}
        <div>
          <label className={sidebarLabelClass}>Sprint</label>
          <select
            value={currentIssue.sprint_id ?? ''}
            onChange={(e) => handleFieldChange({ sprint_id: e.target.value || null })}
            className={inputClass}
          >
            <option value="">No Sprint</option>
            {sprints.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        {/* Story Points */}
        <div>
          <label className={sidebarLabelClass}>Story Points</label>
          <input
            type="number"
            min={0}
            max={100}
            value={currentIssue.story_points ?? ''}
            onChange={(e) => {
              const val = e.target.value ? Number(e.target.value) : null
              setCurrentIssue((prev) => ({ ...prev, story_points: val }))
            }}
            onBlur={(e) => {
              const val = e.target.value ? Number(e.target.value) : null
              handleFieldChange({ story_points: val })
            }}
            className={inputClass}
            placeholder="—"
          />
        </div>

        {/* Start Date */}
        <div>
          <label className={sidebarLabelClass}>Start Date</label>
          <input
            type="date"
            value={currentIssue.start_date ?? ''}
            onChange={(e) => handleFieldChange({ start_date: e.target.value || null })}
            className={inputClass}
          />
        </div>

        {/* Due Date */}
        <div>
          <label className={sidebarLabelClass}>Due Date</label>
          <input
            type="date"
            value={currentIssue.due_date ?? ''}
            onChange={(e) => handleFieldChange({ due_date: e.target.value || null })}
            className={inputClass}
          />
        </div>

        {/* Created / Updated */}
        <div className="text-xs text-gray-400 space-y-0.5 pt-1 border-t border-gray-200">
          <p>Created {formatDate(currentIssue.created_at)}</p>
          <p>Updated {formatDate(currentIssue.updated_at)}</p>
        </div>

        <div className="border-t border-gray-200 pt-4 space-y-4">
          {/* Attachments */}
          <AttachmentList
            issueId={currentIssue.id}
            initialAttachments={attachments}
            currentUserId={currentUser.id}
          />

          {/* Watchers */}
          <WatcherList
            issueId={currentIssue.id}
            initialWatchers={watchers}
            currentUserId={currentUser.id}
          />
        </div>
      </div>
    </div>
  )
}
