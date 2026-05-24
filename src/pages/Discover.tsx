import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Book, Status } from '../types'
import { useOutletContext } from 'react-router-dom'
import type { OutletCtx } from '../App'

const FILTERS = [
  'COZY',
  'PROPULSIVE',
  'HEARTBREAKING',
  'EPIC',
  'SHORT',
  'NONFICTION',
  'DEBUT',
]

interface OLSearchResult {
  key: string
  title: string
  author_name?: string[]
  cover_i?: number
  first_publish_year?: number
  number_of_pages_median?: number
  subject?: string[]
  isbn?: string[]
}

interface DiscoverBook {
  key: string
  title: string
  author: string
  coverUrl: string | null
  publishYear: number | null
  pages: number | null
  genre: string | null
  isbn: string | null
}

export default function Discover() {
  const { user } = useOutletContext<OutletCtx>()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [activeFilters, setActiveFilters] = useState<string[]>([])
  const [results, setResults] = useState<DiscoverBook[]>([])
  const [searching, setSearching] = useState(false)
  const [addingKey, setAddingKey] = useState<string | null>(null)

  function toggleFilter(f: string) {
    setActiveFilters((prev) =>
      prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]
    )
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const q = [query, ...activeFilters.map((f) => f.toLowerCase())].filter(Boolean).join(' ')
    if (!q) return
    setSearching(true)
    setResults([])
    try {
      const res = await fetch(
        `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=12`
      )
      const data = await res.json()
      setResults(
        (data.docs as OLSearchResult[]).map((doc) => ({
          key: doc.key,
          title: doc.title,
          author: doc.author_name?.[0] ?? 'Unknown',
          coverUrl: doc.cover_i
            ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
            : null,
          publishYear: doc.first_publish_year ?? null,
          pages: doc.number_of_pages_median ?? null,
          genre: doc.subject?.[0] ?? null,
          isbn: doc.isbn?.[0] ?? null,
        }))
      )
    } catch {
      // silent fail
    }
    setSearching(false)
  }

  async function handleQuickAdd(book: DiscoverBook, status: Status) {
    setAddingKey(book.key)

    let bookId: string | null = null
    if (book.isbn) {
      const { data: existing } = await supabase.from('books').select('id').eq('isbn', book.isbn).single()
      if (existing) bookId = existing.id
    }

    if (!bookId) {
      const { data: newBook } = await supabase
        .from('books')
        .insert({
          title: book.title,
          author: book.author,
          cover_url: book.coverUrl,
          publish_year: book.publishYear,
          pages: book.pages,
          genre: book.genre,
          isbn: book.isbn,
        } as Omit<Book, 'id'>)
        .select('id')
        .single()
      if (newBook) bookId = newBook.id
    }

    if (bookId) {
      await supabase.from('user_books').insert({
        user_id: user.id,
        book_id: bookId,
        status,
      })
      navigate('/books')
    }
    setAddingKey(null)
  }

  const mono: React.CSSProperties = { fontFamily: "'IBM Plex Mono', monospace" }
  const serif: React.CSSProperties = { fontFamily: "'Spectral', Georgia, serif" }

  return (
    <div style={{ background: '#2C1A0E', minHeight: 'calc(100vh - 90px)', padding: '48px 32px' }}>
      <h1 style={{ ...mono, fontSize: '0.65rem', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(245,240,232,0.35)', marginBottom: 32 }}>
        discover
      </h1>

      {/* Search */}
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
        <input
          type="text"
          placeholder="search books…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{
            flex: 1,
            ...serif,
            fontSize: '1rem',
            padding: '10px 0',
            borderBottom: '1px solid rgba(245,240,232,0.2)',
            background: 'transparent',
            color: '#F5F0E8',
          }}
        />
        <button
          type="submit"
          disabled={searching}
          style={{
            fontFamily: "'Courier Prime', 'Courier New', monospace",
            fontWeight: 700,
            fontSize: '0.72rem',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            padding: '10px 18px',
            background: 'rgba(245,240,232,0.1)',
            color: '#F5F0E8',
            border: '1px solid rgba(245,240,232,0.15)',
            opacity: searching ? 0.5 : 1,
          }}
        >
          {searching ? '...' : 'search'}
        </button>
      </form>

      {/* Filter chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 36 }}>
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => toggleFilter(f)}
            style={{
              ...mono,
              fontSize: '0.6rem',
              letterSpacing: '0.1em',
              padding: '5px 10px',
              background: activeFilters.includes(f) ? 'rgba(245,240,232,0.15)' : 'transparent',
              color: activeFilters.includes(f) ? '#F5F0E8' : 'rgba(245,240,232,0.4)',
              border: `1px solid ${activeFilters.includes(f) ? 'rgba(245,240,232,0.3)' : 'rgba(245,240,232,0.12)'}`,
              cursor: 'pointer',
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 20 }}>
          {results.map((book) => (
            <div key={book.key}>
              <div style={{ marginBottom: 10, position: 'relative' }}>
                {book.coverUrl ? (
                  <img src={book.coverUrl} alt={book.title} style={{ width: '100%', aspectRatio: '2/3', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '100%', aspectRatio: '2/3', background: 'rgba(245,240,232,0.06)', display: 'flex', alignItems: 'flex-end', padding: 8 }}>
                    <span style={{ ...mono, fontSize: '0.55rem', color: 'rgba(245,240,232,0.4)', lineHeight: 1.3 }}>{book.title}</span>
                  </div>
                )}
              </div>
              <p style={{ ...serif, fontWeight: 600, fontSize: '0.88rem', color: '#F5F0E8', marginBottom: 2, lineHeight: 1.3 }}>
                {book.title}
              </p>
              <p style={{ ...serif, fontWeight: 300, fontStyle: 'italic', fontSize: '0.78rem', color: 'rgba(245,240,232,0.5)', marginBottom: 8 }}>
                {book.author}
              </p>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={() => handleQuickAdd(book, 'WANT_TO_READ')}
                  disabled={addingKey === book.key}
                  style={{
                    ...mono,
                    fontSize: '0.55rem',
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    padding: '4px 7px',
                    background: 'transparent',
                    color: 'rgba(245,240,232,0.5)',
                    border: '1px solid rgba(245,240,232,0.15)',
                    cursor: 'pointer',
                    opacity: addingKey === book.key ? 0.4 : 1,
                  }}
                >
                  + want
                </button>
                <button
                  onClick={() => handleQuickAdd(book, 'READ')}
                  disabled={addingKey === book.key}
                  style={{
                    ...mono,
                    fontSize: '0.55rem',
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    padding: '4px 7px',
                    background: 'rgba(245,240,232,0.08)',
                    color: 'rgba(245,240,232,0.7)',
                    border: '1px solid rgba(245,240,232,0.15)',
                    cursor: 'pointer',
                    opacity: addingKey === book.key ? 0.4 : 1,
                  }}
                >
                  + read
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {results.length === 0 && !searching && (
        <p style={{ ...serif, fontWeight: 300, fontStyle: 'italic', color: 'rgba(245,240,232,0.3)', fontSize: '1rem' }}>
          Search for a book or select a mood above.
        </p>
      )}
    </div>
  )
}
