import { db } from "@/lib/db";

export function logActivity(userId: string, action: "create" | "update" | "archive", entityType: "livestock" | "health" | "weight" | "breeding", entityId: number, title: string, detail: string) {
  return db.query("INSERT INTO activity_logs (user_id, action, entity_type, entity_id, title, detail) VALUES ($1,$2,$3,$4,$5,$6)", [userId, action, entityType, entityId, title, detail]);
}
