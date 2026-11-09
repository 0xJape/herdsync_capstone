import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";

const maxSize = 2 * 1024 * 1024;
const formats = [
  { mime: "image/png", extension: "png", matches: (bytes: Uint8Array) => bytes.length >= 8 && [137,80,78,71,13,10,26,10].every((value, index) => bytes[index] === value) },
  { mime: "image/jpeg", extension: "jpg", matches: (bytes: Uint8Array) => bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 },
  { mime: "image/webp", extension: "webp", matches: (bytes: Uint8Array) => bytes.length >= 12 && new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" && new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP" },
];

export async function POST(request: NextRequest) {
  const auth = await requireRole("veterinarian");
  if ("response" in auth) return auth.response;
  const form = await request.formData();
  const uploads = [["leftLogo", "report_left_logo"], ["rightLogo", "report_right_logo"]] as const;
  const pending: { key: string; publicPath: string; bytes: Uint8Array }[] = [];
  for (const [field, key] of uploads) {
    const value = form.get(field);
    if (!(value instanceof File) || value.size === 0) continue;
    if (value.size > maxSize) return NextResponse.json({ error: `${field} must be 2 MB or smaller.` }, { status: 400 });
    const bytes = new Uint8Array(await value.arrayBuffer());
    const format = formats.find((candidate) => candidate.mime === value.type && candidate.matches(bytes));
    if (!format) return NextResponse.json({ error: `${field} must be a valid PNG, JPEG, or WebP image.` }, { status: 400 });
    pending.push({ key, bytes, publicPath: `/uploads/report-logos/${randomUUID()}.${format.extension}` });
  }
  if (!pending.length) return NextResponse.json({ error: "Choose at least one logo image." }, { status: 400 });
  const directory = path.join(process.cwd(), "public", "uploads", "report-logos");
  await mkdir(directory, { recursive: true });
  for (const upload of pending) await writeFile(path.join(process.cwd(), "public", upload.publicPath.slice(1)), upload.bytes, { flag: "wx" });
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    for (const upload of pending) await client.query(`INSERT INTO system_settings (key,value,updated_by_user_id,updated_at) VALUES ($1,$2,$3,NOW()) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value,updated_by_user_id=EXCLUDED.updated_by_user_id,updated_at=NOW()`, [upload.key, upload.publicPath, auth.user.id]);
    await client.query("INSERT INTO activity_logs (user_id,action,entity_type,title,detail) VALUES ($1,'update','settings','Updated report logos',$2)", [auth.user.id, pending.map(({ key }) => key).join(", ")]);
    await client.query("COMMIT");
    return NextResponse.json(Object.fromEntries(pending.map(({ key, publicPath }) => [key, publicPath])));
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
}