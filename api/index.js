module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Usá el método POST.' });

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  const prompt = String(body?.prompt || '').trim();
  if (!prompt || Array.from(prompt).length > 4000) {
    return res.status(400).json({ error: 'El parámetro prompt es obligatorio y debe tener hasta 4000 caracteres.' });
  }
  if (!process.env.GROQ_API_KEY) {
    return res.status(500).json({ error: 'Falta configurar GROQ_API_KEY en Vercel.' });
  }

  try {
    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'openai/gpt-oss-20b',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_completion_tokens: 160
      })
    });
    const result = await groqResponse.json();
    if (!groqResponse.ok) return res.status(502).json({ error: result?.error?.message || 'Groq devolvió un error.' });
    const response = String(result?.choices?.[0]?.message?.content || '').trim();
    if (!response) return res.status(502).json({ error: 'Groq no devolvió texto.' });
    return res.status(200).json({ response });
  } catch {
    return res.status(502).json({ error: 'No se pudo conectar con Groq.' });
  }
};
