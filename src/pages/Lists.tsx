export default function Lists() {
  const serif: React.CSSProperties = { fontFamily: "'Spectral', Georgia, serif" }
  const mono: React.CSSProperties = { fontFamily: "'IBM Plex Mono', monospace" }

  return (
    <div style={{ padding: '48px 28px' }}>
      <h1 style={{ ...serif, fontWeight: 600, fontSize: '2rem', color: '#1A1008', marginBottom: 12 }}>
        lists
      </h1>
      <p style={{ ...mono, fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#888', marginBottom: 48 }}>
        0 lists
      </p>
      <div style={{ borderTop: '1px solid #D9D0C4', paddingTop: 48 }}>
        <p style={{ ...serif, fontWeight: 300, fontStyle: 'italic', color: '#888', fontSize: '1rem' }}>
          You haven't made any lists yet. Lists let you curate books by theme, mood, or occasion.
        </p>
        <button
          style={{
            marginTop: 24,
            fontFamily: "'Courier Prime', 'Courier New', monospace",
            fontWeight: 700,
            fontSize: '0.72rem',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            padding: '10px 18px',
            background: '#1C2B4A',
            color: '#F5F0E8',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          + create a list
        </button>
      </div>
    </div>
  )
}
