/**
 * Mock Service — Demo Mode
 * ─────────────────────────────────────────────────────────────
 * Returns realistic canned responses so the full UI pipeline
 * can be tested without BytePlus API credentials.
 *
 * Automatically activated when BYTEPLUS_ARK_API_KEY is not set
 * or DEMO_MODE=true.
 */

import type {
  ProductAnalysis,
  StoryboardResult,
  VideoTask,
  VoiceResult,
  DistributionPackage,
  AnalyzeProductRequest,
  GenerateStoryboardRequest,
  GenerateVideoRequest,
  GenerateVoiceRequest,
  DistributeRequest,
} from "@/types";
import { sleep } from "@/lib/utils";

// ── Demo video/image URLs (royalty-free Unsplash/Pexels) ──────
// Three distinct watches: classic leather, luxury dress, sport/steel
const DEMO_IMAGES = [
  "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=720&h=1280&fit=crop",
  "https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=720&h=1280&fit=crop",
  "https://images.unsplash.com/photo-1434056886845-dac89ffe9b56?w=720&h=1280&fit=crop",
];

const WATCH_NAMES = [
  "Classic Leather Timepiece",
  "Luxury Dress Watch",
  "Sport Steel Chronograph",
];

// Public-domain sample video (no login required)
const DEMO_VIDEO_URL =
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4";

// Short royalty-free audio clip for demo voiceover preview
const DEMO_AUDIO_URL =
  "https://www.soundjay.com/misc/sounds/bell-ringing-05.mp3";

// ── Simulated latencies (ms) ──────────────────────────────────
const LATENCIES = {
  analyze:    800,
  storyboard: 1200,
  video:      500,   // Initial POST
  poll:       1000,  // Each poll tick
  voice:      900,
  distribute: 400,
};


// ── 1. Analyze Product ────────────────────────────────────────
export async function mockAnalyzeProduct(
  _request: AnalyzeProductRequest
): Promise<ProductAnalysis> {
  await sleep(LATENCIES.analyze);

  return {
    hooks: [
      "Stop scrolling — this watch redefines what luxury looks like on your wrist",
      "Your wrist just got a serious upgrade — meet the timepiece everyone's talking about",
      "What if your watch could turn heads in any room? Now it can.",
    ],
    script: `Crafted for those who demand more from every second. Precision Swiss movement, sapphire crystal glass, and a design that speaks before you do. Whether boardroom or beach — this is the watch that does it all.`,
    cinematic_prompt: {
      hook:   `Extreme close-up of the watch dial emerging from deep shadow, catching golden light on the hands`,
      action: `Watch rotates 360° on a marble plinth, movement visible through the case back`,
      scene:  `Minimalist studio — black velvet surface, single overhead spotlight, reflective marble base`,
      style:  `Luxury product photography, editorial quality, razor-sharp focus, cinematic colour grade`,
      camera: `Macro lens slow dolly-in from 45°, smooth orbital reveal, end on hero front-face shot`,
    },
    full_prompt: `[HOOK] Extreme close-up of luxury watch dial emerging from deep shadow into warm light. [ACTION] Watch rotates 360° on marble plinth, movement visible through case back. [SCENE] Black velvet studio with single overhead spotlight and reflective marble base. [STYLE] Luxury product photography, editorial quality, razor-sharp focus. [CAMERA] Macro lens slow dolly-in from 45°, smooth orbital reveal.`,
  };
}

// ── 2. Generate Storyboard ────────────────────────────────────
export async function mockGenerateStoryboard(
  request: GenerateStoryboardRequest
): Promise<StoryboardResult> {
  await sleep(LATENCIES.storyboard);

  const frameCount = request.frameCount ?? 3;
  const watchFramePrompts = [
    `Frame 1 — ${WATCH_NAMES[0]}: close-up dial reveal, warm golden light`,
    `Frame 2 — ${WATCH_NAMES[1]}: orbital 360° rotation on marble plinth`,
    `Frame 3 — ${WATCH_NAMES[2]}: hero wrist shot, cinematic colour grade`,
  ];
  const frames = DEMO_IMAGES.slice(0, frameCount).map((url, i) => ({
    index: i,
    url,
    prompt: watchFramePrompts[i] ?? `Frame ${i + 1}`,
  }));

  return { frames };
}

// ── 3. Create Video Task ──────────────────────────────────────
export async function mockCreateVideoTask(
  _request: GenerateVideoRequest
): Promise<VideoTask> {
  await sleep(LATENCIES.video);
  // Embed creation timestamp in the task ID so polling works across HMR reloads
  const taskId = `mock_task_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  return { taskId, status: "pending" };
}

// ── 4. Poll Video Task Status ─────────────────────────────────
// Derives status purely from the timestamp embedded in the task ID,
// so it survives Next.js HMR hot-reloads (no in-memory state needed).
export async function mockGetVideoStatus(taskId: string): Promise<VideoTask> {
  await sleep(LATENCIES.poll);

  const match = taskId.match(/mock_task_(\d+)/);
  if (!match) {
    return { taskId, status: "failed", error: "Task not found" };
  }

  const elapsed = Date.now() - parseInt(match[1]);

  if (elapsed < 1_000) return { taskId, status: "pending" };
  if (elapsed < 3_000) return { taskId, status: "running" };

  return {
    taskId,
    status:      "succeeded",
    videoUrl:    DEMO_VIDEO_URL,
    thumbnailUrl: DEMO_IMAGES[0],
  };
}

// ── 5. Generate Voice ─────────────────────────────────────────
export async function mockGenerateVoice(
  _request: GenerateVoiceRequest
): Promise<VoiceResult> {
  await sleep(LATENCIES.voice);

  return {
    audioUrl:        DEMO_AUDIO_URL,
    durationSeconds: 7,
    format:          "mp3",
  };
}

// ── 6. Generate Distribution Package ─────────────────────────
export async function mockDistribute(
  request: DistributeRequest
): Promise<DistributionPackage> {
  await sleep(LATENCIES.distribute);

  const { analysis, videoUrl, audioUrl } = request;
  const hook = analysis.hooks[0];

  const caption = `${hook} ⌚✨\n\n${analysis.script}\n\n🛒 Tap the link in bio to shop now.`;

  const hashtags = [
    "#LuxuryWatch",
    "#WatchOfTheDay",
    "#Horology",
    "#WristGame",
    "#WatchCollector",
    "#SwissWatch",
    "#TimelesStyle",
    "#WatchAddict",
    "#TikTokMarketing",
    "#ProductReel",
  ];

  return {
    videoUrl,
    audioUrl,
    caption,
    hashtags,
    format:    "9:16",
    platforms: ["tiktok", "instagram_reels", "youtube_shorts"],
  };
}
