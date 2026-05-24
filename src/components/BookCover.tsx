import { useState } from 'react'

interface BookCoverProps {
  coverUrl: string | null | undefined
  title: string
  width?: number | string
  height?: number | string
  style?: React.CSSProperties
}

export default function BookCover({ coverUrl, title, width, height, style }: BookCoverProps) {
  const [failed, setFailed] = useState(false)

  const sizeStyle: React.CSSProperties = {
    width: width ?? '100%',
    height: height ?? undefined,
    display: 'block',
    ...style,
  }

  const isValidUrl = coverUrl && coverUrl.startsWith('http')

  if (isValidUrl && !failed) {
    return (
      <img
        src={coverUrl}
        alt={title}
        onError={() => setFailed(true)}
        style={{ ...sizeStyle, objectFit: 'cover' }}
      />
    )
  }

  return (
    <div
      style={{
        background: 'var(--rule)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 8,
        aspectRatio: height ? undefined : '2/3',
        ...sizeStyle,
      }}
    >
      <span
        style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: '0.58rem',
          color: 'var(--muted)',
          textAlign: 'center',
          lineHeight: 1.4,
          wordBreak: 'break-word',
          overflow: 'hidden',
        }}
      >
        {title}
      </span>
    </div>
  )
}
