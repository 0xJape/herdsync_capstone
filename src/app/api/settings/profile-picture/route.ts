import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { uploadDirectory } from "@/lib/uploads";

const maxSize = 10 * 1024 * 1024;
const formats = [
  { mime: "image/png", extension: "png", matches: (bytes: Uint8Array) => bytes.length >= 8 && [137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value) },
  { mime: "image/jpeg", extension: "jpg", matches: (bytes: Uint8Array) => bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 },
  { mime: "image/webp", extension: "webp", matches: (bytes: Uint8Array) => bytes.length >= 12 && new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" && new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP" },
];

export async function POST(request: NextRequest) {
  const auth = await requireApiUser();
  if ("response" in auth) return auth.response;
  const value = (await request.formData()).get("profilePicture");
  if (!(value instanceof File) || value.size === 0) return NextResponse.json({ error: "Choose a profile picture." }, { status: 400 });
  if (value.size > maxSize) return NextResponse.json({ error: "Profile picture must be 10 MB or smaller." }, { status: 400 });
  const bytes = new Uint8Array(await value.arrayBuffer());
  const format = formats.find((candidate) => candidate.mime === value.type && candidate.matches(bytes));
  if (!format) return NextResponse.json({ error: "Profile picture must be a valid PNG, JPEG, or WebP image." }, { status: 400 });
  const publicPath = `/uploads/profile-pictures/${auth.user.id}-${randomUUID()}.${format.extension}`;
  const directory = uploadDirectory("profile-pictures");
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, path.basename(publicPath)), bytes, { flag: "wx" });
  await db.query("UPDATE users SET profile_image_url = $1, updated_at = NOW() WHERE id = $2", [publicPath, auth.user.id]);
  return NextResponse.json({ profileImageUrl: publicPath });
}
