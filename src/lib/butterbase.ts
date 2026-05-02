// ============================================================
// Butterbase Client — ProductReel AI
// Auth (email/password) + Data API helpers
// ============================================================

const API_URL =
  process.env.NEXT_PUBLIC_BUTTERBASE_API_URL ??
  "https://api.butterbase.ai/v1/app_m2mmoqmwv49w";

const AUTH_URL =
  process.env.NEXT_PUBLIC_BUTTERBASE_AUTH_URL ??
  "https://api.butterbase.ai/auth/app_m2mmoqmwv49w";

// ── Token storage (client-side only) ─────────────────────────
const TOKEN_KEY   = "bb_access_token";
const REFRESH_KEY = "bb_refresh_token";

export const tokenStore = {
  getAccess:  (): string | null => (typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY)   : null),
  getRefresh: (): string | null => (typeof window !== "undefined" ? localStorage.getItem(REFRESH_KEY) : null),
  set(access: string, refresh: string) {
    localStorage.setItem(TOKEN_KEY,   access);
    localStorage.setItem(REFRESH_KEY, refresh);
  },
  clear() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

// ── Shared types ──────────────────────────────────────────────
export interface AuthUser {
  id:             string;
  email:          string;
  email_verified: boolean;
  display_name:   string | null;
  avatar_url:     string | null;
}

export interface AuthSession {
  access_token:  string;
  refresh_token: string;
  expires_in:    number;
  token_type:    "Bearer";
  user:          AuthUser;
}

// ── Internal fetch helper ─────────────────────────────────────
async function request<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error ?? res.statusText);
  }

  return res.json() as Promise<T>;
}

// ── Auth API ──────────────────────────────────────────────────
export const auth = {
  /** Register a new user. Sends a 6-digit email verification code. */
  signup(email: string, password: string, display_name?: string): Promise<AuthUser> {
    return request(`${AUTH_URL}/signup`, {
      method: "POST",
      body:   JSON.stringify({ email, password, display_name }),
    });
  },

  /** Sign in and receive tokens. Stores them automatically. */
  async login(email: string, password: string): Promise<AuthSession> {
    const session = await request<AuthSession>(`${AUTH_URL}/login`, {
      method: "POST",
      body:   JSON.stringify({ email, password }),
    });
    tokenStore.set(session.access_token, session.refresh_token);
    return session;
  },

  /** Sign out and clear stored tokens. */
  async logout(): Promise<void> {
    const token = tokenStore.getAccess();
    if (token) {
      await request(`${AUTH_URL}/logout`, {
        method:  "POST",
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {/* best-effort */});
    }
    tokenStore.clear();
  },

  /** Exchange a refresh token for a new access token. */
  async refresh(refreshToken?: string): Promise<AuthSession> {
    const rt = refreshToken ?? tokenStore.getRefresh();
    if (!rt) throw new Error("No refresh token available");
    const session = await request<AuthSession>(`${AUTH_URL}/refresh`, {
      method: "POST",
      body:   JSON.stringify({ refresh_token: rt }),
    });
    tokenStore.set(session.access_token, session.refresh_token);
    return session;
  },

  /** Verify email address with the 6-digit code sent on signup. */
  verifyEmail(email: string, code: string): Promise<{ message: string }> {
    return request(`${AUTH_URL}/verify-email`, {
      method: "POST",
      body:   JSON.stringify({ email, code }),
    });
  },

  /** Request a password-reset code (sent via email). */
  forgotPassword(email: string): Promise<{ message: string }> {
    return request(`${AUTH_URL}/forgot-password`, {
      method: "POST",
      body:   JSON.stringify({ email }),
    });
  },

  /** Complete a password reset with the 6-digit code. */
  resetPassword(email: string, code: string, new_password: string): Promise<{ message: string }> {
    return request(`${AUTH_URL}/reset-password`, {
      method: "POST",
      body:   JSON.stringify({ email, code, new_password }),
    });
  },

  /** Fetch the current user's profile (requires a valid access token). */
  me(token?: string): Promise<AuthUser> {
    const t = token ?? tokenStore.getAccess();
    if (!t) throw new Error("Not authenticated");
    return request(`${AUTH_URL}/me`, {
      headers: { Authorization: `Bearer ${t}` },
    });
  },
};

// ── Data API ──────────────────────────────────────────────────
// Thin wrappers around the Butterbase REST API for each table.
// All calls are automatically scoped to the authenticated user via RLS.

type FilterOp = "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "like" | "ilike";

interface QueryOptions {
  filters?:  Record<string, string | [FilterOp, string]>;
  orderBy?:  string;
  orderDir?: "asc" | "desc";
  limit?:    number;
  offset?:   number;
}

function buildQuery(opts: QueryOptions): string {
  const params = new URLSearchParams();
  if (opts.filters) {
    for (const [col, val] of Object.entries(opts.filters)) {
      if (Array.isArray(val)) {
        params.set(col, `${val[0]}.${val[1]}`);
      } else {
        params.set(col, `eq.${val}`);
      }
    }
  }
  if (opts.orderBy)  params.set("order", `${opts.orderBy}.${opts.orderDir ?? "asc"}`);
  if (opts.limit)    params.set("limit",  String(opts.limit));
  if (opts.offset)   params.set("offset", String(opts.offset));
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

function authHeaders(token?: string): Record<string, string> {
  const t = token ?? tokenStore.getAccess();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

/** Generic table accessor — use the typed helpers below instead. */
function table<T>(name: string) {
  return {
    list(opts: QueryOptions = {}, token?: string): Promise<T[]> {
      return request(`${API_URL}/${name}${buildQuery(opts)}`, {
        headers: authHeaders(token),
      });
    },

    get(id: string, token?: string): Promise<T> {
      return request(`${API_URL}/${name}/${id}`, {
        headers: authHeaders(token),
      });
    },

    create(data: Partial<T>, token?: string): Promise<T> {
      return request(`${API_URL}/${name}`, {
        method:  "POST",
        headers: authHeaders(token),
        body:    JSON.stringify(data),
      });
    },

    update(id: string, data: Partial<T>, token?: string): Promise<T> {
      return request(`${API_URL}/${name}/${id}`, {
        method:  "PATCH",
        headers: authHeaders(token),
        body:    JSON.stringify(data),
      });
    },

    delete(id: string, token?: string): Promise<void> {
      return request(`${API_URL}/${name}/${id}`, {
        method:  "DELETE",
        headers: authHeaders(token),
      });
    },
  };
}

// ── Typed table imports ───────────────────────────────────────
import type {
  StylePreset,
  StoryboardFrame,
  VideoTaskStatus,
  AvatarTask,
} from "@/types";

export interface BBProject {
  id:           string;
  user_id:      string;
  name:         string | null;
  description:  string;
  style_preset: StylePreset;
  image_url:    string | null;
  created_at:   string;
  updated_at:   string;
}

export interface BBPipelineRun {
  id:                        string;
  user_id:                   string;
  project_id:                string;
  status:                    "idle" | "running" | "done" | "error";
  is_batch_mode:             boolean;
  target_variations:         number;
  completed_variations_count: number;
  error_message:             string | null;
  created_at:                string;
  updated_at:                string;
}

export interface BBPipelineVariation {
  id:                    string;
  run_id:                string;
  user_id:               string;
  variation_index:       number;
  hook:                  string | null;
  analysis:              Record<string, unknown> | null;
  storyboard_frames:     StoryboardFrame[] | null;
  video_task_id:         string | null;
  video_status:          VideoTaskStatus | null;
  video_url:             string | null;
  video_thumbnail_url:   string | null;
  audio_url:             string | null;
  audio_duration_seconds: number | null;
  avatar_task_id:        string | null;
  avatar_status:         AvatarTask["status"] | null;
  avatar_video_url:      string | null;
  distribution_caption:  string | null;
  distribution_hashtags: string[] | null;
  distribution_platforms: string[] | null;
  status:                "idle" | "running" | "done" | "error";
  created_at:            string;
  updated_at:            string;
}

export interface BBSchedule {
  id:                     string;
  user_id:                string;
  project_id:             string;
  interval:               "hourly" | "4h" | "daily" | "weekly";
  is_enabled:             boolean;
  last_run_at:            string | null;
  next_run_at:            string | null;
  total_videos_generated: number;
  created_at:             string;
  updated_at:             string;
}

// ── Typed table accessors ─────────────────────────────────────
export const db = {
  projects:           table<BBProject>("projects"),
  pipelineRuns:       table<BBPipelineRun>("pipeline_runs"),
  pipelineVariations: table<BBPipelineVariation>("pipeline_variations"),
  schedules:          table<BBSchedule>("schedules"),
};
