import { useState, useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import type { OutletCtx } from '../App'
import { supabase } from '../lib/supabase'
import type { UserBook } from '../types'
import BookCover from '../components/BookCover'

const GOAL = 80
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function ProgressBar({
  pct,
  fill = '#7B9BAF',
  bg = 'rgba(245,240,232,0.1)',
  height = 2,
}: {
  pct: number
  fill?: string
  bg?: string
  height?: number
}) {
  return (
    <div style={{ background: bg, height, width: '100%' }}>
      <div
        style={{
          background: fill,
          height: '100%',
          width: `${Math.min(pct, 100)}%`,
          transition: 'width 0.6s ease',
        }}
      />
    </div>
  )
}

export default function Stats() {
  const { user } = useOutletContext<OutletCtx>()
  const [yearBooks, setYearBooks] = useState<UserBook[]>([])
  const [allReadBooks, setAllReadBooks] = useState<UserBook[]>([])
  const [loading, setLoading] = useState(true)

  const year = new Date().getFullYear()
  const currentMonth = new Date().getMonth() // 0-indexed

  useEffect(() => {
    async function load() {
      // Diagnostic: fetch everything to inspect DB state
      const { data: diagData } = await supabase
        .from('user_books')
        .select('id, status, date_finished, created_at, books(title)')
        .eq('user_id', user.id)
        .limit(500)
      if (diagData) {
        console.log('[Stats] total user_books:', diagData.length)
        console.log('[Stats] sample 5:', diagData.slice(0, 5))
        const statuses = [...new Set(diagData.map((b) => b.status))]
        console.log('[Stats] distinct statuses:', statuses)
      }

      const [yearRes, allRes] = await Promise.all([
        // Year-filtered: for monthly chart + goal progress
        supabase
          .from('user_books')
          .select('*, books(*)')
          .eq('user_id', user.id)
          .eq('status', 'READ')
          .gte('date_finished', `${year}-01-01`)
          .lte('date_finished', `${year}-12-31`)
          .order('date_finished', { ascending: false }),

        // All-time READ: for author stats + timeline
        supabase
          .from('user_books')
          .select('*, books(*)')
          .eq('user_id', user.id)
          .eq('status', 'READ')
          .order('date_finished', { ascending: false, nullsFirst: false }),
      ])

      if (yearRes.data) setYearBooks(yearRes.data as UserBook[])
      if (allRes.data) setAllReadBooks(allRes.data as UserBook[])
      setLoading(false)
    }
    load()
  }, [user.id, year])

  // Derived stats
  const booksCount = yearBooks.length
  const pagesCount = yearBooks.reduce((sum, ub) => sum + (ub.books?.pages ?? 0), 0)
  const rated = yearBooks.filter((ub) => ub.rating != null)
  const avgRating =
    rated.length > 0
      ? (rated.reduce((sum, ub) => sum + (ub.rating ?? 0), 0) / rated.length).toFixed(1)
      : '—'
  const goalPct = (booksCount / GOAL) * 100

  // Monthly counts
  const monthCounts = MONTHS.map((_, i) =>
    yearBooks.filter((ub) => {
      if (!ub.date_finished) return false
      return new Date(ub.date_finished + 'T12:00:00').getMonth() === i
    }).length
  )
  const maxMonthCount = Math.max(...monthCounts, 1)
  const bestMonthIdx = monthCounts.indexOf(Math.max(...monthCounts))

  // Author breakdown — ALL TIME
  const authorCounts: Record<string, number> = {}
  allReadBooks.forEach((ub) => {
    const a = ub.books?.author
    if (a) authorCounts[a] = (authorCounts[a] ?? 0) + 1
  })
  const topAuthors = Object.entries(authorCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)

  // Genre breakdown — current year
  const genreCounts: Record<string, number> = {}
  yearBooks.forEach((ub) => {
    const g = ub.books?.genre
    if (g) genreCounts[g] = (genreCounts[g] ?? 0) + 1
  })
  const topGenres = Object.entries(genreCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)

  // Timeline — 20 most recently finished, ALL TIME
  const timeline = allReadBooks.filter((ub) => ub.date_finished).slice(0, 20)

  const mono: React.CSSProperties = { fontFamily: "'IBM Plex Mono', monospace" }
  const serif: React.CSSProperties = { fontFamily: "'Spectral', Georgia, serif" }
  const cormorant: React.CSSProperties = { fontFamily: "'Cormorant Garamond', Georgia, serif" }

  if (loading)
    return (
      <div style={{ background: '#2C1A0E', minHeight: '100vh', padding: '60px 32px', ...mono, fontSize: '0.65rem', color: 'rgba(245,240,232,0.3)', letterSpacing: '0.1em' }}>
        loading...
      </div>
    )

  return (
    <div>
      {/* ── 1. DARK HERO ── */}
      <div style={{ background: '#2C1A0E', padding: '40px 32px' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 48,
            alignItems: 'start',
            flexWrap: 'wrap',
          }}
        >
          {/* Left: main stat + goal */}
          <div>
            <div
              style={{
                ...mono,
                fontSize: '0.6rem',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'rgba(245,240,232,0.35)',
                marginBottom: 8,
              }}
            >
              {year}
            </div>
            <div
              style={{
                ...cormorant,
                fontSize: 72,
                fontWeight: 600,
                color: 'rgba(245,240,232,0.85)',
                lineHeight: 1,
                marginBottom: 4,
              }}
            >
              {booksCount}
            </div>
            <div
              style={{
                ...mono,
                fontSize: '0.6rem',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'rgba(245,240,232,0.35)',
                marginBottom: 20,
              }}
            >
              books read
            </div>
            <ProgressBar pct={goalPct} />
            <div
              style={{
                ...mono,
                fontSize: '0.58rem',
                color: 'rgba(245,240,232,0.25)',
                marginTop: 6,
                letterSpacing: '0.06em',
              }}
            >
              {booksCount} / {GOAL} goal
            </div>
          </div>

          {/* Right: 2×2 secondary stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28 }}>
            {[
              { value: allReadBooks.length.toLocaleString(), label: 'books read all time' },
              { value: pagesCount.toLocaleString(), label: 'pages turned this year' },
              { value: avgRating, label: 'avg rating' },
              { value: '—', label: 'avg days/book' },
            ].map((s) => (
              <div key={s.label}>
                <div
                  style={{
                    ...cormorant,
                    fontSize: 36,
                    fontWeight: 600,
                    color: 'rgba(245,240,232,0.75)',
                    lineHeight: 1,
                    marginBottom: 4,
                  }}
                >
                  {s.value}
                </div>
                <div
                  style={{
                    ...mono,
                    fontSize: '0.58rem',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: 'rgba(245,240,232,0.3)',
                  }}
                >
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── 2. MONTHLY PACE BAR CHART ── */}
      <div style={{ background: '#F5F0E8', padding: '28px 32px', borderBottom: '1px solid #D9D0C4' }}>
        <div
          style={{
            ...mono,
            fontSize: '0.6rem',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: '#888',
            marginBottom: 24,
          }}
        >
          monthly pace
          {monthCounts[bestMonthIdx] > 0 && (
            <span style={{ color: '#7B9BAF', marginLeft: 8 }}>
              — best month: {MONTHS[bestMonthIdx]}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 100 }}>
          {MONTHS.map((month, i) => {
            const count = monthCounts[i]
            const isFuture = i > currentMonth
            const isBest = i === bestMonthIdx && count > 0
            const barH = isFuture ? 0 : (count / maxMonthCount) * 80

            return (
              <div
                key={month}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  height: '100%',
                }}
              >
                {isFuture ? (
                  <div style={{ width: 4, height: 4, background: '#D9D0C4', marginBottom: 4 }} />
                ) : (
                  <div
                    style={{
                      width: '100%',
                      height: barH,
                      background: isBest ? '#7B9BAF' : '#1C2B4A',
                      marginBottom: 4,
                      minHeight: count > 0 ? 4 : 0,
                      transition: 'height 0.4s ease',
                    }}
                  />
                )}
                <div style={{ ...mono, fontSize: '0.55rem', color: '#888', textAlign: 'center', lineHeight: 1.2 }}>
                  {month}
                </div>
                {!isFuture && count > 0 && (
                  <div style={{ ...mono, fontSize: '0.55rem', color: isBest ? '#7B9BAF' : '#888', textAlign: 'center' }}>
                    {count}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── 3. DIVERSITY + GENRES ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          borderBottom: '1px solid #D9D0C4',
        }}
      >
        {/* Left: Author diversity */}
        <div style={{ padding: '28px 32px', borderRight: '1px solid #D9D0C4' }}>
          <div
            style={{
              ...mono,
              fontSize: '0.6rem',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: '#888',
              marginBottom: 20,
            }}
          >
            author diversity
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              { label: 'female authors', pct: 0 },
              { label: 'authors of color', pct: 0 },
              { label: 'international authors', pct: 0 },
              { label: 'debut authors', pct: 0 },
            ].map((d) => (
              <div key={d.label}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    marginBottom: 5,
                  }}
                >
                  <span style={{ ...mono, fontSize: '0.6rem', color: '#888', letterSpacing: '0.06em' }}>
                    {d.label}
                  </span>
                  <span style={{ ...mono, fontSize: '0.6rem', color: '#888' }}>{d.pct}%</span>
                </div>
                <ProgressBar pct={d.pct} fill="#1C2B4A" bg="#D9D0C4" height={2} />
              </div>
            ))}
          </div>
          <p style={{ ...mono, fontSize: '0.55rem', color: '#D9D0C4', marginTop: 16, letterSpacing: '0.04em' }}>
            * diversity data not yet tracked
          </p>
        </div>

        {/* Right: Top genres */}
        <div style={{ padding: '28px 32px' }}>
          <div
            style={{
              ...mono,
              fontSize: '0.6rem',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: '#888',
              marginBottom: 20,
            }}
          >
            top genres
          </div>
          {topGenres.length === 0 ? (
            <p style={{ ...serif, fontWeight: 300, fontStyle: 'italic', color: '#888', fontSize: '0.9rem' }}>
              No genre data yet.
            </p>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {topGenres.map(([genre, count], i) => (
                <span
                  key={genre}
                  style={{
                    ...mono,
                    fontSize: '0.6rem',
                    letterSpacing: '0.06em',
                    padding: '5px 10px',
                    border: `1px solid ${i < 3 ? '#1C2B4A' : '#D9D0C4'}`,
                    color: i < 3 ? '#1C2B4A' : '#888',
                  }}
                >
                  {genre}
                  <span style={{ marginLeft: 6, color: '#888' }}>{count}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── 4. MOST READ AUTHORS ── */}
      {topAuthors.length > 0 && (
        <div style={{ padding: '28px 32px', borderBottom: '1px solid #D9D0C4' }}>
          <div
            style={{
              ...mono,
              fontSize: '0.6rem',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: '#888',
              marginBottom: 16,
            }}
          >
            most read authors · all time
          </div>
          {topAuthors.map(([author, count], i) => (
            <div
              key={author}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 0',
                borderBottom: i < topAuthors.length - 1 ? '1px solid #D9D0C4' : 'none',
              }}
            >
              <span
                style={{
                  ...serif,
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  color: '#1A1008',
                  cursor: 'default',
                  transition: 'color 0.15s',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#1C2B4A' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#1A1008' }}
              >
                {author}
              </span>
              <span style={{ ...mono, fontSize: '0.6rem', color: '#888', letterSpacing: '0.06em' }}>
                {count} {count === 1 ? 'book' : 'books'}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ── 5. READING TIMELINE ── */}
      {timeline.length > 0 && (
        <div style={{ padding: '28px 32px 48px' }}>
          <div
            style={{
              ...mono,
              fontSize: '0.6rem',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: '#888',
              marginBottom: 24,
            }}
          >
            reading timeline · all time
          </div>

          <div style={{ position: 'relative', paddingLeft: 24 }}>
            {/* Vertical rule */}
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: 1,
                background: '#D9D0C4',
              }}
            />

            {timeline.map((ub, i) => (
              <div
                key={ub.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 14,
                  marginBottom: 20,
                  position: 'relative',
                }}
              >
                {/* Dot on the timeline */}
                <div
                  style={{
                    position: 'absolute',
                    left: -28,
                    top: 6,
                    width: 6,
                    height: 6,
                    background: i < 3 ? '#1C2B4A' : '#D9D0C4',
                  }}
                />

                {/* Cover thumbnail */}
                <div style={{ flexShrink: 0 }}>
                  <BookCover coverUrl={ub.books?.cover_url} title={ub.books?.title ?? ''} width={28} height={40} />
                </div>

                {/* Book info */}
                <div>
                  <div
                    style={{
                      ...mono,
                      fontSize: '0.58rem',
                      color: '#888',
                      letterSpacing: '0.06em',
                      marginBottom: 2,
                    }}
                  >
                    {ub.date_finished}
                  </div>
                  <div
                    style={{
                      ...serif,
                      fontWeight: 600,
                      fontSize: '0.88rem',
                      color: '#1A1008',
                      lineHeight: 1.3,
                      marginBottom: 1,
                    }}
                  >
                    {ub.books?.title}
                  </div>
                  <div style={{ ...mono, fontSize: '0.58rem', color: '#888' }}>
                    {ub.books?.author}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {timeline.length === 0 && (
            <p style={{ ...serif, fontWeight: 300, fontStyle: 'italic', color: '#888' }}>
              No books finished this year yet.
            </p>
          )}
        </div>
      )}

      {!loading && allReadBooks.length === 0 && (
        <div style={{ padding: '48px 32px' }}>
          <p style={{ ...serif, fontWeight: 300, fontStyle: 'italic', color: '#888' }}>
            Log some books to see your stats.
          </p>
        </div>
      )}
    </div>
  )
}
