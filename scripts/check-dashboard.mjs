import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

// Render the real page with fixture API state; no database or server required.
const require = createRequire(import.meta.url);
const source = readFileSync(new URL("../src/app/dashboard/page.tsx", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS } }).outputText;
function render(data, error = "") {
  let state = 0;
  const exports = {};
  runInNewContext(compiled, {
    exports,
    require: (name) => name === "react" ? { ...React, useEffect() {}, useState: () => [[data, error, 0, ""][state++], () => {}] } : name === "next/link" ? { default: ({ children, ...props }) => React.createElement("a", props, children) } : require(name),
  });
  return renderToStaticMarkup(React.createElement(exports.default));
}
const fixture = {
  stats: [{ kind: "cattle", value: 3, detail: "1 added this month" }, { kind: "health", value: 2 }, { kind: "due", value: 1 }, { kind: "alerts", value: 1 }],
  composition: [{ label: "active", value: 3 }, { label: "sold", value: 2 }],
  population: [{ month: "Sep", value: 5 }],
  alerts: [{ title: "Check-up", detail: "C-1 · overdue", level: "critical" }, { title: "Check-up", detail: "C-2 · due Sep 16", level: "warning" }],
  recent: [{ title: "Registered C-1", detail: "Cattle record added" }],
};
const html = render(fixture);
assert.match(html, />5<\/strong>/, "Status total includes inactive cattle");
assert.equal((html.match(/class="panel metric-card"/g) ?? []).length, 3);
assert.equal((html.match(/<svg/g) ?? []).length, 1);
assert.match(html, /cx="300"/, "One-point chart stays centered");
assert.match(html, /Overdue/);
assert.match(html, /Upcoming/);
assert.match(html, /class="recent-records-table"/);
assert.match(render(null, "Dashboard could not load."), /Retry/);
assert.doesNotMatch(html, /href="(?:#|\/health\/)|NaN|Infinity|<main|<aside/);
const empty = render({ stats: [], composition: [], population: [], alerts: [], recent: [] });
assert.match(empty, /No cattle records yet/);
assert.match(empty, /No population data available/);
assert.match(empty, /No overdue or upcoming follow-ups/);
assert.doesNotMatch(render({ ...fixture, population: [{ month: "Sep", value: 0 }] }), /NaN|Infinity/);
assert.match(render(null), /Loading farm overview/);
console.log("Dashboard checks passed: metrics, status total, chart edge cases, safe links, empty/loading states.");