interface StarRatingProps {
  rating: number | null
  onRate?: (rating: number) => void
  size?: number
}

export default function StarRating({ rating, onRate, size = 16 }: StarRatingProps) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          onClick={() => onRate?.(n)}
          style={{
            fontSize: size,
            cursor: onRate ? 'pointer' : 'default',
            color: n <= (rating ?? 0) ? '#2C1A0E' : '#D9D0C4',
            lineHeight: 1,
            userSelect: 'none',
          }}
        >
          ★
        </span>
      ))}
    </div>
  )
}
