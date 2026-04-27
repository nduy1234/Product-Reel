"use client";

import { Play, Volume2, Copy, Check, ExternalLink } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { PipelineVariation } from "@/types";

const WATCH_NAMES = ["Classic Leather", "Luxury Dress", "Sport Chronograph"];

interface VariationCardProps {
  variation: PipelineVariation;
  isSelected?: boolean;
  onSelect?: () => void;
  index: number;
}

export default function VariationCard({
  variation,
  isSelected = false,
  onSelect,
  index,
}: VariationCardProps) {
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [copiedTags, setCopiedTags] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const { distribution, analysis, videoTask, voice, storyboard } = variation;
  const watchThumb = storyboard.frames[index % storyboard.frames.length]?.url ?? videoTask.thumbnailUrl;

  const handleCopyCaption = async () => {
    await navigator.clipboard.writeText(distribution.caption);
    setCopiedCaption(true);
    setTimeout(() => setCopiedCaption(false), 2000);
  };

  const handleCopyHashtags = async () => {
    await navigator.clipboard.writeText(distribution.hashtags.join(" "));
    setCopiedTags(true);
    setTimeout(() => setCopiedTags(false), 2000);
  };

  const handlePlayAudio = () => {
    if (!voice.audioUrl) return;
    const audio = new Audio(voice.audioUrl);
    setIsPlayingAudio(true);
    audio.play();
    audio.onended = () => setIsPlayingAudio(false);
  };

  return (
    <div
      className={cn(
        "rounded-2xl border transition-all duration-200 overflow-hidden",
        isSelected
          ? "border-brand-500 ring-1 ring-brand-500/30 bg-surface-card"
          : "border-surface-border bg-surface-card hover:border-brand-500/40",
        onSelect && "cursor-pointer"
      )}
      onClick={onSelect}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-border">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-brand-500/20 flex items-center justify-center text-xs font-bold text-brand-400">
            {index + 1}
          </span>
          <div>
            <span className="text-sm font-semibold text-slate-200">
              Variation {index + 1}
            </span>
            <p className="text-[10px] text-slate-500">{WATCH_NAMES[index % 3]}</p>
          </div>
        </div>
        {isSelected && (
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-brand-500/20 text-brand-400 border border-brand-500/30">
            Active
          </span>
        )}
      </div>

      {/* Hook */}
      <div className="px-4 py-3 border-b border-surface-border/50">
        <p className="text-[11px] uppercase tracking-wider text-slate-500 mb-1">
          Hook
        </p>
        <p className="text-sm text-slate-200 font-medium leading-snug">
          &ldquo;{analysis.hooks[index % 3]}&rdquo;
        </p>
      </div>

      {/* Video preview */}
      {videoTask.status === "succeeded" && videoTask.videoUrl ? (
        <div className="relative bg-black aspect-[9/16] max-h-48 overflow-hidden">
          <video
            src={videoTask.videoUrl}
            className="w-full h-full object-cover"
            controls
            playsInline
            poster={watchThumb}
          />
          <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm rounded-md px-1.5 py-0.5 flex items-center gap-1">
            <span className="text-[10px] text-white font-medium">9:16</span>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center bg-surface-border/30 aspect-[9/16] max-h-36">
          <div className="text-center space-y-1">
            <Play className="w-6 h-6 text-slate-600 mx-auto" />
            <p className="text-[10px] text-slate-600">No preview</p>
          </div>
        </div>
      )}

      {/* Caption */}
      <div className="px-4 py-3 space-y-2 border-t border-surface-border/50">
        <div className="flex items-center justify-between">
          <p className="text-[11px] uppercase tracking-wider text-slate-500">
            Caption
          </p>
          <button
            onClick={(e) => { e.stopPropagation(); handleCopyCaption(); }}
            className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-brand-400 transition-colors"
          >
            {copiedCaption ? (
              <Check className="w-3 h-3 text-emerald-400" />
            ) : (
              <Copy className="w-3 h-3" />
            )}
            {copiedCaption ? "Copied!" : "Copy"}
          </button>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed line-clamp-3 whitespace-pre-line">
          {distribution.caption}
        </p>
      </div>

      {/* Hashtags */}
      <div className="px-4 pb-3 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[11px] uppercase tracking-wider text-slate-500">
            Hashtags
          </p>
          <button
            onClick={(e) => { e.stopPropagation(); handleCopyHashtags(); }}
            className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-brand-400 transition-colors"
          >
            {copiedTags ? (
              <Check className="w-3 h-3 text-emerald-400" />
            ) : (
              <Copy className="w-3 h-3" />
            )}
            {copiedTags ? "Copied!" : "Copy"}
          </button>
        </div>
        <div className="flex flex-wrap gap-1">
          {distribution.hashtags.slice(0, 6).map((tag) => (
            <span
              key={tag}
              className="text-[10px] px-1.5 py-0.5 rounded bg-brand-500/10 text-brand-400 border border-brand-500/20"
            >
              {tag}
            </span>
          ))}
          {distribution.hashtags.length > 6 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-border text-slate-500">
              +{distribution.hashtags.length - 6} more
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="px-4 pb-4 flex gap-2 border-t border-surface-border/50 pt-3">
        {/* Voiceover play */}
        <button
          onClick={(e) => { e.stopPropagation(); handlePlayAudio(); }}
          disabled={!voice.audioUrl}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
            voice.audioUrl
              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25"
              : "bg-surface-border/50 text-slate-600 border border-transparent cursor-not-allowed"
          )}
        >
          <Volume2 className={cn("w-3 h-3", isPlayingAudio && "animate-pulse")} />
          {isPlayingAudio ? "Playing…" : "Voiceover"}
        </button>

        {/* Download video */}
        {videoTask.videoUrl && (
          <a
            href={videoTask.videoUrl}
            download={`productreel-variation-${index + 1}.mp4`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-brand-500/15 text-brand-400 border border-brand-500/30 hover:bg-brand-500/25 transition-all"
          >
            <ExternalLink className="w-3 h-3" />
            Download
          </a>
        )}
      </div>
    </div>
  );
}
