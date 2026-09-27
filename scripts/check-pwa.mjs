import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const handlers = {};
const stored = new Map();
const deleted = [];
let networkFails = false;
let networkCalls = 0;
const networkResponse = { private: true };
const cache = {
  addAll: async (paths) => paths.forEach((path) => stored.set(path, { public: path })),
  match: async (path) => stored.get(path),
};
vm.runInNewContext(await readFile(new URL("public/sw.js", root), "utf8"), {
  URL, Response,
  self: { location: { origin: "https://herdsync.test" }, clients: { claim: async () => {} }, addEventListener: (name, handler) => { handlers[name] = handler; } },
  caches: { open: async () => cache, keys: async () => ["herdsync-offline-v0", "herdsync-offline-v1", "other-app"], delete: async (key) => deleted.push(key) },
  fetch: async () => { networkCalls++; if (networkFails) throw new Error("offline"); return networkResponse; },
});
await new Promise((resolve, reject) => handlers.install({ waitUntil: (promise) => promise.then(resolve, reject) }));
await new Promise((resolve, reject) => handlers.activate({ waitUntil: (promise) => promise.then(resolve, reject) }));
assert.deepEqual(deleted, ["herdsync-offline-v0"]);
assert.deepEqual([...stored.keys()], ["/offline.html", "/icons/icon-192.png"]);
function request(path, mode = "navigate", method = "GET") {
  let result;
  handlers.fetch({ request: { url: new URL(path, "https://herdsync.test").href, mode, method }, respondWith: (promise) => { result = promise; } });
  return result;
}
assert.equal(await request("/health?livestock=private"), networkResponse);
networkFails = true;
assert.equal((await request("/dashboard")).public, "/offline.html");
assert.equal((await request("/icons/icon-192.png", "cors")).public, "/icons/icon-192.png");
assert.equal(networkCalls, 2);
for (const [path, mode, method] of [["/api/auth/me", "navigate", "GET"], ["/api", "navigate", "GET"], ["/health", "cors", "GET"], ["/_next/static/app.js", "cors", "GET"], ["/dashboard", "navigate", "POST"], ["https://other.test/page", "navigate", "GET"]]) {
  assert.equal(request(path, mode, method), undefined, `Must bypass ${method} ${path}`);
}
assert.deepEqual([...stored.keys()], ["/offline.html", "/icons/icon-192.png"]);
stored.clear();
assert.equal((await request("/dashboard")).type, "error");
for (const [name, size] of [["icon-192.png", 192], ["icon-512.png", 512], ["apple-touch-icon.png", 180]]) {
  const png = await readFile(new URL(`public/icons/${name}`, root));
  assert.equal(png.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
  assert.equal(png.readUInt32BE(16), size);
  assert.equal(png.readUInt32BE(20), size);
}
console.log("PASS: PWA cache allowlist, navigation fallback, API/private/mutation bypass, cleanup, missing-cache fallback, PNG dimensions.");