export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'GITHUB_TOKEN non configurato. Chiedi a Nico di aggiungerlo nelle env vars di Vercel.' });
  }

  const owner = 'NicoEasyAI';
  const repo = 'mappa-offerta-alessandro';
  const path = 'edits.json';
  const edits = req.body;

  try {
    // 1. Get current file SHA (needed for update)
    let sha = null;
    const getRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'User-Agent': 'mappa-deploy-bot'
        }
      }
    );
    if (getRes.ok) {
      const data = await getRes.json();
      sha = data.sha;
    }

    // 2. Commit edits.json to GitHub → triggers Vercel deploy
    const content = Buffer.from(JSON.stringify(edits, null, 2)).toString('base64');
    const putRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'User-Agent': 'mappa-deploy-bot'
        },
        body: JSON.stringify({
          message: '💾 Aggiornamento mappa da editor',
          content,
          ...(sha ? { sha } : {})
        })
      }
    );

    if (!putRes.ok) {
      const err = await putRes.json();
      return res.status(500).json({ error: 'GitHub API error', details: err.message || err });
    }

    return res.status(200).json({ ok: true, message: 'Salvato e deploy avviato!' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
