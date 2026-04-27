import { clsx, type ClassValue } from "clsx";
import type { CinematicPrompt, PipelineStep, PipelineStepId, StylePreset } from "@/types";

// ── Tailwind class helper ─────────────────────────────────────
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

// ── Pipeline step definitions ─────────────────────────────────
export function getDefaultSteps(): PipelineStep[] {
  return [
    {
      id: "analyze",
      label: "Understand",
      description: "Seed 2.0 analyses your product & generates hooks",
      model: "Seed 2.0",
      status: "idle",
    },
    {
      id: "storyboard",
      label: "Storyboard",
      description: "Seedream 5.0 renders keyframe images",
      model: "Seedream 5.0",
      status: "idle",
    },
    {
      id: "video",
      label: "Video",
      description: "Seedance 2.0 generates your video ad",
      model: "Seedance 2.0",
      status: "idle",
      progress: 0,
    },
    {
      id: "voice",
      label: "Voiceover",
      description: "Seed Speech synthesises the narration",
      model: "Seed Speech",
      status: "idle",
    },
    {
      id: "avatar",
      label: "Avatar",
      description: "OmniHuman animates a presenter lip-synced to the voiceover",
      model: "OmniHuman",
      status: "idle",
    },
    {
      id: "distribute",
      label: "Package",
      description: "Seed 2.0 optimises caption & hashtags for each platform",
      model: "Seed 2.0",
      status: "idle",
    },
  ];
}

// ── Flatten cinematic prompt to a single string ───────────────
export function flattenCinematicPrompt(
  cp: CinematicPrompt,
  styleModifiers: string
): string {
  return [
    `[HOOK] ${cp.hook}`,
    `[ACTION] ${cp.action}`,
    `[SCENE] ${cp.scene}`,
    `[STYLE] ${cp.style}, ${styleModifiers}`,
    `[CAMERA] ${cp.camera}`,
  ].join(". ");
}

// ── Sleep helper ──────────────────────────────────────────────
export const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

// ── Retry with exponential back-off ──────────────────────────
export async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 3,
  delayMs = 1000
): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (i < retries - 1) await sleep(delayMs * Math.pow(2, i));
    }
  }
  throw lastError;
}

// ── Convert File → base64 data URL (client-side only) ────────
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ── Compress + resize image before sending to API ─────────────
// Resizes to max 1024 px on the longest side, encodes as JPEG 0.82.
// Keeps payload well under gateway limits (~150–300 KB for typical photos).
export function compressImage(file: File, maxPx = 1024, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const { width, height } = img;
        const scale = Math.min(1, maxPx / Math.max(width, height));
        const w = Math.round(width  * scale);
        const h = Math.round(height * scale);

        const canvas = document.createElement("canvas");
        canvas.width  = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) { reject(new Error("Canvas not available")); return; }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

// ── Strip data URL prefix to get raw base64 ──────────────────
export function stripDataUrl(dataUrl: string): string {
  return dataUrl.replace(/^data:[^;]+;base64,/, "");
}

// ── Format duration ───────────────────────────────────────────
export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

// ── Derive step index ─────────────────────────────────────────
export function stepIndex(id: PipelineStepId): number {
  const order: PipelineStepId[] = [
    "analyze",
    "storyboard",
    "video",
    "voice",
    "avatar",
    "distribute",
  ];
  return order.indexOf(id);
}

// ── Style preset → short label ────────────────────────────────
export function styleLabel(style: StylePreset): string {
  const map: Record<StylePreset, string> = {
    lifestyle:    "Lifestyle",
    studio_clean: "Studio Clean",
    dynamic:      "Dynamic",
  };
  return map[style];
}

// ── Generate platform hashtags from description ───────────────
export function generateBaseHashtags(description: string): string[] {
  const words = description
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 3)
    .slice(0, 3)
    .map((w) => `#${w}`);

  return [
    ...words,
    "#ProductReel",
    "#ContentMarketing",
    "#VideoAd",
    "#TikTokAds",
    "#ReelsMarketing",
  ];
}

// ── Truncate text ─────────────────────────────────────────────
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + "...";
}

// ── Is demo/mock mode active? ─────────────────────────────────
export function isDemoMode(): boolean {
  return (
    process.env.DEMO_MODE === "true" ||
    (!process.env.BYTEPLUS_ARK_API_KEY && !process.env.IONROUTER_API_KEY)
  );
}
