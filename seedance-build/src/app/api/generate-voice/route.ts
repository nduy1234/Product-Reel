/**
 * POST /api/generate-voice
 * ─────────────────────────────────────────────────────────────
 * Step 4: synthesises the marketing script into a voiceover
 * audio file using Seed Speech (BytePlus Ark TTS).
 *
 * Returns { audioUrl, durationSeconds, format }
 * where audioUrl is either a remote URL or a base64 data URL.
 */

import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;
import type { GenerateVoiceRequest } from "@/types";
import { isDemoMode } from "@/lib/utils";
import { generateVoice } from "@/services/byteplus/seedSpeechService";
import { mockGenerateVoice } from "@/services/mock/mockService";
import { hasIonrouterKey } from "@/services/ionrouter/client";
import { generateVoice as ionGenerateVoice } from "@/services/ionrouter/voiceService";

export async function POST(request: NextRequest) {
  try {
    const body: GenerateVoiceRequest = await request.json();

    if (!body.script?.trim()) {
      return NextResponse.json(
        { error: "script is required" },
        { status: 400 }
      );
    }

    if (isDemoMode()) {
      return NextResponse.json(await mockGenerateVoice(body));
    }

    if (hasIonrouterKey()) {
      try {
        return NextResponse.json(await ionGenerateVoice(body));
      } catch (err) {
        console.warn("[generate-voice] ionrouter failed, falling back to mock:", (err as Error).message);
      }
    }

    try {
      return NextResponse.json(await generateVoice(body));
    } catch (err) {
      console.warn("[generate-voice] BytePlus failed, falling back to mock:", (err as Error).message);
    }

    return NextResponse.json(await mockGenerateVoice(body));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    console.error("[generate-voice]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
