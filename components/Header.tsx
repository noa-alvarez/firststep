'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { countPending, PENDING_EVENT } from '@/lib/progress'

export default function Header({ initialEmail }: { initialEmail: string | null }) {
  const router = useRouter()
  const pathname = usePathname()
  const [email, setEmail] = useState<string | null>(initialEmail)
  const [pending, setPending] = useState<number | null>(null)
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

  // Load the pending count on every page; the dashboard keeps it live while it is open.
  useEffect(() => {
    if (!email) {
      setPending(null)
      return
    }
    let cancelled = false
    const supabase = createClient()
    Promise.all([
      supabase.from('assignments').select('id'),
      supabase.from('subtasks').select('assignment_id, completed'),
    ]).then(([a, s]) => {
      if (cancelled || a.error || s.error) return
      setPending(countPending(a.data.map((r) => r.id as string), s.data))
    })
    return () => {
      cancelled = true
    }
  }, [email, pathname])

  useEffect(() => {
    const onCount = (e: Event) => setPending((e as CustomEvent<number>).detail)
    window.addEventListener(PENDING_EVENT, onCount)
    return () => window.removeEventListener(PENDING_EVENT, onCount)
  }, [])

  async function handleLogout() {
    setBusy(true)
    await createClient().auth.signOut()
    setEmail(null)
    setBusy(false)
    router.replace('/')
    router.refresh()
  }

  const pendingLabel =
    pending === null ? 'Pending assignments' : `${pending} pending assignment${pending === 1 ? '' : 's'}`

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
              <Link
                href="/app?show=pending"
                className={`pending-badge${pending === 0 ? ' is-clear' : ''}`}
                aria-label={`${pendingLabel}. Show pending assignments`}
                title="Show pending assignments"
              >
                <svg viewBox="0 0 20 20" aria-hidden="true">
                  <path d="M4 4h12v2H4zm0 5h12v2H4zm0 5h8v2H4z" />
                </svg>
                <span className="pending-count">{pending ?? '–'}</span>
                <span className="pending-text">pending</span>
              </Link>
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
