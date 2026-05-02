/**
 * Seedance 2.0 Service — Async Video Generation
 * ─────────────────────────────────────────────────────────────
 * Seedance is an asynchronous task-based API:
 *  1. POST /videos/generations  → returns { id, status }
 *  2. GET  /videos/generations/{id} → poll until succeeded/failed
 *
 * API reference:
 *   Model: SEEDANCE_MODEL_ID env var
 */

import { seedancePost as arkPost, seedanceGet as arkGet } from "./seedanceClient";
import type {
  GenerateVideoRequest,
  VideoTask,
  VideoTaskStatus,
} from "@/types";

// ── Model ID ──────────────────────────────────────────────────
const MODEL_ID = process.env.SEEDANCE_MODEL_ID ?? "dreamina-seedance-2-0-fast-260128";

// ── Ark video task response shapes ───────────────────────────
interface ArkVideoCreateResponse {
  id: string;
  status: VideoTaskStatus;
  created: number;
}

interface ArkVideoTaskResponse {
  id: string;
  status: VideoTaskStatus;
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

// ── Create a video generation task ───────────────────────────
export async function createVideoTask(
  request: GenerateVideoRequest
): Promise<VideoTask> {
  const duration = request.duration ?? 5;
  const aspectRatio = request.aspectRatio ?? "9:16";

  // Build multi-modal content array (image + text prompt)
  const imageDataUrl = request.imageBase64.startsWith("data:")
    ? request.imageBase64
    : `data:image/jpeg;base64,${request.imageBase64}`;

  const response = await arkPost<ArkVideoCreateResponse>(
    "/videos/generations",
    {
      model: MODEL_ID,
      content: [
        {
          type:      "image_url",
          image_url: { url: imageDataUrl },
        },
        {
          type: "text",
          text: request.full_prompt,
        },
      ],
      parameters: {
        duration,
        aspect_ratio: aspectRatio,
        fps:          24,
        resolution:   "720p",
      },
    }
  );

  return {
    taskId: response.id,
    status: response.status ?? "pending",
  };
}

// ── Poll task status ──────────────────────────────────────────
export async function getVideoTaskStatus(taskId: string): Promise<VideoTask> {
  const response = await arkGet<ArkVideoTaskResponse>(
    `/videos/generations/${taskId}`
  );

  const base: VideoTask = {
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
      error: response.error?.message ?? "Video generation failed",
    };
  }

  return base;
}

// ── Poll until completion ─────────────────────────────────────
// (Used server-side only; the frontend polls via /api/status)
export async function pollUntilComplete(
  taskId: string,
  options: {
    intervalMs?: number;
    timeoutMs?:  number;
    onProgress?: (task: VideoTask) => void;
  } = {}
): Promise<VideoTask> {
  const { intervalMs = 5_000, timeoutMs = 180_000 } = options;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, intervalMs));
    const task = await getVideoTaskStatus(taskId);

    options.onProgress?.(task);

    if (task.status === "succeeded" || task.status === "failed") {
      return task;
    }
  }

  return {
    taskId,
    status: "failed",
    error: `Video generation timed out after ${timeoutMs / 1000}s`,
  };
}
