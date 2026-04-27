/**
 * GET /api/avatar-status?id={taskId}
 * ─────────────────────────────────────────────────────────────
 * Polls OmniHuman task status. Returns AvatarTask.
 */

import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;
// Polling endpoint — not included in static export (runs on Vercel)

import type { AvatarTask } from "@/types";
import { isDemoMode } from "@/lib/utils";
import { getAvatarTaskStatus } from "@/services/byteplus/omniHumanService";

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  // Mock task IDs always return succeeded
  if (isDemoMode() || id.startsWith("mock-avatar-")) {
    const result: AvatarTask = {
      taskId: id,
      status: "succeeded",
      videoUrl:
        "https://www.pexels.com/download/video/3571264/?fps=25.0&h=1920&w=1080",
    };
    return NextResponse.json(result);
  }

  try {
    const task = await getAvatarTaskStatus(id);
    return NextResponse.json(task);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    console.error("[avatar-status]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
