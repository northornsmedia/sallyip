import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Eye, EyeOff, LockKeyhole, Mail, User, ShieldCheck, CheckCircle2 } from 'lucide-react'
import { saveAuthSession, saveRememberedEmail, getRememberedEmail, clearRememberedEmail } from '../lib/client-auth.js'

function Mark() {
  return (
    <span className="authMark">
      <img src="/sallyip-logo.png" alt="SallyIP" />
    </span>
  )
}

export default function AuthPage({ onHome, onSuccess, initialMode = 'login' }) {
  const [mode, setMode] = useState(initialMode)
  const [name, setName] = useState('')
  const [email, setEmail] = useState(() => getRememberedEmail())
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(true)
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [emailConflict, setEmailConflict] = useState(false)

  useEffect(() => {
    if (initialMode) setMode(initialMode)
  }, [initialMode])

  const submit = async (event) => {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setError('')
    setEmailConflict(false)

    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: mode,
          name: mode === 'signup' ? name.trim() : undefined,
          email: email.trim().toLowerCase(),
          password,
        }),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        if (response.status === 409) {
          setEmailConflict(true)
          throw new Error('An account with this email already exists.')
        }
        throw new Error(data?.error?.message || 'Authentication could not be completed.')
      }

      if (!data?.user) {
        throw new Error('No user data returned from authentication server.')
      }

      // Persist JWT token and user session for 7 days
      saveAuthSession({
        user: data.user,
        token: data.token,
        expiresAt: data.expires_at,
      })

      if (rememberMe) {
        saveRememberedEmail(email)
      } else {
        clearRememberedEmail()
      }

      if (onSuccess) {
        onSuccess(data.user, data.token)
      }
    } catch (err) {
      setError(err.message || 'Unable to connect to SallyIP authentication service.')
    } finally {
      setBusy(false)
    }
  }

  const switchToLogin = () => {
    setMode('login')
    setError('')
    setEmailConflict(false)
  }

  const switchToSignup = () => {
    setMode('signup')
    setError('')
    setEmailConflict(false)
  }

  return (
    <div className="authPage">
      <button className="authHome" onClick={onHome} type="button">
        <ArrowLeft /> Home
      </button>

      <motion.main initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
        <Mark />
        <span className="authEyebrow">
          <ShieldCheck /> SALLYIP 4.2 PRO • SECURE WORKSPACE
        </span>

        <h1>{mode === 'login' ? 'Welcome back.' : 'Create your research workspace.'}</h1>
        <p>
          {mode === 'login'
            ? 'Sign in to access your confidential SallyIP workspace and live chat.'
            : 'Sign up to access patent drafting, trademark clearance, and the full SallyIP intelligence chat.'}
        </p>

        <div className="authTabs">
          <button
            type="button"
            className={mode === 'login' ? 'active' : ''}
            onClick={switchToLogin}
          >
            Log in
          </button>
          <button
            type="button"
            className={mode === 'signup' ? 'active' : ''}
            onClick={switchToSignup}
          >
            Sign up
          </button>
        </div>

        <form onSubmit={submit}>
          {mode === 'signup' && (
            <label>
              <span>FULL NAME</span>
              <div>
                <User />
                <input
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Carlos Northon"
                  required
                />
              </div>
            </label>
          )}

          <label>
            <span>WORK EMAIL</span>
            <div>
              <Mail />
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
              />
            </div>
          </label>

          <label>
            <span>PASSWORD</span>
            <div>
              <LockKeyhole />
              <input
                type={show ? 'text' : 'password'}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                minLength={8}
                required
              />
              <button
                type="button"
                onClick={() => setShow((value) => !value)}
                aria-label={show ? 'Hide password' : 'Show password'}
              >
                {show ? <EyeOff /> : <Eye />}
              </button>
            </div>
          </label>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '11px',
              color: '#818a94',
              margin: '2px 0 6px 0',
            }}
          >
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                userSelect: 'none',
              }}
            >
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{
                  accentColor: '#b8ff5c',
                  width: '14px',
                  height: '14px',
                  cursor: 'pointer',
                }}
              />
              <span>Remember me for 7 days (JWT Cache)</span>
            </label>
          </div>

          {error && (
            <div className="authError" style={{ display: 'grid', gap: '6px' }}>
              <div>{error}</div>
              {emailConflict && (
                <button
                  type="button"
                  onClick={switchToLogin}
                  style={{
                    background: 'transparent',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    color: '#fff',
                    borderRadius: '6px',
                    padding: '6px 10px',
                    fontSize: '10px',
                    cursor: 'pointer',
                    justifySelf: 'start',
                  }}
                >
                  Click here to Log in instead →
                </button>
              )}
            </div>
          )}

          <button className="authSubmit" disabled={busy} type="submit">
            {busy ? 'Verifying with Sally database…' : mode === 'login' ? 'Log in & Open Sally Workspace' : 'Create Account & Access Sally'}
            {!busy && <ArrowRight />}
          </button>
        </form>

        <div style={{ marginTop: '16px', textAlign: 'center', fontSize: '11px', color: '#65707a' }}>
          {mode === 'login' ? (
            <span>
              Don't have an account yet?{' '}
              <button
                type="button"
                onClick={switchToSignup}
                style={{
                  background: 'transparent',
                  border: 0,
                  color: '#b8ff5c',
                  cursor: 'pointer',
                  fontWeight: 600,
                  padding: 0,
                  textDecoration: 'underline',
                }}
              >
                Sign up here
              </button>
            </span>
          ) : (
            <span>
              Already registered?{' '}
              <button
                type="button"
                onClick={switchToLogin}
                style={{
                  background: 'transparent',
                  border: 0,
                  color: '#b8ff5c',
                  cursor: 'pointer',
                  fontWeight: 600,
                  padding: 0,
                  textDecoration: 'underline',
                }}
              >
                Log in to existing account
              </button>
            </span>
          )}
        </div>

        <small>
          By continuing, you agree to use Sally as research assistance and verify important legal conclusions. Session is encrypted &amp; cached for 7 days.
        </small>
      </motion.main>
    </div>
  )
}
