/**
 * Seed Speech Service — Text-to-Speech Voiceover Generation
 * ─────────────────────────────────────────────────────────────
 * Synthesises the marketing script into a natural voiceover.
 *
 * BytePlus Ark TTS endpoint:
 *   POST /audio/speech
 *   Model: SEED_SPEECH_MODEL_ID env var
 *
 * The audio binary is returned directly; we encode it as a
 * base64 data URL so it can be embedded in the response JSON
 * without requiring a separate file-storage service.
 */

import { arkPost, arkPostBinary } from "./client";
import type { GenerateVoiceRequest, VoiceResult } from "@/types";

// ── Model ID ──────────────────────────────────────────────────
const MODEL_ID =
  process.env.SEED_SPEECH_MODEL_ID ?? "seed-tts-doubao";

// ── Available voices ──────────────────────────────────────────
// Voice IDs for BytePlus Seed Speech — update to match your
// available voices in the Ark console.
export const SEED_VOICES: Record<string, string> = {
  "en-female-warm":   "zh_female_meimei",   // Warm female (EN mapped)
  "en-male-confident":"zh_male_xianxia",     // Confident male (EN mapped)
  "en-female-clear":  "en_female_clear",
  "en-male-deep":     "en_male_deep",
};

const DEFAULT_VOICE = "en-female-warm";

// ── Ark TTS response (JSON with URL variant) ──────────────────
interface ArkTTSJsonResponse {
  url?: string;
  audio_url?: string;
  duration?: number;
}

// ── Main function ─────────────────────────────────────────────
export async function generateVoice(
  request: GenerateVoiceRequest
): Promise<VoiceResult> {
  const voiceId =
    request.voice && SEED_VOICES[request.voice]
      ? SEED_VOICES[request.voice]
      : SEED_VOICES[DEFAULT_VOICE];

  // Attempt 1: request binary audio directly
  try {
    const audioBuffer = await arkPostBinary("/audio/speech", {
      model:           MODEL_ID,
      input:           request.script,
      voice:           voiceId,
      response_format: "mp3",
      speed:           1.0,
    });

    const base64 = audioBuffer.toString("base64");
    const audioUrl = `data:audio/mpeg;base64,${base64}`;

    return {
      audioUrl,
      durationSeconds: estimateDuration(request.script),
      format: "mp3",
    };
  } catch (binaryError) {
    // Attempt 2: some Ark TTS versions return a JSON with a URL
    try {
      const jsonResponse = await arkPost<ArkTTSJsonResponse>("/audio/speech", {
        model:           MODEL_ID,
        input:           request.script,
        voice:           voiceId,
        response_format: "mp3",
      });

      const audioUrl =
        jsonResponse.url ?? jsonResponse.audio_url ?? "";

      if (!audioUrl) throw new Error("No audio URL in TTS response");

      return {
        audioUrl,
        durationSeconds:
          jsonResponse.duration ?? estimateDuration(request.script),
        format: "mp3",
      };
    } catch (jsonError) {
      const errMsg =
        jsonError instanceof Error ? jsonError.message : String(jsonError);
      throw new Error(`Seed Speech failed: ${errMsg}`);
    }
  }
}

// ── Rough duration estimate (≈ 130 words/min) ─────────────────
function estimateDuration(text: string): number {
  const wordCount = text.trim().split(/\s+/).length;
  return Math.round((wordCount / 130) * 60);
}
