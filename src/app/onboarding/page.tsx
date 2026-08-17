import { redirect } from 'next/navigation'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { Logo } from '@/components/layout/logo'
import { BrandPattern } from '@/components/layout/brand-pattern'
import { OnboardingForm } from '@/components/onboarding/onboarding-form'
import type { Profile } from '@/types'

export default async function OnboardingPage() {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/auth/login')
  if (profile.onboarding_completed) redirect('/')

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 relative overflow-hidden">
      <BrandPattern id="onboarding-pattern" className="absolute inset-0" color="#00274c" opacity={0.035} />
      <div className="w-full max-w-md relative z-10">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-6">
            <div className="flex justify-center mb-3">
              <Logo variant="dark" />
            </div>
            <h1 className="text-lg font-semibold text-gray-800">Welcome to Tech Plus</h1>
            <p className="text-sm text-gray-500 mt-1">Complete your profile to get started</p>
          </div>

          <OnboardingForm profile={profile as Profile} />
        </div>
      </div>
    </div>
  )
}
