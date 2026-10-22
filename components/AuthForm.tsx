'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import { createClient } from '@/lib/supabase/client'

type Mode = 'login' | 'signup'

export default function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const isSignup = mode === 'signup'

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setNotice(null)
    setBusy(true)
    const supabase = createClient()

    if (isSignup) {
      const { data, error } = await supabase.auth.signUp({ email: email.trim(), password })
      if (error) {
        setError(error.message)
        setBusy(false)
        return
      }
      if (!data.session) {
        // Happens only if "Confirm email" is still enabled in the Supabase project.
        setNotice('Account created, but Supabase is asking for email confirmation. Turn off "Confirm email" in Supabase Auth settings, or confirm via email, then log in.')
        setBusy(false)
        return
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (error) {
        setError(error.message === 'Invalid login credentials' ? 'That email and password don’t match an account.' : error.message)
        setBusy(false)
        return
      }
    }

    router.replace('/app')
    router.refresh()
  }

  return (
    <div className="auth-wrap">
      <div className="card auth-card">
        <h1 className="auth-title">{isSignup ? 'Create your account' : 'Welcome back'}</h1>
        <p className="muted">
          {isSignup ? 'Free for students. Start planning your first assignment in a minute.' : 'Log in to see your next step.'}
        </p>

        <form onSubmit={handleSubmit} className="stack" noValidate={false}>
          <div className="field">
            <label htmlFor={`${mode}-email`}>Email</label>
            <input
              id={`${mode}-email`}
              data-testid={`${mode}-email`}
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@university.edu"
            />
          </div>
          <div className="field">
            <label htmlFor={`${mode}-password`}>Password</label>
            <input
              id={`${mode}-password`}
              data-testid={`${mode}-password`}
              type="password"
              autoComplete={isSignup ? 'new-password' : 'current-password'}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isSignup ? 'At least 6 characters' : 'Your password'}
            />
          </div>

          {error && <p className="alert alert-error" role="alert">{error}</p>}
          {notice && <p className="alert alert-info" role="status">{notice}</p>}

          <button type="submit" data-testid={`${mode}-submit`} className="btn btn-primary btn-block" disabled={busy}>
            {busy ? 'Please wait…' : isSignup ? 'Sign up' : 'Log in'}
          </button>
        </form>

        <p className="auth-switch muted">
          {isSignup ? (
            <>Already have an account? <Link href="/login">Log in</Link></>
          ) : (
            <>New to FirstStep? <Link href="/signup">Create an account</Link></>
          )}
        </p>
      </div>
    </div>
  )
}
