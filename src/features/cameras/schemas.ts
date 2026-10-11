import { z } from "zod";
import {
  MAX_CAMERA_NAME_LENGTH,
  MAX_CAMERA_WATCHLISTS,
  MAX_CREDENTIAL_PASSWORD_LENGTH,
  MAX_CREDENTIAL_USERNAME_LENGTH,
  MAX_DETECTION_CLASSES,
  MAX_DETECTION_CLASS_LENGTH,
  MAX_LOCATION_LENGTH,
  MAX_SOURCE_URL_LENGTH,
} from "./constants";

export const cameraSourceUrlSchema = z
  .string()
  .trim()
  .min(1, "Source URL is required.")
  .max(MAX_SOURCE_URL_LENGTH, `Source URL cannot exceed ${MAX_SOURCE_URL_LENGTH} characters.`)
  .superRefine((val, ctx) => {
    if (/^ffmpeg:[^\s]+$/i.test(val)) {
      return;
    }
    try {
      const parsed = new URL(val);
      if (!/^(rtsps?|https?):$/.test(parsed.protocol) || !parsed.hostname || /\s/.test(val)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Enter a valid RTSP, RTSPS, HTTP, HTTPS or FFmpeg source URL.",
        });
        return;
      }
      if (parsed.username || parsed.password) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Remove credentials from the URL and use the username/password fields below.",
        });
      }
    } catch {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Enter a valid RTSP, RTSPS, HTTP, HTTPS or FFmpeg source URL.",
      });
    }
  });

export const cameraFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Camera name is required.")
    .max(MAX_CAMERA_NAME_LENGTH, `Camera name cannot exceed ${MAX_CAMERA_NAME_LENGTH} characters.`),
  source_url: cameraSourceUrlSchema,
  location: z
    .string()
    .trim()
    .max(MAX_LOCATION_LENGTH, `Location cannot exceed ${MAX_LOCATION_LENGTH} characters.`)
    .default(""),
  watchlist_ids: z
    .array(z.string())
    .max(MAX_CAMERA_WATCHLISTS, `Select at most ${MAX_CAMERA_WATCHLISTS} watchlists.`),
  detection_classes: z
    .array(
      z
        .string()
        .max(
          MAX_DETECTION_CLASS_LENGTH,
          `Class names must be no longer than ${MAX_DETECTION_CLASS_LENGTH} characters.`
        )
    )
    .max(
      MAX_DETECTION_CLASSES,
      `Use at most ${MAX_DETECTION_CLASSES} detection classes, each no longer than ${MAX_DETECTION_CLASS_LENGTH} characters.`
    ),
  credentials: z
    .object({
      username: z.string().trim().min(1, "Both username and password are required.").max(MAX_CREDENTIAL_USERNAME_LENGTH),
      password: z.string().min(1, "Both username and password are required.").max(MAX_CREDENTIAL_PASSWORD_LENGTH),
    })
    .nullable()
    .optional(),
});

export type CameraFormSchema = z.infer<typeof cameraFormSchema>;
