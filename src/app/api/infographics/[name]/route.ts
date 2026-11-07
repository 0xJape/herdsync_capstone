import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

const allowed = new Set(["calf-vigor-score-guide.png", "calving-difficulty-assistance-guide.png"]);

export async function GET(_: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  if (!allowed.has(name)) return new NextResponse("Not found", { status: 404 });
  try {
    const image = await readFile(path.join(process.cwd(), "..", "public", "Tooltip_Infographics", name));
    return new NextResponse(image, { headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=3600" } });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
