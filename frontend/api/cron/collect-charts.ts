import type { VercelRequest, VercelResponse } from '@vercel/node';

const API_BASE_URL =
  process.env.VITE_API_URL || 'https://musicgram-api-89748215794.us-central1.run.app';
const CRON_SECRET = process.env.CRON_SECRET || 'dev-secret';

// Track which batch to run (cycles 0-3)
let currentBatch = 0;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Verify cron secret (also allow direct calls with secret param for testing)
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${CRON_SECRET}` && req.query.secret !== CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Call backend chart collection endpoint with current batch
    const response = await fetch(`${API_BASE_URL}/api/cron/collect-chart-artists-batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        batch: currentBatch,
        secret: CRON_SECRET,
      }),
    });

    const data = await response.json();

    // Update batch for next run (cycle through 0-3)
    currentBatch = (currentBatch + 1) % 4;

    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      batch_executed: data.results?.batch ?? currentBatch - 1,
      next_batch: currentBatch,
      backend_response: data,
    });
  } catch (error) {
    console.error('Chart collection cron error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
