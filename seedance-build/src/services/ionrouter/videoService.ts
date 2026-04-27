/**
 * ionrouter.io — Async Video Generation Service
 * ─────────────────────────────────────────────────────────────
 * Uses wan2.2-i2v-general for image-to-video generation.
 * Async task pattern — mirrors Seedance service shape:
 *  1. POST /video/generations  → { id, status }
 *  2. GET  /video/generations/{id} → poll until succeeded/failed
 *
 * Model: IONROUTER_VIDEO_MODEL env var (default: wan2.2-i2v-general)
 */

import { ionPost, ionGet } from "./client";
import type { GenerateVideoRequest, VideoTask, VideoTaskStatus } from "@/types";

const VIDEO_MODEL = process.env.IONROUTER_VIDEO_MODEL ?? "wan2.2-i2v-general";

// ── ionrouter video API response shapes ───────────────────────
interface IonVideoCreateResponse {
  id: string;
  status: VideoTaskStatus;
  created?: number;
}

interface IonVideoTaskResponse {
  id: string;
  status: VideoTaskStatus;
  created?: number;
  finished_at?: number;
  output?: {
    video_url?: string;
    cover_image_url?: string;
    duration?: number;
  };
  // Flat fields some platforms return
  video_url?: string;
  error?: string | { message?: string };
}

// ── Create a video generation task ───────────────────────────
export async function createVideoTask(
  request: GenerateVideoRequest
): Promise<VideoTask> {
  const duration    = request.duration    ?? 5;
  const aspectRatio = request.aspectRatio ?? "9:16";

  const imageDataUrl = request.imageBase64.startsWith("data:")
    ? request.imageBase64
    : `data:image/jpeg;base64,${request.imageBase64}`;

  // Derive pixel dimensions from aspect ratio
  const [w, h] = aspectRatio === "16:9"
    ? [1280, 720]
    : aspectRatio === "1:1"
    ? [720, 720]
    : [720, 1280]; // default 9:16

  // Approximate num_frames: 24 fps × duration
  const num_frames = duration * 24;

  const response = await ionPost<IonVideoCreateResponse>("/video/generations", {
    model:     VIDEO_MODEL,
    prompt:    request.full_prompt,
    image_url: imageDataUrl,
    width:     w,
    height:    h,
    num_frames,
  });

  return {
    taskId: response.id,
    status: response.status ?? "pending",
  };
}

// ── Poll task status ──────────────────────────────────────────
export async function getVideoTaskStatus(taskId: string): Promise<VideoTask> {
  const response = await ionGet<IonVideoTaskResponse>(
    `/video/generations/${taskId}`
  );

  const base: VideoTask = {
    taskId: response.id,
    status: response.status,
  };

  if (response.status === "succeeded") {
    const videoUrl =
      response.output?.video_url ??
      response.video_url;

    if (videoUrl) {
      return {
        ...base,
        videoUrl,
        thumbnailUrl: response.output?.cover_image_url,
      };
    }
  }

  if (response.status === "failed") {
    const errMsg =
      typeof response.error === "string"
        ? response.error
        : (response.error as { message?: string } | undefined)?.message ??
          "Video generation failed";
    return { ...base, error: errMsg };
  }

  return base;
}
