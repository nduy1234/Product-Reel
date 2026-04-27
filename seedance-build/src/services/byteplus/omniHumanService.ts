/**
 * OmniHuman Service — Talking-Head Avatar Generation
 * ─────────────────────────────────────────────────────────────
 * OmniHuman creates a realistic talking-head video by combining:
 *   • A reference image (avatar/portrait or product image)
 *   • An audio file (the Seed Speech voiceover)
 * Output: a 9:16 MP4 of the avatar lip-syncing to the narration.
 *
 * Async task pattern (same as Seedance 2.0):
 *   POST /videos/omni-human/generations → { id, status }
 *   GET  /videos/omni-human/generations/{id} → poll until done
 *
 * Model IDs (April 2026):
 *   omni-human-lite-fast-250515   ← default (faster)
 *   omni-human-lite-250515        ← higher quality
 */

import { arkPost, arkGet } from "./client";
import type { AvatarTask } from "@/types";

// ── Model ─────────────────────────────────────────────────────
const MODEL_ID =
  process.env.OMNI_HUMAN_MODEL_ID ?? "omni-human-lite-fast-250515";

// ── Task response shape ───────────────────────────────────────
interface OmniHumanCreateResponse {
  id: string;
  status: AvatarTask["status"];
  created: number;
}

interface OmniHumanTaskResponse {
  id: string;
  status: AvatarTask["status"];
  created: number;
  finished_at?: number;
  video?: {
    url: string;
    duration?: number;
    cover_image_url?: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

// ── Create avatar generation task ─────────────────────────────
export async function createAvatarTask(
  referenceImageBase64: string,
  audioUrl: string,
  aspectRatio: "9:16" | "16:9" | "1:1" = "9:16"
): Promise<AvatarTask> {
  const imageDataUrl = referenceImageBase64.startsWith("data:")
    ? referenceImageBase64
    : `data:image/jpeg;base64,${referenceImageBase64}`;

  const response = await arkPost<OmniHumanCreateResponse>(
    "/videos/omni-human/generations",
    {
      model: MODEL_ID,
      content: [
        {
          type:      "image_url",
          image_url: { url: imageDataUrl },
        },
        {
          type:      "audio_url",
          audio_url: { url: audioUrl },
        },
      ],
      parameters: {
        aspect_ratio:    aspectRatio,
        fps:             25,
        resolution:      "720p",
        lip_sync:        true,
        face_enhance:    true,
      },
    }
  );

  return {
    taskId: response.id,
    status: response.status ?? "pending",
  };
}

// ── Poll task status ──────────────────────────────────────────
export async function getAvatarTaskStatus(taskId: string): Promise<AvatarTask> {
  const response = await arkGet<OmniHumanTaskResponse>(
    `/videos/omni-human/generations/${taskId}`
  );

  const base: AvatarTask = {
    taskId: response.id,
    status: response.status,
  };

  if (response.status === "succeeded" && response.video?.url) {
    return {
      ...base,
      videoUrl:     response.video.url,
      thumbnailUrl: response.video.cover_image_url,
    };
  }

  if (response.status === "failed") {
    return {
      ...base,
      error: response.error?.message ?? "OmniHuman generation failed",
    };
  }

  return base;
}
