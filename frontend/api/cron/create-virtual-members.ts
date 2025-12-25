import type { VercelRequest, VercelResponse } from '@vercel/node';

const API_BASE_URL =
  process.env.VITE_API_URL || 'https://musicgram-api-89748215794.us-central1.run.app';
const CRON_SECRET = process.env.CRON_SECRET || 'dev-secret';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Verify cron secret (also allow direct calls with secret param for testing)
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${CRON_SECRET}` && req.query.secret !== CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Call backend virtual member creation endpoint
    const response = await fetch(`${API_BASE_URL}/api/cron/create-virtual-members`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        secret: CRON_SECRET,
        limit: 50, // 배치당 최대 50명 생성
      }),
    });

    const data = await response.json();

    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      backend_response: data,
    });
  } catch (error) {
    console.error('Create virtual members cron error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
