/**
 * ionrouter.io — Text-to-Speech Service
 * ─────────────────────────────────────────────────────────────
 * Uses Orpheus-3B TTS via the OpenAI-compatible /audio/speech
 * endpoint to synthesise the marketing script into a voiceover.
 *
 * Model: IONROUTER_TTS_MODEL env var (default: orpheus-3b)
 */

import { ionPost, ionPostBinary } from "./client";
import type { GenerateVoiceRequest, VoiceResult } from "@/types";

const TTS_MODEL = process.env.IONROUTER_TTS_MODEL ?? "orpheus-3b";
const DEFAULT_VOICE = "tara";

// ── JSON fallback shape (some TTS endpoints return a URL) ─────
interface TtsJsonResponse {
  url?: string;
  audio_url?: string;
  data?: string; // base64
}

// ── Main export ───────────────────────────────────────────────
export async function generateVoice(
  request: GenerateVoiceRequest
): Promise<VoiceResult> {
  const voice = request.voice ?? DEFAULT_VOICE;
  const body = {
    model:           TTS_MODEL,
    input:           request.script,
    voice,
    response_format: "mp3",
  };

  let audioUrl: string;

  try {
    // Attempt binary audio response
    const buffer = await ionPostBinary("/audio/speech", body);
    const base64 = buffer.toString("base64");
    audioUrl = `data:audio/mpeg;base64,${base64}`;
  } catch {
    // Fallback: some endpoints return JSON with a URL
    const json = await ionPost<TtsJsonResponse>("/audio/speech", body);
    const url  = json.url ?? json.audio_url;

    if (url) {
      audioUrl = url;
    } else if (json.data) {
      audioUrl = `data:audio/mpeg;base64,${json.data}`;
    } else {
      throw new Error("ionrouter TTS returned no audio data");
    }
  }

  // Estimate duration: ~140 words per minute
  const wordCount = request.script.trim().split(/\s+/).length;
  const durationSeconds = Math.round((wordCount / 140) * 60);

  return {
    audioUrl,
    durationSeconds,
    format: "mp3",
  };
}
