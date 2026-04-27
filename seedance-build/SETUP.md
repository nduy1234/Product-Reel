# ProductReel AI — Setup Guide

## What this is

**ProductReel AI** is a production-ready Next.js 14 app that converts a product image + 1-line description into a ready-to-publish marketing video using the **BytePlus Seed ecosystem**:

| Step | Model | What it does |
|------|-------|-------------|
| 1 | **Seed 2.0** | Analyses product, writes hooks + narration script + cinematic prompt |
| 2 | **Seedream 5.0** | Generates 2–3 storyboard keyframe images |
| 3 | **Seedance 2.0** | Async video generation (polls every 5 s) |
| 4 | **Seed Speech** | Synthesises the voiceover audio |
| 5 | **Seed 2.0** | Writes platform-optimised caption + hashtags |

Output: `{ videoUrl, audioUrl, caption, hashtags }` — ready to post on TikTok / Reels / Shorts.

---

## 1. Prerequisites

- Node.js ≥ 18
- npm ≥ 9
- A BytePlus account: https://console.byteplus.com

---

## 2. Clone & install

```bash
unzip productreel-ai.zip
cd productreel-ai
npm install
```

---

## 3. Get BytePlus Ark credentials

1. Sign in at https://console.byteplus.com
2. Go to **Ark** (AI Platform) → **API Keys** and create a key.
3. Go to **Endpoint Management** and create endpoints for each model:
   - **Seed 2.0** (text) — copy the endpoint ID
   - **Seedream 5.0** (images) — copy the endpoint ID
   - **Seedance 2.0** (video) — copy the endpoint ID
   - **Seed Speech** (TTS) — copy the endpoint ID
4. Note the **API Base URL** for your region (e.g. `https://ark.ap-southeast.bytepluses.com/api/v3`).

---

## 4. Configure environment variables

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in:

```
BYTEPLUS_ARK_API_KEY=ak-xxxxxxxxxxxx
BYTEPLUS_ARK_BASE_URL=https://ark.ap-southeast.bytepluses.com/api/v3

SEED2_MODEL_ID=ep-20250101-seed2-xxxx
SEEDREAM_MODEL_ID=seedream-5-0
SEEDANCE_MODEL_ID=seedance-2-0-lite
SEED_SPEECH_MODEL_ID=seed-tts-doubao
```

> **Demo mode**: If `BYTEPLUS_ARK_API_KEY` is empty or `DEMO_MODE=true`, the app runs with realistic mock data so you can test the UI immediately.

---

## 5. Run locally

```bash
npm run dev
```

Open http://localhost:3000 — you should see the ProductReel AI interface.

---

## 6. Deploy to Vercel

```bash
npm install -g vercel
vercel
```

When prompted, add the same environment variables from `.env.local` to your Vercel project settings.  
(Settings → Environment Variables)

Or use the Vercel dashboard to import the project directly from GitHub.

---

## 7. Project structure

```
src/
├── app/
│   ├── page.tsx                  ← Main UI & pipeline orchestration
│   ├── layout.tsx
│   ├── globals.css
│   └── api/
│       ├── analyze-product/      ← POST → Seed 2.0
│       ├── generate-storyboard/  ← POST → Seedream 5.0
│       ├── generate-video/       ← POST → Seedance 2.0 (returns taskId)
│       ├── status/               ← GET  → poll Seedance task
│       ├── generate-voice/       ← POST → Seed Speech
│       └── distribute/           ← POST → caption + hashtags
├── components/
│   ├── ImageUpload.tsx           ← Drag & drop with preview
│   ├── StyleSelector.tsx         ← 3 style presets
│   ├── PipelineProgress.tsx      ← Step-by-step loading states
│   ├── ResultDisplay.tsx         ← Video, caption, hashtags, download
│   └── VariationCard.tsx         ← Per-variation result card
├── services/
│   ├── byteplus/                 ← One file per Seed model
│   │   ├── client.ts             ← Shared Ark axios instance
│   │   ├── seed2Service.ts
│   │   ├── seedreamService.ts
│   │   ├── seedanceService.ts
│   │   └── seedSpeechService.ts
│   └── mock/
│       └── mockService.ts        ← Demo mode fallback
├── types/index.ts                ← All shared TypeScript types
└── lib/utils.ts                  ← Helpers: cn, retry, fileToBase64, etc.
```

---

## 8. Customising style presets

Edit `src/types/index.ts` → `STYLE_PRESETS` to add new styles or tweak the visual modifiers sent to Seedream and Seedance.

---

## 9. Extending the pipeline

To add a new step (e.g. background music, subtitles):

1. Add the step ID to `PipelineStepId` in `src/types/index.ts`
2. Create a service file in `src/services/byteplus/`
3. Add an API route in `src/app/api/`
4. Add mock data in `src/services/mock/mockService.ts`
5. Wire it into `runPipeline` in `src/app/page.tsx`

---

## 10. Troubleshooting

| Symptom | Fix |
|---------|-----|
| `BytePlus API [401]` | Check `BYTEPLUS_ARK_API_KEY` is correct |
| `BytePlus API [404]` | Check the model ID / endpoint ID for your region |
| Video stuck at "Polling" | Seedance jobs can take 60–120 s — wait; or enable demo mode to test UI |
| Image too large | Compress to < 10 MB; JPEG recommended |
| TTS returns no audio | Some Ark TTS endpoints return a URL rather than binary — check `seedSpeechService.ts` |

---

Built with Next.js 14 · Tailwind CSS · BytePlus Ark API
