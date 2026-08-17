import { redirect } from 'next/navigation'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/sidebar'
import { TopNav } from '@/components/layout/topnav'
import { BrandPattern } from '@/components/layout/brand-pattern'
import type { Profile } from '@/types'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) {
    redirect('/auth/login')
  }

  if (!profile.onboarding_completed) {
    redirect('/onboarding')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar profile={profile as Profile} />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TopNav profile={profile as Profile} />
        <main className="relative flex-1 overflow-y-auto">
          <BrandPattern id="dashboard-pattern" className="fixed inset-0 pointer-events-none" color="#00274c" opacity={0.035} />
          <div className="relative">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
