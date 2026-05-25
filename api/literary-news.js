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
    items.push({ title: get('title'), link: get('link'), description: get('description'), pubDate: get('pubDate') })
  }
  return items
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate')
  const feeds = [
    { url: 'https://rss.nytimes.com/services/xml/rss/nyt/Books.xml', source: 'nyt books' },
    { url: 'https://www.theguardian.com/books/rss', source: 'the guardian' },
    { url: 'https://lithub.com/feed/', source: 'literary hub' },
    { url: 'https://www.publishersweekly.com/pw/feeds/rss/pw-newest-reviews.xml', source: 'publishers weekly' },
  ]
  try {
    const results = await Promise.allSettled(feeds.map(async ({ url, source }) => {
      const r = await fetch(url, { headers: { 'User-Agent': 'bookworm-app/1.0' }, signal: AbortSignal.timeout(5000) })
      const text = await r.text()
      return xml2json(text, 'item').slice(0, 8).map(item => ({ ...item, source }))
    }))
    const all = results.flatMap(r => r.status === 'fulfilled' ? r.value : [])
    all.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())
    res.json(all.slice(0, 20))
  } catch (e) {
    res.status(500).json([])
  }
}
