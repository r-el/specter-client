import axios from "axios";
import api from "../../../services/api";
import type { ICamera } from "../../../@types/Camera";
import { buildLiveSocketUrl } from "../lib/live-protocol";

interface Envelope<T> {
  success: boolean;
  data?: T;
}

export interface LiveFailure {
  message: string;
  retryable: boolean;
}

function cameraPath(cameraId: string): string {
  if (!/^[a-zA-Z0-9_-]+$/.test(cameraId)) throw new Error("Invalid camera ID.");
  return `/cameras/${encodeURIComponent(cameraId)}`;
}

function assertSecureApi(path: string): void {
  // Validate before axios sends the user's Authorization header, not just before WS upgrade.
  buildLiveSocketUrl(api.getUri({ url: path }), window.location.href, "validation-only");
}

export async function getLiveCamera(cameraId: string, signal: AbortSignal): Promise<ICamera> {
  const path = cameraPath(cameraId);
  assertSecureApi(path);
  const { data } = await api.get<Envelope<ICamera>>(path, { signal, timeout: 15000 });
  if (!data.success || !data.data || data.data.id !== cameraId || typeof data.data.name !== "string") {
    throw new Error("The camera response was invalid.");
  }
  return data.data;
}

/** Each attempt requests a new one-use, 60-second ticket; the user's JWT stays in axios headers. */
export async function requestLiveSocketUrl(cameraId: string, signal: AbortSignal): Promise<string> {
  const path = `${cameraPath(cameraId)}/live`;
  assertSecureApi(path);
  const { data } = await api.post<Envelope<{ ticket: string; expires_in: number }>>(
    `${path}/ticket`, {}, { signal, timeout: 10000 },
  );
  signal.throwIfAborted();
  if (!data.success || !data.data || typeof data.data.ticket !== "string" ||
      !data.data.ticket || !(data.data.expires_in > 0)) {
    throw new Error("The live ticket response was invalid.");
  }
  return buildLiveSocketUrl(api.getUri({ url: `${path}/mse` }), window.location.href, data.data.ticket);
}

export interface RtcIceServer {
  urls: string | string[];
  username?: string;
  credential?: string;
}

export async function getLiveIceServers(cameraId: string, signal: AbortSignal): Promise<RtcIceServer[]> {
  const path = `${cameraPath(cameraId)}/live/ice-servers`;
  assertSecureApi(path);
  const { data } = await api.get<Envelope<{ iceServers: RtcIceServer[] }>>(path, {
    signal,
    timeout: 10000,
  });
  signal.throwIfAborted();
  if (!data.success || !data.data || !Array.isArray(data.data.iceServers)) {
    throw new Error("The ICE servers response was invalid.");
  }
  return data.data.iceServers;
}

export async function getLiveFrame(cameraId: string, signal: AbortSignal): Promise<Blob> {
  const path = `${cameraPath(cameraId)}/live/frame.jpeg`;
  assertSecureApi(path);
  const { data } = await api.get<Blob>(path, {
    signal, timeout: 10000, responseType: "blob", headers: { Accept: "image/jpeg" },
  });
  signal.throwIfAborted();
  if (!(data instanceof Blob) || !data.size || data.type.split(";")[0].toLowerCase() !== "image/jpeg") {
    throw new Error("The camera did not return a JPEG snapshot.");
  }
  return data;
}

/** Deliberately omit raw axios/relay messages and URLs, which can contain credentials. */
export function liveFailure(error: unknown): LiveFailure {
  if (axios.isAxiosError(error)) {
    switch (error.response?.status) {
      case 401: return { message: "Your session expired. Sign in again.", retryable: false };
      case 403: return { message: "You do not have access to this camera.", retryable: false };
      case 404: return { message: "The camera or live relay was not found.", retryable: false };
      case 409: return { message: "The camera is stopped. Start it before viewing.", retryable: false };
      default: return { message: "The camera service is unavailable. It may still be starting.", retryable: true };
    }
  }
  return { message: "Unable to open this camera. Check the camera and secure API configuration.", retryable: false };
}