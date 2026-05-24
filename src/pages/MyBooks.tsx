import { useState, useEffect, useCallback } from 'react'
import { useOutletContext, Link } from 'react-router-dom'
import type { OutletCtx } from '../App'
import { supabase } from '../lib/supabase'
import type { UserBook, Status } from '../types'
import StarRating from '../components/StarRating'
import BookCover from '../components/BookCover'

type SortKey = 'created_at' | 'title' | 'author' | 'rating' | 'date_finished'
type ViewMode = 'list' | 'covers'

const STATUS_LABELS: Record<Status, string> = {
  READ: 'read',
  CURRENTLY_READING: 'reading',
  WANT_TO_READ: 'want to read',
  PRE_PUBLICATION: 'pre-pub',
}

const STATUS_OPTIONS: Status[] = ['READ', 'CURRENTLY_READING', 'WANT_TO_READ', 'PRE_PUBLICATION']

interface EditModalProps {
  book: UserBook
  onSave: (updates: Partial<UserBook>) => Promise<void>
  onClose: () => void
}

function EditModal({ book, onSave, onClose }: EditModalProps) {
  const [status, setStatus] = useState<Status>(book.status)
  const [rating, setRating] = useState<number | null>(book.rating)
  const [dateFinished, setDateFinished] = useState(book.date_finished ?? '')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    await onSave({ status, rating, date_finished: dateFinished || null })
    setSaving(false)
    onClose()
  }

  const labelStyle: React.CSSProperties = {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: '0.6rem',
    letterSpacing: '0.1em',
    textTransform: 'uppercase' as const,
    color: '#888',
    display: 'block',
    marginBottom: 6,
  }

  const selectStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 0',
    borderBottom: '1px solid #D9D0C4',
    fontSize: '0.9rem',
    color: '#1A1008',
    marginBottom: 20,
    fontFamily: "'Spectral', Georgia, serif",
    appearance: 'none' as const,
    cursor: 'pointer',
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(44,26,14,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 300,
        padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#F5F0E8',
          width: '100%',
          maxWidth: 400,
          padding: 28,
          border: '1px solid #D9D0C4',
        }}
      >
        <p style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: '0.6rem',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: '#888',
          marginBottom: 4,
        }}>
          edit
        </p>
        <p style={{
          fontFamily: "'Spectral', Georgia, serif",
          fontWeight: 600,
          fontSize: '1.1rem',
          color: '#1A1008',
          marginBottom: 24,
        }}>
          {book.books?.title}
        </p>

        <label>
          <span style={labelStyle}>status</span>
          <select value={status} onChange={(e) => setStatus(e.target.value as Status)} style={selectStyle}>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
        </label>

        <label>
          <span style={labelStyle}>rating</span>
          <div style={{ marginBottom: 20 }}>
            <StarRating rating={rating} onRate={setRating} size={20} />
          </div>
        </label>

        <label>
          <span style={labelStyle}>date finished</span>
          <input
            type="date"
            value={dateFinished}
            onChange={(e) => setDateFinished(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 0',
              borderBottom: '1px solid #D9D0C4',
              fontSize: '0.9rem',
              color: '#1A1008',
              marginBottom: 28,
              fontFamily: "'IBM Plex Mono', monospace",
            }}
          />
        </label>

        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              flex: 1,
              padding: '10px',
              background: '#2C1A0E',
              color: '#F5F0E8',
              fontFamily: "'Courier Prime', 'Courier New', monospace",
              fontWeight: 700,
              fontSize: '0.72rem',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? 'saving...' : 'save'}
          </button>
          <button
            onClick={onClose}
            style={{
              padding: '10px 16px',
              background: 'none',
              border: '1px solid #D9D0C4',
              fontFamily: "'Courier Prime', 'Courier New', monospace",
              fontSize: '0.72rem',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: '#888',
            }}
          >
            cancel
          </button>
        </div>
      </div>
    </div>
  )
}

export default function MyBooks() {
  const { user } = useOutletContext<OutletCtx>()
  const [books, setBooks] = useState<UserBook[]>([])
  const [loading, setLoading] = useState(true)
  const [sortKey, setSortKey] = useState<SortKey>('created_at')
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [editingBook, setEditingBook] = useState<UserBook | null>(null)

  const fetchBooks = useCallback(async () => {
    const { data } = await supabase
      .from('user_books')
      .select('*, books(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (data) setBooks(data as UserBook[])
    setLoading(false)
  }, [user.id])

  useEffect(() => { fetchBooks() }, [fetchBooks])

  const sorted = [...books].sort((a, b) => {
    if (sortKey === 'title') return (a.books?.title ?? '').localeCompare(b.books?.title ?? '')
    if (sortKey === 'author') return (a.books?.author ?? '').localeCompare(b.books?.author ?? '')
    if (sortKey === 'rating') return (b.rating ?? 0) - (a.rating ?? 0)
    if (sortKey === 'date_finished') return (b.date_finished ?? '').localeCompare(a.date_finished ?? '')
    return (b.created_at ?? '').localeCompare(a.created_at ?? '')
  })

  async function handleSaveEdit(updates: Partial<UserBook>) {
    if (!editingBook) return
    await supabase
      .from('user_books')
      .update(updates)
      .eq('id', editingBook.id)
    await fetchBooks()
  }

  const mono: React.CSSProperties = { fontFamily: "'IBM Plex Mono', monospace" }
  const serif: React.CSSProperties = { fontFamily: "'Spectral', Georgia, serif" }

  return (
    <div style={{ padding: '36px 28px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
        <h1 style={{ ...serif, fontWeight: 600, fontSize: '2rem', color: '#1A1008' }}>
          my books
        </h1>
        <span style={{ ...mono, fontSize: '0.65rem', color: '#888', letterSpacing: '0.08em' }}>
          {books.length} titles
        </span>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ ...mono, fontSize: '0.6rem', color: '#888', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            sort
          </span>
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            style={{
              ...mono,
              fontSize: '0.7rem',
              color: '#1A1008',
              border: '1px solid #D9D0C4',
              padding: '4px 8px',
              background: 'transparent',
              cursor: 'pointer',
            }}
          >
            <option value="created_at">date added</option>
            <option value="date_finished">date finished</option>
            <option value="title">title</option>
            <option value="author">author</option>
            <option value="rating">rating</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: 0, marginLeft: 'auto' }}>
          {(['list', 'covers'] as ViewMode[]).map((v) => (
            <button
              key={v}
              onClick={() => setViewMode(v)}
              style={{
                ...mono,
                fontSize: '0.6rem',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                padding: '5px 10px',
                background: viewMode === v ? '#2C1A0E' : 'transparent',
                color: viewMode === v ? '#F5F0E8' : '#888',
                border: '1px solid #D9D0C4',
                marginLeft: v === 'covers' ? -1 : 0,
              }}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p style={{ ...mono, fontSize: '0.65rem', color: '#888', letterSpacing: '0.08em' }}>loading...</p>
      ) : books.length === 0 ? (
        <p style={{ ...serif, fontWeight: 300, fontStyle: 'italic', color: '#888' }}>
          No books yet. <Link to="/books/add" style={{ color: '#1C2B4A', textDecoration: 'underline' }}>Log your first book.</Link>
        </p>
      ) : viewMode === 'list' ? (
        /* List view */
        <div>
          {sorted.map((ub, i) => (
            <div
              key={ub.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                padding: '12px 0',
                borderBottom: '1px solid #D9D0C4',
              }}
            >
              <span style={{ ...mono, fontSize: '0.6rem', color: '#888', width: 28, flexShrink: 0 }}>
                {String(i + 1).padStart(2, '0')}
              </span>

              {/* Cover thumbnail */}
              <Link to={`/books/${ub.id}`} style={{ flexShrink: 0 }}>
                <BookCover
                  coverUrl={ub.books?.cover_url}
                  title={ub.books?.title ?? ''}
                  width={36}
                  height={52}
                />
              </Link>

              {/* Title + meta */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <Link to={`/books/${ub.id}`} style={{ textDecoration: 'none' }}>
                  <p style={{ ...serif, fontWeight: 600, fontSize: '0.95rem', color: '#1A1008', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {ub.books?.title}
                  </p>
                </Link>
                <p style={{ ...mono, fontSize: '0.6rem', color: '#888', letterSpacing: '0.04em' }}>
                  {[
                    ub.books?.author,
                    ub.books?.pages && `${ub.books.pages}p`,
                    ub.date_finished?.substring(0, 4),
                  ].filter(Boolean).join(' · ')}
                </p>
              </div>

              {/* Rating */}
              <div style={{ flexShrink: 0 }}>
                <StarRating rating={ub.rating} size={12} />
              </div>

              {/* Status dropdown */}
              <select
                value={ub.status}
                onChange={async (e) => {
                  await supabase.from('user_books').update({ status: e.target.value as Status }).eq('id', ub.id)
                  fetchBooks()
                }}
                style={{
                  ...mono,
                  fontSize: '0.6rem',
                  color: '#888',
                  border: '1px solid #D9D0C4',
                  padding: '3px 6px',
                  background: 'transparent',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </select>

              {/* Edit button */}
              <button
                onClick={() => setEditingBook(ub)}
                style={{
                  ...mono,
                  fontSize: '0.6rem',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  padding: '4px 8px',
                  border: '1px solid #D9D0C4',
                  background: 'none',
                  color: '#888',
                  flexShrink: 0,
                }}
              >
                edit
              </button>
            </div>
          ))}
        </div>
      ) : (
        /* Covers view — CSS columns masonry */
        <div style={{ columns: '5 140px', columnGap: 6 }}>
          {sorted.map((ub) => (
            <Link
              key={ub.id}
              to={`/books/${ub.id}`}
              style={{
                display: 'block',
                breakInside: 'avoid',
                marginBottom: 6,
                opacity: 1,
                transition: 'opacity 0.15s',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = '0.85' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = '1' }}
            >
              <BookCover
                coverUrl={ub.books?.cover_url}
                title={ub.books?.title ?? ''}
                style={{ width: '100%' }}
              />
            </Link>
          ))}
        </div>
      )}

      {/* Edit modal */}
      {editingBook && (
        <EditModal
          book={editingBook}
          onSave={handleSaveEdit}
          onClose={() => setEditingBook(null)}
        />
      )}
    </div>
  )
}
