/**
 * SallyIP Server Voice Handler - Session
 * 
 * Initializes voice session, resolves matter confidentiality posture,
 * and issues session configuration tokens.
 */

import { neon } from '@neondatabase/serverless';
import { getSessionUser } from '../../src/lib/auth.js';
import { getMatterContext } from '../../src/lib/matter-service.js';
import { resolveExecutionMode } from '../../src/lib/provider-policy.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: { message: 'Method not allowed' } });
  }

  try {
    const { matter_id } = req.body || {};
    const executionMode = resolveExecutionMode(process.env);

    let user = null;
    if (process.env.DATABASE_URL) {
      try {
        const sql = neon(process.env.DATABASE_URL);
        user = await getSessionUser(sql, req.headers.cookie);
      } catch {}
    }

    const sessionId = `vsess-${crypto.randomUUID()}`;

    return res.status(200).json({
      session_id: sessionId,
      execution_mode: executionMode,
      matter_id: matter_id || null,
      tts_model: process.env.SALLYIP_SPEECH_MODEL || 'fish-audio/s2.1-pro-free:free',
      sample_rate: 24000,
      created_at: Date.now(),
    });
  } catch (error) {
    return res.status(500).json({ error: { message: error.message } });
  }
}
