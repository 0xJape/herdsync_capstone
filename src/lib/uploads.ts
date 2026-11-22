import path from "node:path";

export const uploadRoot = process.env.HERDSYNC_UPLOAD_DIR
  ? path.resolve(process.env.HERDSYNC_UPLOAD_DIR)
  : path.join(process.cwd(), "data", "uploads");

export type UploadCategory = "cattle" | "breeding" | "profile-pictures" | "report-logos";

export function uploadDirectory(category: UploadCategory) {
  return path.join(uploadRoot, category);
}
