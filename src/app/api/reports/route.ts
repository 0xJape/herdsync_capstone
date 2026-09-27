import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { withCategory } from "@/lib/livestock";

const categories = ["Bull", "Yearling bull", "Cow", "Heifer", "Calf"];

export async function GET() {
  const auth = await requireRole("veterinarian", "faculty");
  if ("response" in auth) return auth.response;
  const [animals, settings] = await Promise.all([
    db.query("SELECT sex, birth_date, has_calved, current_weight_kg, status, created_at FROM livestock WHERE archived_at IS NULL ORDER BY created_at"),
    db.query("SELECT key, value FROM system_settings WHERE key IN ('farm_name','mature_cattle_price_per_kg','calf_fixed_price')")
  ]);
  const config = Object.fromEntries(settings.rows.map((row) => [row.key, row.value]));
  const prices = { maturePricePerKg: Number(config.mature_cattle_price_per_kg ?? 130), calfFixedPrice: Number(config.calf_fixed_price ?? 10000) };
  const live = animals.rows.filter((animal) => animal.status === "active").map(withCategory);
  const inventory = categories.map((category) => {
    const matches = live.filter((animal) => animal.category === category);
    const averageWeight = matches.length ? matches.reduce((sum, animal) => sum + Number(animal.current_weight_kg), 0) / matches.length : 0;
    return { category, quantity: matches.length, averageWeight, price: category === "Calf" ? prices.calfFixedPrice : prices.maturePricePerKg, pricingMethod: category === "Calf" ? "Fixed price per head" : "Price per kg", value: category === "Calf" ? matches.length * prices.calfFixedPrice : matches.length * averageWeight * prices.maturePricePerKg };
  });
  const months = Array.from({ length: 6 }, (_, index) => { const date = new Date(); date.setUTCDate(1); date.setUTCMonth(date.getUTCMonth() - 5 + index); return date; });
  const trend = months.map((month) => { const end = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 1)); return { month: month.toLocaleDateString("en-US", { month: "short", year: "2-digit", timeZone: "UTC" }), total: animals.rows.filter((animal) => new Date(animal.created_at) < end).length }; });
  return NextResponse.json({ farmName: config.farm_name ?? "MSU-GenSan Animal Science Farm", generatedBy: auth.user.display_name, generatedAt: new Date().toISOString(), prices, inventory, totalCattle: live.length, totalValue: inventory.reduce((sum, row) => sum + row.value, 0), trend, methodology: "Live cattle are grouped by sex, birth date, and calving history. Population trend uses record creation dates because historical status snapshots are unavailable." }, { headers: { "Cache-Control": "no-store" } });
}

export async function PUT(request: NextRequest) {
  const auth = await requireRole("veterinarian", "faculty");
  if ("response" in auth) return auth.response;
  const body = await request.json() as { maturePricePerKg?: unknown; calfFixedPrice?: unknown };
  const maturePrice = Number(body.maturePricePerKg), calfPrice = Number(body.calfFixedPrice);
  if (!Number.isFinite(maturePrice) || maturePrice <= 0 || !Number.isFinite(calfPrice) || calfPrice <= 0) return NextResponse.json({ error: "Prices must be greater than zero" }, { status: 400 });
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    await client.query(`INSERT INTO system_settings (key,value,updated_by_user_id,updated_at) VALUES ('mature_cattle_price_per_kg',$1,$3,NOW()),('calf_fixed_price',$2,$3,NOW()) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value,updated_by_user_id=EXCLUDED.updated_by_user_id,updated_at=NOW()`, [String(maturePrice), String(calfPrice), auth.user.id]);
    await client.query("INSERT INTO activity_logs (user_id,action,entity_type,title,detail) VALUES ($1,'update','settings','Updated report pricing',$2)", [auth.user.id, `Mature cattle: ₱${maturePrice}/kg; calves: ₱${calfPrice}/head`]);
    await client.query("COMMIT");
    return NextResponse.json({ maturePricePerKg: maturePrice, calfFixedPrice: calfPrice });
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
}
