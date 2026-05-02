/**
 * Seedream 5.0 Service — Storyboard Keyframe Generation
 * ─────────────────────────────────────────────────────────────
 * Generates 2-3 keyframe images that form the visual storyboard
 * for the video ad.
 *
 * API reference:
 *   POST /images/generations
 *   Model: SEEDREAM_MODEL_ID env var
 */

import { arkPost } from "./client";
import type {
  GenerateStoryboardRequest,
  StoryboardFrame,
  StoryboardResult,
} from "@/types";
import { STYLE_PRESETS } from "@/types";

// ── Model ID ──────────────────────────────────────────────────
const MODEL_ID = process.env.SEEDREAM_MODEL_ID ?? "seedream-5-0-260128";

// ── Ark images/generations response shape ─────────────────────
interface ArkImageResponse {
  created: number;
  data: Array<{
    url?: string;
    b64_json?: string;
    revised_prompt?: string;
  }>;
}

// ── Build per-frame prompts ───────────────────────────────────
function buildFramePrompts(
  request: GenerateStoryboardRequest
): string[] {
  const { cinematic_prompt: cp, style } = request;
  const styleModifiers = STYLE_PRESETS[style].promptModifiers;

  const frameCount = request.frameCount ?? 3;

  if (frameCount === 2) {
    return [
      // Frame 1: Opening hook
      `${cp.hook}. ${cp.scene}. ${styleModifiers}. Ultra high quality product photograph, 9:16 vertical format, cinematic composition, photorealistic`,
      // Frame 2: Action climax
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

// ── Generate a single image ───────────────────────────────────
async function generateFrame(
  prompt: string,
  index: number
): Promise<StoryboardFrame> {
  const response = await arkPost<ArkImageResponse>("/images/generations", {
    model:  MODEL_ID,
    prompt,
    n:      1,
    size:   "720x1280",   // 9:16 portrait
    response_format: "url",
  });

  const image = response.data?.[0];
  if (!image?.url && !image?.b64_json) {
    throw new Error(`Seedream 5.0 returned no image data for frame ${index + 1}`);
  }

  const url = image.url ?? `data:image/png;base64,${image.b64_json}`;

  return { index, url, prompt };
}

// ── Main function ─────────────────────────────────────────────
export async function generateStoryboard(
  request: GenerateStoryboardRequest
): Promise<StoryboardResult> {
  const prompts = buildFramePrompts(request);

  // Generate frames sequentially to stay within rate limits
  // (switch to Promise.all if your tier allows parallel requests)
  const frames: StoryboardFrame[] = [];

  for (let i = 0; i < prompts.length; i++) {
    const frame = await generateFrame(prompts[i], i);
    frames.push(frame);
  }

  return { frames };
}
