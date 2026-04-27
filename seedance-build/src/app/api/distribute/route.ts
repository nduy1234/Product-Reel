/**
 * POST /api/distribute
 * ─────────────────────────────────────────────────────────────
 * Step 5 (Distribution Layer): uses Seed 2.0 to generate a
 * platform-optimised caption and hashtags, then packages the
 * final content bundle ready to publish.
 *
 * Returns a DistributionPackage:
 *   { videoUrl, audioUrl, caption, hashtags, format, platforms }
 */

import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;
import type { DistributeRequest, DistributionPackage } from "@/types";
import { isDemoMode } from "@/lib/utils";
import { arkPost } from "@/services/byteplus/client";
import { mockDistribute } from "@/services/mock/mockService";
import { hasIonrouterKey, ionPost } from "@/services/ionrouter/client";

const MODEL_ID         = process.env.SEED2_MODEL_ID          ?? "seed-2-0-lite-260228";
const ION_LLM_MODEL_ID = process.env.IONROUTER_LLM_MODEL     ?? "qwen3.5-27b";

// ── Ark chat response ─────────────────────────────────────────
interface ArkChatResponse {
  choices: Array<{ message: { content: string } }>;
}

interface CaptionJSON {
  caption?: string;
  hashtags?: string[];
}

// ── Build the caption prompt ──────────────────────────────────
function buildCaptionPrompt(request: DistributeRequest): string {
  const { analysis } = request;
  return `You are a social media content strategist specialising in TikTok, Instagram Reels, and YouTube Shorts.

Given this marketing context, write a platform-optimised caption and hashtag set.

Product script: "${analysis.script}"
Hook used: "${analysis.hooks[0]}"
Style: ${request.style}

Respond with ONLY valid JSON:
{
  "caption": "2-3 line caption with emojis, CTA at the end (max 150 chars per line)",
  "hashtags": ["#tag1", "#tag2", ...] // 10-12 tags, mix of niche and broad
}`;
}

// ── Generate caption via ionrouter LLM ───────────────────────
async function generateCaptionWithIonrouter(
  request: DistributeRequest
): Promise<{ caption: string; hashtags: string[] }> {
  const response = await ionPost<ArkChatResponse>("/chat/completions", {
    model:           ION_LLM_MODEL_ID,
    messages:        [{ role: "user", content: buildCaptionPrompt(request) }],
    response_format: { type: "json_object" },
    temperature:     0.7,
    max_tokens:      512,
  });

  const raw    = response.choices[0]?.message?.content ?? "{}";
  const parsed: CaptionJSON = JSON.parse(raw);

  return {
    caption:  parsed.caption  ?? `${request.analysis.hooks[0]} ✨\n\n${request.analysis.script}\n\n🛒 Shop now — link in bio!`,
    hashtags: parsed.hashtags ?? ["#ProductReel", "#VideoAd", "#TikTok"],
  };
}

// ── Generate caption via Seed 2.0 ────────────────────────────
async function generateCaptionWithSeed2(
  request: DistributeRequest
): Promise<{ caption: string; hashtags: string[] }> {
  const response = await arkPost<ArkChatResponse>("/chat/completions", {
    model:           MODEL_ID,
    messages:        [{ role: "user", content: buildCaptionPrompt(request) }],
    response_format: { type: "json_object" },
    temperature:     0.7,
    max_tokens:      512,
  });

  const raw    = response.choices[0]?.message?.content ?? "{}";
  const parsed: CaptionJSON = JSON.parse(raw);

  return {
    caption:  parsed.caption  ?? `${request.analysis.hooks[0]} ✨\n\n${request.analysis.script}\n\n🛒 Shop now — link in bio!`,
    hashtags: parsed.hashtags ?? ["#ProductReel", "#VideoAd", "#TikTok"],
  };
}

// ── Route handler ─────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const body: DistributeRequest = await request.json();

    if (!body.analysis || !body.videoUrl) {
      return NextResponse.json(
        { error: "analysis and videoUrl are required" },
        { status: 400 }
      );
    }

    let caption: string;
    let hashtags: string[];

    if (isDemoMode()) {
      const mock = await mockDistribute(body);
      caption  = mock.caption;
      hashtags = mock.hashtags;
    } else if (hasIonrouterKey()) {
      try {
        const generated = await generateCaptionWithIonrouter(body);
        caption  = generated.caption;
        hashtags = generated.hashtags;
      } catch (err) {
        console.warn("[distribute] ionrouter failed, falling back to mock:", (err as Error).message);
        const mock = await mockDistribute(body);
        caption  = mock.caption;
        hashtags = mock.hashtags;
      }
    } else {
      try {
        const generated = await generateCaptionWithSeed2(body);
        caption  = generated.caption;
        hashtags = generated.hashtags;
      } catch (err) {
        console.warn("[distribute] BytePlus failed, falling back to mock:", (err as Error).message);
        const mock = await mockDistribute(body);
        caption  = mock.caption;
        hashtags = mock.hashtags;
      }
    }

    const result: DistributionPackage = {
      videoUrl:  body.videoUrl,
      audioUrl:  body.audioUrl,
      caption,
      hashtags,
      format:    "9:16",
      platforms: ["tiktok", "instagram_reels", "youtube_shorts"],
    };

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    console.error("[distribute]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
