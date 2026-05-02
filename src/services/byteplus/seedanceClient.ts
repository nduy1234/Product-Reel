/**
 * Dedicated Seedance 2.0 API Client with key rotation.
 * Uses SEEDANCE_API_KEYS (comma-separated) or falls back to SEEDANCE_API_KEY.
 * On 429 / rate-limit the next key in the list is tried automatically.
 */

import axios from "axios";

const BASE_URL =
  process.env.SEEDANCE_API_BASE_URL ??
  process.env.BYTEPLUS_ARK_BASE_URL ??
  "https://ark.ap-southeast.bytepluses.com/api/v3";

// Build key pool from SEEDANCE_API_KEYS (preferred) or single SEEDANCE_API_KEY
const KEY_POOL: string[] = (() => {
  const multi = process.env.SEEDANCE_API_KEYS;
  if (multi) return multi.split(",").map((k) => k.trim()).filter(Boolean);
  const single = process.env.SEEDANCE_API_KEY ?? process.env.BYTEPLUS_ARK_API_KEY ?? "";
  return single ? [single] : [];
})();

let keyIndex = 0;

function currentKey(): string {
  return KEY_POOL[keyIndex] ?? "";
}

function rotateKey(): boolean {
  if (KEY_POOL.length <= 1) return false;
  keyIndex = (keyIndex + 1) % KEY_POOL.length;
  return true;
}

function makeClient(apiKey: string) {
  return axios.create({
    baseURL: BASE_URL,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    timeout: 120_000,
  });
}

async function request<T>(
  method: "get" | "post",
  path: string,
  body?: Record<string, unknown>
): Promise<T> {
  let attempts = 0;
  const maxAttempts = KEY_POOL.length || 1;

  while (attempts < maxAttempts) {
    try {
      const client = makeClient(currentKey());
      const res =
        method === "post"
          ? await client.post<T>(path, body)
          : await client.get<T>(path);
      return res.data;
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      const isRateLimit = status === 429 || status === 403;

      if (isRateLimit && rotateKey()) {
        attempts++;
        continue;
      }

      const data = (err as { response?: { data?: { error?: { message?: string }; message?: string } } })?.response?.data;
      const message =
        data?.error?.message ??
        data?.message ??
        (err as Error).message ??
        "Unknown Seedance API error";
      throw new Error(`Seedance API [${status ?? 500}]: ${message}`);
    }
  }

  throw new Error("Seedance API: all keys exhausted");
}

export async function seedancePost<T = unknown>(
  path: string,
  body: Record<string, unknown>
): Promise<T> {
  return request<T>("post", path, body);
}

export async function seedanceGet<T = unknown>(path: string): Promise<T> {
  return request<T>("get", path);
}

/** Returns true when at least one real Seedance key is configured */
export function hasSeedanceKey(): boolean {
  return KEY_POOL.length > 0;
}

// Keep legacy export for any code that imported getSeedanceClient directly
export function getSeedanceClient() {
  return makeClient(currentKey());
}
