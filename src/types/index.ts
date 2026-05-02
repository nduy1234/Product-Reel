// ============================================================
// ProductReel AI — Shared TypeScript Types
// ============================================================

// ── Style Presets ─────────────────────────────────────────────
export type StylePreset = "lifestyle" | "studio_clean" | "dynamic";

export const STYLE_PRESETS: Record<
  StylePreset,
  { label: string; description: string; promptModifiers: string; icon: string }
> = {
  lifestyle: {
    label: "Lifestyle",
    description: "Natural, authentic feel",
    promptModifiers:
      "natural lighting, handheld camera, organic motion, warm tones, lifestyle photography style, bokeh background",
    icon: "🌿",
  },
  studio_clean: {
    label: "Studio Clean",
    description: "Polished product showcase",
    promptModifiers:
      "white background, soft studio lighting, slow 360° rotation, crisp shadows, professional product photography",
    icon: "✨",
  },
  dynamic: {
    label: "Dynamic / Energetic",
    description: "High-impact, fast-paced",
    promptModifiers:
      "particle effects, liquid splashes, high energy, fast camera movements, dramatic lighting, cinematic color grading, motion blur",
    icon: "⚡",
  },
};

// ── Pipeline Steps ────────────────────────────────────────────
export type PipelineStepId =
  | "analyze"
  | "storyboard"
  | "video"
  | "voice"
  | "avatar"
  | "distribute";

export type PipelineStepStatus =
  | "idle"
  | "loading"
  | "polling"
  | "done"
  | "error";

export interface PipelineStep {
  id: PipelineStepId;
  label: string;
  description: string;
  model: string;
  status: PipelineStepStatus;
  progress?: number; // 0-100 for polling steps
  error?: string;
}

// ── Step 1: Product Analysis (Seed 2.0) ──────────────────────
export interface CinematicPrompt {
  hook: string;       // Opening line / attention grabber
  action: string;     // What the product is doing
  scene: string;      // Environment / context
  style: string;      // Visual style description
  camera: string;     // Camera movement / angle
}

export interface ProductAnalysis {
  hooks: [string, string, string];   // 3 hook variations
  script: string;                    // Narration script (30–60 words)
  cinematic_prompt: CinematicPrompt; // Structured video prompt
  full_prompt: string;               // Flattened string for APIs
}

// ── Step 2: Storyboard (Seedream 5.0) ────────────────────────
export interface StoryboardFrame {
  index: number;
  url: string;
  prompt: string;
}

export interface StoryboardResult {
  frames: StoryboardFrame[];
}

// ── Step 3: Video Generation (Seedance 2.0) ───────────────────
export type VideoTaskStatus =
  | "pending"
  | "running"
  | "succeeded"
  | "failed"
  | "cancelled";

export interface VideoTask {
  taskId: string;
  status: VideoTaskStatus;
  videoUrl?: string;
  thumbnailUrl?: string;
  error?: string;
}

// ── Step 4: Voiceover (Seed Speech) ──────────────────────────
export interface VoiceResult {
  audioUrl: string;        // URL or data URL of the audio file
  durationSeconds: number;
  format: "mp3" | "wav";
}


// ── Step 5: OmniHuman Avatar (talking-head video) ────────────
export interface AvatarTask {
  taskId: string;
  status: "pending" | "running" | "succeeded" | "failed";
  videoUrl?: string;
  thumbnailUrl?: string;
  error?: string;
}

export interface GenerateAvatarRequest {
  referenceImageBase64: string; // portrait or product image
  audioUrl: string;             // voice-over URL from step 4
  aspectRatio?: "9:16" | "16:9" | "1:1";
}

// ── Step 6: Distribution Package ─────────────────────────────
export interface DistributionPackage {
  videoUrl: string;
  audioUrl: string;
  caption: string;
  hashtags: string[];
  format: "9:16";
  platforms: ("tiktok" | "instagram_reels" | "youtube_shorts")[];
}

// ── Full Pipeline Result (one variation) ─────────────────────
export interface PipelineVariation {
  variationIndex: number; // 0, 1, 2
  hook: string;
  analysis: ProductAnalysis;
  storyboard: StoryboardResult;
  videoTask: VideoTask;
  voice: VoiceResult;
  avatarTask?: AvatarTask;
  distribution: DistributionPackage;
}

// ── App State ─────────────────────────────────────────────────
export interface AppState {
  // Input
  productImageBase64: string | null;
  productImageUrl: string | null;
  productDescription: string;
  stylePreset: StylePreset;

  // Pipeline tracking
  steps: PipelineStep[];
  activeVariationIndex: number;
  variations: Partial<PipelineVariation>[];
  completedVariations: PipelineVariation[];

  // Overall status
  isRunning: boolean;
  isBatchMode: boolean;
  error: string | null;
}

// ── API Request / Response shapes ────────────────────────────
export interface AnalyzeProductRequest {
  description: string;
  style: StylePreset;
  imageBase64?: string;
}

export interface GenerateStoryboardRequest {
  cinematic_prompt: CinematicPrompt;
  full_prompt: string;
  style: StylePreset;
  frameCount?: 2 | 3;
}

export interface GenerateVideoRequest {
  imageBase64: string;
  full_prompt: string;
  style: StylePreset;
  duration?: 5 | 7 | 10;
  aspectRatio?: "9:16" | "16:9" | "1:1";
}

export interface GenerateVoiceRequest {
  script: string;
  voice?: string;
}

export interface DistributeRequest {
  analysis: ProductAnalysis;
  videoUrl: string;
  audioUrl: string;
  style: StylePreset;
}

export interface ApiErrorResponse {
  error: string;
  details?: unknown;
}
