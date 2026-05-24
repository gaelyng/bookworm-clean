import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { UserBook, Status } from '../types'
import StarRating from '../components/StarRating'

const STATUS_LABELS: Record<Status, string> = {
  READ: 'read',
  CURRENTLY_READING: 'currently reading',
  WANT_TO_READ: 'want to read',
  PRE_PUBLICATION: 'pre-publication',
}

const STATUS_OPTIONS: Status[] = ['READ', 'CURRENTLY_READING', 'WANT_TO_READ', 'PRE_PUBLICATION']

export default function BookDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [userBook, setUserBook] = useState<UserBook | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)

  // Edit state
  const [editStatus, setEditStatus] = useState<Status>('READ')
  const [editRating, setEditRating] = useState<number | null>(null)
  const [editDateFinished, setEditDateFinished] = useState('')
  const [editReview, setEditReview] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!id) return
    supabase
      .from('user_books')
      .select('*, books(*)')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        if (data) {
          const ub = data as UserBook
          setUserBook(ub)
          setEditStatus(ub.status)
          setEditRating(ub.rating)
          setEditDateFinished(ub.date_finished ?? '')
          setEditReview(ub.review ?? '')
        }
        setLoading(false)
      })
  }, [id])

  async function handleSave() {
    if (!userBook) return
    setSaving(true)
    await supabase
      .from('user_books')
      .update({
        status: editStatus,
        rating: editRating,
        date_finished: editDateFinished || null,
        review: editReview || null,
      })
      .eq('id', userBook.id)
    setUserBook((prev) =>
      prev ? { ...prev, status: editStatus, rating: editRating, date_finished: editDateFinished || null, review: editReview || null } : prev
    )
    setSaving(false)
    setEditing(false)
  }

  const mono: React.CSSProperties = { fontFamily: "'IBM Plex Mono', monospace" }
  const serif: React.CSSProperties = { fontFamily: "'Spectral', Georgia, serif" }

  if (loading) return (
    <div style={{ padding: '60px 28px', ...mono, fontSize: '0.65rem', color: '#888', letterSpacing: '0.08em' }}>
      loading...
    </div>
  )

  if (!userBook?.books) return (
    <div style={{ padding: '60px 28px', ...serif, fontStyle: 'italic', color: '#888' }}>
      Book not found.
    </div>
  )

  const book = userBook.books

  return (
    <div style={{ padding: '40px 28px', maxWidth: 900 }}>
      <button
        onClick={() => navigate(-1)}
        style={{
          ...mono,
          fontSize: '0.6rem',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: '#888',
          background: 'none',
          padding: 0,
          marginBottom: 32,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        ← back
      </button>

      <div style={{ display: 'flex', gap: 40, flexWrap: 'wrap' }}>
        {/* Cover */}
        <div style={{ flexShrink: 0 }}>
          {book.cover_url ? (
            <img
              src={book.cover_url}
              alt={book.title}
              style={{ width: 180, display: 'block' }}
            />
          ) : (
            <div style={{
              width: 180,
              aspectRatio: '2/3',
              background: '#EDE7DA',
              display: 'flex',
              alignItems: 'flex-end',
              padding: 10,
            }}>
              <span style={{ ...mono, fontSize: '0.7rem', color: '#888', lineHeight: 1.4 }}>{book.title}</span>
            </div>
          )}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 220 }}>
          <h1 style={{ ...serif, fontWeight: 600, fontSize: '1.8rem', color: '#1A1008', marginBottom: 8, lineHeight: 1.2 }}>
            {book.title}
          </h1>
          <p style={{ ...serif, fontWeight: 300, fontStyle: 'italic', fontSize: '1.1rem', color: '#888', marginBottom: 16 }}>
            {book.author}
          </p>

          <p style={{ ...mono, fontSize: '0.65rem', color: '#888', letterSpacing: '0.04em', marginBottom: 20 }}>
            {[
              book.pages && `${book.pages} pages`,
              book.publish_year,
              book.genre,
              book.isbn && `ISBN ${book.isbn}`,
            ].filter(Boolean).join(' · ')}
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <span style={{ ...mono, fontSize: '0.6rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#888' }}>
              {STATUS_LABELS[userBook.status]}
            </span>
            {userBook.date_finished && (
              <span style={{ ...mono, fontSize: '0.6rem', color: '#888' }}>
                · {userBook.date_finished}
              </span>
            )}
          </div>

          {userBook.rating != null && !editing && (
            <div style={{ marginBottom: 20 }}>
              <StarRating rating={userBook.rating} size={18} />
            </div>
          )}

          {userBook.review && !editing && (
            <blockquote style={{
              ...serif,
              fontWeight: 300,
              fontStyle: 'italic',
              fontSize: '1rem',
              color: 'rgba(26,16,8,0.7)',
              lineHeight: 1.7,
              borderLeft: '2px solid #D9D0C4',
              paddingLeft: 16,
              marginBottom: 24,
            }}>
              {userBook.review}
            </blockquote>
          )}

          {!editing ? (
            <button
              onClick={() => setEditing(true)}
              style={{
                ...mono,
                fontSize: '0.65rem',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                padding: '8px 14px',
                border: '1px solid #2C1A0E',
                background: 'none',
                color: '#2C1A0E',
              }}
            >
              edit
            </button>
          ) : (
            <div style={{ marginTop: 8 }}>
              <label>
                <span style={{ ...mono, fontSize: '0.6rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#888', display: 'block', marginBottom: 6 }}>
                  status
                </span>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as Status)}
                  style={{ ...mono, fontSize: '0.8rem', padding: '6px 0', borderBottom: '1px solid #D9D0C4', width: '100%', marginBottom: 16, background: 'transparent', color: '#1A1008', appearance: 'none' as const, cursor: 'pointer' }}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                  ))}
                </select>
              </label>

              <div style={{ marginBottom: 16 }}>
                <span style={{ ...mono, fontSize: '0.6rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#888', display: 'block', marginBottom: 8 }}>
                  rating
                </span>
                <StarRating rating={editRating} onRate={setEditRating} size={22} />
              </div>

              <label>
                <span style={{ ...mono, fontSize: '0.6rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#888', display: 'block', marginBottom: 6 }}>
                  date finished
                </span>
                <input
                  type="date"
                  value={editDateFinished}
                  onChange={(e) => setEditDateFinished(e.target.value)}
                  style={{ ...mono, fontSize: '0.8rem', padding: '6px 0', borderBottom: '1px solid #D9D0C4', width: '100%', marginBottom: 16, background: 'transparent', color: '#1A1008' }}
                />
              </label>

              <label>
                <span style={{ ...mono, fontSize: '0.6rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#888', display: 'block', marginBottom: 6 }}>
                  review
                </span>
                <textarea
                  value={editReview}
                  onChange={(e) => setEditReview(e.target.value)}
                  rows={5}
                  placeholder="Your thoughts..."
                  style={{
                    ...serif,
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #D9D0C4',
                    fontSize: '0.95rem',
                    lineHeight: 1.6,
                    color: '#1A1008',
                    background: '#F5F0E8',
                    marginBottom: 16,
                    resize: 'vertical' as const,
                  }}
                />
              </label>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  style={{
                    fontFamily: "'Courier Prime', 'Courier New', monospace",
                    fontWeight: 700,
                    fontSize: '0.72rem',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    padding: '9px 16px',
                    background: '#2C1A0E',
                    color: '#F5F0E8',
                    border: 'none',
                    opacity: saving ? 0.6 : 1,
                    cursor: saving ? 'not-allowed' : 'pointer',
                  }}
                >
                  {saving ? 'saving...' : 'save'}
                </button>
                <button
                  onClick={() => setEditing(false)}
                  style={{
                    ...mono,
                    fontSize: '0.65rem',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    padding: '9px 14px',
                    background: 'none',
                    border: '1px solid #D9D0C4',
                    color: '#888',
                  }}
                >
                  cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
