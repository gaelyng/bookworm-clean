import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { UserBook, Status } from '../types'
import StarRating from '../components/StarRating'
import BookCover from '../components/BookCover'

const STATUS_LABELS: Record<Status, string> = {
  READ: 'read',
  CURRENTLY_READING: 'currently reading',
  WANT_TO_READ: 'want to read',
  PRE_PUBLICATION: 'pre-publication',
}

const STATUS_OPTIONS: Status[] = ['READ', 'CURRENTLY_READING', 'WANT_TO_READ', 'PRE_PUBLICATION']

interface Rec {
  title: string
  author: string
  reason: string
}

interface AuthorBook {
  title: string
  coverUrl: string
}

interface GoogleBookInfo {
  description: string | null
  categories: string[]
}

function firstNSentences(text: string, n: number): string {
  const matches = text.match(/[^.!?]*[.!?]+/g) ?? []
  return matches.slice(0, n).join('').trim()
}

async function fetchGoogleBooksInfo(title: string, author: string): Promise<GoogleBookInfo | null> {
  try {
    const q = `intitle:${encodeURIComponent(title)}+inauthor:${encodeURIComponent(author)}`
    const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=1`)
    const data = await res.json()
    const info = data.items?.[0]?.volumeInfo
    if (!info) return null
    return {
      description: (info.description as string | undefined) ?? null,
      categories: (info.categories as string[] | undefined) ?? [],
    }
  } catch {
    return null
  }
}

async function fetchAuthorBooks(author: string, currentTitle: string): Promise<AuthorBook[]> {
  try {
    const res = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=inauthor:${encodeURIComponent(author)}&maxResults=6`
    )
    const data = await res.json()
    type GItem = { volumeInfo: { title?: string; imageLinks?: { thumbnail?: string } } }
    return ((data.items ?? []) as GItem[])
      .filter((item) => item.volumeInfo.title && item.volumeInfo.title !== currentTitle)
      .slice(0, 4)
      .map((item) => ({
        title: item.volumeInfo.title ?? '',
        coverUrl: (item.volumeInfo.imageLinks?.thumbnail ?? '').replace('http://', 'https://'),
      }))
  } catch {
    return []
  }
}

async function fetchRecommendations(title: string, author: string): Promise<Rec[] | null> {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY as string | undefined
  if (!apiKey) return null
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 500,
        messages: [
          {
            role: 'user',
            content: `Recommend 3 books similar to "${title}" by "${author}". Respond only in JSON: [{"title":"...","author":"...","reason":"..."}]`,
          },
        ],
      }),
    })
    const data = await res.json()
    const text: string = data.content?.[0]?.text ?? ''
    const match = text.match(/\[[\s\S]*\]/)
    if (match) return JSON.parse(match[0]) as Rec[]
  } catch {
    // silent fail
  }
  return null
}

export default function BookDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [userBook, setUserBook] = useState<UserBook | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)

  const [editStatus, setEditStatus] = useState<Status>('READ')
  const [editRating, setEditRating] = useState<number | null>(null)
  const [editDateFinished, setEditDateFinished] = useState('')
  const [editReview, setEditReview] = useState('')
  const [saving, setSaving] = useState(false)

  // Enriched data
  const [bookInfo, setBookInfo] = useState<GoogleBookInfo | null>(null)
  const [authorBooks, setAuthorBooks] = useState<AuthorBook[]>([])
  const [recs, setRecs] = useState<Rec[] | null>(null)
  const [recsLoading, setRecsLoading] = useState(false)

  const hasApiKey = !!import.meta.env.VITE_ANTHROPIC_API_KEY

  useEffect(() => {
    if (!id) return
    supabase
      .from('user_books')
      .select('*, books(*)')
      .eq('id', id)
      .single()
      .then(async ({ data }) => {
        if (data) {
          const ub = data as UserBook
          setUserBook(ub)
          setEditStatus(ub.status)
          setEditRating(ub.rating)
          setEditDateFinished(ub.date_finished ?? '')
          setEditReview(ub.review ?? '')

          if (ub.books) {
            const { title, author } = ub.books

            // Google Books + Anthropic in parallel
            const [info, otherBooks] = await Promise.all([
              fetchGoogleBooksInfo(title, author),
              fetchAuthorBooks(author, title),
            ])
            setBookInfo(info)
            setAuthorBooks(otherBooks)

            if (hasApiKey) {
              setRecsLoading(true)
              const result = await fetchRecommendations(title, author)
              setRecs(result)
              setRecsLoading(false)
            }
          }
        }
        setLoading(false)
      })
  }, [id, hasApiKey])

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
      prev
        ? { ...prev, status: editStatus, rating: editRating, date_finished: editDateFinished || null, review: editReview || null }
        : prev
    )
    setSaving(false)
    setEditing(false)
  }

  const mono: React.CSSProperties = { fontFamily: "'IBM Plex Mono', monospace" }
  const serif: React.CSSProperties = { fontFamily: "'Spectral', Georgia, serif" }

  if (loading)
    return (
      <div style={{ padding: '60px 28px', ...mono, fontSize: '0.65rem', color: '#888', letterSpacing: '0.08em' }}>
        loading...
      </div>
    )

  if (!userBook?.books)
    return (
      <div style={{ padding: '60px 28px', ...serif, fontStyle: 'italic', color: '#888' }}>
        Book not found.
      </div>
    )

  const book = userBook.books

  const buyLinks = [
    {
      label: 'find on goodreads',
      href: `https://www.goodreads.com/search?q=${encodeURIComponent(`${book.title} ${book.author}`)}`,
    },
    {
      label: 'buy on bookshop',
      href: `https://bookshop.org/search?keywords=${encodeURIComponent(book.title)}`,
    },
    {
      label: 'search worldcat',
      href: `https://www.worldcat.org/search?q=${encodeURIComponent(`${book.title} ${book.author}`)}`,
    },
  ]

  const descriptionSnippet =
    bookInfo?.description ? firstNSentences(bookInfo.description, 3) : null

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

      {/* Cover + info row */}
      <div style={{ display: 'flex', gap: 40, flexWrap: 'wrap' }}>
        <div style={{ flexShrink: 0 }}>
          <BookCover coverUrl={book.cover_url} title={book.title} width={180} />
        </div>

        <div style={{ flex: 1, minWidth: 220 }}>
          <h1
            style={{
              ...serif,
              fontWeight: 600,
              fontSize: '1.8rem',
              color: '#1A1008',
              marginBottom: 8,
              lineHeight: 1.2,
            }}
          >
            {book.title}
          </h1>
          <p
            style={{
              ...serif,
              fontWeight: 300,
              fontStyle: 'italic',
              fontSize: '1.1rem',
              color: '#888',
              marginBottom: 14,
            }}
          >
            {book.author}
          </p>

          {/* Buy links */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
            {buyLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  ...mono,
                  fontSize: '0.6rem',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: 'var(--muted)',
                  border: '1px solid var(--rule)',
                  padding: '4px 8px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  textDecoration: 'none',
                  transition: 'color 0.15s',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text)' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--muted)' }}
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Metadata */}
          <p
            style={{
              ...mono,
              fontSize: '0.65rem',
              color: '#888',
              letterSpacing: '0.04em',
              marginBottom: 16,
            }}
          >
            {[
              book.pages && `${book.pages} pages`,
              book.publish_year,
              book.genre,
              book.isbn && `ISBN ${book.isbn}`,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>

          {/* Status + date */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <span
              style={{
                ...mono,
                fontSize: '0.6rem',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: '#888',
              }}
            >
              {STATUS_LABELS[userBook.status]}
            </span>
            {userBook.date_finished && (
              <span style={{ ...mono, fontSize: '0.6rem', color: '#888' }}>
                · {userBook.date_finished}
              </span>
            )}
          </div>

          {/* Description from Google Books */}
          {descriptionSnippet && (
            <p
              style={{
                ...serif,
                fontWeight: 300,
                fontStyle: 'italic',
                fontSize: '0.95rem',
                color: 'var(--muted)',
                lineHeight: 1.7,
                marginBottom: 14,
              }}
            >
              {descriptionSnippet}
            </p>
          )}

          {/* Categories */}
          {bookInfo?.categories && bookInfo.categories.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
              {bookInfo.categories.map((cat) => (
                <span
                  key={cat}
                  style={{
                    ...mono,
                    fontSize: '0.55rem',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: '#888',
                    background: '#EDE7DA',
                    padding: '2px 6px',
                  }}
                >
                  {cat}
                </span>
              ))}
            </div>
          )}

          {/* Rating */}
          {userBook.rating != null && !editing && (
            <div style={{ marginBottom: 16 }}>
              <StarRating rating={userBook.rating} size={18} />
            </div>
          )}

          {/* Review */}
          {userBook.review && !editing && (
            <blockquote
              style={{
                ...serif,
                fontWeight: 300,
                fontStyle: 'italic',
                fontSize: '1rem',
                color: 'rgba(26,16,8,0.7)',
                lineHeight: 1.7,
                borderLeft: '2px solid #D9D0C4',
                paddingLeft: 16,
                marginBottom: 20,
              }}
            >
              {userBook.review}
            </blockquote>
          )}

          {/* Edit button / form */}
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
                <span
                  style={{
                    ...mono,
                    fontSize: '0.6rem',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: '#888',
                    display: 'block',
                    marginBottom: 6,
                  }}
                >
                  status
                </span>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as Status)}
                  style={{
                    ...mono,
                    fontSize: '0.8rem',
                    padding: '6px 0',
                    borderBottom: '1px solid #D9D0C4',
                    width: '100%',
                    marginBottom: 16,
                    background: 'transparent',
                    color: '#1A1008',
                    appearance: 'none' as const,
                    cursor: 'pointer',
                  }}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                  ))}
                </select>
              </label>

              <div style={{ marginBottom: 16 }}>
                <span
                  style={{
                    ...mono,
                    fontSize: '0.6rem',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: '#888',
                    display: 'block',
                    marginBottom: 8,
                  }}
                >
                  rating
                </span>
                <StarRating rating={editRating} onRate={setEditRating} size={22} />
              </div>

              <label>
                <span
                  style={{
                    ...mono,
                    fontSize: '0.6rem',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: '#888',
                    display: 'block',
                    marginBottom: 6,
                  }}
                >
                  date finished
                </span>
                <input
                  type="date"
                  value={editDateFinished}
                  onChange={(e) => setEditDateFinished(e.target.value)}
                  style={{
                    ...mono,
                    fontSize: '0.8rem',
                    padding: '6px 0',
                    borderBottom: '1px solid #D9D0C4',
                    width: '100%',
                    marginBottom: 16,
                    background: 'transparent',
                    color: '#1A1008',
                  }}
                />
              </label>

              <label>
                <span
                  style={{
                    ...mono,
                    fontSize: '0.6rem',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: '#888',
                    display: 'block',
                    marginBottom: 6,
                  }}
                >
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

      {/* More by this author */}
      {authorBooks.length > 0 && (
        <div style={{ marginTop: 48, borderTop: '1px solid #D9D0C4', paddingTop: 32 }}>
          <p
            style={{
              ...mono,
              fontSize: '0.6rem',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: '#888',
              marginBottom: 20,
            }}
          >
            more by {book.author}
          </p>
          <div
            style={{
              display: 'flex',
              gap: 16,
              overflowX: 'auto',
              paddingBottom: 8,
            }}
          >
            {authorBooks.map((ab) => (
              <a
                key={ab.title}
                href={`/discover?q=${encodeURIComponent(ab.title)}`}
                style={{
                  flexShrink: 0,
                  width: 80,
                  textDecoration: 'none',
                  display: 'block',
                }}
              >
                <BookCover coverUrl={ab.coverUrl} title={ab.title} width={80} height={112} />
                <p
                  style={{
                    ...serif,
                    fontWeight: 300,
                    fontSize: '0.72rem',
                    color: '#888',
                    marginTop: 6,
                    lineHeight: 1.3,
                    overflow: 'hidden',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical' as const,
                  }}
                >
                  {ab.title}
                </p>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* YOU MIGHT ALSO LIKE */}
      {(hasApiKey || recsLoading || recs) && (
        <div style={{ marginTop: 48, borderTop: '1px solid #D9D0C4', paddingTop: 32 }}>
          <p
            style={{
              ...mono,
              fontSize: '0.6rem',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: '#888',
              marginBottom: 24,
            }}
          >
            you might also like
          </p>

          {recsLoading ? (
            <p style={{ ...mono, fontSize: '0.6rem', color: '#888', letterSpacing: '0.08em' }}>
              finding recommendations...
            </p>
          ) : recs && recs.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap' }}>
              {recs.map((rec, i) => (
                <div
                  key={rec.title}
                  style={{
                    flex: '1 1 180px',
                    padding: '0 24px',
                    borderLeft: i > 0 ? '1px solid var(--rule)' : 'none',
                    paddingLeft: i === 0 ? 0 : 24,
                  }}
                >
                  <p
                    style={{
                      ...serif,
                      fontWeight: 600,
                      fontSize: '1rem',
                      color: '#1A1008',
                      marginBottom: 6,
                      lineHeight: 1.3,
                    }}
                  >
                    {rec.title}
                  </p>
                  <p
                    style={{
                      ...mono,
                      fontSize: '0.58rem',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: '#888',
                      marginBottom: 10,
                    }}
                  >
                    {rec.author}
                  </p>
                  <p
                    style={{
                      ...serif,
                      fontWeight: 300,
                      fontStyle: 'italic',
                      fontSize: '0.88rem',
                      color: 'rgba(26,16,8,0.6)',
                      lineHeight: 1.6,
                    }}
                  >
                    {rec.reason}
                  </p>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}
