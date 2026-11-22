import { requireRole } from "@/lib/auth";
import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import { NextRequest, NextResponse } from "next/server";
import { uploadDirectory } from "@/lib/uploads";
import path from "node:path";

const types = {
  "image/jpeg": { extension: "jpg", signature: (bytes: Buffer) => bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff },
  "image/png": { extension: "png", signature: (bytes: Buffer) => bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) },
  "image/webp": { extension: "webp", signature: (bytes: Buffer) => bytes.subarray(0, 4).toString() === "RIFF" && bytes.subarray(8, 12).toString() === "WEBP" },
} as const;

export async function POST(request: NextRequest) {
  const auth = await requireRole("admin", "veterinarian", "farm_aide");
  if ("response" in auth) return auth.response;
  const { image } = await request.json() as { image?: unknown };
  if (typeof image !== "string") return NextResponse.json({ error: "Photo is required" }, { status: 400 });
  const match = image.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!match) return NextResponse.json({ error: "Photo must be JPEG, PNG, or WebP" }, { status: 400 });
  const type = match[1] as keyof typeof types;
  const bytes = Buffer.from(match[2], "base64");
  if (!bytes.length || bytes.length > 5 * 1024 * 1024) return NextResponse.json({ error: "Photo must be 5 MB or smaller" }, { status: 400 });
  if (!types[type].signature(bytes)) return NextResponse.json({ error: "Photo content does not match its file type" }, { status: 400 });
  const filename = `${randomUUID()}.${types[type].extension}`;
  const directory = uploadDirectory("breeding");
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, filename), bytes, { flag: "wx" });
  return NextResponse.json({ url: `/uploads/breeding/${filename}` }, { status: 201 });
}
