export default function Friends() {
  const serif: React.CSSProperties = { fontFamily: "'Spectral', Georgia, serif" }
  const mono: React.CSSProperties = { fontFamily: "'IBM Plex Mono', monospace" }

  return (
    <div style={{ padding: '48px 28px' }}>
      <h1 style={{ ...serif, fontWeight: 600, fontSize: '2rem', color: '#1A1008', marginBottom: 12 }}>
        friends
      </h1>
      <p style={{ ...mono, fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#888', marginBottom: 48 }}>
        0 connections
      </p>
      <div style={{ borderTop: '1px solid #D9D0C4', paddingTop: 48 }}>
        <p style={{ ...serif, fontWeight: 300, fontStyle: 'italic', color: '#888', fontSize: '1rem' }}>
          Connect with fellow readers to see what they're reading and share recommendations.
        </p>
        <div style={{ marginTop: 28, display: 'flex', gap: 10 }}>
          <input
            type="email"
            placeholder="invite by email…"
            style={{
              ...serif,
              fontSize: '0.9rem',
              padding: '9px 0',
              borderBottom: '1px solid #D9D0C4',
              width: 280,
              color: '#1A1008',
              background: 'transparent',
            }}
          />
          <button
            style={{
              fontFamily: "'Courier Prime', 'Courier New', monospace",
              fontWeight: 700,
              fontSize: '0.72rem',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              padding: '9px 14px',
              background: '#2C1A0E',
              color: '#F5F0E8',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            invite
          </button>
        </div>
      </div>
    </div>
  )
}
