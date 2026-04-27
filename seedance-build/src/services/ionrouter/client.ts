/**
 * ionrouter.io (Cumulus) API Client
 * ─────────────────────────────────────────────────────────────
 * OpenAI-compatible client for the ionrouter.io inference platform.
 * Base URL: https://api.ionrouter.io/v1
 *
 * Docs: https://ionrouter.io/docs
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from "axios";

const BASE_URL =
  process.env.IONROUTER_BASE_URL ?? "https://api.ionrouter.io/v1";

const API_KEY = process.env.IONROUTER_API_KEY ?? "";

let _client: AxiosInstance | null = null;

function getClient(): AxiosInstance {
  if (_client) return _client;

  _client = axios.create({
    baseURL: BASE_URL,
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    timeout: 120_000,
  });

  _client.interceptors.response.use(
    (response) => response,
    (error: AxiosError<{ error?: { message?: string }; message?: string }>) => {
      const data = error.response?.data;
      const message =
        data?.error?.message ??
        data?.message ??
        error.message ??
        "Unknown ionrouter API error";
      const status = error.response?.status ?? 500;
      const enhanced = new Error(`ionrouter API [${status}]: ${message}`);
      (enhanced as NodeJS.ErrnoException).code = String(status);
      return Promise.reject(enhanced);
    }
  );

  return _client;
}

export async function ionPost<T = unknown>(
  path: string,
  body: Record<string, unknown>,
  config?: AxiosRequestConfig
): Promise<T> {
  const res = await getClient().post<T>(path, body, config);
  return res.data;
}

export async function ionGet<T = unknown>(path: string): Promise<T> {
  const res = await getClient().get<T>(path);
  return res.data;
}

/** POST that returns raw binary (used for TTS audio). */
export async function ionPostBinary(
  path: string,
  body: Record<string, unknown>
): Promise<Buffer> {
  const res = await getClient().post<ArrayBuffer>(path, body, {
    responseType: "arraybuffer",
  });
  return Buffer.from(res.data);
}

/**
 * GET that returns raw binary — used to download images returned as URLs.
 * Accepts a full URL or a path relative to the ionrouter base.
 * Always sends the Authorization header so private image URLs work.
 */
export async function ionGetBinary(urlOrPath: string): Promise<Buffer> {
  // Absolute URLs are used directly; relative paths are resolved against baseURL
  const res = await getClient().get<ArrayBuffer>(urlOrPath, {
    responseType: "arraybuffer",
    // Pass baseURL: "" so an absolute URL isn't double-prefixed
    ...(urlOrPath.startsWith("http") ? { baseURL: "" } : {}),
  });
  return Buffer.from(res.data);
}

/** True when an ionrouter API key is configured. */
export function hasIonrouterKey(): boolean {
  return Boolean(process.env.IONROUTER_API_KEY);
}
