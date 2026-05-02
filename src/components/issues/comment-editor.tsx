'use client'

import { useState, useRef, useCallback } from 'react'
import { Send } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils/cn'
import type { ProjectMember } from '@/types'

interface CommentEditorProps {
  issueId: string
  members: ProjectMember[]
  onCommented: () => void
}

interface MentionState {
  active: boolean
  query: string
  startIndex: number
}

export function CommentEditor({ issueId, members, onCommented }: CommentEditorProps) {
  const [body, setBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [mention, setMention] = useState<MentionState>({ active: false, query: '', startIndex: 0 })
  const [mentionIndex, setMentionIndex] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const filteredMembers = members.filter((m) =>
    m.profile?.full_name.toLowerCase().includes(mention.query.toLowerCase())
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (mention.active) {
        if (e.key === 'ArrowDown') {
          e.preventDefault()
          setMentionIndex((i) => Math.min(i + 1, filteredMembers.length - 1))
        } else if (e.key === 'ArrowUp') {
          e.preventDefault()
          setMentionIndex((i) => Math.max(i - 1, 0))
        } else if (e.key === 'Enter' || e.key === 'Tab') {
          e.preventDefault()
          const member = filteredMembers[mentionIndex]
          if (member) selectMember(member)
        } else if (e.key === 'Escape') {
          setMention({ active: false, query: '', startIndex: 0 })
        }
      } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        handleSubmit()
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mention, filteredMembers, mentionIndex, body]
  )

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value
    setBody(val)

    const cursor = e.target.selectionStart ?? 0
    const textUpToCursor = val.slice(0, cursor)
    const atMatch = textUpToCursor.match(/@(\w*)$/)

    if (atMatch) {
      setMention({ active: true, query: atMatch[1], startIndex: cursor - atMatch[0].length })
      setMentionIndex(0)
    } else {
      setMention({ active: false, query: '', startIndex: 0 })
    }
  }

  function selectMember(member: ProjectMember) {
    if (!member.profile) return
    const before = body.slice(0, mention.startIndex)
    const after = body.slice((textareaRef.current?.selectionStart ?? 0))
    const newBody = `${before}@${member.user_id} ${after}`
    setBody(newBody)
    setMention({ active: false, query: '', startIndex: 0 })
    textareaRef.current?.focus()
  }

  async function handleSubmit() {
    if (!body.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/issues/${issueId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: body.trim() }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Failed to post comment')
      }
      setBody('')
      setMention({ active: false, query: '', startIndex: 0 })
      onCommented()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="relative">
      <div className="border border-gray-200 rounded-xl overflow-hidden focus-within:border-[#1e3a5f] focus-within:ring-2 focus-within:ring-[#1e3a5f]/10 transition-all">
        <textarea
          ref={textareaRef}
          value={body}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          rows={3}
          className="w-full px-3 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 resize-none focus:outline-none bg-white"
          placeholder="Write a comment... (use @ to mention someone, Cmd+Enter to submit)"
        />
        <div className="flex items-center justify-between px-3 py-2 border-t border-gray-100 bg-gray-50/50">
          <span className="text-xs text-gray-400">Cmd+Enter to submit</span>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !body.trim()}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
              body.trim()
                ? 'bg-[#1e3a5f] text-white hover:bg-[#2d5a8e]'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            )}
          >
            <Send className="w-3 h-3" />
            {submitting ? 'Posting...' : 'Comment'}
          </button>
        </div>
      </div>

      {/* Mention dropdown */}
      {mention.active && filteredMembers.length > 0 && (
        <div className="absolute left-0 bottom-full mb-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 w-56 overflow-hidden">
          {filteredMembers.slice(0, 8).map((m, i) => {
            const profile = m.profile
            if (!profile) return null
            return (
              <button
                key={m.user_id}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault()
                  selectMember(m)
                }}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 transition-colors text-left',
                  i === mentionIndex && 'bg-[#1e3a5f]/5'
                )}
              >
                <div className="w-6 h-6 rounded-full bg-[#1e3a5f] text-white flex items-center justify-center text-xs flex-shrink-0">
                  {profile.full_name.charAt(0).toUpperCase()}
                </div>
                <span className="truncate text-gray-700">{profile.full_name}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
