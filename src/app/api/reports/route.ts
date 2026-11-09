import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { withCategory } from "@/lib/livestock";

const categories = ["Bull", "Yearling bull", "Cow", "Heifer", "Calf"];
const defaultLogo = "/letterHeader_logo/MSUGensan_logo.png";
const reportConfig = (rows: { key: string; value: string }[]) => {
  const values = Object.fromEntries(rows.map(({ key, value }) => [key, value]));
  return { farmName: values.farm_name ?? "MSU-GenSan Animal Science Farm", leftLogo: values.report_left_logo ?? defaultLogo, rightLogo: values.report_right_logo ?? defaultLogo };
};

export async function GET(request: NextRequest) {
  const auth = await requireRole("veterinarian", "faculty");
  if ("response" in auth) return auth.response;
  const params = request.nextUrl.searchParams, type = params.get("type") ?? "inventory";
  if (type === "breeding" || type === "pregnancy") {
    const range = params.get("range") ?? "month", now = new Date(), to = params.get("to") || now.toISOString().slice(0, 10), start = new Date(now);
    if (range === "month") start.setUTCDate(1); else if (range === "3-months") start.setUTCMonth(start.getUTCMonth() - 3); else if (range === "6-months") start.setUTCMonth(start.getUTCMonth() - 6); else if (range === "year") start.setUTCMonth(0, 1); else start.setUTCFullYear(1970, 0, 1);
    const from = range === "custom" ? params.get("from") : start.toISOString().slice(0, 10);
    if (!from || !/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || from > to) return NextResponse.json({ error: "Valid report dates are required" }, { status: 400 });
    if (type === "pregnancy") {
      const [settings, result] = await Promise.all([
        db.query("SELECT key,value FROM system_settings WHERE key IN ('farm_name','report_left_logo','report_right_logo')"),
        db.query(`SELECT service.id, COALESCE(outcome.event_date, service.event_date + 45) check_date, outcome.event_type outcome
          FROM breeding_records service
          LEFT JOIN LATERAL (SELECT event_type,event_date FROM breeding_records
            WHERE source_service_id=service.id AND archived_at IS NULL
              AND event_type IN ('pregnancy_confirmed','pregnancy_negative','pregnancy_loss')
            ORDER BY event_date,id LIMIT 1) outcome ON TRUE
          WHERE service.archived_at IS NULL AND service.event_type IN ('natural_service','artificial_insemination')
            AND COALESCE(outcome.event_date, service.event_date + 45) BETWEEN $1 AND $2
          ORDER BY check_date,service.id`, [from, to]),
      ]);
      const rows = result.rows, confirmed = rows.filter(row => row.outcome === "pregnancy_confirmed").length, negative = rows.filter(row => row.outcome === "pregnancy_negative").length, losses = rows.filter(row => row.outcome === "pregnancy_loss").length, pending = rows.filter(row => !row.outcome).length;
      const periods = new Map<string, { period:string; checks:number; confirmed:number; negative:number; losses:number; pending:number; pregnancyRate:number }>();
      for (const row of rows) { const period = new Date(row.check_date).toLocaleDateString("en-US", { month:"short", year:"numeric", timeZone:"UTC" }), item = periods.get(period) ?? { period, checks:0, confirmed:0, negative:0, losses:0, pending:0, pregnancyRate:0 }; item.checks++; if (row.outcome === "pregnancy_confirmed") item.confirmed++; else if (row.outcome === "pregnancy_negative") item.negative++; else if (row.outcome === "pregnancy_loss") item.losses++; else item.pending++; item.pregnancyRate = item.checks ? item.confirmed / item.checks * 100 : 0; periods.set(period, item); }
      return NextResponse.json({ type, ...reportConfig(settings.rows), generatedBy: auth.user.display_name, generatedAt: new Date().toISOString(), from, to, checks: rows.length, confirmed, negative, losses, pending, pregnancyRate: rows.length ? confirmed / rows.length * 100 : 0, trend: [...periods.values()] }, { headers: { "Cache-Control": "no-store" } });
    }
    const [settings, result] = await Promise.all([
      db.query("SELECT key,value FROM system_settings WHERE key IN ('farm_name','report_left_logo','report_right_logo')"),
      db.query(`SELECT service.id,service.event_date,service.event_type,dam.tag_number dam_tag,COALESCE(dam.name,'Unnamed') dam_name,COALESCE(sire.tag_number,'Not recorded') sire_tag,
        outcome.event_type outcome
        FROM breeding_records service JOIN livestock dam ON dam.id=service.livestock_id LEFT JOIN livestock sire ON sire.id=service.sire_id
        LEFT JOIN LATERAL (SELECT event_type FROM breeding_records WHERE source_service_id=service.id AND archived_at IS NULL AND event_type IN ('pregnancy_confirmed','pregnancy_negative','pregnancy_loss') ORDER BY event_date DESC,id DESC LIMIT 1) outcome ON TRUE
        WHERE service.archived_at IS NULL AND service.event_type IN ('natural_service','artificial_insemination') AND service.event_date BETWEEN $1 AND $2 ORDER BY service.event_date`, [from, to])
    ]);
    const rows = result.rows, confirmed = rows.filter(row => row.outcome === "pregnancy_confirmed").length, unsuccessful = rows.filter(row => ["pregnancy_negative", "pregnancy_loss"].includes(row.outcome)).length, pending = rows.length - confirmed - unsuccessful;
    const months = new Map<string, { period:string; attempts:number; naturalService:number; artificialInsemination:number; confirmed:number; unsuccessful:number; pending:number }>();
    for (const row of rows) { const period = new Date(row.event_date).toLocaleDateString("en-US", { month:"short", year:"numeric", timeZone:"UTC" }), item = months.get(period) ?? { period, attempts:0, naturalService:0, artificialInsemination:0, confirmed:0, unsuccessful:0, pending:0 }; item.attempts++; if (row.event_type === "natural_service") item.naturalService++; else item.artificialInsemination++; if (row.outcome === "pregnancy_confirmed") item.confirmed++; else if (["pregnancy_negative", "pregnancy_loss"].includes(row.outcome)) item.unsuccessful++; else item.pending++; months.set(period, item); }
    return NextResponse.json({ type, ...reportConfig(settings.rows), generatedBy: auth.user.display_name, generatedAt: new Date().toISOString(), from, to, attempts: rows.length, confirmed, unsuccessful, pending, successRate: rows.length ? confirmed / rows.length * 100 : 0, methods: { naturalService: rows.filter(row => row.event_type === "natural_service").length, artificialInsemination: rows.filter(row => row.event_type === "artificial_insemination").length }, trend: [...months.values()], records: rows });
  }
  const [animals, settings] = await Promise.all([
    db.query("SELECT sex, birth_date, has_calved, current_weight_kg, status, created_at FROM livestock WHERE archived_at IS NULL ORDER BY created_at"),
    db.query("SELECT key, value FROM system_settings WHERE key IN ('farm_name','mature_cattle_price_per_kg','calf_fixed_price','report_left_logo','report_right_logo')")
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
  return NextResponse.json({ ...reportConfig(settings.rows), generatedBy: auth.user.display_name, generatedAt: new Date().toISOString(), prices, inventory, totalCattle: live.length, totalValue: inventory.reduce((sum, row) => sum + row.value, 0), trend, methodology: "Live cattle are grouped by sex, birth date, and calving history. Population trend uses record creation dates because historical status snapshots are unavailable." }, { headers: { "Cache-Control": "no-store" } });
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
