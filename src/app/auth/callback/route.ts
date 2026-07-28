import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const code = searchParams.get('code')
  const origin = request.nextUrl.origin

  if (!code) {
    const oauthError = searchParams.get('error')
    const oauthErrorDescription = searchParams.get('error_description')
    console.error('Auth callback missing code:', { oauthError, oauthErrorDescription, url: request.nextUrl.toString() })
    const message = oauthErrorDescription || oauthError
    return NextResponse.redirect(
      message ? `${origin}/auth/error?message=${encodeURIComponent(message)}` : `${origin}/auth/error`
    )
  }

  try {
    const supabase = await getSupabaseServerClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('Auth callback error:', error)
      return NextResponse.redirect(`${origin}/auth/error?message=${encodeURIComponent(error.message)}`)
    }

    return NextResponse.redirect(`${origin}/`)
  } catch (err) {
    console.error('Auth callback exception:', err)
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.redirect(`${origin}/auth/error?message=${encodeURIComponent(message)}`)
  }
}
