import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setMessage(error.message)
      } else {
        navigate('/')
      }
    } else {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) {
        setMessage(error.message)
      } else {
        setMode('login')
        setMessage('Check your email for a confirmation link.')
      }
    }

    setLoading(false)
  }

  const input: React.CSSProperties = {
    display: 'block',
    width: '100%',
    border: 'none',
    borderBottom: '1px solid #D9D0C4',
    padding: '10px 0',
    fontSize: '0.95rem',
    color: '#1A1008',
    background: 'transparent',
    marginBottom: 20,
    fontFamily: "'Spectral', Georgia, serif",
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#F5F0E8',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 24px',
      }}
    >
      <div style={{ width: '100%', maxWidth: 360 }}>
        {/* Wordmark */}
        <div
          style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: 36,
            color: '#2C1A0E',
            textAlign: 'center',
            marginBottom: 48,
            letterSpacing: '-0.01em',
          }}
        >
          <span style={{ fontWeight: 600 }}>book</span>
          <span style={{ fontWeight: 300, fontStyle: 'italic' }}>worm</span>
        </div>

        <p
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '0.65rem',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: '#888888',
            marginBottom: 28,
          }}
        >
          {mode === 'login' ? 'sign in' : 'create account'}
        </p>

        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={input}
          />
          <input
            type="password"
            placeholder="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={input}
          />

          {message && (
            <p
              style={{
                fontSize: '0.8rem',
                color: '#888888',
                marginBottom: 16,
                fontFamily: "'IBM Plex Mono', monospace",
              }}
            >
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              background: '#2C1A0E',
              color: '#F5F0E8',
              fontFamily: "'Courier Prime', 'Courier New', monospace",
              fontWeight: 700,
              fontSize: '0.75rem',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
              marginBottom: 16,
            }}
          >
            {loading ? '...' : mode === 'login' ? 'sign in' : 'create account'}
          </button>
        </form>

        <button
          onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setMessage(null) }}
          style={{
            background: 'none',
            padding: 0,
            fontFamily: "'Spectral', Georgia, serif",
            fontWeight: 300,
            fontStyle: 'italic',
            fontSize: '0.9rem',
            color: 'rgba(26,16,8,0.5)',
            display: 'block',
            width: '100%',
            textAlign: 'center',
          }}
        >
          {mode === 'login' ? 'create an account' : 'already have an account?'}
        </button>
      </div>
    </div>
  )
}
