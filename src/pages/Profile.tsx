import { useState, useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import type { OutletCtx } from '../App'
import { supabase } from '../lib/supabase'
import type { UserBook } from '../types'

export default function Profile() {
  const { user } = useOutletContext<OutletCtx>()
  const [stats, setStats] = useState({ total: 0, read: 0, reading: 0, wantToRead: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('user_books')
      .select('status')
      .eq('user_id', user.id)
      .then(({ data }) => {
        if (data) {
          const books = data as Pick<UserBook, 'status'>[]
          setStats({
            total: books.length,
            read: books.filter((b) => b.status === 'READ').length,
            reading: books.filter((b) => b.status === 'CURRENTLY_READING').length,
            wantToRead: books.filter((b) => b.status === 'WANT_TO_READ').length,
          })
        }
        setLoading(false)
      })
  }, [user.id])

  const serif: React.CSSProperties = { fontFamily: "'Spectral', Georgia, serif" }
  const mono: React.CSSProperties = { fontFamily: "'IBM Plex Mono', monospace" }
  const cormorant: React.CSSProperties = { fontFamily: "'Cormorant Garamond', Georgia, serif" }

  return (
    <div style={{ padding: '48px 28px', maxWidth: 600 }}>
      {/* Avatar placeholder */}
      <div style={{
        width: 64,
        height: 64,
        background: '#2C1A0E',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
      }}>
        <span style={{ ...cormorant, fontSize: 28, fontWeight: 600, color: '#F5F0E8' }}>
          {user.email?.[0]?.toUpperCase() ?? 'B'}
        </span>
      </div>

      <h1 style={{ ...serif, fontWeight: 600, fontSize: '1.8rem', color: '#1A1008', marginBottom: 4 }}>
        {user.email?.split('@')[0]}
      </h1>
      <p style={{ ...mono, fontSize: '0.6rem', color: '#888', letterSpacing: '0.06em', marginBottom: 40 }}>
        {user.email}
      </p>

      {/* Stats */}
      {!loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0, borderTop: '1px solid #D9D0C4', marginBottom: 40 }}>
          {[
            { value: stats.total, label: 'total' },
            { value: stats.read, label: 'read' },
            { value: stats.reading, label: 'reading' },
            { value: stats.wantToRead, label: 'want to read' },
          ].map((s, i) => (
            <div
              key={s.label}
              style={{
                padding: '20px 0',
                borderRight: i < 3 ? '1px solid #D9D0C4' : 'none',
                paddingRight: i < 3 ? 16 : 0,
                paddingLeft: i > 0 ? 16 : 0,
              }}
            >
              <div style={{ ...cormorant, fontSize: 32, fontWeight: 600, color: '#1A1008', lineHeight: 1, marginBottom: 4 }}>
                {s.value}
              </div>
              <div style={{ ...mono, fontSize: '0.58rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#888' }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ borderTop: '1px solid #D9D0C4', paddingTop: 28 }}>
        <p style={{ ...serif, fontWeight: 300, fontStyle: 'italic', color: '#888', marginBottom: 20 }}>
          Member since {new Date(user.created_at ?? '').getFullYear() || '—'}
        </p>
      </div>
    </div>
  )
}
