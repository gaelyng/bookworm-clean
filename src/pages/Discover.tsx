import { useState, useEffect, useRef } from 'react'
import { useOutletContext } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { OutletCtx } from '../App'

interface NewsItem {
  title: string
  link: string
  description: string
  pubDate: string
  source: string
}

interface Bestseller {
  title: string
  author: string
  list: string
  rank: number
}

interface OLResult {
  title: string
  author_name?: string[]
  cover_i?: number
  first_publish_year?: number
}

interface Adaptation {
  title: string
  author: string
  film: string
}

const ADAPTATIONS: Adaptation[] = [
  { title: 'The Thursday Murder Club', author: 'Richard Osman', film: 'Netflix · 2025' },
  { title: 'All Fours', author: 'Miranda July', film: 'A24 · 2025' },
  { title: 'Intermezzo', author: 'Sally Rooney', film: 'Apple TV+ · 2025' },
  { title: 'The Women', author: 'Kristin Hannah', film: 'Amazon · 2026' },
]

export default function Discover() {
  const { user } = useOutletContext<OutletCtx>()

  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState<OLResult[]>([])
  const [searchOpen, setSearchOpen] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [news, setNews] = useState<NewsItem[]>([])
  const [newsLoading, setNewsLoading] = useState(true)

  const [bestsellers, setBestsellers] = useState<Bestseller[]>([])
  const [libraryTitles, setLibraryTitles] = useState<Set<string>>(new Set())
  const [adding, setAdding] = useState<string | null>(null)

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  useEffect(() => {
    fetch('/api/literary-news')
      .then(r => r.json())
      .then((data: NewsItem[]) => { setNews(data); setNewsLoading(false) })
      .catch(() => setNewsLoading(false))

    fetch('/api/bestsellers')
      .then(r => r.json())
      .then((data: Bestseller[]) => setBestsellers(data))
      .catch(() => {})

    supabase
      .from('user_books')
      .select('books(title)')
      .eq('user_id', user.id)
      .then(({ data }) => {
        if (data) {
          const titles = new Set(data.flatMap(ub => {
            const b = ub.books as unknown as { title: string } | null
            return b ? [b.title.toLowerCase()] : []
          }))
          setLibraryTitles(titles)
        }
      })
  }, [user.id])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query.trim()) { setSearchResults([]); setSearchOpen(false); return }
    debounceRef.current = setTimeout(async () => {
      try {
        const r = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=6&fields=title,author_name,cover_i,first_publish_year`)
        const json = await r.json()
        setSearchResults((json.docs as OLResult[]) || [])
        setSearchOpen(true)
      } catch {
        setSearchResults([])
      }
    }, 350)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query])

  async function insertBook(title: string, author: string) {
    const { data: existing } = await supabase.from('books').select('id').eq('title', title).single()
    let bookId: string
    if (existing) {
      bookId = existing.id
    } else {
      const { data: inserted } = await supabase.from('books').insert({ title, author }).select('id').single()
      if (!inserted) return
      bookId = inserted.id
    }
    await supabase.from('user_books').upsert(
      { user_id: user.id, book_id: bookId, status: 'WANT_TO_READ' },
      { onConflict: 'user_id,book_id' }
    )
    setLibraryTitles(prev => new Set([...prev, title.toLowerCase()]))
  }

  async function handleSearchAdd(result: OLResult, key: string) {
    setAdding(key)
    try { await insertBook(result.title, result.author_name?.[0] || '') } catch {}
    setAdding(null)
  }

  async function handleNewsAdd(item: NewsItem, key: string) {
    setAdding(key)
    try {
      const r = await fetch(`https://openlibrary.org/search.json?title=${encodeURIComponent(item.title)}&limit=1&fields=title,author_name`)
      const json = await r.json()
      const doc = (json.docs as OLResult[])?.[0]
      await insertBook(doc?.title || item.title, doc?.author_name?.[0] || '')
    } catch {}
    setAdding(null)
  }

  async function handleBestsellerAdd(book: Bestseller, key: string) {
    setAdding(key)
    try { await insertBook(book.title, book.author) } catch {}
    setAdding(null)
  }

  const featured = news[0]
  const gridItems = news.slice(1, 7)
  const displayBestsellers = [
    ...bestsellers.filter(b => b.list === 'Hardcover Fiction').slice(0, 4),
    ...bestsellers.filter(b => b.list === 'Hardcover Nonfiction').slice(0, 4),
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#F5F0E8' }}>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}`}</style>

      {/* Section A: Dark hero */}
      <div style={{ background: '#2C1A0E', padding: '28px 24px 24px', position: 'relative' }}>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontFamily: "'Spectral', Georgia, serif", fontWeight: 600, fontSize: 42, color: '#F5F0E8', lineHeight: 1 }}>discover</div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: 'rgba(245,240,232,0.35)', letterSpacing: '0.06em', marginTop: 6 }}>
            {today.toLowerCase()}
          </div>
        </div>

        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(245,240,232,0.08)', border: '1px solid rgba(245,240,232,0.15)', padding: '10px 14px', gap: 10 }}>
            <span style={{ color: 'rgba(245,240,232,0.4)', fontSize: 16 }}>⌕</span>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              onFocus={() => searchResults.length > 0 && setSearchOpen(true)}
              placeholder="search books, authors..."
              style={{
                flex: 1, background: 'none', border: 'none', outline: 'none',
                fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem',
                color: '#F5F0E8', letterSpacing: '0.04em',
              }}
            />
          </div>

          {searchOpen && searchResults.length > 0 && (
            <div style={{ position: 'absolute', top: 'calc(100% + 2px)', left: 0, right: 0, background: '#1A0E05', border: '1px solid rgba(245,240,232,0.12)', zIndex: 50, maxHeight: 320, overflowY: 'auto' }}>
              {searchResults.map((result, i) => (
                <div
                  key={i}
                  style={{ padding: '12px 16px', borderBottom: i < searchResults.length - 1 ? '1px solid rgba(245,240,232,0.06)' : 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}
                  onClick={() => { handleSearchAdd(result, `s${i}`); setSearchOpen(false); setQuery('') }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(245,240,232,0.04)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'none'}
                >
                  <div>
                    <div style={{ fontFamily: "'Spectral', Georgia, serif", fontStyle: 'italic', fontSize: '0.9rem', color: '#F5F0E8' }}>{result.title}</div>
                    {result.author_name?.[0] && (
                      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: 'rgba(245,240,232,0.4)', marginTop: 2 }}>
                        {result.author_name[0]}{result.first_publish_year ? ` · ${result.first_publish_year}` : ''}
                      </div>
                    )}
                  </div>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: 'rgba(245,240,232,0.35)', flexShrink: 0 }}>
                    {adding === `s${i}` ? '...' : '+ add'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {searchOpen && <div onClick={() => setSearchOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />}
      </div>

      {/* Section B: News grid */}
      <div style={{ background: '#F5F0E8' }}>
        <div style={{ padding: '20px 24px 0' }}>
          <div style={{ borderBottom: '1px solid #D9D0C4', paddingBottom: 12, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(26,16,8,0.4)' }}>literary news</span>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.5rem', color: 'rgba(26,16,8,0.3)' }}>nyt · guardian · lit hub · pw</span>
          </div>
        </div>

        {newsLoading ? (
          <div style={{ padding: '0 24px' }}>
            <div style={{ padding: '20px 0', borderBottom: '1px solid #D9D0C4' }}>
              <div style={{ height: 120, background: '#E8E2D9', animation: 'pulse 1.5s ease-in-out infinite' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
              {[0,1,2,3,4,5].map(i => (
                <div key={i} style={{ padding: 16, borderRight: i % 2 === 0 ? '1px solid #D9D0C4' : 'none', borderBottom: i < 4 ? '1px solid #D9D0C4' : 'none' }}>
                  <div style={{ height: 72, background: '#E8E2D9', animation: 'pulse 1.5s ease-in-out infinite' }} />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            {featured && (
              <div style={{ padding: '20px 24px', borderBottom: '1px solid #D9D0C4' }}>
                <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.5rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(26,16,8,0.35)', marginBottom: 8 }}>{featured.source}</div>
                    <a href={featured.link} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                      <div style={{ fontFamily: "'Spectral', Georgia, serif", fontWeight: 600, fontSize: '1.1rem', color: '#1A1008', lineHeight: 1.3, marginBottom: 10 }}>{featured.title}</div>
                    </a>
                    {featured.description && (
                      <div style={{ fontFamily: "'Spectral', Georgia, serif", fontWeight: 300, fontStyle: 'italic', fontSize: '0.85rem', color: 'rgba(26,16,8,0.6)', lineHeight: 1.6, marginBottom: 12 }}>
                        {featured.description.replace(/<[^>]*>/g, '').slice(0, 180)}...
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.5rem', color: 'rgba(26,16,8,0.3)' }}>
                        {featured.pubDate ? new Date(featured.pubDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                      </span>
                      <button
                        onClick={() => handleNewsAdd(featured, 'feat')}
                        style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', letterSpacing: '0.06em', textTransform: 'uppercase', background: 'none', border: '1px solid #D9D0C4', color: 'rgba(26,16,8,0.5)', padding: '5px 12px', cursor: 'pointer' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#1A1008'; (e.currentTarget as HTMLElement).style.color = '#1A1008' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#D9D0C4'; (e.currentTarget as HTMLElement).style.color = 'rgba(26,16,8,0.5)' }}
                      >
                        {adding === 'feat' ? '...' : '+ want to read'}
                      </button>
                    </div>
                  </div>
                  <div style={{ width: 160, flexShrink: 0, background: '#E8E2D9', height: 120 }} />
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', marginBottom: 32 }}>
              {gridItems.map((item, i) => (
                <div key={i} style={{
                  padding: '16px 20px',
                  borderRight: i % 2 === 0 ? '1px solid #D9D0C4' : 'none',
                  borderBottom: i < gridItems.length - (gridItems.length % 2 === 0 ? 2 : 1) ? '1px solid #D9D0C4' : 'none',
                }}>
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.5rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(26,16,8,0.3)', marginBottom: 6 }}>{item.source}</div>
                  <a href={item.link} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                    <div style={{ fontFamily: "'Spectral', Georgia, serif", fontWeight: 600, fontSize: '0.88rem', color: '#1A1008', lineHeight: 1.35, marginBottom: 10 }}>{item.title}</div>
                  </a>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.5rem', color: 'rgba(26,16,8,0.3)' }}>
                      {item.pubDate ? new Date(item.pubDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                    </span>
                    <button
                      onClick={() => handleNewsAdd(item, `n${i}`)}
                      style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.55rem', letterSpacing: '0.04em', background: 'none', border: 'none', color: 'rgba(26,16,8,0.35)', cursor: 'pointer', padding: '2px 0' }}
                    >
                      {adding === `n${i}` ? '...' : '+ want to read'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Section C: NYT bestsellers band */}
      {displayBestsellers.length > 0 && (
        <div style={{ background: '#2C1A0E', padding: '24px 0 32px' }}>
          <div style={{ padding: '0 24px', marginBottom: 16, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(245,240,232,0.4)' }}>nyt bestsellers</span>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.5rem', color: 'rgba(245,240,232,0.25)' }}>this week</span>
          </div>
          <div style={{ display: 'flex', overflowX: 'auto', paddingLeft: 24, paddingRight: 24, scrollbarWidth: 'none' }}>
            {displayBestsellers.map((book, i) => {
              const inLibrary = libraryTitles.has(book.title.toLowerCase())
              const key = `b${i}`
              return (
                <div key={i} style={{ flexShrink: 0, width: 140, marginRight: 16 }}>
                  <div style={{ position: 'relative', width: 80, height: 112, background: 'rgba(245,240,232,0.06)', marginBottom: 10 }}>
                    <div style={{ position: 'absolute', top: 4, left: 4, background: '#2C1A0E', border: '1px solid rgba(245,240,232,0.2)', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.55rem', color: 'rgba(245,240,232,0.7)', zIndex: 2 }}>
                      {book.rank}
                    </div>
                    {inLibrary && (
                      <div style={{ position: 'absolute', top: 4, right: 4, background: '#2C6B3F', width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.5rem', color: '#fff', zIndex: 2 }}>
                        ✓
                      </div>
                    )}
                  </div>
                  <div style={{ fontFamily: "'Spectral', Georgia, serif", fontWeight: 600, fontStyle: 'italic', fontSize: '0.8rem', color: '#F5F0E8', lineHeight: 1.3, marginBottom: 3 }}>{book.title}</div>
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.5rem', color: 'rgba(245,240,232,0.4)', marginBottom: 4 }}>{book.author}</div>
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.48rem', color: 'rgba(245,240,232,0.2)', marginBottom: 8, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{book.list}</div>
                  {!inLibrary && (
                    <button
                      onClick={() => handleBestsellerAdd(book, key)}
                      style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.55rem', letterSpacing: '0.04em', background: 'none', border: '1px solid rgba(245,240,232,0.2)', color: 'rgba(245,240,232,0.5)', padding: '4px 10px', cursor: 'pointer' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(245,240,232,0.5)'; (e.currentTarget as HTMLElement).style.color = '#F5F0E8' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(245,240,232,0.2)'; (e.currentTarget as HTMLElement).style.color = 'rgba(245,240,232,0.5)' }}
                    >
                      {adding === key ? '...' : '+ add'}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Section D: Adaptations */}
      <div style={{ background: '#EDE7DA', padding: '24px 0 40px' }}>
        <div style={{ padding: '0 24px', marginBottom: 16 }}>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(26,16,8,0.4)' }}>coming to screen</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: '#D9D0C4', margin: '0 24px' }}>
          {ADAPTATIONS.map((a, i) => (
            <div key={i} style={{ background: '#EDE7DA', padding: '20px 18px' }}>
              <div style={{ fontFamily: "'Spectral', Georgia, serif", fontWeight: 600, fontStyle: 'italic', fontSize: '0.95rem', color: '#1A1008', lineHeight: 1.3, marginBottom: 4 }}>{a.title}</div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.55rem', color: 'rgba(26,16,8,0.45)', marginBottom: 10 }}>{a.author}</div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.55rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(26,16,8,0.35)' }}>{a.film}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
