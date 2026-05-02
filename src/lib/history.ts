"use client";

import type { PipelineVariation, StylePreset } from "@/types";

const KEY = "productreel:history:v1";

export interface HistoryEntry {
  id: string;
  createdAt: number;
  description: string;
  style: StylePreset;
  thumbnail: string | null;
  variations: PipelineVariation[];
}

function safeParse(raw: string | null): HistoryEntry[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export function loadHistory(): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  return safeParse(window.localStorage.getItem(KEY));
}

export function saveHistoryEntry(entry: Omit<HistoryEntry, "id" | "createdAt">): HistoryEntry {
  if (typeof window === "undefined") {
    return { id: "", createdAt: 0, ...entry };
  }
  const list = loadHistory();
  const full: HistoryEntry = {
    id: `proj_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    createdAt: Date.now(),
    ...entry,
  };
  list.unshift(full);
  // cap at 30 entries to avoid quota issues
  const capped = list.slice(0, 30);
  try {
    window.localStorage.setItem(KEY, JSON.stringify(capped));
  } catch {
    // quota exceeded — drop oldest until it fits
    let trimmed = capped.slice(0, 10);
    while (trimmed.length > 0) {
      try {
        window.localStorage.setItem(KEY, JSON.stringify(trimmed));
        break;
      } catch {
        trimmed = trimmed.slice(0, trimmed.length - 1);
      }
    }
  }
  return full;
}

export function deleteHistoryEntry(id: string): void {
  if (typeof window === "undefined") return;
  const list = loadHistory().filter((e) => e.id !== id);
  window.localStorage.setItem(KEY, JSON.stringify(list));
}

export function clearHistory(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
}

export function getHistoryEntry(id: string): HistoryEntry | null {
  return loadHistory().find((e) => e.id === id) ?? null;
}
