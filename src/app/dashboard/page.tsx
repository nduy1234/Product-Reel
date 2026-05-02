"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Sparkles, Trash2, Clock, Layers, ArrowRight,
  Film, FolderOpen, Plus,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { loadHistory, deleteHistoryEntry, clearHistory, type HistoryEntry } from "@/lib/history";

function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60_000);
  if (m < 1)   return "just now";
  if (m < 60)  return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h} hr ago`;
  const d = Math.floor(h / 24);
  if (d < 7)   return `${d} day${d > 1 ? "s" : ""} ago`;
  return new Date(ts).toLocaleDateString();
}

export default function DashboardPage() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setEntries(loadHistory());
    setHydrated(true);
  }, []);

  const handleDelete = (id: string) => {
    deleteHistoryEntry(id);
    setEntries(loadHistory());
  };

  const handleClearAll = () => {
    if (!confirm("Delete all saved projects? This cannot be undone.")) return;
    clearHistory();
    setEntries([]);
  };

  const totalVideos = entries.reduce((sum, e) => sum + e.variations.length, 0);

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Dashboard</h1>
            <p className="text-sm text-[#9090b0] mt-0.5">Your generated reels — saved locally on this device.</p>
          </div>
          <Link
            href="/create"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-lg shadow-indigo-500/25 transition-all active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            New project
          </Link>
        </div>

        {/* Stats */}
        {hydrated && entries.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            <StatCard icon={FolderOpen} label="Projects" value={entries.length.toString()} color="text-indigo-300" bg="bg-indigo-500/10" border="border-indigo-500/20" />
            <StatCard icon={Film}       label="Videos"   value={totalVideos.toString()}   color="text-violet-300" bg="bg-violet-500/10" border="border-violet-500/20" />
            <StatCard icon={Sparkles}   label="Models"   value="5"                          color="text-emerald-300" bg="bg-emerald-500/10" border="border-emerald-500/20" />
          </div>
        )}

        {/* Empty state */}
        {hydrated && entries.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 rounded-2xl border-2 border-dashed border-[#252535] text-center space-y-5">
            <div className="w-20 h-20 rounded-2xl bg-indigo-500/10 flex items-center justify-center animate-float">
              <Sparkles className="w-10 h-10 text-indigo-500/60" />
            </div>
            <div>
              <p className="text-[#f0f0fa] font-semibold text-base">No projects yet</p>
              <p className="text-sm text-[#5a5a78] mt-1.5 max-w-sm mx-auto">
                Generate your first product reel — it will be saved here automatically.
              </p>
            </div>
            <Link
              href="/create"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-lg shadow-indigo-500/25 transition-all"
            >
              <Sparkles className="w-4 h-4" />
              Create your first reel
            </Link>
          </div>
        )}

        {/* Project grid */}
        {hydrated && entries.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {entries.map((entry) => (
                <ProjectCard key={entry.id} entry={entry} onDelete={handleDelete} />
              ))}
            </div>
            <div className="mt-8 flex justify-center">
              <button
                onClick={handleClearAll}
                className="text-xs text-[#5a5a78] hover:text-red-400 transition-colors"
              >
                Clear all projects
              </button>
            </div>
          </>
        )}

        {!hydrated && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="rounded-2xl bg-[#13131c] border border-[#252535] aspect-[3/4] shimmer" />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function StatCard({
  icon: Icon, label, value, color, bg, border,
}: { icon: typeof Film; label: string; value: string; color: string; bg: string; border: string }) {
  return (
    <div className={`rounded-xl ${bg} border ${border} p-4 flex items-center gap-3`}>
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${bg}`}>
        <Icon className={`w-4 h-4 ${color}`} />
      </div>
      <div>
        <p className="text-lg font-bold text-white leading-none">{value}</p>
        <p className="text-[10px] uppercase tracking-wider text-[#9090b0] mt-1">{label}</p>
      </div>
    </div>
  );
}

function ProjectCard({ entry, onDelete }: { entry: HistoryEntry; onDelete: (id: string) => void }) {
  const v0 = entry.variations[0];
  const videoUrl = v0?.videoTask?.videoUrl;
  const captions = entry.variations.map((v) => v.distribution?.caption ?? "").filter(Boolean);
  const firstHook = entry.variations[0]?.hook ?? entry.description;

  return (
    <div className="group rounded-2xl bg-[#13131c] border border-[#252535] overflow-hidden hover:border-indigo-500/40 hover:shadow-lg hover:shadow-indigo-500/5 transition-all flex flex-col">
      {/* Preview */}
      <div className="relative aspect-[3/4] bg-black overflow-hidden">
        {videoUrl ? (
          <video
            src={videoUrl}
            poster={entry.thumbnail ?? undefined}
            muted
            playsInline
            loop
            onMouseEnter={(e) => e.currentTarget.play().catch(() => {})}
            onMouseLeave={(e) => { e.currentTarget.pause(); e.currentTarget.currentTime = 0; }}
            className="w-full h-full object-cover"
          />
        ) : entry.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={entry.thumbnail} alt={entry.description} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-[#0a0a0f]">
            <Film className="w-10 h-10 text-[#3a3a55]" />
          </div>
        )}
        <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-sm border border-white/10 text-[10px] font-semibold text-white flex items-center gap-1">
          <Layers className="w-2.5 h-2.5" />
          {entry.variations.length}
        </div>
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(entry.id); }}
          className="absolute top-2 left-2 w-7 h-7 rounded-full bg-black/70 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white/60 hover:text-red-400 hover:bg-red-500/20 hover:border-red-500/40 opacity-0 group-hover:opacity-100 transition-all"
          title="Delete"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Body */}
      <div className="p-4 space-y-2 flex-1 flex flex-col">
        <p className="text-sm font-medium text-white leading-snug line-clamp-2">
          {firstHook}
        </p>
        <p className="text-xs text-[#9090b0] line-clamp-2">{entry.description}</p>

        <div className="flex-1" />

        <div className="flex items-center justify-between pt-2 border-t border-[#252535]">
          <div className="flex items-center gap-1.5 text-[10px] text-[#5a5a78]">
            <Clock className="w-3 h-3" />
            {formatRelative(entry.createdAt)}
          </div>
          <Link
            href={`/create?id=${entry.id}`}
            className="flex items-center gap-1 text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            Open
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {captions.length > 0 && (
          <p className="text-[10px] text-[#5a5a78] italic line-clamp-1 truncate">
            &ldquo;{captions[0]}&rdquo;
          </p>
        )}
      </div>
    </div>
  );
}
