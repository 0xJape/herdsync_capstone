import { requireApiUser } from "@/lib/auth";
import { uploadDirectory, type UploadCategory } from "@/lib/uploads";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

const contentTypes: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

export async function GET(_request: Request, { params }: { params: Promise<{ category: string; filename: string }> }) {
  const auth = await requireApiUser();
  if ("response" in auth) return auth.response;
  const { category, filename } = await params;
  const extension = path.extname(filename).toLowerCase();
  if (!/^(cattle|breeding|profile-pictures|report-logos)$/.test(category) || !/^[0-9a-f-]+\.(jpg|png|webp)$/i.test(filename) || !contentTypes[extension]) return new NextResponse("Not found", { status: 404 });
  try {
    let bytes: Buffer;
    try {
      bytes = await readFile(path.join(uploadDirectory(category as UploadCategory), filename));
    } catch {
      bytes = await readFile(path.join(process.cwd(), "public", "uploads", category, filename));
    }
    return new NextResponse(new Uint8Array(bytes), { headers: { "Content-Type": contentTypes[extension], "Cache-Control": "private, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" } });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}