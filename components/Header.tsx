'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function Header({ initialEmail }: { initialEmail: string | null }) {
  const router = useRouter()
  const [email, setEmail] = useState<string | null>(initialEmail)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user.email ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleLogout() {
    setBusy(true)
    await createClient().auth.signOut()
    setEmail(null)
    setBusy(false)
    router.replace('/')
    router.refresh()
  }

  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link href={email ? '/app' : '/'} className="brand" aria-label="FirstStep home">
          <span className="brand-mark" aria-hidden="true">1</span>
          FirstStep
        </Link>
        <nav className="header-nav" aria-label="Main">
          {email ? (
            <>
              <span className="header-email" title={email}>{email}</span>
              <Link href="/app" className="btn btn-ghost btn-sm">Dashboard</Link>
              <button type="button" data-testid="logout" className="btn btn-outline btn-sm" onClick={handleLogout} disabled={busy}>
                {busy ? 'Logging out…' : 'Log out'}
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="btn btn-ghost btn-sm">Log in</Link>
              <Link href="/signup" className="btn btn-primary btn-sm">Sign up</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
