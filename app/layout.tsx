import type { Metadata, Viewport } from 'next'
import Header from '@/components/Header'
import { createClient } from '@/lib/supabase/server'
import './globals.css'

export const metadata: Metadata = {
  title: 'FirstStep — break big assignments into small steps',
  description: 'FirstStep helps university students turn overwhelming assignments into clear, manageable steps so they always know what to do next.',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#4338ca',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <html lang="en">
      <body>
        <a href="#main" className="skip-link">Skip to content</a>
        <Header initialEmail={user?.email ?? null} />
        <main id="main">{children}</main>
        <footer className="site-footer">
          <div className="container">FirstStep · Built for students who want to start earlier.</div>
        </footer>
      </body>
    </html>
  )
}
