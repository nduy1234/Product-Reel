"use client";

import { CheckCircle2, Circle, Loader2, AlertCircle, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PipelineStep } from "@/types";

interface PipelineProgressProps {
  steps: PipelineStep[];
  isDemoMode?: boolean;
}

const MODEL_COLORS: Record<string, string> = {
  "Seed 2.0":    "text-violet-400 bg-violet-400/10 border-violet-400/30",
  "Seedream 5.0":"text-sky-400   bg-sky-400/10    border-sky-400/30",
  "Seedance 2.0":"text-amber-400 bg-amber-400/10  border-amber-400/30",
  "Seed Speech": "text-emerald-400 bg-emerald-400/10 border-emerald-400/30",
  "Distribution":"text-pink-400  bg-pink-400/10   border-pink-400/30",
};

function StepIcon({ status }: { status: PipelineStep["status"] }) {
  switch (status) {
    case "done":
      return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
    case "error":
      return <AlertCircle className="w-4 h-4 text-red-400" />;
    case "loading":
    case "polling":
      return <Loader2 className="w-4 h-4 text-brand-400 animate-spin" />;
    default:
      return <Circle className="w-4 h-4 text-slate-600" />;
  }
}

export default function PipelineProgress({
  steps,
  isDemoMode = false,
}: PipelineProgressProps) {
  const activeStep = steps.find(
    (s) => s.status === "loading" || s.status === "polling"
  );
  const doneCount = steps.filter((s) => s.status === "done").length;
  const totalCount = steps.length;
  const overallPct = Math.round((doneCount / totalCount) * 100);

  return (
    <div className="space-y-3 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-brand-400" />
          <span className="text-sm font-semibold text-slate-200">
            Pipeline Running
          </span>
          {isDemoMode && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
              DEMO
            </span>
          )}
        </div>
        <span className="text-xs text-slate-400">
          {doneCount}/{totalCount} steps
        </span>
      </div>

      {/* Overall progress bar */}
      <div className="h-1 w-full rounded-full bg-surface-border overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-brand-600 to-brand-400 transition-all duration-500 ease-out"
          style={{ width: `${overallPct}%` }}
        />
      </div>

      {/* Steps list */}
      <div className="space-y-1.5">
        {steps.map((step, i) => {
          const isActive =
            step.status === "loading" || step.status === "polling";
          const isDone = step.status === "done";
          const isError = step.status === "error";
          const modelColor =
            MODEL_COLORS[step.model] ??
            "text-slate-400 bg-slate-400/10 border-slate-400/20";

          return (
            <div
              key={step.id}
              className={cn(
                "flex items-start gap-3 rounded-lg p-2.5 transition-all duration-300",
                isActive && "bg-brand-500/8 ring-1 ring-brand-500/20",
                isDone && "opacity-70",
                isError && "bg-red-500/8 ring-1 ring-red-500/20"
              )}
            >
              {/* Connector line + icon */}
              <div className="flex flex-col items-center gap-1 mt-0.5 flex-shrink-0">
                <StepIcon status={step.status} />
                {i < steps.length - 1 && (
                  <div
                    className={cn(
                      "w-px h-3 rounded-full transition-colors duration-500",
                      isDone ? "bg-emerald-400/40" : "bg-surface-border"
                    )}
                  />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={cn(
                      "text-xs font-semibold",
                      isActive
                        ? "text-slate-100"
                        : isDone
                        ? "text-slate-300"
                        : "text-slate-500"
                    )}
                  >
                    {step.label}
                  </span>
                  <span
                    className={cn(
                      "text-[10px] font-medium px-1.5 py-0.5 rounded border",
                      modelColor
                    )}
                  >
                    {step.model}
                  </span>
                </div>

                {isActive && (
                  <p className="text-[11px] text-slate-400 mt-0.5 animate-pulse-slow">
                    {step.status === "polling"
                      ? `Polling video status…`
                      : step.description}
                  </p>
                )}

                {isError && step.error && (
                  <p className="text-[11px] text-red-400 mt-0.5">{step.error}</p>
                )}

                {/* Per-step progress bar (video polling) */}
                {step.status === "polling" &&
                  step.progress !== undefined && (
                    <div className="mt-1.5 h-0.5 w-full rounded-full bg-surface-border overflow-hidden">
                      <div
                        className="h-full rounded-full bg-amber-400 transition-all duration-1000"
                        style={{ width: `${step.progress}%` }}
                      />
                    </div>
                  )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Active step callout */}
      {activeStep && (
        <div className="rounded-lg bg-surface-card border border-surface-border px-3 py-2">
          <p className="text-[11px] text-slate-400">
            <span className="text-slate-200 font-medium">{activeStep.label}: </span>
            {activeStep.status === "polling"
              ? "Seedance 2.0 is rendering your video. Checking every 5 seconds…"
              : activeStep.description}
          </p>
        </div>
      )}
    </div>
  );
}
