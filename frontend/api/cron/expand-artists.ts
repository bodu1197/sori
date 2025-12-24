import type { VercelRequest, VercelResponse } from '@vercel/node';

const API_BASE_URL =
  process.env.VITE_API_URL || 'https://musicgram-api-89748215794.us-central1.run.app';
const CRON_SECRET = process.env.CRON_SECRET || 'dev-secret';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Verify cron secret
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    if (req.query.secret !== CRON_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  try {
    // Call backend related artists expansion endpoint
    const response = await fetch(`${API_BASE_URL}/api/cron/expand-related-artists`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        secret: CRON_SECRET,
        limit: 20, // 기존 아티스트 20명 처리
        related_limit: 10, // 각각 10명의 related
      }),
    });

    const data = await response.json();

    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      backend_response: data,
    });
  } catch (error) {
    console.error('Expand artists cron error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
