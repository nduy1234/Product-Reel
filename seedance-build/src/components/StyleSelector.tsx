"use client";

import { STYLE_PRESETS, StylePreset } from "@/types";
import { cn } from "@/lib/utils";

interface StyleSelectorProps {
  value: StylePreset;
  onChange: (style: StylePreset) => void;
  disabled?: boolean;
}

export default function StyleSelector({
  value,
  onChange,
  disabled = false,
}: StyleSelectorProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-300">Style Preset</label>
      <div className="grid grid-cols-3 gap-2">
        {(Object.entries(STYLE_PRESETS) as [StylePreset, typeof STYLE_PRESETS[StylePreset]][]).map(
          ([key, preset]) => {
            const isActive = value === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => !disabled && onChange(key)}
                disabled={disabled}
                className={cn(
                  "relative flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition-all duration-200",
                  isActive
                    ? "border-brand-500 bg-brand-500/15 shadow-lg shadow-brand-500/10"
                    : "border-surface-border bg-surface-card hover:border-brand-500/40 hover:bg-brand-500/5",
                  disabled && "opacity-50 cursor-not-allowed"
                )}
              >
                {isActive && (
                  <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-brand-400" />
                )}
                <span className="text-xl leading-none">{preset.icon}</span>
                <span
                  className={cn(
                    "text-xs font-semibold leading-tight",
                    isActive ? "text-brand-300" : "text-slate-300"
                  )}
                >
                  {preset.label}
                </span>
                <span
                  className={cn(
                    "text-[10px] leading-tight",
                    isActive ? "text-brand-400/80" : "text-slate-500"
                  )}
                >
                  {preset.description}
                </span>
              </button>
            );
          }
        )}
      </div>
    </div>
  );
}
