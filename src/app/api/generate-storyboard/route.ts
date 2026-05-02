/**
 * POST /api/generate-storyboard
 * ─────────────────────────────────────────────────────────────
 * Step 2: calls Seedream 5.0 to generate 2-3 keyframe images
 * that form the visual storyboard for the video ad.
 */

import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;
import type { GenerateStoryboardRequest } from "@/types";
import { isDemoMode } from "@/lib/utils";
import { generateStoryboard } from "@/services/byteplus/seedreamService";
import { mockGenerateStoryboard } from "@/services/mock/mockService";
import { hasIonrouterKey } from "@/services/ionrouter/client";
import { generateStoryboard as ionGenerateStoryboard } from "@/services/ionrouter/storyboardService";

export async function POST(request: NextRequest) {
  try {
    const body: GenerateStoryboardRequest = await request.json();

    if (!body.cinematic_prompt) {
      return NextResponse.json(
        { error: "cinematic_prompt is required" },
        { status: 400 }
      );
    }

    const result = isDemoMode()
      ? await mockGenerateStoryboard(body)
      : hasIonrouterKey()
      ? await ionGenerateStoryboard(body)
      : await generateStoryboard(body);

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    console.error("[generate-storyboard]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
