import { useState, useEffect, useRef } from 'react'
import { useOutletContext, useNavigate } from 'react-router-dom'
import type { OutletCtx } from '../App'
import { supabase } from '../lib/supabase'
import type { Status } from '../types'
import StarRating from '../components/StarRating'
import BookCover from '../components/BookCover'

type Step = 'select' | 'processing' | 'review'

interface IdentifiedBook {
  title: string | null
  author: string | null
  confidence: 'high' | 'medium' | 'low'
}

interface OLData {
  title: string
  author: string
  coverUrl: string | null
  pages: number | null
  year: number | null
  isbn: string | null
}

interface BookResult {
  id: string
  file: File
  previewUrl: string
  identified: IdentifiedBook | null
  olData: OLData | null
  done: boolean
  status: Status
  rating: number | null
  included: boolean
}

const STATUS_OPTIONS: Array<{ value: Status; label: string }> = [
  { value: 'READ', label: 'read' },
  { value: 'CURRENTLY_READING', label: 'currently reading' },
  { value: 'WANT_TO_READ', label: 'want to read' },
]

async function readAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

async function fetchOLData(title: string, author: string): Promise<OLData | null> {
  try {
    const q = encodeURIComponent(`${title} ${author}`.trim())
    const res = await fetch(`https://openlibrary.org/search.json?q=${q}&limit=1`)
    const data = await res.json()
    const doc = data.docs?.[0]
    if (!doc) return null
    return {
      title: (doc.title as string | undefined) ?? title,
      author: (doc.author_name as string[] | undefined)?.[0] ?? author,
      coverUrl: doc.cover_i
        ? `https://covers.openlibrary.org/b/id/${doc.cover_i as number}-M.jpg`
        : null,
      pages: (doc.number_of_pages_median as number | undefined) ?? null,
      year: (doc.first_publish_year as number | undefined) ?? null,
      isbn: (doc.isbn as string[] | undefined)?.[0] ?? null,
    }
  } catch {
    return null
  }
}

export default function ScanBooks() {
  const { user } = useOutletContext<OutletCtx>()
  const navigate = useNavigate()

  const [step, setStep] = useState<Step>('select')
  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [results, setResults] = useState<BookResult[]>([])
  const [processedCount, setProcessedCount] = useState(0)
  const [saving, setSaving] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const allUrlsRef = useRef<string[]>([])

  useEffect(() => {
    const urls = allUrlsRef.current
    return () => { urls.forEach(u => URL.revokeObjectURL(u)) }
  }, [])

  function addFiles(incoming: FileList | null) {
    if (!incoming) return
    const images = Array.from(incoming).filter(f => f.type.startsWith('image/'))
    if (!images.length) return
    const newUrls = images.map(f => URL.createObjectURL(f))
    allUrlsRef.current.push(...newUrls)
    setFiles(prev => [...prev, ...images])
    setPreviews(prev => [...prev, ...newUrls])
  }

  function removeFile(i: number) {
    setFiles(prev => prev.filter((_, j) => j !== i))
    setPreviews(prev => prev.filter((_, j) => j !== i))
  }

  async function processAll() {
    setStep('processing')
    setProcessedCount(0)

    const initial: BookResult[] = files.map((file, i) => ({
      id: `${Date.now()}-${i}`,
      file,
      previewUrl: previews[i],
      identified: null,
      olData: null,
      done: false,
      status: 'WANT_TO_READ' as Status,
      rating: null,
      included: true,
    }))
    setResults(initial)

    await Promise.allSettled(
      files.map(async (file, i) => {
        try {
          const base64 = await readAsBase64(file)
          const identRes = await fetch('/api/identify-book', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ imageBase64: base64, mediaType: file.type || 'image/jpeg' }),
          })
          const identified: IdentifiedBook = await identRes.json()

          let olData: OLData | null = null
          if (identified.title) {
            olData = await fetchOLData(identified.title, identified.author ?? '')
          }

          setResults(prev => {
            const next = [...prev]
            next[i] = { ...next[i], identified, olData, done: true }
            return next
          })
        } catch {
          setResults(prev => {
            const next = [...prev]
            next[i] = {
              ...next[i],
              identified: { title: null, author: null, confidence: 'low' },
              done: true,
            }
            return next
          })
        }
        setProcessedCount(p => p + 1)
      })
    )

    setStep('review')
  }

  function updateResult(id: string, updates: Partial<BookResult>) {
    setResults(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r))
  }

  async function handleAddBooks() {
    setSaving(true)
    const toAdd = results.filter(r =>
      r.included && r.done && !!(r.olData?.title ?? r.identified?.title)
    )

    for (const result of toAdd) {
      const title = result.olData?.title ?? result.identified?.title ?? ''
      const author = result.olData?.author ?? result.identified?.author ?? 'Unknown'
      const coverUrl = result.olData?.coverUrl ?? null
      const pages = result.olData?.pages ?? null
      const publishYear = result.olData?.year ?? null
      const isbn = result.olData?.isbn ?? null

      let bookId: string | null = null
      if (isbn) {
        const { data } = await supabase.from('books').select('id').eq('isbn', isbn).single()
        if (data) bookId = data.id
      }
      if (!bookId) {
        const { data } = await supabase
          .from('books')
          .insert({ title, author, cover_url: coverUrl, publish_year: publishYear, pages, isbn })
          .select('id')
          .single()
        if (data) bookId = data.id
      }
      if (bookId) {
        await supabase.from('user_books').insert({
          user_id: user.id,
          book_id: bookId,
          status: result.status,
          rating: result.rating,
        })
      }
    }

    navigate('/books')
  }

  const mono: React.CSSProperties = { fontFamily: "'IBM Plex Mono', monospace" }
  const serif: React.CSSProperties = { fontFamily: "'Spectral', Georgia, serif" }
  const courier: React.CSSProperties = { fontFamily: "'Courier Prime', 'Courier New', monospace" }

  const includedCount = results.filter(r =>
    r.included && r.done && !!(r.olData?.title ?? r.identified?.title)
  ).length

  return (
    <div style={{ padding: '40px 32px', background: '#F5F0E8', minHeight: 'calc(100vh - 90px)' }}>
      <style>{`
        @keyframes bkscan-spin {
          to { transform: rotate(360deg); }
        }
        .bkscan-spinner {
          width: 22px;
          height: 22px;
          border: 2px solid rgba(245,240,232,0.25);
          border-top-color: #7B9BAF;
          animation: bkscan-spin 0.75s linear infinite;
        }
      `}</style>

      {/* Back + heading */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
        <button
          onClick={() => step === 'select' ? navigate(-1) : setStep('select')}
          style={{ ...mono, fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#888', background: 'none', padding: 0 }}
        >
          ← back
        </button>
        <span style={{ ...mono, fontSize: '0.6rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#888' }}>
          scan books{step === 'processing' ? ' · identifying...' : step === 'review' ? ' · review' : ''}
        </span>
      </div>

      {/* ─── STEP 1: SELECT ─── */}
      {step === 'select' && (
        <>
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files) }}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `1px dashed ${dragOver ? '#1C2B4A' : '#D9D0C4'}`,
              padding: '64px 40px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              marginBottom: 24,
              minHeight: 240,
              background: dragOver ? 'rgba(28,43,74,0.03)' : 'transparent',
              transition: 'border-color 0.15s, background 0.15s',
            }}
          >
            <p style={{ ...serif, fontWeight: 300, fontStyle: 'italic', fontSize: '1.05rem', color: '#888', marginBottom: 10, textAlign: 'center' }}>
              drag photos here or tap to select
            </p>
            <p style={{ ...mono, fontSize: '0.58rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#888', textAlign: 'center' }}>
              select multiple photos of book covers or spines
            </p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display: 'none' }}
            onChange={e => { addFiles(e.target.files); e.target.value = '' }}
          />

          {files.length > 0 && (
            <>
              <p style={{ ...mono, fontSize: '0.6rem', color: '#888', letterSpacing: '0.08em', marginBottom: 16 }}>
                {files.length} {files.length === 1 ? 'photo' : 'photos'} selected
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 10, marginBottom: 32 }}>
                {files.map((file, i) => (
                  <div key={`${i}-${file.name}`} style={{ position: 'relative' }}>
                    <img
                      src={previews[i]}
                      alt={file.name}
                      style={{ width: '100%', aspectRatio: '2/3', objectFit: 'cover', display: 'block' }}
                    />
                    <button
                      onClick={e => { e.stopPropagation(); removeFile(i) }}
                      style={{
                        position: 'absolute',
                        top: 4,
                        right: 4,
                        background: 'rgba(26,16,8,0.75)',
                        color: '#F5F0E8',
                        width: 22,
                        height: 22,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        ...mono,
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        padding: 0,
                        lineHeight: 1,
                        border: 'none',
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}

          <button
            onClick={processAll}
            disabled={files.length === 0}
            style={{
              ...courier,
              fontWeight: 700,
              fontSize: '0.72rem',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              padding: '12px 32px',
              background: files.length === 0 ? '#D9D0C4' : '#1C2B4A',
              color: files.length === 0 ? '#888' : '#F5F0E8',
              cursor: files.length === 0 ? 'not-allowed' : 'pointer',
              border: 'none',
            }}
          >
            identify books
          </button>
        </>
      )}

      {/* ─── STEP 2: PROCESSING ─── */}
      {step === 'processing' && (
        <>
          <p style={{ ...mono, fontSize: '0.65rem', color: '#888', letterSpacing: '0.08em', marginBottom: 32 }}>
            identifying {processedCount} of {files.length} book{files.length !== 1 ? 's' : ''}...
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 16 }}>
            {results.map(result => (
              <div key={result.id} style={{ position: 'relative' }}>
                <img
                  src={result.previewUrl}
                  alt="scanning"
                  style={{
                    width: '100%',
                    aspectRatio: '2/3',
                    objectFit: 'cover',
                    display: 'block',
                    opacity: result.done ? 1 : 0.45,
                    transition: 'opacity 0.3s',
                  }}
                />
                {!result.done && (
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <div className="bkscan-spinner" />
                  </div>
                )}
                {result.done && (
                  <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    background: result.identified?.title
                      ? 'rgba(28,43,74,0.85)'
                      : 'rgba(44,26,14,0.8)',
                    padding: '5px 7px',
                  }}>
                    <p style={{
                      ...mono,
                      fontSize: '0.5rem',
                      color: 'rgba(245,240,232,0.9)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      letterSpacing: '0.03em',
                    }}>
                      {result.identified?.title ?? 'not identified'}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* ─── STEP 3: REVIEW ─── */}
      {step === 'review' && (
        <>
          <p style={{ ...mono, fontSize: '0.6rem', color: '#888', letterSpacing: '0.08em', marginBottom: 28 }}>
            {includedCount} book{includedCount !== 1 ? 's' : ''} selected · uncheck to exclude
          </p>

          <div style={{ marginBottom: 40 }}>
            {results.map(result => {
              const isUnidentified = !result.identified?.title

              if (isUnidentified) {
                return (
                  <div
                    key={result.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 14,
                      padding: '14px 0',
                      borderBottom: '1px solid #D9D0C4',
                    }}
                  >
                    <img
                      src={result.previewUrl}
                      alt="unidentified"
                      style={{ width: 44, height: 66, objectFit: 'cover', flexShrink: 0, opacity: 0.5 }}
                    />
                    <p style={{ ...serif, fontWeight: 300, fontStyle: 'italic', color: '#888', flex: 1, fontSize: '0.9rem' }}>
                      couldn't identify this book
                    </p>
                    {result.included && (
                      <button
                        onClick={() => updateResult(result.id, { included: false })}
                        style={{
                          ...mono,
                          fontSize: '0.58rem',
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase',
                          color: '#888',
                          border: '1px solid #D9D0C4',
                          padding: '5px 10px',
                          background: 'none',
                          cursor: 'pointer',
                          flexShrink: 0,
                        }}
                      >
                        skip
                      </button>
                    )}
                  </div>
                )
              }

              const display = result.olData ?? {
                title: result.identified!.title!,
                author: result.identified!.author ?? 'Unknown',
                coverUrl: null,
                pages: null,
                year: null,
              }

              return (
                <div
                  key={result.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 14,
                    padding: '14px 0',
                    borderBottom: '1px solid #D9D0C4',
                    opacity: result.included ? 1 : 0.4,
                    transition: 'opacity 0.15s',
                  }}
                >
                  {/* Include checkbox */}
                  <input
                    type="checkbox"
                    checked={result.included}
                    onChange={e => updateResult(result.id, { included: e.target.checked })}
                    style={{ marginTop: 6, flexShrink: 0, accentColor: '#1C2B4A', cursor: 'pointer' }}
                  />

                  {/* Cover */}
                  <div style={{ flexShrink: 0 }}>
                    <BookCover
                      coverUrl={display.coverUrl}
                      title={display.title}
                      width={44}
                      height={66}
                    />
                  </div>

                  {/* Title / author / meta */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      ...serif,
                      fontWeight: 600,
                      fontSize: '0.95rem',
                      color: '#1A1008',
                      marginBottom: 2,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {display.title}
                    </p>
                    <p style={{ ...mono, fontSize: '0.6rem', color: '#888', marginBottom: 3, letterSpacing: '0.04em' }}>
                      {display.author}
                    </p>
                    <p style={{ ...mono, fontSize: '0.58rem', color: '#888', letterSpacing: '0.04em' }}>
                      {[display.year, display.pages && `${display.pages}p`].filter(Boolean).join(' · ')}
                    </p>
                  </div>

                  {/* Status */}
                  <select
                    value={result.status}
                    onChange={e => updateResult(result.id, { status: e.target.value as Status })}
                    disabled={!result.included}
                    style={{
                      ...mono,
                      fontSize: '0.6rem',
                      color: '#1A1008',
                      border: '1px solid #D9D0C4',
                      padding: '4px 6px',
                      background: 'transparent',
                      cursor: result.included ? 'pointer' : 'default',
                      flexShrink: 0,
                    }}
                  >
                    {STATUS_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>

                  {/* Star rating */}
                  <div style={{ flexShrink: 0, paddingTop: 2 }}>
                    <StarRating
                      rating={result.rating}
                      onRate={result.included ? r => updateResult(result.id, { rating: r }) : undefined}
                      size={13}
                    />
                  </div>
                </div>
              )
            })}
          </div>

          <button
            onClick={handleAddBooks}
            disabled={saving || includedCount === 0}
            style={{
              ...courier,
              fontWeight: 700,
              fontSize: '0.72rem',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              padding: '12px 32px',
              background: includedCount === 0 || saving ? '#D9D0C4' : '#1C2B4A',
              color: includedCount === 0 || saving ? '#888' : '#F5F0E8',
              cursor: includedCount === 0 || saving ? 'not-allowed' : 'pointer',
              border: 'none',
            }}
          >
            {saving ? 'adding...' : `add ${includedCount} book${includedCount !== 1 ? 's' : ''}`}
          </button>
        </>
      )}
    </div>
  )
}
