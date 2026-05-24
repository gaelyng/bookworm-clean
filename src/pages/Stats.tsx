import { useState, useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import type { OutletCtx } from '../App'
import { supabase } from '../lib/supabase'
import type { UserBook } from '../types'

export default function Stats() {
  const { user } = useOutletContext<OutletCtx>()
  const [allRead, setAllRead] = useState<UserBook[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('user_books')
      .select('*, books(*)')
      .eq('user_id', user.id)
      .eq('status', 'READ')
      .then(({ data }) => {
        if (data) setAllRead(data as UserBook[])
        setLoading(false)
      })
  }, [user.id])

  const year = new Date().getFullYear()
  const booksThisYear = allRead.filter(
    (ub) => ub.date_finished && ub.date_finished.startsWith(String(year))
  )
  const totalPages = allRead.reduce((sum, ub) => sum + (ub.books?.pages ?? 0), 0)
  const pagesThisYear = booksThisYear.reduce((sum, ub) => sum + (ub.books?.pages ?? 0), 0)

  // Most read author
  const authorCounts: Record<string, number> = {}
  allRead.forEach((ub) => {
    const a = ub.books?.author
    if (a) authorCounts[a] = (authorCounts[a] ?? 0) + 1
  })
  const mostReadAuthor = Object.entries(authorCounts).sort((a, b) => b[1] - a[1])[0]

  // Average rating
  const rated = allRead.filter((ub) => ub.rating != null)
  const avgRating = rated.length > 0
    ? (rated.reduce((sum, ub) => sum + (ub.rating ?? 0), 0) / rated.length).toFixed(1)
    : null

  const mono: React.CSSProperties = { fontFamily: "'IBM Plex Mono', monospace" }
  const cormorant: React.CSSProperties = { fontFamily: "'Cormorant Garamond', Georgia, serif" }

  const statBlock = (value: string | number, label: string, sub?: string) => (
    <div style={{ borderBottom: '1px solid rgba(245,240,232,0.08)', paddingBottom: 32, marginBottom: 32 }}>
      <div style={{ ...cormorant, fontSize: 64, fontWeight: 300, color: '#F5F0E8', lineHeight: 1, marginBottom: 8 }}>
        {value}
      </div>
      <div style={{ ...mono, fontSize: '0.65rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(245,240,232,0.45)' }}>
        {label}
      </div>
      {sub && (
        <div style={{ ...mono, fontSize: '0.6rem', color: 'rgba(245,240,232,0.25)', marginTop: 4 }}>
          {sub}
        </div>
      )}
    </div>
  )

  return (
    <div style={{ background: '#2C1A0E', minHeight: 'calc(100vh - 90px)', padding: '48px 40px' }}>
      <h1 style={{ ...mono, fontSize: '0.65rem', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(245,240,232,0.35)', marginBottom: 48 }}>
        reading stats
      </h1>

      {loading ? (
        <p style={{ ...mono, fontSize: '0.65rem', color: 'rgba(245,240,232,0.3)', letterSpacing: '0.08em' }}>loading...</p>
      ) : (
        <div style={{ maxWidth: 560 }}>
          {statBlock(booksThisYear.length, `books read in ${year}`)}
          {statBlock(pagesThisYear.toLocaleString(), `pages turned in ${year}`)}
          {statBlock(allRead.length, 'total books read')}
          {statBlock(totalPages.toLocaleString(), 'total pages ever')}
          {mostReadAuthor && statBlock(
            mostReadAuthor[0],
            'most read author',
            `${mostReadAuthor[1]} book${mostReadAuthor[1] === 1 ? '' : 's'}`
          )}
          {avgRating && statBlock(avgRating, 'average rating', `across ${rated.length} rated books`)}

          {allRead.length === 0 && (
            <p style={{ fontFamily: "'Spectral', Georgia, serif", fontWeight: 300, fontStyle: 'italic', color: 'rgba(245,240,232,0.4)', marginTop: -8 }}>
              Log some books to see your stats.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
