export type Status = 'READ' | 'CURRENTLY_READING' | 'WANT_TO_READ' | 'PRE_PUBLICATION'

export interface Book {
  id: string
  title: string
  author: string
  cover_url: string | null
  publish_year: number | null
  pages: number | null
  genre: string | null
  isbn: string | null
}

export interface UserBook {
  id: string
  user_id: string
  book_id: string
  status: Status
  rating: number | null
  date_finished: string | null
  review: string | null
  created_at: string
  books?: Book
}
