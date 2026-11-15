import { db } from "@/lib/db";

export async function releaseExpiredQuarantines(id?: string | number) {
  await db.query(`WITH due AS (
      UPDATE livestock
      SET quarantine_status = 'pending_clearance', updated_at = NOW()
      WHERE quarantine_status = 'active'
        AND acquisition_date + 30 <= CURRENT_DATE
        AND ($1::bigint IS NULL OR id = $1)
      RETURNING id, acquisition_date + 30 AS due_date
    )
    INSERT INTO health_records (livestock_id, record_type, record_date, diagnosis, details, follow_up_date, status)
    SELECT id, 'quarantine_clearance', due_date, 'Admission veterinary review',
      'Thirty-day quarantine completed. Veterinary clearance required before herd admission.', due_date, 'open'
    FROM due
    WHERE NOT EXISTS (
      SELECT 1 FROM health_records h
      WHERE h.livestock_id = due.id AND h.record_type = 'quarantine_clearance'
        AND h.status = 'open' AND h.archived_at IS NULL
    )`, [id ?? null]);
}
