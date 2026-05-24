import { useState, useEffect } from 'react'
import { useOutletContext, useNavigate } from 'react-router-dom'
import type { OutletCtx } from '../App'
import { supabase } from '../lib/supabase'
import type { Status } from '../types'

interface OLDoc {
  key: string
  title: string
  author_name?: string[]
  cover_i?: number
  first_publish_year?: number
  number_of_pages_median?: number
  subject?: string[]
  isbn?: string[]
}

interface SearchResult {
  key: string
  title: string
  author: string
  coverUrl: string | null
  coverThumb: string | null
  publishYear: number | null
  pages: number | null
  genre: string | null
  isbn: string | null
}

const STATUS_OPTIONS: { value: Status; label: string }[] = [
  { value: 'READ', label: 'Read' },
  { value: 'CURRENTLY_READING', label: 'Currently Reading' },
  { value: 'WANT_TO_READ', label: 'Want to Read' },
  { value: 'PRE_PUBLICATION', label: 'Pre-Publication' },
]

export default function AddBook() {
  const { user } = useOutletContext<OutletCtx>()
  const navigate = useNavigate()

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)

  const [selected, setSelected] = useState<SearchResult | null>(null)
  const [status, setStatus] = useState<Status>('READ')
  const [dateFinished, setDateFinished] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const [showManual, setShowManual] = useState(false)
  const [manualTitle, setManualTitle] = useState('')
  const [manualAuthor, setManualAuthor] = useState('')
  const [manualYear, setManualYear] = useState('')
  const [manualPages, setManualPages] = useState('')
  const [manualGenre, setManualGenre] = useState('')

  // Live search with 350ms debounce
  useEffect(() => {
    if (query.length < 2) {
      setResults([])
      return
    }

    const timer = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(
          `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=8`
        )
        const data = await res.json()
        setResults(
          (data.docs as OLDoc[]).map((doc) => ({
            key: doc.key,
            title: doc.title,
            author: doc.author_name?.[0] ?? 'Unknown',
            coverUrl: doc.cover_i
              ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
              : null,
            coverThumb: doc.cover_i
              ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-S.jpg`
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
    }, 350)

    return () => clearTimeout(timer)
  }, [query])

  async function handleAddBook(bookData: {
    title: string
    author: string
    cover_url: string | null
    publish_year: number | null
    pages: number | null
    genre: string | null
    isbn: string | null
  }) {
    setSaving(true)
    setSaveError(null)

    let bookId: string | null = null
    if (bookData.isbn) {
      const { data: existing } = await supabase
        .from('books')
        .select('id')
        .eq('isbn', bookData.isbn)
        .single()
      if (existing) bookId = existing.id
    }

    if (!bookId) {
      const { data: newBook, error: bookErr } = await supabase
        .from('books')
        .insert(bookData)
        .select('id')
        .single()
      if (bookErr || !newBook) {
        setSaveError(bookErr?.message ?? 'Failed to add book.')
        setSaving(false)
        return
      }
      bookId = newBook.id
    }

    const { error: ubErr } = await supabase.from('user_books').insert({
      user_id: user.id,
      book_id: bookId,
      status,
      date_finished: dateFinished || null,
    })

    if (ubErr) {
      setSaveError(ubErr.message)
      setSaving(false)
      return
    }

    navigate('/books')
  }

  async function handleConfirmAdd() {
    if (!selected) return
    await handleAddBook({
      title: selected.title,
      author: selected.author,
      cover_url: selected.coverUrl,
      publish_year: selected.publishYear,
      pages: selected.pages,
      genre: selected.genre,
      isbn: selected.isbn,
    })
  }

  async function handleManualAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!manualTitle || !manualAuthor) return
    await handleAddBook({
      title: manualTitle,
      author: manualAuthor,
      cover_url: null,
      publish_year: manualYear ? parseInt(manualYear) : null,
      pages: manualPages ? parseInt(manualPages) : null,
      genre: manualGenre || null,
      isbn: null,
    })
  }

  const mono: React.CSSProperties = { fontFamily: "'IBM Plex Mono', monospace" }
  const serif: React.CSSProperties = { fontFamily: "'Spectral', Georgia, serif" }
  const labelStyle: React.CSSProperties = {
    ...mono,
    fontSize: '0.6rem',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: '#888',
    display: 'block',
    marginBottom: 6,
  }
  const inputStyle: React.CSSProperties = {
    ...serif,
    width: '100%',
    padding: '8px 0',
    borderBottom: '1px solid #D9D0C4',
    fontSize: '0.95rem',
    color: '#1A1008',
    marginBottom: 18,
    background: 'transparent',
  }

  return (
    <div style={{ padding: '40px 28px', maxWidth: 720 }}>
      <h1 style={{ ...serif, fontWeight: 600, fontSize: '2rem', color: '#1A1008', marginBottom: 32 }}>
        log a book
      </h1>

      {/* Live search input */}
      <div style={{ position: 'relative', marginBottom: 8 }}>
        <input
          type="text"
          placeholder="search by title, author, or ISBN…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setSelected(null)
          }}
          style={{
            width: '100%',
            ...serif,
            fontSize: '1rem',
            padding: '10px 0',
            borderBottom: '2px solid #2C1A0E',
            color: '#1A1008',
            background: 'transparent',
          }}
        />
      </div>

      {/* Status line */}
      <div style={{ ...mono, fontSize: '0.6rem', color: '#888', letterSpacing: '0.08em', marginBottom: 24, minHeight: 16 }}>
        {searching && 'searching…'}
        {!searching && query.length >= 2 && results.length > 0 && `${results.length} results`}
        {!searching && query.length >= 2 && results.length === 0 && !selected && 'no results'}
        {query.length > 0 && query.length < 2 && 'type at least 2 characters'}
      </div>

      {/* Search results */}
      {results.length > 0 && !selected && (
        <div style={{ marginBottom: 32 }}>
          {results.map((result) => (
            <button
              key={result.key}
              onClick={() => {
                setSelected(result)
                setStatus('READ')
                setDateFinished('')
                setSaveError(null)
                setShowManual(false)
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '12px 0',
                borderBottom: '1px solid #D9D0C4',
                background: 'none',
                textAlign: 'left',
                cursor: 'pointer',
                width: '100%',
              }}
            >
              <div style={{ width: 28, height: 40, flexShrink: 0, background: '#EDE7DA', overflow: 'hidden' }}>
                {result.coverThumb && (
                  <img
                    src={result.coverThumb}
                    alt=""
                    style={{ width: 28, height: 40, objectFit: 'cover', display: 'block' }}
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                  />
                )}
              </div>
              <div>
                <p style={{ ...serif, fontWeight: 600, fontSize: '0.95rem', color: '#1A1008', marginBottom: 2 }}>
                  {result.title}
                </p>
                <p style={{ ...mono, fontSize: '0.6rem', color: '#888', letterSpacing: '0.04em' }}>
                  {[result.author, result.publishYear].filter(Boolean).join(' · ')}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Confirm selected book */}
      {selected && (
        <div style={{ border: '1px solid #D9D0C4', padding: 24, marginBottom: 32 }}>
          <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
            <div style={{ width: 72, flexShrink: 0, background: '#EDE7DA', aspectRatio: '2/3', overflow: 'hidden' }}>
              {selected.coverUrl && (
                <img
                  src={selected.coverUrl}
                  alt={selected.title}
                  style={{ width: 72, display: 'block', objectFit: 'cover' }}
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                />
              )}
            </div>
            <div>
              <p style={{ ...serif, fontWeight: 600, fontSize: '1.1rem', color: '#1A1008', marginBottom: 4 }}>
                {selected.title}
              </p>
              <p style={{ ...serif, fontWeight: 300, fontStyle: 'italic', color: '#888', marginBottom: 8 }}>
                {selected.author}
              </p>
              <p style={{ ...mono, fontSize: '0.6rem', color: '#888', letterSpacing: '0.04em' }}>
                {[
                  selected.publishYear,
                  selected.pages && `${selected.pages}p`,
                  selected.genre,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            </div>
          </div>

          <label>
            <span style={labelStyle}>status</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as Status)}
              style={{ ...inputStyle, appearance: 'none' as const, cursor: 'pointer' }}
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>

          {status === 'READ' && (
            <label>
              <span style={labelStyle}>date finished</span>
              <input
                type="date"
                value={dateFinished}
                onChange={(e) => setDateFinished(e.target.value)}
                style={{ ...inputStyle, ...mono }}
              />
            </label>
          )}

          {saveError && (
            <p style={{ ...mono, fontSize: '0.7rem', color: '#888', marginBottom: 12 }}>{saveError}</p>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={handleConfirmAdd}
              disabled={saving}
              style={{
                fontFamily: "'Courier Prime', 'Courier New', monospace",
                fontWeight: 700,
                fontSize: '0.72rem',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                padding: '10px 18px',
                background: '#1C2B4A',
                color: '#F5F0E8',
                border: 'none',
                opacity: saving ? 0.6 : 1,
                cursor: saving ? 'not-allowed' : 'pointer',
              }}
            >
              {saving ? 'adding...' : 'add to my books'}
            </button>
            <button
              onClick={() => setSelected(null)}
              style={{
                ...mono,
                fontSize: '0.65rem',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                padding: '10px 14px',
                background: 'none',
                border: '1px solid #D9D0C4',
                color: '#888',
              }}
            >
              ← back
            </button>
          </div>
        </div>
      )}

      {/* Manual entry */}
      <div>
        <button
          onClick={() => {
            setShowManual((v) => !v)
            setSelected(null)
          }}
          style={{
            ...mono,
            fontSize: '0.6rem',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: '#888',
            background: 'none',
            padding: 0,
            textDecoration: 'underline',
            textUnderlineOffset: 3,
          }}
        >
          {showManual ? 'hide manual entry' : 'enter manually'}
        </button>

        {showManual && (
          <form onSubmit={handleManualAdd} style={{ marginTop: 24 }}>
            <label>
              <span style={labelStyle}>title *</span>
              <input required value={manualTitle} onChange={(e) => setManualTitle(e.target.value)} style={inputStyle} />
            </label>
            <label>
              <span style={labelStyle}>author *</span>
              <input required value={manualAuthor} onChange={(e) => setManualAuthor(e.target.value)} style={inputStyle} />
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
              <label>
                <span style={labelStyle}>year</span>
                <input type="number" value={manualYear} onChange={(e) => setManualYear(e.target.value)} style={inputStyle} />
              </label>
              <label>
                <span style={labelStyle}>pages</span>
                <input type="number" value={manualPages} onChange={(e) => setManualPages(e.target.value)} style={inputStyle} />
              </label>
              <label>
                <span style={labelStyle}>genre</span>
                <input value={manualGenre} onChange={(e) => setManualGenre(e.target.value)} style={inputStyle} />
              </label>
            </div>
            <label>
              <span style={labelStyle}>status</span>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as Status)}
                style={{ ...inputStyle, appearance: 'none' as const, cursor: 'pointer' }}
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </label>
            {status === 'READ' && (
              <label>
                <span style={labelStyle}>date finished</span>
                <input
                  type="date"
                  value={dateFinished}
                  onChange={(e) => setDateFinished(e.target.value)}
                  style={{ ...inputStyle, ...mono }}
                />
              </label>
            )}
            {saveError && (
              <p style={{ ...mono, fontSize: '0.7rem', color: '#888', marginBottom: 12 }}>{saveError}</p>
            )}
            <button
              type="submit"
              disabled={saving}
              style={{
                fontFamily: "'Courier Prime', 'Courier New', monospace",
                fontWeight: 700,
                fontSize: '0.72rem',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                padding: '10px 18px',
                background: '#1C2B4A',
                color: '#F5F0E8',
                border: 'none',
                opacity: saving ? 0.6 : 1,
                cursor: saving ? 'not-allowed' : 'pointer',
              }}
            >
              {saving ? 'adding...' : 'add to my books'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
