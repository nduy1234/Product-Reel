import Link from "next/link";
import {
  Zap, Sparkles, Brain, Image as ImageIcon, Video, Mic, Share2,
  ChevronRight, Play, ArrowRight, Layers, Clock, CheckCircle2,
  Wand2, TrendingUp, Globe,
} from "lucide-react";
import Navbar from "@/components/Navbar";

const PIPELINE = [
  { icon: Brain,      label: "Analyse",    model: "Seed 2.0",     color: "text-violet-300",  bg: "bg-violet-500/15",  border: "border-violet-500/30" },
  { icon: ImageIcon,  label: "Storyboard", model: "Seedream 5.0", color: "text-sky-300",     bg: "bg-sky-500/15",     border: "border-sky-500/30" },
  { icon: Video,      label: "Video",      model: "Seedance 2.0", color: "text-amber-300",   bg: "bg-amber-500/15",   border: "border-amber-500/30" },
  { icon: Mic,        label: "Voice",      model: "Seed Speech",  color: "text-emerald-300", bg: "bg-emerald-500/15", border: "border-emerald-500/30" },
  { icon: Share2,     label: "Distribute", model: "Seed 2.0",     color: "text-pink-300",    bg: "bg-pink-500/15",    border: "border-pink-500/30" },
];

const FEATURES = [
  { icon: Wand2,       title: "Photo → Reel in 90 sec",     desc: "Upload a single product photo. AI handles script, storyboard, video, voiceover, captions." },
  { icon: Layers,      title: "3 hooks side-by-side",        desc: "Every run yields 3 variations with different hooks for A/B testing — no extra cost." },
  { icon: TrendingUp,  title: "Platform-optimised",          desc: "9:16 vertical output ready for TikTok, Instagram Reels, YouTube Shorts. Caption + hashtags included." },
  { icon: Clock,       title: "Always-on schedule",          desc: "Auto-generate fresh ads daily, weekly, or hourly. Set once, publish forever." },
  { icon: Globe,       title: "Powered by BytePlus Seed",    desc: "Seed 2.0, Seedream 5.0, Seedance 2.0 and Seed Speech — all coordinated through one agentic pipeline." },
  { icon: CheckCircle2,title: "No video editor needed",      desc: "Skip Premiere, CapCut, Runway. One image in, finished ad out." },
];

const STEPS = [
  { n: "1", title: "Upload product photo",  desc: "PNG / JPG up to 10 MB. Anything from product shots to lifestyle imagery." },
  { n: "2", title: "Describe in one line",   desc: "\"premium stainless water bottle that keeps drinks cold for 24 hours\" — that's it." },
  { n: "3", title: "Pick a style",           desc: "Lifestyle, Studio Clean, or Dynamic. Each preset tunes lighting, motion and pacing." },
  { n: "4", title: "Get 3 ready-to-post videos", desc: "Hooks, captions, hashtags and MP4 files — download or copy in one click." },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <Navbar />

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-[#252535]">
        <div className="orb orb-violet w-[700px] h-[700px] -top-72 -left-32 opacity-60" />
        <div className="orb orb-purple w-[500px] h-[500px] -top-32 right-0 opacity-50" />
        <div className="orb orb-teal   w-[300px] h-[300px] top-40 right-1/4 opacity-30" />
        <div className="bg-grid absolute inset-0 opacity-100" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-20 pb-24 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/25 text-indigo-300 text-xs font-medium mb-7 animate-fade-in">
            <Zap className="w-3 h-3" />
            Powered by 5 BytePlus Seed Models · Agentic Pipeline
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-white leading-[1.05] tracking-tight mb-6 animate-slide-up">
            One product photo.
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 animate-gradient">
              Three viral video ads.
            </span>
            <br />
            <span className="text-[#9090b0] text-3xl sm:text-4xl lg:text-5xl">In under 90 seconds.</span>
          </h1>

          <p className="text-base sm:text-lg text-[#9090b0] max-w-2xl mx-auto leading-relaxed mb-10 animate-fade-in">
            ProductReel AI turns a still image and one line of text into three platform-ready
            video ads — complete with hooks, voiceover, captions and hashtags. No editor. No script. No crew.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-14 animate-fade-in">
            <Link
              href="/create"
              className="group flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-lg shadow-indigo-500/30 transition-all duration-200 active:scale-[0.98]"
            >
              <Sparkles className="w-4 h-4" />
              Generate your first reel
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <Link
              href="/dashboard"
              className="flex items-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-sm text-[#9090b0] border border-[#252535] hover:border-indigo-500/40 hover:text-white transition-all"
            >
              <Play className="w-4 h-4" />
              View past projects
            </Link>
          </div>

          {/* Pipeline diagram */}
          <div className="flex items-center justify-center gap-0 sm:gap-1 flex-wrap sm:flex-nowrap animate-fade-in">
            {PIPELINE.map((step, i) => {
              const Icon = step.icon;
              return (
                <div key={step.label} className="flex items-center">
                  <div className={`flex flex-col items-center gap-1.5 px-3.5 py-3 rounded-xl border ${step.bg} ${step.border} min-w-[92px]`}>
                    <Icon className={`w-4 h-4 ${step.color}`} />
                    <span className="text-[10px] font-semibold text-white">{step.label}</span>
                    <span className={`text-[9px] font-medium ${step.color} opacity-80`}>{step.model}</span>
                  </div>
                  {i < PIPELINE.length - 1 && (
                    <ChevronRight className="w-4 h-4 text-[#3a3a55] flex-shrink-0 mx-0.5 hidden sm:block" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto mt-14 animate-fade-in">
            {[
              { val: "< 90 s", label: "End-to-end" },
              { val: "9:16",    label: "Vertical format" },
              { val: "3×",      label: "Hooks per run" },
              { val: "5",       label: "Seed models" },
            ].map(({ val, label }) => (
              <div key={label} className="rounded-xl bg-[#13131c] border border-[#252535] py-4">
                <div className="text-xl font-bold text-white">{val}</div>
                <div className="text-[10px] text-[#5a5a78] uppercase tracking-wider mt-1">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────── */}
      <section className="border-b border-[#252535] py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold text-indigo-400 uppercase tracking-widest mb-2">How it works</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white">Four steps. Zero friction.</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {STEPS.map(({ n, title, desc }) => (
              <div key={n} className="rounded-2xl bg-[#13131c] border border-[#252535] p-5 hover:border-indigo-500/40 transition-colors">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-indigo-500/30 flex items-center justify-center mb-4">
                  <span className="text-sm font-bold text-indigo-300">{n}</span>
                </div>
                <h3 className="text-sm font-semibold text-white mb-1.5">{title}</h3>
                <p className="text-xs text-[#9090b0] leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────── */}
      <section className="border-b border-[#252535] py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold text-violet-400 uppercase tracking-widest mb-2">Why ProductReel AI</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white">Built for ecommerce velocity.</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="rounded-2xl bg-[#13131c] border border-[#252535] p-5 hover:border-indigo-500/40 hover:shadow-lg hover:shadow-indigo-500/5 transition-all">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-indigo-300" />
                </div>
                <h3 className="text-sm font-semibold text-white mb-1.5">{title}</h3>
                <p className="text-xs text-[#9090b0] leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────── */}
      <section className="py-24 relative overflow-hidden">
        <div className="orb orb-violet w-[500px] h-[500px] top-0 left-1/4 opacity-40" />
        <div className="orb orb-purple w-[400px] h-[400px] bottom-0 right-1/4 opacity-30" />
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Stop editing. Start shipping.</h2>
          <p className="text-base text-[#9090b0] mb-8">
            Try ProductReel AI free in demo mode — no signup, no API key required.
          </p>
          <Link
            href="/create"
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-lg shadow-indigo-500/30 transition-all active:scale-[0.98]"
          >
            <Sparkles className="w-4 h-4" />
            Generate now
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-[#252535] py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-[#3a3a55]">
          <span>ProductReel AI · The Agentic Frontier</span>
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
