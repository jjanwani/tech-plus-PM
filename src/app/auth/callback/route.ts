import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const code = searchParams.get('code')
  const origin = request.nextUrl.origin

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/error`)
  }

  try {
    const supabase = await getSupabaseServerClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('Auth callback error:', error)
      return NextResponse.redirect(`${origin}/auth/error`)
    }

    return NextResponse.redirect(`${origin}/`)
  } catch (err) {
    console.error('Auth callback exception:', err)
    return NextResponse.redirect(`${origin}/auth/error`)
  }
}
