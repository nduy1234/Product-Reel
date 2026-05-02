// ============================================================
// Pipeline Persistence — ProductReel AI
//
// Best-effort Butterbase saves for each pipeline step.
// Every function is fire-and-forget (never throws) so DB issues
// never disrupt video generation.
// ============================================================

import { db, tokenStore } from "@/lib/butterbase";
import type {
  StylePreset,
  ProductAnalysis,
  StoryboardResult,
  VideoTask,
  VoiceResult,
  AvatarTask,
  DistributionPackage,
} from "@/types";

function authed(): boolean {
  return !!tokenStore.getAccess();
}

// ── Run lifecycle ─────────────────────────────────────────────

/**
 * Create a project row for the current inputs.
 * Returns the project id, or null if the user isn't signed in.
 */
export async function persistProject(
  description: string,
  style: StylePreset
): Promise<string | null> {
  if (!authed()) return null;
  try {
    const project = await db.projects.create({ description, style_preset: style });
    return project.id;
  } catch {
    return null;
  }
}

/**
 * Open a pipeline_runs row.
 * Returns the run id, or null on failure.
 */
export async function persistRunStart(
  projectId: string,
  targetVariations: number,
  isBatchMode: boolean
): Promise<string | null> {
  if (!authed() || !projectId) return null;
  try {
    const run = await db.pipelineRuns.create({
      project_id:        projectId,
      target_variations: targetVariations,
      is_batch_mode:     isBatchMode,
      status:            "running",
    });
    return run.id;
  } catch {
    return null;
  }
}

/**
 * Mark a run as done or errored. Fire-and-forget.
 */
export function persistRunEnd(
  runId:          string | null,
  status:         "done" | "error",
  completedCount: number,
  errorMessage?:  string
): void {
  if (!runId) return;
  db.pipelineRuns
    .update(runId, {
      status,
      completed_variations_count: completedCount,
      error_message: errorMessage ?? null,
    })
    .catch(() => {});
}

// ── Variation lifecycle ───────────────────────────────────────

/**
 * Open a pipeline_variations row.
 * Returns the variation id, or null on failure.
 */
export async function persistVariationStart(
  runId:          string | null,
  variationIndex: number
): Promise<string | null> {
  if (!runId) return null;
  try {
    const v = await db.pipelineVariations.create({
      run_id:          runId,
      variation_index: variationIndex,
      status:          "running",
    });
    return v.id;
  } catch {
    return null;
  }
}

// ── Per-step saves (all fire-and-forget) ──────────────────────

/** Save the product analysis result. */
export function persistAnalysis(
  variationId:    string | null,
  analysis:       ProductAnalysis,
  variationIndex: number
): void {
  if (!variationId) return;
  db.pipelineVariations
    .update(variationId, {
      hook:     analysis.hooks[variationIndex % 3],
      analysis: analysis as unknown as Record<string, unknown>,
    })
    .catch(() => {});
}

/** Save storyboard frames. */
export function persistStoryboard(
  variationId: string | null,
  storyboard:  StoryboardResult
): void {
  if (!variationId) return;
  db.pipelineVariations
    .update(variationId, { storyboard_frames: storyboard.frames })
    .catch(() => {});
}

/** Save video task result (task id, status, URLs). */
export function persistVideo(
  variationId: string | null,
  videoTask:   VideoTask
): void {
  if (!variationId) return;
  db.pipelineVariations
    .update(variationId, {
      video_task_id:       videoTask.taskId,
      video_status:        videoTask.status,
      video_url:           videoTask.videoUrl           ?? null,
      video_thumbnail_url: videoTask.thumbnailUrl       ?? null,
    })
    .catch(() => {});
}

/** Save voiceover result. */
export function persistVoice(
  variationId: string | null,
  voice:       VoiceResult
): void {
  if (!variationId) return;
  db.pipelineVariations
    .update(variationId, {
      audio_url:             voice.audioUrl,
      audio_duration_seconds: voice.durationSeconds,
    })
    .catch(() => {});
}

/** Save avatar task result. */
export function persistAvatar(
  variationId: string | null,
  avatarTask:  AvatarTask
): void {
  if (!variationId) return;
  db.pipelineVariations
    .update(variationId, {
      avatar_task_id:  avatarTask.taskId,
      avatar_status:   avatarTask.status,
      avatar_video_url: avatarTask.videoUrl ?? null,
    })
    .catch(() => {});
}

/** Save distribution package and mark variation complete. */
export function persistDistribution(
  variationId:  string | null,
  distribution: DistributionPackage
): void {
  if (!variationId) return;
  db.pipelineVariations
    .update(variationId, {
      distribution_caption:   distribution.caption,
      distribution_hashtags:  distribution.hashtags,
      distribution_platforms: distribution.platforms,
      status:                 "done",
    })
    .catch(() => {});
}
