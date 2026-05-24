export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method not allowed' })
  }

  const { title, author } = req.body ?? {}
  if (!title || !author) {
    return res.status(400).json({ error: 'title and author required' })
  }

  const apiKey = process.env.VITE_ANTHROPIC_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'api key not configured' })
  }

  try {
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
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

    const data = await anthropicRes.json()
    const text = data.content?.[0]?.text ?? ''
    const match = text.match(/\[[\s\S]*\]/)
    if (match) {
      return res.json(JSON.parse(match[0]))
    }
    return res.status(500).json({ error: 'could not parse response' })
  } catch (e) {
    return res.status(500).json({ error: String(e) })
  }
}
