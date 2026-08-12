import { LoginButton } from '@/components/auth/login-button'
import { Logo } from '@/components/layout/logo'
import { BrandPattern } from '@/components/layout/brand-pattern'

export default function LoginPage() {
  return (
    <div className="min-h-screen flex bg-white">
      {/* Left: brand panel */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-[#00274c] to-[#15345c] overflow-hidden">
        <BrandPattern id="login-pattern" className="absolute inset-0" color="#ffffff" opacity={0.1} />
        <div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(circle at 30% 20%, rgba(241,193,0,0.12), transparent 55%)' }}
        />
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <a href="https://www.techplusumich.org/" target="_blank" rel="noopener noreferrer">
            <Logo variant="light" showTagline={false} />
          </a>
          <div>
            <p className="font-display text-3xl text-white leading-snug max-w-md">
              Technology, execution, and human-centered problem solving.
            </p>
            <p className="text-white/60 text-sm mt-4 max-w-sm">
              Tech Plus Consulting matches ambitious student teams with real
              organizations tackling real technical problems.
            </p>
          </div>
          <p className="text-white/40 text-xs tracking-wide">
            University of Michigan
          </p>
        </div>
      </div>

      {/* Right: sign-in */}
      <div className="flex-1 flex items-center justify-center px-4 relative">
        <div className="lg:hidden absolute inset-0 bg-gradient-to-br from-[#00274c] to-[#15345c] overflow-hidden">
          <BrandPattern id="login-pattern-mobile" className="absolute inset-0" color="#ffffff" opacity={0.1} />
        </div>
        <div className="w-full max-w-md relative z-10">
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <div className="text-center mb-8 lg:hidden">
              <div className="flex justify-center mb-3">
                <Logo variant="dark" className="items-center text-center" />
              </div>
              <p className="text-sm text-gray-500 mt-1">Tech Plus Consulting · University of Michigan</p>
            </div>

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
              <p className="text-xs text-gray-400 text-center">
                First time here? An admin needs to add you before you can sign in.
              </p>
            </div>
          </div>

          <p className="text-center text-xs text-gray-400 lg:text-gray-300 mt-6">
            &copy; {new Date().getFullYear()} Tech Plus Consulting. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  )
}
