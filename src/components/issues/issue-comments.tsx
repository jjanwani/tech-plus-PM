'use client'

import { useState, useEffect, useCallback } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { timeAgo } from '@/lib/utils/date'
import { renderMentions } from '@/lib/utils/mentions'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { CommentEditor } from './comment-editor'
import type { Comment, ProjectMember, Profile } from '@/types'

interface IssueCommentsProps {
  issueId: string
  initialComments: Comment[]
  members: ProjectMember[]
  currentUserId: string
}

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
}

export function IssueComments({ issueId, initialComments, members, currentUserId }: IssueCommentsProps) {
  const [comments, setComments] = useState<Comment[]>(initialComments)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editBody, setEditBody] = useState('')

  const memberProfiles: Profile[] = members.map((m) => m.profile).filter(Boolean) as Profile[]

  const refreshComments = useCallback(async () => {
    const res = await fetch(`/api/issues/${issueId}/comments`)
    if (res.ok) {
      const data = await res.json()
      setComments(data)
    }
  }, [issueId])

  useEffect(() => {
    const supabase = getSupabaseBrowserClient()
    const channel = supabase
      .channel(`issue-comments-${issueId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comments',
          filter: `issue_id=eq.${issueId}`,
        },
        () => { refreshComments() }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [issueId, refreshComments])

  async function handleDelete(commentId: string) {
    try {
      const res = await fetch(`/api/issues/${issueId}/comments/${commentId}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete')
      setComments((prev) => prev.filter((c) => c.id !== commentId))
      toast.success('Comment deleted')
    } catch {
      toast.error('Failed to delete comment')
    }
  }

  async function handleEdit(commentId: string) {
    try {
      const res = await fetch(`/api/issues/${issueId}/comments/${commentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: editBody }),
      })
      if (!res.ok) throw new Error('Failed to update')
      const updated = await res.json()
      setComments((prev) => prev.map((c) => (c.id === commentId ? updated : c)))
      setEditingId(null)
      toast.success('Comment updated')
    } catch {
      toast.error('Failed to update comment')
    }
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-700">
        Comments ({comments.length})
      </h3>

      {comments.length === 0 && (
        <p className="text-sm text-gray-400">No comments yet. Be the first!</p>
      )}

      {comments.map((comment) => {
        const author = comment.author
        const isOwn = comment.author_id === currentUserId

        return (
          <div key={comment.id} className="flex gap-3 group">
            {/* Avatar */}
            <div className="flex-shrink-0">
              {author?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={author.avatar_url} alt={author.full_name} className="w-7 h-7 rounded-full" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-[#1e3a5f] text-white flex items-center justify-center text-xs">
                  {author ? getInitials(author.full_name) : '?'}
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium text-gray-900">
                  {author?.full_name ?? 'Unknown'}
                </span>
                <span className="text-xs text-gray-400">{timeAgo(comment.created_at)}</span>
                {comment.edited_at && (
                  <span className="text-xs text-gray-400 italic">(edited)</span>
                )}
              </div>

              {editingId === comment.id ? (
                <div className="space-y-2">
                  <textarea
                    value={editBody}
                    onChange={(e) => setEditBody(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f] resize-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(comment.id)}
                      className="px-3 py-1 bg-[#1e3a5f] text-white rounded text-xs font-medium hover:bg-[#2d5a8e]"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="px-3 py-1 border border-gray-200 text-gray-600 rounded text-xs font-medium hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {renderMentions(comment.body, memberProfiles)}
                </p>
              )}
            </div>

            {/* Actions (own comments only) */}
            {isOwn && editingId !== comment.id && (
              <div className="flex items-start gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 pt-0.5">
                <button
                  onClick={() => {
                    setEditingId(comment.id)
                    setEditBody(comment.body)
                  }}
                  className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                  title="Edit"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(comment.id)}
                  className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )
      })}

      <div className="pt-2 border-t border-gray-100">
        <CommentEditor
          issueId={issueId}
          members={members}
          onCommented={refreshComments}
        />
      </div>
    </div>
  )
}
