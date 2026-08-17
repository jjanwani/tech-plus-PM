'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, FileText, Camera, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import type { Profile } from '@/types'

interface OnboardingFormProps {
  profile: Profile
}

export function OnboardingForm({ profile }: OnboardingFormProps) {
  const router = useRouter()
  const [fullName, setFullName] = useState(profile.full_name)
  const [headshotFile, setHeadshotFile] = useState<File | null>(null)
  const [headshotPreview, setHeadshotPreview] = useState<string | null>(profile.avatar_url)
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleHeadshotChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    setHeadshotFile(file)
    if (file) setHeadshotPreview(URL.createObjectURL(file))
  }

  function handleResumeChange(e: React.ChangeEvent<HTMLInputElement>) {
    setResumeFile(e.target.files?.[0] ?? null)
  }

  const canSubmit = fullName.trim().length > 0 && Boolean(headshotPreview) && Boolean(resumeFile)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    setError(null)
    try {
      const formData = new FormData()
      formData.set('full_name', fullName.trim())
      if (headshotFile) formData.set('headshot', headshotFile)
      if (resumeFile) formData.set('resume', resumeFile)

      const res = await fetch('/api/profile?complete_onboarding=true', {
        method: 'PATCH',
        body: formData,
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Failed to save profile')
      }
      toast.success('Profile complete — welcome to Tech Plus!')
      router.push('/')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Headshot */}
      <div className="flex items-center gap-4">
        <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-100 border border-gray-200 flex-shrink-0 flex items-center justify-center">
          {headshotPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={headshotPreview} alt="Headshot preview" className="w-full h-full object-cover" />
          ) : (
            <Camera className="w-6 h-6 text-gray-300" />
          )}
        </div>
        <div className="flex-1">
          <label className="text-sm font-medium text-gray-700 block mb-1">
            Headshot <span className="text-red-500">*</span>
          </label>
          {profile.avatar_url && !headshotFile && (
            <p className="text-xs text-gray-400 mb-1.5">Using your Google account photo — upload a different one if you&apos;d like.</p>
          )}
          <label className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors">
            <Upload className="w-3.5 h-3.5" />
            {headshotFile ? headshotFile.name : profile.avatar_url ? 'Replace photo' : 'Upload photo'}
            <input type="file" accept="image/*" onChange={handleHeadshotChange} className="hidden" />
          </label>
        </div>
      </div>

      {/* Name */}
      <div>
        <label className="text-sm font-medium text-gray-700 block mb-1.5">
          Full name <span className="text-red-500">*</span>
        </label>
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Your full name"
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00274c]/20 focus:border-[#00274c]"
        />
      </div>

      {/* Resume */}
      <div>
        <label className="text-sm font-medium text-gray-700 block mb-1.5">
          Resume <span className="text-red-500">*</span>
        </label>
        <label className="flex items-center gap-2 px-3 py-2.5 border border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-[#00274c]/40 hover:bg-gray-50 cursor-pointer transition-colors">
          <FileText className="w-4 h-4 flex-shrink-0" />
          {resumeFile ? (
            <span className="text-gray-800 truncate">{resumeFile.name}</span>
          ) : (
            <span>Upload your resume (PDF preferred)</span>
          )}
          <input type="file" accept=".pdf,.doc,.docx" onChange={handleResumeChange} className="hidden" />
        </label>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={!canSubmit || submitting}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#00274c] text-white rounded-lg text-sm font-medium hover:bg-[#15345c] disabled:opacity-50 transition-colors"
      >
        {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
        {submitting ? 'Saving...' : 'Continue'}
      </button>
    </form>
  )
}
