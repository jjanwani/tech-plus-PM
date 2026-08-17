import { redirect } from 'next/navigation'
import { UserCircle } from 'lucide-react'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { ProfileForm } from '@/components/profile/profile-form'
import type { Profile } from '@/types'

export default async function ProfilePage() {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/auth/login')

  return (
    <div className="p-6 max-w-xl">
      <div className="flex items-center gap-2 mb-2">
        <UserCircle className="w-5 h-5 text-[#00274c]" />
        <h1 className="text-xl font-bold text-gray-900">My Profile</h1>
      </div>
      <p className="text-sm text-gray-500 mb-6">
        Update your info, headshot, and resume.
      </p>

      <ProfileForm profile={profile as Profile} />
    </div>
  )
}
