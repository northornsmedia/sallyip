import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Eye, EyeOff, LockKeyhole, Mail, User, ShieldCheck } from 'lucide-react'
import { saveAuthSession, saveRememberedEmail, getRememberedEmail, clearRememberedEmail } from '../lib/client-auth.js'
import './auth-page.css'

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
      <button className="authHome" onClick={onHome} type="button" aria-label="Return to SallyIP Home">
        <ArrowLeft />
        <span>Home</span>
      </button>

      <motion.main
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      >
        <header className="authHeader">
          <div className="authLogoSquare">
            <img src="/sallyip-logo.png" alt="SallyIP" className="authLogoImg" />
          </div>

          <div className="authSecurityBadge">
            <LockKeyhole />
            <span>Confidential IP Workspace</span>
          </div>

          <h1 className="authTitle">
            {mode === 'login' ? 'Sign in to SallyIP' : 'Create your account'}
          </h1>

          <p className="authSubtitle">
            {mode === 'login'
              ? 'Access your confidential patent drafting, search, and research workspace.'
              : 'Sign up to access verified patent drafting, trademark clearance, and prior art.'}
          </p>
        </header>

        <div className="authTabs" role="tablist" aria-label="Authentication modes">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'login'}
            className={`authTab ${mode === 'login' ? 'active' : ''}`}
            onClick={switchToLogin}
          >
            Sign in
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'signup'}
            className={`authTab ${mode === 'signup' ? 'active' : ''}`}
            onClick={switchToSignup}
          >
            Create account
          </button>
        </div>

        <form className="authForm" onSubmit={submit}>
          {mode === 'signup' && (
            <label className="authField">
              <span className="authFieldLabel">Full name</span>
              <div className="authInputWrap">
                <User className="authFieldIcon" />
                <input
                  type="text"
                  className="authInput"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Carlos Northon"
                  required
                />
              </div>
            </label>
          )}

          <label className="authField">
            <span className="authFieldLabel">Work email</span>
            <div className="authInputWrap">
              <Mail className="authFieldIcon" />
              <input
                type="email"
                className="authInput"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@firm.com"
                required
              />
            </div>
          </label>

          <label className="authField">
            <span className="authFieldLabel">Password</span>
            <div className="authInputWrap">
              <LockKeyhole className="authFieldIcon" />
              <input
                type={show ? 'text' : 'password'}
                className="authInput"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                minLength={8}
                required
              />
              <button
                type="button"
                className="authTogglePassword"
                onClick={() => setShow((value) => !value)}
                aria-label={show ? 'Hide password' : 'Show password'}
              >
                {show ? <EyeOff /> : <Eye />}
              </button>
            </div>
          </label>

          <div className="authOptions">
            <label className="authRememberLabel">
              <input
                type="checkbox"
                className="authCheckbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <span>Remember this device</span>
            </label>
          </div>

          {error && (
            <div className="authError">
              <div>{error}</div>
              {emailConflict && (
                <button
                  type="button"
                  onClick={switchToLogin}
                  className="authErrorSwitchBtn"
                >
                  Sign in to existing account →
                </button>
              )}
            </div>
          )}

          <button className="authSubmit" disabled={busy} type="submit">
            {busy ? (
              <>
                <span className="authSpinner" />
                <span>Authenticating…</span>
              </>
            ) : (
              <>
                <span>{mode === 'login' ? 'Sign in' : 'Create account'}</span>
                <ArrowRight />
              </>
            )}
          </button>
        </form>

        <div className="authFooterSwitch">
          {mode === 'login' ? (
            <span>
              Don't have an account?
              <button type="button" onClick={switchToSignup} className="authTextLink">
                Create one
              </button>
            </span>
          ) : (
            <span>
              Already have an account?
              <button type="button" onClick={switchToLogin} className="authTextLink">
                Sign in
              </button>
            </span>
          )}
        </div>

        <small className="authLegal">
          Protected by 256-bit encryption. By continuing, you agree to SallyIP's Terms of Service and Privacy Policy.
        </small>
      </motion.main>
    </div>
  )
}
