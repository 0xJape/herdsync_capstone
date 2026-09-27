import pg from "pg";

const { Pool } = pg;
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

try {
  const cattle = await pool.query("SELECT id, sex FROM livestock WHERE archived_at IS NULL ORDER BY id");
  const sires = cattle.rows.filter((animal) => animal.sex === "male");
  const dams = cattle.rows.filter((animal) => animal.sex === "female");
  if (sires.length < 2 || dams.length < 2) throw new Error("At least two male and two female cattle are required");

  await pool.query("BEGIN");
  for (const [index, animal] of cattle.rows.entries()) {
    const sire = sires.find((candidate, offset) => candidate.id !== animal.id && offset >= index % sires.length)
      ?? sires.find((candidate) => candidate.id !== animal.id);
    const dam = dams.find((candidate, offset) => candidate.id !== animal.id && offset >= (index * 3) % dams.length)
      ?? dams.find((candidate) => candidate.id !== animal.id);
    if (!sire || !dam) throw new Error(`Could not assign pedigree for livestock ${animal.id}`);
    await pool.query("UPDATE livestock SET sire_id = $1, dam_id = $2, updated_at = NOW() WHERE id = $3", [sire.id, dam.id, animal.id]);
  }
  await pool.query("COMMIT");
  console.log(`Seeded pedigree for ${cattle.rows.length} cattle.`);
} catch (error) {
  await pool.query("ROLLBACK");
  throw error;
} finally {
  await pool.end();
}
