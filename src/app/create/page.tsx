"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Sparkles, Zap, AlertCircle, Image as ImageIcon, Brain,
  Video, Wand2, RefreshCw, ArrowRight, Save, Layers,
} from "lucide-react";
import axios from "axios";

import Navbar          from "@/components/Navbar";
import ImageUpload     from "@/components/ImageUpload";
import StyleSelector   from "@/components/StyleSelector";
import PipelineProgress from "@/components/PipelineProgress";
import VariationCard   from "@/components/VariationCard";

import type {
  StylePreset, PipelineStep, ProductAnalysis,
  StoryboardResult, VideoTask, VoiceResult,
  DistributionPackage, PipelineVariation,
} from "@/types";
import { getDefaultSteps, sleep } from "@/lib/utils";
import { saveHistoryEntry, getHistoryEntry } from "@/lib/history";

// ── Constants ─────────────────────────────────────────────────
const POLL_INTERVAL_MS  = 3_000;     // faster polling
const POLL_MAX_ATTEMPTS = 60;        // 3 min total

// Pipeline steps (avatar removed for speed — was slowest)
const STEPS_FAST = (): PipelineStep[] => getDefaultSteps().filter((s) => s.id !== "avatar");

type Phase = "idle" | "running" | "done" | "error";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
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

const DEMO_DESCRIPTION = "premium stainless steel water bottle that keeps drinks cold for 24 hours";
const DEMO_STYLE: StylePreset = "lifestyle";

export default function CreatePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Input state
  const [imageBase64,  setImageBase64]  = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [description,  setDescription]  = useState("");
  const [style,        setStyle]        = useState<StylePreset>("lifestyle");

  // Pipeline state
  const [phase,        setPhase]        = useState<Phase>("idle");
  const [steps,        setSteps]        = useState<PipelineStep[]>(STEPS_FAST());
  const [variations,   setVariations]   = useState<PipelineVariation[]>([]);
  const [globalError,  setGlobalError]  = useState<string | null>(null);
  const [savedId,      setSavedId]      = useState<string | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load past project if ?id= is present
  useEffect(() => {
    const id = searchParams.get("id");
    if (!id) return;
    const entry = getHistoryEntry(id);
    if (!entry) return;
    setDescription(entry.description);
    setStyle(entry.style);
    setImagePreview(entry.thumbnail);
    setVariations(entry.variations);
    setPhase("done");
    setSavedId(entry.id);
  }, [searchParams]);

  const resetPipeline = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    setPhase("idle");
    setSteps(STEPS_FAST());
    setVariations([]);
    setGlobalError(null);
    setSavedId(null);
  }, []);

  const setStep = useCallback((id: PipelineStep["id"], patch: Partial<PipelineStep>) => {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }, []);

  // Demo seed: drop an image + description and run
  const runDemo = useCallback(async () => {
    setDescription(DEMO_DESCRIPTION);
    setStyle(DEMO_STYLE);
    setGlobalError(null);

    // Fetch a placeholder product image so demo works without upload
    try {
      const res = await fetch("/demo-bottle.jpg").catch(() => null);
      if (res && res.ok) {
        const blob = await res.blob();
        const reader = new FileReader();
        reader.onloadend = () => {
          const dataUrl = reader.result as string;
          setImageBase64(dataUrl);
          setImagePreview(dataUrl);
        };
        reader.readAsDataURL(blob);
      } else {
        // No demo asset present — let demo mode in API stub return mock video
        const placeholder = "data:image/svg+xml;base64," + btoa(
          `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800"><rect width="100%" height="100%" fill="#1a1a26"/><text x="50%" y="50%" font-family="sans-serif" font-size="32" fill="#6366f1" text-anchor="middle">Demo Product</text></svg>`
        );
        setImageBase64(placeholder);
        setImagePreview(placeholder);
      }
    } catch {
      // ignore
    }
  }, []);

  // ── Step: Analyse ──
  const runAnalyze = useCallback(async (imgB64: string, desc: string, st: StylePreset): Promise<ProductAnalysis> => {
    return apiPost<ProductAnalysis>("/api/analyze-product", {
      description: desc, style: st, imageBase64: imgB64,
    });
  }, []);

  // ── Step: Storyboard ──
  const runStoryboard = useCallback(async (analysis: ProductAnalysis, st: StylePreset): Promise<StoryboardResult> => {
    return apiPost<StoryboardResult>("/api/generate-storyboard", {
      cinematic_prompt: analysis.cinematic_prompt,
      full_prompt:      analysis.full_prompt,
      style: st, frameCount: 3,
    });
  }, []);

  // ── Step: Video w/ poll ──
  const runVideo = useCallback(async (imgB64: string, analysis: ProductAnalysis, st: StylePreset): Promise<VideoTask> => {
    const task = await apiPost<VideoTask>("/api/generate-video", {
      imageBase64: imgB64, full_prompt: analysis.full_prompt, style: st,
      duration: 5, aspectRatio: "9:16",
    });
    if (task.status === "succeeded" && task.videoUrl) return task;

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
  }, [setStep]);

  const runVoice = useCallback(async (script: string): Promise<VoiceResult> => {
    return apiPost<VoiceResult>("/api/generate-voice", { script, voice: "en-female-warm" });
  }, []);

  const runDistribute = useCallback(async (analysis: ProductAnalysis, videoUrl: string, audioUrl: string, st: StylePreset): Promise<DistributionPackage> => {
    return apiPost<DistributionPackage>("/api/distribute", { analysis, videoUrl, audioUrl, style: st });
  }, []);

  // ── Faster pipeline: parallelize within variation, share video across variations ──
  const runPipeline = useCallback(async () => {
    if (!imageBase64) { setGlobalError("Upload a product image first."); return; }
    if (!description.trim()) { setGlobalError("Write a one-line product description."); return; }

    resetPipeline();
    setPhase("running");

    try {
      // Step 1: analyze (shared across all 3 variations — gives us 3 hooks at once)
      setStep("analyze", { status: "loading" });
      const analysis = await runAnalyze(imageBase64, description, style);
      setStep("analyze", { status: "done" });

      // Step 2 + 3 in parallel: storyboard | video (both shared across vars)
      setStep("storyboard", { status: "loading" });
      setStep("video",      { status: "loading", progress: 0 });

      const [storyboard, videoTask] = await Promise.all([
        runStoryboard(analysis, style).then((r) => { setStep("storyboard", { status: "done" }); return r; }),
        runVideo(imageBase64, analysis, style).then((r) => { setStep("video", { status: "done", progress: 100 }); return r; }),
      ]);

      // Step 4: voice (shared)
      setStep("voice", { status: "loading" });
      const voice = await runVoice(analysis.script);
      setStep("voice", { status: "done" });

      // Step 5: distribute — run 3 in parallel (one per hook variation)
      setStep("distribute", { status: "loading" });
      const distributions = await Promise.all(
        [0, 1, 2].map((i) =>
          runDistribute(
            { ...analysis, hooks: [analysis.hooks[i], analysis.hooks[i], analysis.hooks[i]] },
            videoTask.videoUrl ?? "",
            voice.audioUrl,
            style,
          ),
        ),
      );
      setStep("distribute", { status: "done" });

      const results: PipelineVariation[] = [0, 1, 2].map((i) => ({
        variationIndex: i,
        hook: analysis.hooks[i % 3],
        analysis,
        storyboard,
        videoTask,
        voice,
        distribution: distributions[i],
      }));

      setVariations(results);
      setPhase("done");

      // Persist to localStorage history
      const saved = saveHistoryEntry({
        description, style,
        thumbnail: imagePreview,
        variations: results,
      });
      setSavedId(saved.id);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Pipeline error";
      console.error("[pipeline]", msg);
      setGlobalError(msg);
      setSteps((prev) => prev.map((s) =>
        s.status === "loading" || s.status === "polling"
          ? { ...s, status: "error", error: msg } : s
      ));
      setPhase("error");
    }
  }, [imageBase64, imagePreview, description, style, resetPipeline, setStep, runAnalyze, runStoryboard, runVideo, runVoice, runDistribute]);

  const isRunning = phase === "running";
  const isDone    = phase === "done";

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white">Create a reel</h1>
            <p className="text-sm text-[#9090b0] mt-0.5">Upload, describe, generate 3 variations.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={runDemo}
              disabled={isRunning}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium bg-violet-500/10 border border-violet-500/30 text-violet-300 hover:bg-violet-500/20 transition-all disabled:opacity-40"
            >
              <Wand2 className="w-3.5 h-3.5" />
              Try demo input
            </button>
            {(isDone || phase === "error") && (
              <button
                onClick={resetPipeline}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium border border-[#252535] text-[#9090b0] hover:text-white hover:border-indigo-500/40 transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                New project
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6 items-start">
          {/* LEFT: input */}
          <div className="space-y-4 lg:sticky lg:top-20">
            <div className="rounded-2xl bg-[#13131c] border border-[#252535] p-4 space-y-3">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-3.5 h-3.5 text-sky-400" />
                <label className="text-xs font-semibold text-[#9090b0] uppercase tracking-wider">Product Image</label>
              </div>
              <ImageUpload
                onImageSelected={(b64, preview) => { setImageBase64(b64); setImagePreview(preview); setGlobalError(null); }}
                onImageCleared={() => { setImageBase64(null); setImagePreview(null); }}
                preview={imagePreview}
                disabled={isRunning}
              />
            </div>

            <div className="rounded-2xl bg-[#13131c] border border-[#252535] p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Brain className="w-3.5 h-3.5 text-violet-400" />
                <label htmlFor="desc" className="text-xs font-semibold text-[#9090b0] uppercase tracking-wider">Product Description</label>
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

            <div className="rounded-2xl bg-[#13131c] border border-[#252535] p-4">
              <StyleSelector value={style} onChange={setStyle} disabled={isRunning} />
            </div>

            {globalError && (
              <div className="flex items-start gap-2 rounded-xl bg-red-500/8 border border-red-500/25 px-3 py-2.5 animate-fade-in">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-300">{globalError}</p>
              </div>
            )}

            <button
              onClick={runPipeline}
              disabled={isRunning || !imageBase64 || !description.trim()}
              className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-lg shadow-indigo-500/25 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none active:scale-[0.98]"
            >
              {isRunning ? (
                <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Generating…</>
              ) : (
                <><Sparkles className="w-4 h-4" /> Generate 3 variations</>
              )}
            </button>

            {savedId && isDone && (
              <button
                onClick={() => router.push("/dashboard")}
                className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-medium border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/15 transition-all"
              >
                <Save className="w-3.5 h-3.5" />
                Saved to dashboard
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* RIGHT: progress + results */}
          <div className="space-y-6 min-h-[480px]">
            {phase === "idle" && (
              <div className="flex flex-col items-center justify-center h-96 rounded-2xl border-2 border-dashed border-[#252535] text-center space-y-5 animate-fade-in">
                <div className="w-20 h-20 rounded-2xl bg-indigo-500/10 flex items-center justify-center animate-float">
                  <Video className="w-10 h-10 text-indigo-500/50" />
                </div>
                <div>
                  <p className="text-[#f0f0fa] font-semibold text-base">Ready to generate</p>
                  <p className="text-sm text-[#5a5a78] mt-1.5 max-w-xs mx-auto">Upload a product image, write a description, click generate.</p>
                </div>
                <div className="flex flex-wrap gap-2 justify-center text-[11px] text-[#5a5a78]">
                  {["⚡ < 90 s", "🎬 9:16", "📱 TikTok · Reels · Shorts", "🤖 5 Seed models"].map((t) => (
                    <span key={t} className="px-2.5 py-1 rounded-full bg-[#13131c] border border-[#252535]">{t}</span>
                  ))}
                </div>
              </div>
            )}

            {isRunning && (
              <div className="rounded-2xl bg-[#13131c] border border-[#252535] p-5 animate-fade-in" style={{ boxShadow: "0 0 40px rgba(99,102,241,0.12)" }}>
                <PipelineProgress steps={steps} isDemoMode={false} />
              </div>
            )}

            {(isDone || phase === "error") && variations.length > 0 && (
              <div className="space-y-4 animate-slide-up">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-400" />
                  <h2 className="text-base font-bold text-white">3 variations ready</h2>
                  <span className="text-xs text-[#5a5a78]">· same video, different hooks &amp; captions</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {variations.map((v, i) => (
                    <VariationCard
                      key={i}
                      variation={v}
                      index={i}
                      isSelected={false}
                      onSelect={() => { /* noop — all visible */ }}
                    />
                  ))}
                </div>
              </div>
            )}

            {phase === "error" && variations.length === 0 && (
              <div className="rounded-2xl bg-red-500/5 border border-red-500/25 p-5 space-y-3 animate-fade-in">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-400" />
                  <p className="text-sm font-semibold text-red-300">Pipeline error</p>
                </div>
                <p className="text-sm text-[#9090b0]">{globalError}</p>
                <PipelineProgress steps={steps} />
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
