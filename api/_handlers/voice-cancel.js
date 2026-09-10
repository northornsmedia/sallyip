/**
 * SallyIP Server Voice Handler - Cancel
 * 
 * Records cancellation events and manages session invalidation.
 */

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: { message: 'Method not allowed' } });
  }

  try {
    const { session_id, turn_id, generation_id, reason = 'USER_BARGE_IN' } = req.body || {};

    // Safe metrics logging - never log raw audio or confidential transcript text
    console.log(`[voice-cancel] Session ${session_id} generation ${generation_id} cancelled (${reason})`);

    return res.status(200).json({
      ok: true,
      cancelled: true,
      session_id,
      generation_id,
      timestamp: Date.now(),
    });
  } catch (error) {
    return res.status(500).json({ error: { message: error.message } });
  }
}
