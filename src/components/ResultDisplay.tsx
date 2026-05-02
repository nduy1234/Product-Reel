"use client";

import { useState } from "react";
import {
  Download,
  Share2,
  RefreshCw,
  Film,
  Copy,
  Check,
  Layers,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { PipelineVariation } from "@/types";
import VariationCard from "./VariationCard";

interface ResultDisplayProps {
  variations: PipelineVariation[];
  onRegenerate?: () => void;
  isRegenerating?: boolean;
}

export default function ResultDisplay({
  variations,
  onRegenerate,
  isRegenerating = false,
}: ResultDisplayProps) {
  const [selectedVariation, setSelectedVariation] = useState(0);
  const [showScript, setShowScript] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);

  const active = variations[selectedVariation];
  if (!active) return null;

  const { distribution, analysis, videoTask, storyboard } = active;

  const handleCopyAll = async () => {
    const allText = [
      `🎬 Caption:\n${distribution.caption}`,
      `\n🏷️ Hashtags:\n${distribution.hashtags.join(" ")}`,
      `\n📝 Script:\n${analysis.script}`,
    ].join("\n");
    await navigator.clipboard.writeText(allText);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2500);
  };

  return (
    <div className="space-y-6 animate-slide-up">
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <Film className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100">
              Content Package Ready
            </h2>
            <p className="text-xs text-slate-400">
              {variations.length} variation{variations.length > 1 ? "s" : ""} ·
              Ready to publish
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleCopyAll}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-surface-card border border-surface-border hover:border-brand-500/40 text-slate-300 transition-all"
          >
            {copiedAll ? (
              <Check className="w-3 h-3 text-emerald-400" />
            ) : (
              <Copy className="w-3 h-3" />
            )}
            {copiedAll ? "Copied!" : "Copy All"}
          </button>
          {onRegenerate && (
            <button
              onClick={onRegenerate}
              disabled={isRegenerating}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-brand-500/15 border border-brand-500/30 text-brand-400 hover:bg-brand-500/25 transition-all disabled:opacity-50"
            >
              <RefreshCw
                className={cn("w-3 h-3", isRegenerating && "animate-spin")}
              />
              {isRegenerating ? "Regenerating…" : "Regenerate"}
            </button>
          )}
        </div>
      </div>

      {/* ── Platform badges ──────────────────────────────────── */}
      <div className="flex gap-2">
        {distribution.platforms.map((p) => {
          const labels: Record<string, string> = {
            tiktok:           "TikTok",
            instagram_reels:  "Instagram Reels",
            youtube_shorts:   "YouTube Shorts",
          };
          return (
            <span
              key={p}
              className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-surface-card border border-surface-border text-slate-300"
            >
              {labels[p]}
            </span>
          );
        })}
        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-surface-card border border-surface-border text-slate-300">
          {distribution.format}
        </span>
      </div>

      {/* ── Hero video (active variation) ───────────────────── */}
      {videoTask.status === "succeeded" && videoTask.videoUrl ? (
        <div className="relative rounded-2xl overflow-hidden bg-black ring-1 ring-surface-border">
          <div className="flex justify-center bg-black py-2">
            <video
              key={videoTask.videoUrl}
              src={videoTask.videoUrl}
              poster={videoTask.thumbnailUrl}
              controls
              playsInline
              className="max-h-[360px] w-auto rounded-xl"
            />
          </div>
          <div className="px-4 py-3 bg-surface-card flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Variation {selectedVariation + 1} · 9:16 · Seedance 2.0
            </div>
            <a
              href={videoTask.videoUrl}
              download={`productreel-v${selectedVariation + 1}.mp4`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-brand-400 hover:text-brand-300 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Download MP4
            </a>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl bg-surface-card border border-surface-border p-6 text-center">
          <p className="text-sm text-slate-400">Video not available</p>
        </div>
      )}

      {/* ── Storyboard frames ────────────────────────────────── */}
      {storyboard.frames.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
            Storyboard · {storyboard.frames.length} keyframes
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {storyboard.frames.map((frame) => (
              <div
                key={frame.index}
                className="relative flex-shrink-0 w-20 rounded-lg overflow-hidden ring-1 ring-surface-border"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={frame.url}
                  alt={`Frame ${frame.index + 1}`}
                  className="w-full aspect-[9/16] object-cover"
                />
                <div className="absolute bottom-0 inset-x-0 bg-black/60 text-center py-0.5">
                  <span className="text-[9px] text-slate-300">
                    {frame.index + 1}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Caption ──────────────────────────────────────────── */}
      <div className="rounded-xl bg-surface-card border border-surface-border p-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Share2 className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Caption
            </span>
          </div>
          <CopyButton text={distribution.caption} />
        </div>
        <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-line">
          {distribution.caption}
        </p>
      </div>

      {/* ── Hashtags ─────────────────────────────────────────── */}
      <div className="rounded-xl bg-surface-card border border-surface-border p-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Hashtags ({distribution.hashtags.length})
            </span>
          </div>
          <CopyButton text={distribution.hashtags.join(" ")} />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {distribution.hashtags.map((tag) => (
            <span
              key={tag}
              className="text-xs px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-300 border border-brand-500/20"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* ── Script (collapsible) ─────────────────────────────── */}
      <div className="rounded-xl bg-surface-card border border-surface-border overflow-hidden">
        <button
          onClick={() => setShowScript((s) => !s)}
          className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-surface-border/20 transition-colors"
        >
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Voiceover Script
          </span>
          {showScript ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </button>
        {showScript && (
          <div className="px-4 pb-4 border-t border-surface-border/50 pt-3">
            <p className="text-sm text-slate-300 leading-relaxed italic">
              &ldquo;{analysis.script}&rdquo;
            </p>
          </div>
        )}
      </div>

      {/* ── Variation switcher ───────────────────────────────── */}
      {variations.length > 1 && (
        <div className="space-y-3">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
            All Variations
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {variations.map((v, i) => (
              <VariationCard
                key={i}
                variation={v}
                index={i}
                isSelected={selectedVariation === i}
                onSelect={() => setSelectedVariation(i)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Reusable copy button ──────────────────────────────────────
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handle = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handle}
      className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-brand-400 transition-colors"
    >
      {copied ? (
        <Check className="w-3 h-3 text-emerald-400" />
      ) : (
        <Copy className="w-3 h-3" />
      )}
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}
