import { useState, useEffect } from 'react'
import { useOutletContext, Link } from 'react-router-dom'
import type { OutletCtx } from '../App'
import { supabase } from '../lib/supabase'
import type { UserBook } from '../types'
import StarRating from '../components/StarRating'
import BookCover from '../components/BookCover'

const YEARLY_GOAL = 80

const RECOMMENDATIONS = [
  { title: 'Tomorrow, and Tomorrow, and Tomorrow', author: 'Gabrielle Zevin', genre: 'Literary Fiction' },
  { title: 'The God of Small Things', author: 'Arundhati Roy', genre: 'Literary Fiction' },
  { title: 'Bewilderment', author: 'Richard Powers', genre: 'Science Fiction' },
]

export default function Dashboard() {
  const { user } = useOutletContext<OutletCtx>()
  const [currentlyReading, setCurrentlyReading] = useState<UserBook | null>(null)
  const [recentBooks, setRecentBooks] = useState<UserBook[]>([])
  const [booksThisYear, setBooksThisYear] = useState(0)
  const [pagesThisYear, setPagesThisYear] = useState(0)
  const [loading, setLoading] = useState(true)
  const [crDescription, setCrDescription] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const year = new Date().getFullYear()
      const startOfYear = `${year}-01-01`

      const [crRes, recentRes, statsRes] = await Promise.all([
        supabase
          .from('user_books')
          .select('*, books(*)')
          .eq('user_id', user.id)
          .eq('status', 'CURRENTLY_READING')
          .limit(1)
          .single(),

        supabase
          .from('user_books')
          .select('*, books(*)')
          .eq('user_id', user.id)
          .eq('status', 'READ')
          .order('date_finished', { ascending: false, nullsFirst: false })
          .limit(7),

        supabase
          .from('user_books')
          .select('*, books(*)')
          .eq('user_id', user.id)
          .eq('status', 'READ')
          .gte('date_finished', startOfYear),
      ])

      if (crRes.data) setCurrentlyReading(crRes.data as UserBook)
      if (recentRes.data) setRecentBooks(recentRes.data as UserBook[])
      if (statsRes.data) {
        const books = statsRes.data as UserBook[]
        setBooksThisYear(books.length)
        setPagesThisYear(books.reduce((sum, b) => sum + (b.books?.pages ?? 0), 0))
      }

      setLoading(false)
    }
    load()
  }, [user.id])

  // Fetch Google Books description for currently-reading book
  useEffect(() => {
    if (!currentlyReading?.books) return
    setCrDescription(null)
    const { title, author } = currentlyReading.books
    const q = encodeURIComponent(`intitle:${title} inauthor:${author}`)
    fetch(`https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=1`)
      .then((r) => r.json())
      .then((data) => {
        const desc: string | undefined = data.items?.[0]?.volumeInfo?.description
        if (desc) setCrDescription(desc.length > 300 ? desc.substring(0, 300) + '…' : desc)
      })
      .catch(() => {})
  }, [currentlyReading])

  if (loading) {
    return (
      <div style={{ padding: '60px 28px', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: '#888', letterSpacing: '0.1em' }}>
        loading...
      </div>
    )
  }

  return (
    <div>
      {/* Currently reading hero */}
      {currentlyReading?.books && (() => {
        const b = currentlyReading.books
        const daysAgo = Math.floor(
          (Date.now() - new Date(currentlyReading.created_at).getTime()) / 86_400_000
        )
        const startedText =
          daysAgo === 0 ? 'started today' : `started ${daysAgo} day${daysAgo === 1 ? '' : 's'} ago`
        const meta = [b.author, b.publish_year, b.pages && `${b.pages}p`].filter(Boolean).join(' · ')

        return (
          <Link
            to={`/books/${currentlyReading.id}`}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 20,
              background: '#1C2B4A',
              padding: '28px 24px',
              textDecoration: 'none',
            }}
          >
            {/* Cover */}
            <div style={{ flexShrink: 0, border: '1px solid rgba(245,240,232,0.2)', width: 88, height: 132, overflow: 'hidden' }}>
              <BookCover coverUrl={b.cover_url} title={b.title} width={88} height={132} />
            </div>

            {/* Right column */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '0.5rem',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'rgba(245,240,232,0.4)',
                marginBottom: 6,
              }}>
                currently reading
              </p>
              <p style={{
                fontFamily: "'Spectral', Georgia, serif",
                fontWeight: 600,
                fontSize: '1.625rem',
                lineHeight: 1.1,
                color: 'rgba(245,240,232,0.9)',
                marginBottom: 8,
              }}>
                {b.title}
              </p>
              <p style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '0.5625rem',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'rgba(245,240,232,0.45)',
                marginBottom: 10,
              }}>
                {meta}
              </p>
              {crDescription && (
                <p style={{
                  fontFamily: "'Spectral', Georgia, serif",
                  fontWeight: 300,
                  fontStyle: 'italic',
                  fontSize: '0.8125rem',
                  lineHeight: 1.6,
                  color: 'rgba(245,240,232,0.6)',
                  marginBottom: 10,
                }}>
                  {crDescription}
                </p>
              )}
              <p style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '0.5rem',
                color: 'rgba(245,240,232,0.35)',
                letterSpacing: '0.06em',
              }}>
                {startedText}
              </p>
            </div>
          </Link>
        )
      })()}

      {/* Stats band */}
      <div
        style={{
          background: '#2C1A0E',
          padding: '20px 28px',
          display: 'flex',
          gap: 48,
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        {[
          { value: booksThisYear, label: 'books read this year' },
          { value: pagesThisYear.toLocaleString(), label: 'pages turned' },
          { value: `${booksThisYear} / ${YEARLY_GOAL}`, label: 'yearly goal' },
        ].map((stat) => (
          <div key={stat.label}>
            <div style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: 28,
              fontWeight: 600,
              color: '#F5F0E8',
              lineHeight: 1,
              marginBottom: 4,
            }}>
              {stat.value}
            </div>
            <div style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '0.6rem',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'rgba(245,240,232,0.4)',
            }}>
              {stat.label}
            </div>
          </div>
        ))}

        {/* Goal progress bar */}
        <div style={{ flex: 1, minWidth: 120 }}>
          <div style={{ background: 'rgba(245,240,232,0.1)', height: 2, width: '100%' }}>
            <div
              style={{
                background: '#7B9BAF',
                height: '100%',
                width: `${Math.min((booksThisYear / YEARLY_GOAL) * 100, 100)}%`,
                transition: 'width 0.6s ease',
              }}
            />
          </div>
        </div>
      </div>

      {/* Recently read */}
      <div style={{ padding: '40px 28px' }}>
        <h2 style={{
          fontFamily: "'Spectral', Georgia, serif",
          fontWeight: 300,
          fontStyle: 'italic',
          fontSize: '0.75rem',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: '#888',
          marginBottom: 32,
        }}>
          recently read
        </h2>

        {recentBooks.length === 0 ? (
          <p style={{
            fontFamily: "'Spectral', Georgia, serif",
            fontWeight: 300,
            fontStyle: 'italic',
            color: '#888',
          }}>
            No books logged yet. <Link to="/books/add" style={{ color: '#1C2B4A', textDecoration: 'underline' }}>Add your first book.</Link>
          </p>
        ) : (() => {
          const withBooks = recentBooks.filter((ub) => ub.books)
          const featured = withBooks[0]
          const gridBooks = withBooks.slice(1, 4)
          return (
            <>
              {/* Featured — most recent */}
              {featured && (
                <Link
                  to={`/books/${featured.id}`}
                  style={{
                    display: 'flex',
                    gap: 28,
                    marginBottom: 40,
                    paddingBottom: 40,
                    borderBottom: gridBooks.length > 0 ? '1px solid #D9D0C4' : 'none',
                    textDecoration: 'none',
                  }}
                >
                  <BookCover
                    coverUrl={featured.books!.cover_url}
                    title={featured.books!.title}
                    width={100}
                    height={150}
                    style={{ flexShrink: 0 }}
                  />
                  <div style={{ flex: 1 }}>
                    <span style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: '0.6rem',
                      letterSpacing: '0.1em',
                      color: '#888',
                      display: 'block',
                      marginBottom: 8,
                    }}>
                      (01)
                    </span>
                    <h3 style={{
                      fontFamily: "'Spectral', Georgia, serif",
                      fontWeight: 600,
                      fontSize: '1.4rem',
                      color: '#1A1008',
                      marginBottom: 6,
                      lineHeight: 1.2,
                    }}>
                      {featured.books!.title}
                    </h3>
                    <p style={{
                      fontFamily: "'Spectral', Georgia, serif",
                      fontWeight: 300,
                      fontStyle: 'italic',
                      color: '#888',
                      marginBottom: 12,
                    }}>
                      {featured.books!.author}
                    </p>
                    <p style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: '0.65rem',
                      color: '#888',
                      letterSpacing: '0.04em',
                      marginBottom: 12,
                    }}>
                      {[
                        featured.books!.pages && `${featured.books!.pages}p`,
                        featured.books!.publish_year,
                        featured.books!.genre,
                      ].filter(Boolean).join(' · ')}
                    </p>
                    {featured.rating != null && (
                      <div style={{ marginBottom: 12 }}>
                        <StarRating rating={featured.rating} size={14} />
                      </div>
                    )}
                    {featured.review && (
                      <p style={{
                        fontFamily: "'Spectral', Georgia, serif",
                        fontWeight: 300,
                        fontStyle: 'italic',
                        fontSize: '0.95rem',
                        color: 'rgba(26,16,8,0.7)',
                        lineHeight: 1.6,
                      }}>
                        "{featured.review.length > 200
                          ? featured.review.substring(0, 200) + '…'
                          : featured.review}"
                      </p>
                    )}
                  </div>
                </Link>
              )}

              {/* Grid of up to 3 more */}
              {gridBooks.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
                  {gridBooks.map((ub, i) => (
                    <Link
                      key={ub.id}
                      to={`/books/${ub.id}`}
                      style={{ textDecoration: 'none' }}
                    >
                      <BookCover
                        coverUrl={ub.books!.cover_url}
                        title={ub.books!.title}
                        width="100%"
                        height={undefined}
                        style={{ aspectRatio: '2/3', marginBottom: 10 }}
                      />
                      <span style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: '0.6rem',
                        letterSpacing: '0.1em',
                        color: '#888',
                        display: 'block',
                        marginBottom: 4,
                      }}>
                        ({String(i + 2).padStart(2, '0')})
                      </span>
                      <p style={{
                        fontFamily: "'Spectral', Georgia, serif",
                        fontWeight: 600,
                        fontSize: '0.95rem',
                        color: '#1A1008',
                        marginBottom: 2,
                        lineHeight: 1.3,
                      }}>
                        {ub.books!.title}
                      </p>
                      <p style={{
                        fontFamily: "'Spectral', Georgia, serif",
                        fontWeight: 300,
                        fontStyle: 'italic',
                        fontSize: '0.85rem',
                        color: '#888',
                      }}>
                        {ub.books!.author}
                      </p>
                    </Link>
                  ))}
                </div>
              )}
            </>
          )
        })()}
      </div>

      {/* You might like */}
      <div style={{ padding: '0 28px 60px', borderTop: '1px solid #D9D0C4' }}>
        <h2 style={{
          fontFamily: "'Spectral', Georgia, serif",
          fontWeight: 300,
          fontStyle: 'italic',
          fontSize: '0.75rem',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: '#888',
          margin: '40px 0 28px',
        }}>
          you might like
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
          {RECOMMENDATIONS.map((rec) => (
            <div key={rec.title}>
              <div style={{
                width: '100%',
                aspectRatio: '2/3',
                background: '#EDE7DA',
                marginBottom: 10,
                display: 'flex',
                alignItems: 'flex-end',
                padding: 10,
              }}>
                <span style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: '0.6rem',
                  color: '#888',
                  lineHeight: 1.4,
                }}>
                  {rec.genre}
                </span>
              </div>
              <p style={{
                fontFamily: "'Spectral', Georgia, serif",
                fontWeight: 600,
                fontSize: '0.95rem',
                color: '#1A1008',
                marginBottom: 2,
                lineHeight: 1.3,
              }}>
                {rec.title}
              </p>
              <p style={{
                fontFamily: "'Spectral', Georgia, serif",
                fontWeight: 300,
                fontStyle: 'italic',
                fontSize: '0.85rem',
                color: '#888',
              }}>
                {rec.author}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
