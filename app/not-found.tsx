import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="auth-wrap">
      <div className="card auth-card">
        <h1 className="auth-title">Page not found</h1>
        <p className="muted">That page doesn’t exist.</p>
        <Link href="/" className="btn btn-primary">Back to home</Link>
      </div>
    </div>
  )
}
