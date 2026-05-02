/**
 * POST /api/generate-avatar
 * ─────────────────────────────────────────────────────────────
 * Step 5 (OmniHuman): Creates a talking-head avatar video by
 * combining a reference image with the Seed Speech voiceover.
 *
 * Returns an AvatarTask { taskId, status } — the client polls
 * /api/avatar-status?id={taskId} for the final videoUrl.
 *
 * Falls back to mock mode when BYTEPLUS_ARK_API_KEY is absent.
 */

import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

import type { AvatarTask, GenerateAvatarRequest } from "@/types";
import { isDemoMode } from "@/lib/utils";
import { createAvatarTask } from "@/services/byteplus/omniHumanService";

// ── Mock response ─────────────────────────────────────────────
function mockAvatarTask(): AvatarTask {
  return {
    taskId: `mock-avatar-${Date.now()}`,
    status: "succeeded",
    videoUrl:
      "https://www.pexels.com/download/video/3571264/?fps=25.0&h=1920&w=1080",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=720&h=1280&fit=crop",
  };
}

// ── Route handler ─────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const body: GenerateAvatarRequest = await request.json();

    if (!body.referenceImageBase64) {
      return NextResponse.json(
        { error: "referenceImageBase64 is required" },
        { status: 400 }
      );
    }

    if (!body.audioUrl) {
      return NextResponse.json(
        { error: "audioUrl is required" },
        { status: 400 }
      );
    }

    if (isDemoMode()) {
      await new Promise((r) => setTimeout(r, 1200));
      return NextResponse.json(mockAvatarTask());
    }

    try {
      const task = await createAvatarTask(
        body.referenceImageBase64,
        body.audioUrl,
        body.aspectRatio ?? "9:16"
      );
      return NextResponse.json(task);
    } catch (err) {
      console.warn("[generate-avatar] real API failed, falling back to mock:", (err as Error).message);
      return NextResponse.json(mockAvatarTask());
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    console.error("[generate-avatar]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
