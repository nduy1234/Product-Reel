/**
 * POST /api/generate-video
 * ─────────────────────────────────────────────────────────────
 * Step 3: submits a video generation task to Seedance 2.0.
 * Returns { taskId, status } immediately — the client must
 * poll /api/status?id=<taskId> to wait for completion.
 */

import { NextRequest, NextResponse } from "next/server";
import type { GenerateVideoRequest } from "@/types";
import { isDemoMode } from "@/lib/utils";
import { hasSeedanceKey } from "@/services/byteplus/seedanceClient";
import { createVideoTask } from "@/services/byteplus/seedanceService";
import { mockCreateVideoTask } from "@/services/mock/mockService";
import { hasIonrouterKey } from "@/services/ionrouter/client";
import { createVideoTask as ionCreateVideoTask } from "@/services/ionrouter/videoService";

// Allow up to 60 s for the Seedance submission call
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body: GenerateVideoRequest = await request.json();

    if (!body.imageBase64) {
      return NextResponse.json(
        { error: "imageBase64 is required" },
        { status: 400 }
      );
    }

    if (!body.full_prompt) {
      return NextResponse.json(
        { error: "full_prompt is required" },
        { status: 400 }
      );
    }

    // Demo mode → mock immediately
    if (isDemoMode()) {
      return NextResponse.json(await mockCreateVideoTask(body));
    }

    // Try real backends, fall back to mock if they fail
    if (hasSeedanceKey()) {
      try {
        return NextResponse.json(await createVideoTask(body));
      } catch (err) {
        console.warn("[generate-video] Seedance failed, falling back to mock:", (err as Error).message);
      }
    }

    if (hasIonrouterKey()) {
      try {
        return NextResponse.json(await ionCreateVideoTask(body));
      } catch (err) {
        console.warn("[generate-video] ionrouter failed, falling back to mock:", (err as Error).message);
      }
    }

    // All real backends failed — use mock so the pipeline completes
    return NextResponse.json(await mockCreateVideoTask(body));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    console.error("[generate-video]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
