/**
 * GET /api/status?id=<taskId>
 * ─────────────────────────────────────────────────────────────
 * Polls the status of a Seedance 2.0 video generation task.
 *
 * The client calls this every 5 seconds until status is
 * "succeeded" or "failed".
 *
 * Response:
 *   { taskId, status, videoUrl?, thumbnailUrl?, error? }
 */

import { NextRequest, NextResponse } from "next/server";
import { isDemoMode } from "@/lib/utils";
import { hasSeedanceKey } from "@/services/byteplus/seedanceClient";
import { getVideoTaskStatus } from "@/services/byteplus/seedanceService";
import { mockGetVideoStatus } from "@/services/mock/mockService";
import { hasIonrouterKey } from "@/services/ionrouter/client";
import { getVideoTaskStatus as ionGetVideoTaskStatus } from "@/services/ionrouter/videoService";

// Polling endpoint — not included in static export (runs on Vercel)
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get("id");

    if (!taskId) {
      return NextResponse.json(
        { error: "id query parameter is required" },
        { status: 400 }
      );
    }

    // Demo mode → mock immediately
    if (isDemoMode()) {
      return NextResponse.json(await mockGetVideoStatus(taskId));
    }

    // Try real backends, fall back to mock if they fail
    if (hasSeedanceKey()) {
      try {
        return NextResponse.json(await getVideoTaskStatus(taskId));
      } catch (err) {
        console.warn("[status] Seedance failed, falling back to mock:", (err as Error).message);
      }
    }

    if (hasIonrouterKey()) {
      try {
        return NextResponse.json(await ionGetVideoTaskStatus(taskId));
      } catch (err) {
        console.warn("[status] ionrouter failed, falling back to mock:", (err as Error).message);
      }
    }

    return NextResponse.json(await mockGetVideoStatus(taskId));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    console.error("[status]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
