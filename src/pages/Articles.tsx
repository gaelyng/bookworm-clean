const PLACEHOLDER_ARTICLES = [
  {
    id: 1,
    category: 'Essay',
    title: 'On Reading Slowly in a Fast World',
    excerpt: 'There is a particular pleasure in finishing a book over the course of weeks, letting it seep into your daily life...',
    date: 'May 2026',
  },
  {
    id: 2,
    category: 'Interview',
    title: 'The Library as Sacred Space',
    excerpt: 'We spoke with three writers about the libraries that shaped them and what it means to inhabit a building built for silence...',
    date: 'April 2026',
  },
  {
    id: 3,
    category: 'List',
    title: 'Fifteen Novels That Changed How We Read Fiction',
    excerpt: "Some books don't just tell stories — they rearrange your sense of what stories can be...",
    date: 'March 2026',
  },
]

export default function Articles() {
  const serif: React.CSSProperties = { fontFamily: "'Spectral', Georgia, serif" }
  const mono: React.CSSProperties = { fontFamily: "'IBM Plex Mono', monospace" }

  return (
    <div style={{ padding: '48px 28px' }}>
      <h1 style={{ ...serif, fontWeight: 600, fontSize: '2rem', color: '#1A1008', marginBottom: 48 }}>
        articles
      </h1>

      <div>
        {PLACEHOLDER_ARTICLES.map((article, i) => (
          <div
            key={article.id}
            style={{
              paddingBottom: 32,
              marginBottom: 32,
              borderBottom: i < PLACEHOLDER_ARTICLES.length - 1 ? '1px solid #D9D0C4' : 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
              <span style={{ ...mono, fontSize: '0.58rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#7B9BAF' }}>
                {article.category}
              </span>
              <span style={{ ...mono, fontSize: '0.58rem', color: '#D9D0C4' }}>·</span>
              <span style={{ ...mono, fontSize: '0.58rem', color: '#888' }}>{article.date}</span>
            </div>
            <h2 style={{ ...serif, fontWeight: 600, fontSize: '1.3rem', color: '#1A1008', marginBottom: 10, lineHeight: 1.3 }}>
              {article.title}
            </h2>
            <p style={{ ...serif, fontWeight: 300, fontStyle: 'italic', fontSize: '0.95rem', color: 'rgba(26,16,8,0.6)', lineHeight: 1.7 }}>
              {article.excerpt}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
