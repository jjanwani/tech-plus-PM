import { Resend } from 'resend'

let _resend: Resend | null = null

export function getResend(): Resend {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY ?? 'placeholder')
  }
  return _resend
}

export const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL ?? 'Tech Plus PM <noreply@resend.dev>'

export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
