import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

// Shared chrome for the Privacy Policy and Terms pages — a clean, readable
// document layout that Apple's reviewers and real users can both open.
export function LegalLayout({
  title, lastUpdated, children,
}: {
  title: string
  lastUpdated: string
  children: React.ReactNode
}) {
  return (
    <div className="min-h-dvh bg-gray-50">
      {/* Top bar */}
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-[760px] mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="h-10 overflow-hidden flex items-center">
            <img src="/icon-banner.png" alt="Stampd Bahamas" className="h-16 w-auto max-w-none -ml-2" />
          </Link>
          <Link
            to="/"
            className="flex items-center gap-1.5 text-[13px] font-medium text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft size={15} /> Back to site
          </Link>
        </div>
      </header>

      {/* Document */}
      <main className="max-w-[760px] mx-auto px-6 py-12">
        <h1 className="text-[30px] sm:text-[34px] font-bold text-gray-900 tracking-[-0.02em]">{title}</h1>
        <p className="text-[13px] text-gray-500 mt-2">Last updated: {lastUpdated}</p>
        <div className="mt-8 space-y-1">{children}</div>

        <div className="mt-14 pt-6 border-t border-gray-200 text-[13px] text-gray-500">
          © {new Date().getFullYear()} Stampd Bahamas · Product of Rykno Tech Solutions
        </div>
      </main>
    </div>
  )
}

// Readable typographic primitives so each document stays legible in JSX.
export function Section({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section className="pt-6">
      <h2 className="text-[18px] font-semibold text-gray-900 tracking-[-0.01em] mb-2">{heading}</h2>
      <div className="space-y-3 text-[15px] text-gray-600 leading-relaxed">{children}</div>
    </section>
  )
}

export function Bullets({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="list-disc pl-5 space-y-1.5 text-[15px] text-gray-600 leading-relaxed">
      {items.map((it, i) => <li key={i}>{it}</li>)}
    </ul>
  )
}
