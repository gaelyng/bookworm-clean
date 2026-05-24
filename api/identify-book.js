export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method not allowed' })
  }

  const { imageBase64, mediaType } = req.body ?? {}
  if (!imageBase64) {
    return res.status(400).json({ error: 'imageBase64 required' })
  }

  const apiKey = process.env.VITE_ANTHROPIC_API_KEY
  if (!apiKey) {
    return res.status(500).json({ title: null, author: null, confidence: 'low' })
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 200,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mediaType || 'image/jpeg',
                  data: imageBase64,
                },
              },
              {
                type: 'text',
                text: 'Identify the book in this image. Return ONLY a JSON object: {"title": "...", "author": "...", "confidence": "high|medium|low"}. If no book visible, return {"title": null, "author": null, "confidence": "low"}',
              },
            ],
          },
        ],
      }),
    })

    const data = await response.json()
    const text = data.content?.[0]?.text ?? '{}'
    try {
      const parsed = JSON.parse(text.replace(/```json|```/g, '').trim())
      return res.json(parsed)
    } catch {
      return res.json({ title: null, author: null, confidence: 'low' })
    }
  } catch (e) {
    return res.status(500).json({ title: null, author: null, confidence: 'low' })
  }
}
