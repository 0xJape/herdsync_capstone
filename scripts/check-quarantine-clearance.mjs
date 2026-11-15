import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [quarantine, clearance, profile, alerts] = await Promise.all([
  readFile(new URL("../src/lib/quarantine.ts", import.meta.url), "utf8"),
  readFile(new URL("../src/app/api/livestock/[id]/quarantine-clearance/route.ts", import.meta.url), "utf8"),
  readFile(new URL("../src/app/livestock/[id]/page.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/app/api/alerts/route.ts", import.meta.url), "utf8"),
]);

assert.match(quarantine, /quarantine_status = 'pending_clearance'/);
assert.doesNotMatch(quarantine, /quarantine_status = 'released'/);
assert.match(clearance, /requireRole\("veterinarian"\)/);
assert.match(clearance, /quarantine_status = 'released'/);
assert.match(profile, /Review for admission/);
assert.match(alerts, /Admission veterinary review/);
console.log("Quarantine clearance workflow check passed.");
