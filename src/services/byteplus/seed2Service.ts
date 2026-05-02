/**
 * Seed 2.0 Service — Product Understanding & Script Generation
 * ─────────────────────────────────────────────────────────────
 * Uses the Seed 2.0 LLM via BytePlus Ark chat completions API.
 * Returns structured JSON with hooks, script, and cinematic prompt.
 *
 * API reference:
 *   POST /chat/completions
 *   Model: SEED2_MODEL_ID env var
 */

import { arkPost } from "./client";
import type {
  AnalyzeProductRequest,
  ProductAnalysis,
  CinematicPrompt,
} from "@/types";
import { STYLE_PRESETS } from "@/types";

// ── Model ID ──────────────────────────────────────────────────
const MODEL_ID = process.env.SEED2_MODEL_ID ?? "seed-2-0-lite-260228";

// ── System prompt ─────────────────────────────────────────────
const SYSTEM_PROMPT = `You are an expert marketing video scriptwriter and creative director specialising in short-form social media ads (TikTok, Instagram Reels, YouTube Shorts).

Your task is to analyse a product description and style preset, then produce a structured JSON object that a downstream video-generation pipeline can consume directly.

You MUST respond with ONLY valid JSON — no markdown fences, no prose outside the JSON.

JSON schema:
{
  "hooks": [
    "hook variation 1 — punchy, curiosity-driven",
    "hook variation 2 — benefit-focused",
    "hook variation 3 — question or bold claim"
  ],
  "script": "30-50 word narration that flows naturally as a voiceover. Use second-person (you/your).",
  "cinematic_prompt": {
    "hook":   "Opening scene description (1-2 sentences)",
    "action": "What the product does on screen",
    "scene":  "Environment, background, props",
    "style":  "Visual style, mood, colour palette",
    "camera": "Camera movement: pan, zoom, dolly, static, etc."
  }
}

Rules:
- hooks must be ≤12 words each and start with a verb or strong noun
- script must sound natural when read aloud in 5-8 seconds
- cinematic_prompt fields must be concrete and visually descriptive
- Tailor everything to the provided style preset`;

// ── Ark chat completions response shape ───────────────────────
interface ArkChatResponse {
  id: string;
  choices: Array<{
    message: {
      content: string;
    };
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
  };
}

// ── Main function ─────────────────────────────────────────────
export async function analyzeProduct(
  request: AnalyzeProductRequest
): Promise<ProductAnalysis> {
  const styleInfo = STYLE_PRESETS[request.style];

  const userMessage = [
    `Product description: "${request.description}"`,
    `Style preset: ${styleInfo.label} — ${styleInfo.description}`,
    `Style visual modifiers: ${styleInfo.promptModifiers}`,
    request.imageBase64
      ? "A product image has been provided (use it to inform your descriptions)."
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  const messages: Array<{ role: string; content: unknown }> = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user",   content: userMessage },
  ];

  // If image provided, use vision format
  if (request.imageBase64) {
    messages[1] = {
      role: "user",
      content: [
        { type: "text", text: userMessage },
        {
          type: "image_url",
          image_url: {
            url: request.imageBase64.startsWith("data:")
              ? request.imageBase64
              : `data:image/jpeg;base64,${request.imageBase64}`,
          },
        },
      ],
    };
  }

  const response = await arkPost<ArkChatResponse>("/chat/completions", {
    model: MODEL_ID,
    messages,
    response_format: { type: "json_object" },
    temperature: 0.8,
    max_tokens: 1024,
  });

  const rawContent = response.choices[0]?.message?.content ?? "{}";

  // Parse and validate
  let parsed: {
    hooks?: string[];
    script?: string;
    cinematic_prompt?: Partial<CinematicPrompt>;
  };

  try {
    parsed = JSON.parse(rawContent);
  } catch {
    throw new Error(`Seed 2.0 returned invalid JSON: ${rawContent.slice(0, 200)}`);
  }

  // Validate hooks
  const hooks = parsed.hooks ?? [];
  if (hooks.length < 3) {
    throw new Error("Seed 2.0 returned fewer than 3 hook variations");
  }

  const cp = parsed.cinematic_prompt ?? {};
  const cinematic: CinematicPrompt = {
    hook:   cp.hook   ?? "Product reveal with dramatic lighting",
    action: cp.action ?? "Product showcased in action",
    scene:  cp.scene  ?? "Clean, modern environment",
    style:  cp.style  ?? styleInfo.promptModifiers,
    camera: cp.camera ?? "Slow push-in, product centre frame",
  };

  const full_prompt = [
    `[HOOK] ${cinematic.hook}`,
    `[ACTION] ${cinematic.action}`,
    `[SCENE] ${cinematic.scene}`,
    `[STYLE] ${cinematic.style}`,
    `[CAMERA] ${cinematic.camera}`,
  ].join(". ");

  return {
    hooks:             [hooks[0], hooks[1], hooks[2]],
    script:            parsed.script ?? `Introducing ${request.description}. Experience the difference today.`,
    cinematic_prompt:  cinematic,
    full_prompt,
  };
}
