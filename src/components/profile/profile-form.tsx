'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, FileText, Camera, Loader2, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { ROLE_LABELS } from '@/types'
import type { Profile } from '@/types'

interface ProfileFormProps {
  profile: Profile
}

export function ProfileForm({ profile }: ProfileFormProps) {
  const router = useRouter()
  const [fullName, setFullName] = useState(profile.full_name)
  const [phoneNumber, setPhoneNumber] = useState(profile.phone_number ?? '')
  const [gradYear, setGradYear] = useState(profile.grad_year?.toString() ?? '')
  const [college, setCollege] = useState(profile.college ?? '')
  const [headshotFile, setHeadshotFile] = useState<File | null>(null)
  const [headshotPreview, setHeadshotPreview] = useState<string | null>(profile.avatar_url)
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [resumeFileName, setResumeFileName] = useState<string | null>(profile.resume_file_name)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleHeadshotChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    setHeadshotFile(file)
    if (file) setHeadshotPreview(URL.createObjectURL(file))
  }

  function handleResumeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    setResumeFile(file)
    if (file) setResumeFileName(file.name)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!fullName.trim()) return
    setSaving(true)
    setError(null)
    try {
      const formData = new FormData()
      formData.set('full_name', fullName.trim())
      formData.set('phone_number', phoneNumber.trim())
      formData.set('grad_year', gradYear.trim())
      formData.set('college', college.trim())
      if (headshotFile) formData.set('headshot', headshotFile)
      if (resumeFile) formData.set('resume', resumeFile)

      const res = await fetch('/api/profile', { method: 'PATCH', body: formData })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Failed to save profile')
      }
      toast.success('Profile updated')
      setHeadshotFile(null)
      setResumeFile(null)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 font-medium">{ROLE_LABELS[profile.role]}</span>
        <span>{profile.email}</span>
      </div>

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
          <label className="text-sm font-medium text-gray-700 block mb-1.5">Headshot</label>
          <label className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors">
            <Upload className="w-3.5 h-3.5" />
            {headshotFile ? headshotFile.name : 'Replace photo'}
            <input type="file" accept="image/*" onChange={handleHeadshotChange} className="hidden" />
          </label>
        </div>
      </div>

      {/* Name */}
      <div>
        <label className="text-sm font-medium text-gray-700 block mb-1.5">Full name</label>
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00274c]/20 focus:border-[#00274c]"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1.5">Phone</label>
          <input
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="(555) 555-5555"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00274c]/20 focus:border-[#00274c]"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1.5">Grad year</label>
          <input
            type="number"
            value={gradYear}
            onChange={(e) => setGradYear(e.target.value)}
            placeholder="2027"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00274c]/20 focus:border-[#00274c]"
          />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700 block mb-1.5">College</label>
        <input
          value={college}
          onChange={(e) => setCollege(e.target.value)}
          placeholder="Ross, Engineering, LSA..."
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00274c]/20 focus:border-[#00274c]"
        />
      </div>

      {/* Resume */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-sm font-medium text-gray-700">Resume</label>
          {profile.resume_url && !resumeFile && (
            <a
              href={profile.resume_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-[#00274c] hover:underline"
            >
              View current <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
        <label className="flex items-center gap-2 px-3 py-2.5 border border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-[#00274c]/40 hover:bg-gray-50 cursor-pointer transition-colors">
          <FileText className="w-4 h-4 flex-shrink-0" />
          {resumeFileName ? (
            <span className="text-gray-800 truncate">{resumeFileName}</span>
          ) : (
            <span>Upload a resume (PDF preferred)</span>
          )}
          <input type="file" accept=".pdf,.doc,.docx" onChange={handleResumeChange} className="hidden" />
        </label>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={!fullName.trim() || saving}
        className="flex items-center justify-center gap-2 px-4 py-2 bg-[#00274c] text-white rounded-lg text-sm font-medium hover:bg-[#15345c] disabled:opacity-50 transition-colors"
      >
        {saving && <Loader2 className="w-4 h-4 animate-spin" />}
        {saving ? 'Saving...' : 'Save changes'}
      </button>
    </form>
  )
}
