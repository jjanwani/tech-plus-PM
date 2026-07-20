import { LoginButton } from '@/components/auth/login-button'
import { Logo } from '@/components/layout/logo'

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1e3a5f] to-[#2d5a8e] px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {/* Logo / Branding */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-3">
              <Logo variant="dark" className="items-center text-center" />
            </div>
            <p className="text-sm text-gray-500 mt-1">Tech Plus Consulting · University of Michigan</p>
          </div>

          {/* Sign in section */}
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-800 text-center">Sign in to your account</h2>
              <p className="text-sm text-gray-500 text-center mt-1">
                Use your U of M Google account to continue
              </p>
            </div>

            <LoginButton />

            <div className="flex items-center gap-3 mt-4">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400">Note</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3">
              <p className="text-sm text-blue-700 text-center">
                You must use your <span className="font-semibold">@umich.edu</span> account to sign in.
                Personal Gmail accounts are not permitted.
              </p>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-blue-200 mt-6">
          &copy; {new Date().getFullYear()} Tech Plus Consulting. All rights reserved.
        </p>
      </div>
    </div>
  )
}
