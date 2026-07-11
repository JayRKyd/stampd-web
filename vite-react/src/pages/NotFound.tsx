import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="min-h-dvh flex items-center justify-center bg-gray-50 px-6">
      <div className="text-center">
        <div className="h-16 overflow-hidden flex items-center justify-center mb-8">
          <img src="/icon-banner.png" alt="Stampd Bahamas" className="h-28 w-auto max-w-none" />
        </div>
        <p className="text-[64px] font-black text-brand-500 leading-none tracking-tight">404</p>
        <h1 className="text-[22px] font-bold text-gray-900 mt-2 mb-1">Page not found</h1>
        <p className="text-[14px] text-gray-500 mb-6">
          The page you're looking for doesn't exist or has moved.
        </p>
        <Link
          to="/dashboard"
          className="inline-block px-6 py-3 rounded-lg bg-brand-500 text-[14px] font-semibold text-white hover:bg-brand-600 transition-colors"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  )
}
