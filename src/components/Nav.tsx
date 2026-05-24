import { useState } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

interface NavProps {
  user: User
}

const routeLabels: Record<string, string> = {
  '/': 'home',
  '/books': 'my books',
  '/books/add': 'add a book',
  '/stats': 'stats',
  '/discover': 'discover',
  '/lists': 'lists',
  '/friends': 'friends',
  '/articles': 'articles',
  '/profile': 'profile',
}

function getLabel(pathname: string): string {
  if (routeLabels[pathname]) return routeLabels[pathname]
  if (pathname.startsWith('/books/')) return 'book detail'
  return ''
}

export default function Nav({ user }: NavProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const label = getLabel(location.pathname)

  async function handleSignOut() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <nav style={{ position: 'sticky', top: 0, zIndex: 50 }}>
      {/* Bar 1 */}
      <div
        style={{
          background: '#2C1A0E',
          padding: '10px 28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Wordmark + dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setDropdownOpen((o) => !o)}
            style={{
              background: 'none',
              padding: 0,
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: 18,
              color: 'rgba(245,240,232,0.7)',
              letterSpacing: '0.01em',
            }}
          >
            <span style={{ fontWeight: 600 }}>book</span>
            <span style={{ fontWeight: 300, fontStyle: 'italic' }}>worm</span>
          </button>

          {dropdownOpen && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 10px)',
                left: 0,
                background: '#2C1A0E',
                border: '1px solid rgba(245,240,232,0.12)',
                minWidth: 160,
                zIndex: 200,
              }}
            >
              <div
                style={{
                  padding: '10px 16px 8px',
                  borderBottom: '1px solid rgba(245,240,232,0.08)',
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: '0.6rem',
                  color: 'rgba(245,240,232,0.3)',
                  letterSpacing: '0.06em',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {user.email}
              </div>
              {[
                { label: 'home', path: '/' },
                { label: 'stats', path: '/stats' },
                { label: 'profile', path: '/profile' },
              ].map((item) => (
                <button
                  key={item.path}
                  onClick={() => { navigate(item.path); setDropdownOpen(false) }}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '10px 16px',
                    textAlign: 'left',
                    background: 'none',
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: '0.65rem',
                    color: 'rgba(245,240,232,0.7)',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    borderBottom: '1px solid rgba(245,240,232,0.06)',
                  }}
                >
                  {item.label}
                </button>
              ))}
              <button
                onClick={handleSignOut}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '10px 16px',
                  textAlign: 'left',
                  background: 'none',
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: '0.65rem',
                  color: 'rgba(245,240,232,0.4)',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}
              >
                sign out
              </button>
            </div>
          )}
        </div>

        {/* Center label */}
        <span
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '0.65rem',
            color: 'rgba(245,240,232,0.45)',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
          }}
        >
          {label}
        </span>

        {/* Search icon */}
        <button
          onClick={() => navigate('/discover')}
          aria-label="search"
          style={{
            background: 'none',
            padding: 4,
            color: 'rgba(245,240,232,0.6)',
            fontSize: 16,
            lineHeight: 1,
          }}
        >
          &#9906;
        </button>
      </div>

      {/* Bar 2 */}
      <div
        style={{
          background: '#F5F0E8',
          borderBottom: '1px solid #D9D0C4',
          padding: '10px 22px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
          {[
            { label: 'books', path: '/books' },
            { label: 'articles', path: '/articles' },
            { label: 'lists', path: '/lists' },
            { label: 'friends', path: '/friends' },
          ].map((item, i) => (
            <span key={item.path} style={{ display: 'flex', alignItems: 'center' }}>
              {i > 0 && (
                <span
                  style={{
                    margin: '0 8px',
                    color: 'rgba(26,16,8,0.3)',
                    fontFamily: "'Spectral', Georgia, serif",
                    fontWeight: 300,
                    fontStyle: 'italic',
                  }}
                >
                  ·
                </span>
              )}
              <NavLink
                to={item.path}
                style={({ isActive }) => ({
                  fontFamily: "'Spectral', Georgia, serif",
                  fontWeight: 300,
                  fontStyle: 'italic',
                  fontSize: '0.95rem',
                  color: isActive ? '#1A1008' : 'rgba(26,16,8,0.5)',
                  textDecoration: isActive ? 'underline' : 'none',
                  textUnderlineOffset: 3,
                })}
              >
                {item.label}
              </NavLink>
            </span>
          ))}
        </div>

        <NavLink
          to="/books/add"
          style={{
            fontFamily: "'Courier Prime', 'Courier New', monospace",
            fontWeight: 700,
            fontSize: '0.72rem',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            background: '#1C2B4A',
            color: '#F5F0E8',
            padding: '7px 14px',
          }}
        >
          + log a book
        </NavLink>
      </div>

      {/* Close dropdown on outside click */}
      {dropdownOpen && (
        <div
          onClick={() => setDropdownOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
          }}
        />
      )}
    </nav>
  )
}

