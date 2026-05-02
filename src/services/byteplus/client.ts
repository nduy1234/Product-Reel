/**
 * BytePlus Ark API Client
 * ─────────────────────────────────────────────────────────────
 * Thin wrapper around the BytePlus Volcano Engine Ark platform.
 * All four Seed models (Seed 2.0, Seedream 5.0, Seedance 2.0,
 * Seed Speech) share the same API key and base URL.
 *
 * Docs: https://console.byteplus.com/ark/region:ark+ap-southeast/documentation
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from "axios";

// ── Config ────────────────────────────────────────────────────
const ARK_BASE_URL =
  process.env.BYTEPLUS_ARK_BASE_URL ??
  "https://ark.ap-southeast.bytepluses.com/api/v3";

const ARK_API_KEY = process.env.BYTEPLUS_ARK_API_KEY ?? "";

// ── Shared Axios instance ─────────────────────────────────────
let _client: AxiosInstance | null = null;

export function getArkClient(): AxiosInstance {
  if (_client) return _client;

  _client = axios.create({
    baseURL: ARK_BASE_URL,
    headers: {
      Authorization: `Bearer ${ARK_API_KEY}`,
      "Content-Type": "application/json",
    },
    timeout: 120_000, // 2 min for long-running calls
  });

  // Response error interceptor — normalises error messages
  _client.interceptors.response.use(
    (response) => response,
    (error: AxiosError<{ error?: { message?: string }; message?: string }>) => {
      const data = error.response?.data;
      const message =
        data?.error?.message ??
        data?.message ??
        error.message ??
        "Unknown BytePlus API error";

      const status = error.response?.status ?? 500;
      const enhanced = new Error(`BytePlus API [${status}]: ${message}`);
      (enhanced as NodeJS.ErrnoException).code = String(status);
      return Promise.reject(enhanced);
    }
  );

  return _client;
}

// ── Generic POST helper ───────────────────────────────────────
export async function arkPost<T = unknown>(
  path: string,
  body: Record<string, unknown>,
  config?: AxiosRequestConfig
): Promise<T> {
  const client = getArkClient();
  const response = await client.post<T>(path, body, config);
  return response.data;
}

// ── Generic GET helper ────────────────────────────────────────
export async function arkGet<T = unknown>(
  path: string,
  config?: AxiosRequestConfig
): Promise<T> {
  const client = getArkClient();
  const response = await client.get<T>(path, config);
  return response.data;
}

// ── POST with binary response (for audio) ────────────────────
export async function arkPostBinary(
  path: string,
  body: Record<string, unknown>
): Promise<Buffer> {
  const client = getArkClient();
  const response = await client.post<ArrayBuffer>(path, body, {
    responseType: "arraybuffer",
  });
  return Buffer.from(response.data);
}
