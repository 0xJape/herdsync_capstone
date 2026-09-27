import { randomBytes, scrypt as scryptCallback } from "node:crypto";
import { promisify } from "node:util";
import pg from "pg";

const { Pool } = pg;
const scrypt = promisify(scryptCallback);
const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD ?? "";
const name = process.env.ADMIN_NAME?.trim();

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
if (!email || !/^\S+@\S+\.\S+$/.test(email)) throw new Error("Valid ADMIN_EMAIL is required");
if (password.length < 12) throw new Error("ADMIN_PASSWORD must be at least 12 characters");
if (!name) throw new Error("ADMIN_NAME is required");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
try {
  const count = await pool.query("SELECT COUNT(*)::int count FROM users");
  if (count.rows[0].count !== 0) throw new Error("Bootstrap refused: a user already exists");
  const salt = randomBytes(16).toString("hex");
  const derived = await scrypt(password, salt, 64);
  const passwordHash = `scrypt:${salt}:${derived.toString("hex")}`;
  await pool.query("INSERT INTO users (email, display_name, password_hash, role) VALUES ($1, $2, $3, 'admin')", [email, name, passwordHash]);
  console.log(`Created first admin: ${email}`);
} finally {
  await pool.end();
}