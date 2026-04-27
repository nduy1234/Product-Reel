/**
 * ionrouter.io — Storyboard / Keyframe Generation Service
 * ─────────────────────────────────────────────────────────────
 * Generates 2-3 keyframe images using Flux Schnell via the
 * OpenAI-compatible /images/generations endpoint.
 *
 * Model: IONROUTER_IMAGE_MODEL env var (default: flux-schnell)
 */

import { ionPost } from "./client";
import type {
  GenerateStoryboardRequest,
  StoryboardFrame,
  StoryboardResult,
} from "@/types";
import { STYLE_PRESETS } from "@/types";

const IMAGE_MODEL = process.env.IONROUTER_IMAGE_MODEL ?? "flux-schnell";

// ── OpenAI images/generations response shape ──────────────────
interface ImageResponse {
  created: number;
  data: Array<{
    url?: string;
    b64_json?: string;
    revised_prompt?: string;
  }>;
}

// ── Build per-frame prompts (mirrors seedreamService) ─────────
function buildFramePrompts(request: GenerateStoryboardRequest): string[] {
  const { cinematic_prompt: cp, style } = request;
  const styleModifiers = STYLE_PRESETS[style].promptModifiers;
  const frameCount = request.frameCount ?? 3;

  if (frameCount === 2) {
    return [
      `${cp.hook}. ${cp.scene}. ${styleModifiers}. Ultra high quality product photograph, 9:16 vertical format, cinematic composition, photorealistic`,
      `${cp.action}. ${cp.scene}. ${cp.camera}. ${styleModifiers}. Ultra high quality, dramatic product shot, 9:16 vertical format, cinematic`,
    ];
  }

  return [
    // Frame 1: Hook / Opening
    `${cp.hook}. ${cp.scene}. ${styleModifiers}. Ultra high quality product photograph, 9:16 vertical format, cinematic composition, photorealistic`,
    // Frame 2: Main action
    `${cp.action}. ${cp.scene}. ${styleModifiers}. Ultra high quality, mid-shot product in use, 9:16 vertical format, cinematic`,
    // Frame 3: Closing / CTA
    `Product hero shot, ${cp.style}, ${cp.camera}. ${styleModifiers}. Clean and polished, 9:16 vertical format, cinematic product photography`,
  ];
}

// ── Generate a single frame ───────────────────────────────────
async function generateFrame(
  prompt: string,
  index: number
): Promise<StoryboardFrame> {
  const response = await ionPost<ImageResponse>("/images/generations", {
    model:           IMAGE_MODEL,
    prompt,
    width:           720,
    height:          1280,
    response_format: "b64_json",  // avoids a second round-trip to fetch a URL
  });

  const image = response.data?.[0];
  if (!image?.b64_json) {
    throw new Error(`ionrouter image model returned no base64 data for frame ${index + 1}`);
  }

  return { index, url: `data:image/png;base64,${image.b64_json}`, prompt };
}

// ── Main export ───────────────────────────────────────────────
export async function generateStoryboard(
  request: GenerateStoryboardRequest
): Promise<StoryboardResult> {
  const prompts = buildFramePrompts(request);
  const frames: StoryboardFrame[] = [];

  // Sequential to stay within rate limits
  for (let i = 0; i < prompts.length; i++) {
    const frame = await generateFrame(prompts[i], i);
    frames.push(frame);
  }

  return { frames };
}
