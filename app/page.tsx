import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function LandingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <>
      <section className="hero">
        <div className="container hero-inner">
          <div className="hero-copy">
            <p className="eyebrow">For university students</p>
            <h1 className="hero-title">Big assignment? <span className="accent">Just take the first step.</span></h1>
            <p className="hero-lead">
              FirstStep breaks overwhelming essays, projects and exam prep into small, doable steps — so you always know
              what to do next and start earlier, not the night before.
            </p>
            {user ? (
              <Link href="/app" className="btn btn-primary btn-lg">Go to your dashboard</Link>
            ) : (
              <Link href="/signup" className="btn btn-primary btn-lg">Sign up free</Link>
            )}
            <p className="hero-note muted small">Email and password only. No credit card.</p>
          </div>

          <div className="hero-preview" aria-hidden="true">
            <div className="card preview-card">
              <div className="assignment-meta">
                <span className="badge badge-assignment">Assignment</span>
                <span className="meta-course">Microeconomics</span>
                <span className="pill pill-soon">Due in 5 days</span>
              </div>
              <h3 className="assignment-title">Essay: price elasticity of coffee</h3>
              <div className="progress-row">
                <div className="progress"><div className="progress-fill" style={{ width: '40%' }} /></div>
                <span className="progress-label">2/5 steps · 40%</span>
              </div>
              <div className="next-step"><span className="next-label">Next step</span> Find 3 academic sources</div>
              <ul className="preview-steps">
                <li className="is-done">Read the brief and rubric</li>
                <li className="is-done">Pick a market to analyse</li>
                <li>Find 3 academic sources</li>
                <li>Write an outline</li>
                <li>First draft</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="container section">
        <h2 className="section-title">How it works</h2>
        <ol className="how-grid">
          <li className="card how-card">
            <span className="how-num">1</span>
            <h3>Add the assignment</h3>
            <p className="muted">Just type the title. Course, deadline, notes and type (assignment, midterm, final or group project) are optional.</p>
          </li>
          <li className="card how-card">
            <span className="how-num">2</span>
            <h3>Break it into steps</h3>
            <p className="muted">Add small steps, give them their own dates, reorder them and tick them off as you go.</p>
          </li>
          <li className="card how-card">
            <span className="how-num">3</span>
            <h3>See what’s next</h3>
            <p className="muted">Each assignment shows your progress and the very next step, and the calendar shows every deadline at a glance.</p>
          </li>
        </ol>
      </section>

      <section className="container section">
        <div className="card cta-card">
          <div>
            <h2>Starting is the hardest part.</h2>
            <p className="muted">FirstStep makes the first step obvious. Your plans are private to your account.</p>
          </div>
          {user ? (
            <Link href="/app" className="btn btn-primary">Open dashboard</Link>
          ) : (
            <Link href="/login" className="btn btn-outline">I already have an account</Link>
          )}
        </div>
      </section>
    </>
  )
}
