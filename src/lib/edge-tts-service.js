/**
 * Microsoft Edge Neural TTS Service for SallyIP
 *
 * High-quality, ultra-realistic neural speech synthesis using Microsoft Edge's free Neural TTS.
 * Zero subscription required, zero token quota limitations, crystal-clear natural speech.
 */

import { Communicate } from 'edge-tts-universal';

export const DEFAULT_EDGE_VOICE = 'en-US-AriaNeural'; // Sally's signature clear, warm, intelligent neural voice

/**
 * Synthesize speech using Microsoft Edge Neural TTS.
 *
 * @param {string} text - text to synthesize
 * @param {Object} [options] - synthesis options
 * @param {string} [options.voice] - Microsoft Edge voice (default: en-US-AriaNeural)
 * @param {string} [options.rate] - speed modifier (e.g. '+0%', '+5%')
 * @param {string} [options.pitch] - pitch modifier (e.g. '+0Hz')
 * @returns {Promise<Buffer>} MP3 Audio Buffer
 */
export async function synthesizeEdgeTTS(text, options = {}) {
  const cleanText = String(text || '').trim();
  if (!cleanText) {
    throw new Error('Text is required for Edge TTS synthesis');
  }

  const voice = options.voice || process.env.EDGE_TTS_VOICE || DEFAULT_EDGE_VOICE;
  const rate = options.rate || '+0%';
  const pitch = options.pitch || '+0Hz';

  const comm = new Communicate(cleanText, {
    voice,
    rate,
    pitch,
  });

  const chunks = [];
  for await (const chunk of comm.stream()) {
    if (chunk.type === 'audio' && chunk.data) {
      chunks.push(chunk.data);
    }
  }

  if (!chunks.length) {
    throw new Error('Edge TTS returned an empty audio stream');
  }

  return Buffer.concat(chunks);
}
