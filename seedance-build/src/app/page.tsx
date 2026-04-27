"use client";

/**
 * ProductReel AI — Main Page
 * ─────────────────────────────────────────────────────────────
 * Hackathon: "The Agentic Frontier" — Track 2: Always-On Content Engine
 *
 * Pipeline:
 *   1. Seed 2.0      → product analysis, hooks, script
 *   2. Seedream 5.0  → storyboard keyframes
 *   3. Seedance 2.0  → async video generation (I2V / T2V)
 *   4. Seed Speech   → voiceover synthesis
 *   5. Seed 2.0      → caption + hashtags for distribution
 */

import { useState, useCallback, useRef } from "react";
import {
  Sparkles, Zap, Layers, Info, AlertCircle,
  Clock, Calendar, RefreshCw, ChevronRight,
  Video, Mic, Image as ImageIcon, Brain,
  Share2, Play, Settings, UserCircle2,
} from "lucide-react";
import axios from "axios";

import ImageUpload     from "@/components/ImageUpload";
import StyleSelector   from "@/components/StyleSelector";
import PipelineProgress from "@/components/PipelineProgress";
import ResultDisplay   from "@/components/ResultDisplay";

import type {
  StylePreset, PipelineStep, ProductAnalysis,
  StoryboardResult, VideoTask, VoiceResult,
  AvatarTask, DistributionPackage, PipelineVariation,
} from "@/types";
import { getDefaultSteps, sleep } from "@/lib/utils";
import {
  persistProject, persistRunStart, persistRunEnd,
  persistVariationStart, persistAnalysis, persistStoryboard,
  persistVideo, persistVoice, persistAvatar, persistDistribution,
} from "@/lib/pipeline-persistence";

// ── Constants ─────────────────────────────────────────────────
const POLL_INTERVAL_MS  = 5_000;
const POLL_MAX_ATTEMPTS = 36; // 3 min

// ── Types ─────────────────────────────────────────────────────
type Phase    = "idle" | "running" | "done" | "error";
type TabMode  = "generate" | "schedule";

function updateStep(steps: PipelineStep[], id: PipelineStep["id"], patch: Partial<PipelineStep>): PipelineStep[] {
  return steps.map((s) => (s.id === id ? { ...s, ...patch } : s));
}

// Resolved at build time.
// Local dev  → leave empty (Next.js serves /api/* routes itself)
// Production → set to Butterbase functions base, e.g.:
//   NEXT_PUBLIC_API_BASE_URL=https://api.butterbase.ai/v1/app_m2mmoqmwv49w/fn
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

// Strips the /api prefix when routing to Butterbase functions
// e.g. /api/analyze-product → https://.../fn/analyze-product
function resolveUrl(path: string): string {
  if (API_BASE) return `${API_BASE}${path.replace(/^\/api/, "")}`;
  return path;
}

async function apiPost<T>(url: string, body: unknown): Promise<T> {
  const res = await axios.post<T>(resolveUrl(url), body);
  return res.data;
}

async function apiGet<T>(url: string, params?: Record<string, string>): Promise<T> {
  const res = await axios.get<T>(resolveUrl(url), { params });
  return res.data;
}

// ─────────────────────────────────────────────────────────────
// Pipeline steps metadata (for hero diagram)
// ─────────────────────────────────────────────────────────────
const PIPELINE_STEPS = [
  { icon: Brain,     label: "Analyse",    model: "Seed 2.0",     color: "violet", bg: "bg-violet-500/15", border: "border-violet-500/30", text: "text-violet-300" },
  { icon: ImageIcon, label: "Storyboard", model: "Seedream 5.0", color: "sky",    bg: "bg-sky-500/15",    border: "border-sky-500/30",    text: "text-sky-300"    },
  { icon: Video,     label: "Video",      model: "Seedance 2.0", color: "amber",  bg: "bg-amber-500/15",  border: "border-amber-500/30",  text: "text-amber-300"  },
  { icon: Mic,        label: "Voice",     model: "Seed Speech",  color: "emerald",bg: "bg-emerald-500/15", border: "border-emerald-500/30", text: "text-emerald-300" },
  { icon: UserCircle2,label: "Avatar",    model: "OmniHuman",    color: "rose",   bg: "bg-rose-500/15",    border: "border-rose-500/30",    text: "text-rose-300"    },
  { icon: Share2,    label: "Distribute", model: "Seed 2.0",     color: "pink",   bg: "bg-pink-500/15",    border: "border-pink-500/30",    text: "text-pink-300"    },
];

const SCHEDULE_INTERVALS = [
  { id: "hourly",  label: "Every hour",    desc: "24 videos/day" },
  { id: "4h",      label: "Every 4 hours", desc: "6 videos/day"  },
  { id: "daily",   label: "Daily",         desc: "1 video/day"   },
  { id: "weekly",  label: "Weekly",        desc: "7 videos/week" },
];

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────
export default function Home() {
  // ── Input state ──────────────────────────────────────────
  const [imageBase64,   setImageBase64]   = useState<string | null>(null);
  const [imagePreview,  setImagePreview]  = useState<string | null>(null);
  const [description,   setDescription]  = useState("");
  const [style,         setStyle]        = useState<StylePreset>("lifestyle");

  // ── Pipeline state ───────────────────────────────────────
  const [phase,             setPhase]             = useState<Phase>("idle");
  const [steps,             setSteps]             = useState<PipelineStep[]>(getDefaultSteps());
  const [completedVariations, setCompletedVariations] = useState<PipelineVariation[]>([]);
  const [globalError,       setGlobalError]       = useState<string | null>(null);
  const [isBatchMode,       setIsBatchMode]       = useState(false);

  // ── Always-On state ──────────────────────────────────────
  const [activeTab,         setActiveTab]         = useState<TabMode>("generate");
  const [scheduleInterval,  setScheduleInterval]  = useState("daily");
  const [scheduleEnabled,   setScheduleEnabled]   = useState(false);
  const [scheduledCount,    setScheduledCount]    = useState(0);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Reset ─────────────────────────────────────────────────
  const resetPipeline = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    setPhase("idle");
    setSteps(getDefaultSteps());
    setCompletedVariations([]);
    setGlobalError(null);
    setIsBatchMode(false);
  }, []);

  const setStep = useCallback((id: PipelineStep["id"], patch: Partial<PipelineStep>) => {
    setSteps((prev) => updateStep(prev, id, patch));
  }, []);

  // ── Step 1: Analyse ──────────────────────────────────────
  const runAnalyze = useCallback(async (variationIndex: number): Promise<ProductAnalysis> => {
    if (variationIndex === 0) setStep("analyze", { status: "loading" });
    const result = await apiPost<ProductAnalysis>("/api/analyze-product", {
      description, style, imageBase64: imageBase64 ?? undefined,
    });
    if (variationIndex === 0) setStep("analyze", { status: "done" });
    return result;
  }, [description, style, imageBase64, setStep]);

  // ── Step 2: Storyboard ───────────────────────────────────
  const runStoryboard = useCallback(async (analysis: ProductAnalysis): Promise<StoryboardResult> => {
    setStep("storyboard", { status: "loading" });
    const result = await apiPost<StoryboardResult>("/api/generate-storyboard", {
      cinematic_prompt: analysis.cinematic_prompt,
      full_prompt:      analysis.full_prompt,
      style, frameCount: 3,
    });
    setStep("storyboard", { status: "done" });
    return result;
  }, [style, setStep]);

  // ── Step 3: Video (async + poll) ─────────────────────────
  const runVideo = useCallback(async (analysis: ProductAnalysis): Promise<VideoTask> => {
    if (!imageBase64) throw new Error("Product image is required");
    setStep("video", { status: "loading", progress: 0 });

    const task = await apiPost<VideoTask>("/api/generate-video", {
      imageBase64, full_prompt: analysis.full_prompt, style, duration: 5, aspectRatio: "9:16",
    });

    setStep("video", { status: "polling", progress: 5 });
    let attempts = 0;

    return new Promise<VideoTask>((resolve, reject) => {
      pollRef.current = setInterval(async () => {
        attempts++;
        const pct = Math.min(5 + (attempts / POLL_MAX_ATTEMPTS) * 90, 95);
        try {
          const status = await apiGet<VideoTask>("/api/status", { id: task.taskId });
          setStep("video", { progress: Math.round(pct) });
          if (status.status === "succeeded") {
            clearInterval(pollRef.current!);
            setStep("video", { status: "done", progress: 100 });
            resolve(status);
          } else if (status.status === "failed" || status.status === "cancelled") {
            clearInterval(pollRef.current!);
            reject(new Error(status.error ?? `Video generation ${status.status}`));
          } else if (attempts >= POLL_MAX_ATTEMPTS) {
            clearInterval(pollRef.current!);
            reject(new Error("Video generation timed out after 3 minutes"));
          }
        } catch (err) {
          console.warn("[poll]", err);
        }
      }, POLL_INTERVAL_MS);
    });
  }, [imageBase64, style, setStep]);

  // ── Step 4: Voice ────────────────────────────────────────
  const runVoice = useCallback(async (analysis: ProductAnalysis): Promise<VoiceResult> => {
    setStep("voice", { status: "loading" });
    const result = await apiPost<VoiceResult>("/api/generate-voice", {
      script: analysis.script, voice: "en-female-warm",
    });
    setStep("voice", { status: "done" });
    return result;
  }, [setStep]);

  // ── Step 5: OmniHuman Avatar ────────────────────────────────
  const runAvatar = useCallback(async (refImageBase64: string, audioUrl: string): Promise<AvatarTask> => {
    setStep("avatar", { status: "loading", progress: 0 });
    const task = await apiPost<AvatarTask>("/api/generate-avatar", {
      referenceImageBase64: refImageBase64,
      audioUrl,
      aspectRatio: "9:16",
    });
    if (task.status === "succeeded") {
      setStep("avatar", { status: "done", progress: 100 });
      return task;
    }
    // Poll if pending
    setStep("avatar", { status: "polling", progress: 10 });
    let attempts = 0;
    while (attempts < 24) {
      await new Promise<void>((r) => setTimeout(r, 5000));
      attempts++;
      const pct = Math.min(10 + (attempts / 24) * 85, 95);
      const status = await apiGet<AvatarTask>("/api/avatar-status", { id: task.taskId });
      setStep("avatar", { progress: Math.round(pct) });
      if (status.status === "succeeded") {
        setStep("avatar", { status: "done", progress: 100 });
        return status;
      }
      if (status.status === "failed") {
        throw new Error(status.error ?? "OmniHuman generation failed");
      }
    }
    // Timed out — non-fatal, return partial task
    setStep("avatar", { status: "done", progress: 100 });
    return task;
  }, [setStep]);

  // ── Step 6: Distribute ───────────────────────────────────
  const runDistribute = useCallback(async (analysis: ProductAnalysis, videoUrl: string, audioUrl: string): Promise<DistributionPackage> => {
    setStep("distribute", { status: "loading" });
    const result = await apiPost<DistributionPackage>("/api/distribute", {
      analysis, videoUrl, audioUrl, style,
    });
    setStep("distribute", { status: "done" });
    return result;
  }, [style, setStep]);

  // ── Full pipeline ─────────────────────────────────────────
  const runSingleVariation = useCallback(async (variationIndex: number, firstVariation?: PipelineVariation, runId?: string | null): Promise<PipelineVariation> => {
    const varId = await persistVariationStart(runId ?? null, variationIndex);

    const analysis = await runAnalyze(variationIndex);
    persistAnalysis(varId, analysis, variationIndex);

    let storyboard: StoryboardResult;
    let videoTask: VideoTask;

    if (variationIndex === 0 || !firstVariation) {
      storyboard = await runStoryboard(analysis);
      persistStoryboard(varId, storyboard);
      videoTask  = await runVideo(analysis);
      persistVideo(varId, videoTask);
    } else {
      storyboard = firstVariation.storyboard;
      videoTask  = firstVariation.videoTask;
    }

    const voice = await runVoice(analysis);
    persistVoice(varId, voice);
    const avatarTask = await runAvatar(imageBase64!, voice.audioUrl);
    persistAvatar(varId, avatarTask);
    const distribution = await runDistribute(analysis, videoTask.videoUrl ?? "", voice.audioUrl);
    persistDistribution(varId, distribution);

    return {
      variationIndex,
      hook: analysis.hooks[variationIndex % 3],
      analysis, storyboard, videoTask, voice, avatarTask, distribution,
    };
  }, [runAnalyze, runStoryboard, runVideo, runVoice, runAvatar, runDistribute, imageBase64]);

  const runPipeline = useCallback(async (targetVariations = 1) => {
    if (!imageBase64) { setGlobalError("Please upload a product image first."); return; }
    if (!description.trim()) { setGlobalError("Please enter a product description."); return; }

    resetPipeline();
    setPhase("running");
    setIsBatchMode(targetVariations > 1);

    // Persist run to Butterbase (best-effort — never blocks the pipeline)
    const projectId = await persistProject(description, style);
    const runId     = projectId ? await persistRunStart(projectId, targetVariations, targetVariations > 1) : null;

    try {
      const results: PipelineVariation[] = [];
      for (let i = 0; i < targetVariations; i++) {
        if (i > 0) {
          setSteps((prev) => prev.map((s) =>
            (s.id === "analyze" || s.id === "voice" || s.id === "distribute")
              ? { ...s, status: "idle" } : s
          ));
          await sleep(300);
        }
        const variation = await runSingleVariation(i, results[0], runId);
        results.push(variation);
        setCompletedVariations([...results]);
      }
      persistRunEnd(runId, "done", results.length);
      setPhase("done");
      if (scheduleEnabled) setScheduledCount((c) => c + targetVariations);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Pipeline error";
      console.error("[pipeline]", msg);
      persistRunEnd(runId, "error", 0, msg);
      setGlobalError(msg);
      setSteps((prev) => prev.map((s) =>
        s.status === "loading" || s.status === "polling"
          ? { ...s, status: "error", error: msg } : s
      ));
      setPhase("error");
    }
  }, [imageBase64, description, style, resetPipeline, runSingleVariation, scheduleEnabled]);

  const canGenerate = !!imageBase64 && description.trim().length > 0 && phase !== "running";
  const isRunning   = phase === "running";
  const isDone      = phase === "done";

  return (
    <div className="min-h-screen bg-[#0a0a0f]">

      {/* ── Navbar ──────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 border-b border-[#252535] bg-[#0a0a0f]/90 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Zap className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-white tracking-tight text-sm">
              ProductReel <span className="text-indigo-400">AI</span>
            </span>
          </div>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-[#252535]">
        {/* Background orbs */}
        <div className="orb orb-violet w-[600px] h-[600px] -top-64 -left-32 opacity-60" />
        <div className="orb orb-purple w-[400px] h-[400px] -top-20 right-0 opacity-40" />
        <div className="orb orb-teal   w-[300px] h-[300px] top-20 right-1/4 opacity-30" />
        <div className="bg-grid absolute inset-0 opacity-100" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-20 text-center">
          {/* Hackathon badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/25 text-indigo-300 text-xs font-medium mb-6 animate-fade-in">
            <Zap className="w-3 h-3" />
            Track 2 · Always-On Content Engine · 6 Seed Models
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-[1.1] tracking-tight mb-4 animate-slide-up">
            Product photo{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 animate-gradient">
              → viral video ad
            </span>
            <br />in under 2 minutes
          </h1>

          <p className="text-base sm:text-lg text-[#9090b0] max-w-2xl mx-auto leading-relaxed mb-10 animate-fade-in">
            Fully agentic pipeline: Seed 2.0 analyses your product, Seedream 5.0 renders
            storyboards, Seedance 2.0 generates the video, and Seed Speech adds the
            voiceover — then packages it for TikTok, Reels &amp; Shorts.
          </p>

          {/* Pipeline diagram */}
          <div className="flex items-center justify-center gap-0 sm:gap-1 flex-wrap sm:flex-nowrap mb-10 animate-fade-in">
            {PIPELINE_STEPS.map((step, i) => {
              const Icon = step.icon;
              return (
                <div key={step.label} className="flex items-center">
                  <div className={`flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-xl border ${step.bg} ${step.border} min-w-[80px]`}>
                    <Icon className={`w-4 h-4 ${step.text}`} />
                    <span className="text-[10px] font-semibold text-white">{step.label}</span>
                    <span className={`text-[9px] font-medium ${step.text} opacity-80`}>{step.model}</span>
                  </div>
                  {i < PIPELINE_STEPS.length - 1 && (
                    <ChevronRight className="w-4 h-4 text-[#3a3a55] flex-shrink-0 mx-0.5 hidden sm:block" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Stats row */}
          <div className="flex items-center justify-center gap-6 sm:gap-10 text-center animate-fade-in">
            {[
              { val: "< 2 min", label: "End-to-end" },
              { val: "9:16",    label: "Vertical format" },
              { val: "6 models",label: "BytePlus Seed" },
              { val: "∞",       label: "Always-on mode" },
            ].map(({ val, label }) => (
              <div key={label}>
                <div className="text-lg font-bold text-white">{val}</div>
                <div className="text-[10px] text-[#5a5a78] uppercase tracking-wider">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Tab Bar ──────────────────────────────────────────── */}
      <div className="border-b border-[#252535] bg-[#0d0d17]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex gap-0">
          {[
            { id: "generate" as TabMode, icon: Sparkles, label: "Generate Now" },
            { id: "schedule" as TabMode, icon: Clock,    label: "Always-On Schedule" },
          ].map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === id
                  ? "border-indigo-500 text-indigo-300"
                  : "border-transparent text-[#5a5a78] hover:text-[#9090b0]"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
              {id === "schedule" && scheduleEnabled && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Main Content ─────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

        {/* ── Generate Tab ─────────────────────────────────── */}
        {activeTab === "generate" && (
          <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-8 items-start">

            {/* LEFT: Input panel */}
            <div className="space-y-4 lg:sticky lg:top-20">

              {/* Image upload */}
              <div className="rounded-2xl bg-[#13131c] border border-[#252535] p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-3.5 h-3.5 text-sky-400" />
                  <label className="text-xs font-semibold text-[#9090b0] uppercase tracking-wider">
                    Product Image
                  </label>
                </div>
                <ImageUpload
                  onImageSelected={(b64, preview) => { setImageBase64(b64); setImagePreview(preview); setGlobalError(null); }}
                  onImageCleared={() => { setImageBase64(null); setImagePreview(null); }}
                  preview={imagePreview}
                  disabled={isRunning}
                />
              </div>

              {/* Description */}
              <div className="rounded-2xl bg-[#13131c] border border-[#252535] p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Brain className="w-3.5 h-3.5 text-violet-400" />
                  <label htmlFor="desc" className="text-xs font-semibold text-[#9090b0] uppercase tracking-wider">
                    Product Description
                  </label>
                </div>
                <textarea
                  id="desc"
                  value={description}
                  onChange={(e) => { setDescription(e.target.value); setGlobalError(null); }}
                  disabled={isRunning}
                  rows={3}
                  maxLength={200}
                  placeholder="e.g. premium stainless steel water bottle that keeps drinks cold for 24 hours"
                  className="w-full resize-none rounded-xl bg-[#0a0a0f] border border-[#252535] px-3 py-2.5 text-sm text-[#f0f0fa] placeholder-[#3a3a55] focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/50 transition-all disabled:opacity-50"
                />
                <p className="text-right text-[10px] text-[#3a3a55]">{description.length}/200</p>
              </div>

              {/* Style */}
              <div className="rounded-2xl bg-[#13131c] border border-[#252535] p-4">
                <StyleSelector value={style} onChange={setStyle} disabled={isRunning} />
              </div>

              {/* Error */}
              {globalError && (
                <div className="flex items-start gap-2 rounded-xl bg-red-500/8 border border-red-500/25 px-3 py-2.5 animate-fade-in">
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-300">{globalError}</p>
                </div>
              )}

              {/* CTA buttons */}
              <div className="space-y-2">
                <button
                  onClick={() => runPipeline(3)}
                  disabled={isRunning}
                  className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-lg shadow-indigo-500/25 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none active:scale-[0.98]"
                >
                  {isRunning ? (
                    <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Generating…</>
                  ) : (
                    <><Sparkles className="w-4 h-4" /> Generate 3 Variations</>
                  )}
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => runPipeline(1)} disabled={isRunning}
                    className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-medium border border-[#252535] bg-[#13131c] text-[#9090b0] hover:border-indigo-500/40 hover:text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                    <Zap className="w-3.5 h-3.5 text-indigo-400" /> Quick (1)
                  </button>
                  <button onClick={() => runPipeline(5)} disabled={isRunning}
                    className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-medium border border-[#252535] bg-[#13131c] text-[#9090b0] hover:border-violet-500/40 hover:text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                    <Layers className="w-3.5 h-3.5 text-violet-400" /> Batch × 5
                  </button>
                </div>

                {(isDone || phase === "error") && (
                  <button onClick={resetPipeline}
                    className="w-full text-xs text-[#5a5a78] hover:text-[#9090b0] py-1.5 transition-colors">
                    ↺ Start over
                  </button>
                )}
              </div>

              {/* Model badges */}
              <div className="rounded-2xl bg-[#13131c] border border-[#252535] p-3.5">
                <p className="text-[10px] uppercase tracking-widest text-[#3a3a55] mb-3 font-semibold">
                  Agentic Pipeline
                </p>
                <div className="space-y-2">
                  {PIPELINE_STEPS.map(({ label, model, text, icon: Icon }, i) => (
                    <div key={label} className="flex items-center gap-2.5 text-xs">
                      <span className="w-5 h-5 rounded-full bg-[#1a1a26] flex items-center justify-center text-[9px] text-[#5a5a78] font-bold flex-shrink-0">
                        {i + 1}
                      </span>
                      <Icon className={`w-3 h-3 ${text} flex-shrink-0`} />
                      <span className="text-[#9090b0] flex-1">{label}</span>
                      <span className={`font-semibold ${text}`}>{model}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* RIGHT: Progress + Results */}
            <div className="space-y-6 min-h-[480px]">
              {phase === "idle" && (
                <div className="flex flex-col items-center justify-center h-96 rounded-2xl border-2 border-dashed border-[#252535] text-center space-y-5 animate-fade-in">
                  <div className="w-20 h-20 rounded-2xl bg-indigo-500/10 flex items-center justify-center animate-float">
                    <Video className="w-10 h-10 text-indigo-500/50" />
                  </div>
                  <div>
                    <p className="text-[#f0f0fa] font-semibold text-base">Ready to generate your video ad</p>
                    <p className="text-sm text-[#5a5a78] mt-1.5 max-w-xs mx-auto">
                      Upload a product image, write a one-line description, pick a style.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3 justify-center text-[11px] text-[#5a5a78]">
                    {["⚡ 2 min end-to-end", "🎬 9:16 vertical", "📱 TikTok · Reels · Shorts", "🤖 5 Seed models"].map((t) => (
                      <span key={t} className="px-2.5 py-1 rounded-full bg-[#13131c] border border-[#252535]">{t}</span>
                    ))}
                  </div>
                </div>
              )}

              {isRunning && (
                <div className="rounded-2xl bg-[#13131c] border border-[#252535] p-5 animate-fade-in" style={{ boxShadow: "0 0 40px rgba(99,102,241,0.12)" }}>
                  <PipelineProgress steps={steps} isDemoMode={false} />
                  {completedVariations.length > 0 && (
                    <div className="mt-6 pt-5 border-t border-[#252535]">
                      <p className="text-xs text-[#5a5a78] mb-4">
                        Variation {completedVariations.length} complete — generating more…
                      </p>
                      <ResultDisplay variations={completedVariations} />
                    </div>
                  )}
                </div>
              )}

              {isDone && completedVariations.length > 0 && (
                <div className="rounded-2xl bg-[#13131c] border border-[#252535] p-5 animate-slide-up" style={{ boxShadow: "0 0 40px rgba(99,102,241,0.12)" }}>
                  <ResultDisplay
                    variations={completedVariations}
                    onRegenerate={() => runPipeline(completedVariations.length)}
                    isRegenerating={isRunning}
                  />
                </div>
              )}

              {phase === "error" && (
                <div className="rounded-2xl bg-red-500/5 border border-red-500/25 p-5 space-y-3 animate-fade-in">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-red-400" />
                    <p className="text-sm font-semibold text-red-300">Pipeline Error</p>
                  </div>
                  <p className="text-sm text-[#9090b0]">{globalError}</p>
                  <PipelineProgress steps={steps} />
                  {completedVariations.length > 0 && (
                    <div className="pt-4 border-t border-[#252535]">
                      <p className="text-xs text-[#5a5a78] mb-3">
                        Partial results ({completedVariations.length} variation{completedVariations.length > 1 ? "s" : ""} completed):
                      </p>
                      <ResultDisplay variations={completedVariations} />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Always-On Schedule Tab ───────────────────────── */}
        {activeTab === "schedule" && (
          <div className="max-w-3xl space-y-6 animate-fade-in">

            {/* Header */}
            <div className="rounded-2xl bg-[#13131c] border border-[#252535] p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4 text-indigo-400" />
                    <h2 className="text-base font-bold text-white">Always-On Content Engine</h2>
                    {scheduleEnabled && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 animate-pulse">
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-[#9090b0] max-w-lg leading-relaxed">
                    Set up an automated pipeline that generates fresh product videos on a
                    schedule — no manual input needed. Configure once, publish continuously.
                  </p>
                </div>
                {/* Toggle */}
                <button
                  onClick={() => setScheduleEnabled((v) => !v)}
                  className={`relative flex-shrink-0 w-12 h-6 rounded-full transition-colors duration-200 ${scheduleEnabled ? "bg-indigo-500" : "bg-[#252535]"}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-200 ${scheduleEnabled ? "translate-x-6" : ""}`} />
                </button>
              </div>
            </div>

            {/* Schedule interval */}
            <div className="rounded-2xl bg-[#13131c] border border-[#252535] p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-violet-400" />
                <h3 className="text-sm font-semibold text-white">Generation Frequency</h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {SCHEDULE_INTERVALS.map(({ id, label, desc }) => (
                  <button
                    key={id}
                    onClick={() => setScheduleInterval(id)}
                    className={`flex flex-col items-center gap-1 px-3 py-4 rounded-xl border text-center transition-all ${
                      scheduleInterval === id
                        ? "border-indigo-500/60 bg-indigo-500/10 text-white"
                        : "border-[#252535] bg-[#0a0a0f] text-[#9090b0] hover:border-indigo-500/30"
                    }`}
                  >
                    <span className="text-xs font-semibold">{label}</span>
                    <span className="text-[10px] text-[#5a5a78]">{desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Pipeline config */}
            <div className="rounded-2xl bg-[#13131c] border border-[#252535] p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-semibold text-white">Automation Config</h3>
              </div>

              <div className="space-y-3">
                {[
                  { label: "Variations per run",  value: "3",         sub: "Hook A/B/C tested automatically" },
                  { label: "Output format",        value: "9:16 MP4",  sub: "TikTok · Reels · Shorts ready" },
                  { label: "Distribution",         value: "Auto-pack", sub: "Caption + hashtags per platform" },
                  { label: "Model chain",          value: "Full Seed", sub: "Seed 2.0 → Seedream → Seedance → Speech → OmniHuman" },
                ].map(({ label, value, sub }) => (
                  <div key={label} className="flex items-center justify-between py-3 border-b border-[#1a1a26] last:border-0">
                    <div>
                      <p className="text-sm text-[#f0f0fa] font-medium">{label}</p>
                      <p className="text-xs text-[#5a5a78]">{sub}</p>
                    </div>
                    <span className="text-xs font-semibold text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-lg">
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Stats */}
            {scheduledCount > 0 && (
              <div className="rounded-2xl bg-emerald-500/8 border border-emerald-500/20 p-5 animate-slide-up">
                <div className="flex items-center gap-3">
                  <RefreshCw className="w-5 h-5 text-emerald-400" />
                  <div>
                    <p className="text-sm font-semibold text-emerald-300">
                      {scheduledCount} video{scheduledCount > 1 ? "s" : ""} generated this session
                    </p>
                    <p className="text-xs text-[#5a5a78]">Always-on pipeline running</p>
                  </div>
                </div>
              </div>
            )}

            {/* Run now CTA */}
            <div className="rounded-2xl bg-[#13131c] border border-[#252535] p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-white">Trigger a run now</p>
                <p className="text-xs text-[#5a5a78] mt-0.5">Uses the image + description set in the Generate tab</p>
              </div>
              <button
                onClick={() => { setActiveTab("generate"); setTimeout(() => runPipeline(3), 100); }}
                disabled={!imageBase64 || !description.trim()}
                className="flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Play className="w-4 h-4" /> Run Pipeline
              </button>
            </div>

            {!imageBase64 && (
              <p className="text-xs text-[#5a5a78] text-center">
                ← Go to the <button onClick={() => setActiveTab("generate")} className="text-indigo-400 hover:underline">Generate tab</button> to upload a product image first.
              </p>
            )}
          </div>
        )}
      </main>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className="border-t border-[#252535] mt-20 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-[#3a3a55]">
          <span>ProductReel AI · Hackathon: The Agentic Frontier · Track 2</span>
          <span className="flex items-center gap-2 flex-wrap justify-center">
            {["Seed 2.0", "Seedream 5.0", "Seedance 2.0", "Seed Speech", "OmniHuman"].map((m, i) => (
              <span key={m}>{i > 0 && "·"} {m}</span>
            ))}
          </span>
        </div>
      </footer>
    </div>
  );
}
