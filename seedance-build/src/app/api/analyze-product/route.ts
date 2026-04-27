/**
 * POST /api/analyze-product
 * ─────────────────────────────────────────────────────────────
 * Step 1 of the pipeline: calls Seed 2.0 to understand the
 * product and generate hooks + a structured cinematic prompt.
 */

import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;
import type { AnalyzeProductRequest } from "@/types";
import { isDemoMode } from "@/lib/utils";
import { analyzeProduct } from "@/services/byteplus/seed2Service";
import { mockAnalyzeProduct } from "@/services/mock/mockService";
import { hasIonrouterKey } from "@/services/ionrouter/client";
import { analyzeProduct as ionAnalyzeProduct } from "@/services/ionrouter/analyzeService";

export async function POST(request: NextRequest) {
  try {
    const body: AnalyzeProductRequest = await request.json();

    if (!body.description?.trim()) {
      return NextResponse.json(
        { error: "description is required" },
        { status: 400 }
      );
    }

    if (!body.style) {
      return NextResponse.json(
        { error: "style preset is required" },
        { status: 400 }
      );
    }

    const result = isDemoMode()
      ? await mockAnalyzeProduct(body)
      : hasIonrouterKey()
      ? await ionAnalyzeProduct(body)
      : await analyzeProduct(body);

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    console.error("[analyze-product]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
