const xml2json = (xml, tag) => {
  const items = []
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'gi')
  let match
  while ((match = regex.exec(xml)) !== null) {
    const block = match[1]
    const get = (t) => {
      const m = block.match(new RegExp(`<${t}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${t}>|<${t}[^>]*>([\\s\\S]*?)<\\/${t}>`, 'i'))
      return m ? (m[1] || m[2] || '').trim() : ''
    }
    items.push({
      title: get('title'),
      author: get('dc:creator') || get('author'),
      description: get('description'),
    })
  }
  return items
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate')
  const feeds = [
    { url: 'https://www.nytimes.com/books/best-sellers/rss/combined-print-and-e-book-fiction/', list: 'Hardcover Fiction' },
    { url: 'https://www.nytimes.com/books/best-sellers/rss/combined-print-and-e-book-nonfiction/', list: 'Hardcover Nonfiction' },
  ]
  try {
    const results = await Promise.allSettled(feeds.map(async ({ url, list }) => {
      const r = await fetch(url, { headers: { 'User-Agent': 'bookworm-app/1.0' }, signal: AbortSignal.timeout(5000) })
      const text = await r.text()
      return xml2json(text, 'item').slice(0, 10).map((item, i) => ({ ...item, list, rank: i + 1 }))
    }))
    const all = results.flatMap(r => r.status === 'fulfilled' ? r.value : [])
    res.json(all)
  } catch (e) {
    res.status(500).json([])
  }
}
