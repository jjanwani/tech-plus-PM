import Link from 'next/link'

export default function AuthErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1e3a5f] to-[#2d5a8e] px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
            <svg
              className="w-8 h-8 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Authentication Failed</h1>
          <p className="text-gray-600 mb-6">
            Authentication failed. Please use your{' '}
            <span className="font-semibold text-[#1e3a5f]">@umich.edu</span> Google account to sign in.
            Personal Gmail accounts are not permitted.
          </p>
          <Link
            href="/auth/login"
            className="inline-flex items-center justify-center px-6 py-2.5 rounded-lg bg-[#1e3a5f] text-white font-medium hover:bg-[#2d5a8e] transition-colors"
          >
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  )
}
