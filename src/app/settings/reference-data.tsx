"use client";

import { FormEvent, useEffect, useState } from "react";
import { BookOpen, Plus } from "lucide-react";

type Item = { id: number; name: string; active: boolean; treatment_type?: string };
type Data = { breeds: Item[]; medicines: Item[]; canManage: boolean };
const treatmentTypes = ["vaccination", "vitamins", "antibiotics", "anti_inflammatory", "dewormer"];
const pageSize = 10;

function ReferenceList({ kind, items, onToggle }: { kind: "breed" | "medicine"; items: Item[]; onToggle: (kind: "breed" | "medicine", item: Item) => void }) {
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const start = (currentPage - 1) * pageSize;
  const visible = items.slice(start, start + pageSize);
  return <><div className="reference-list">{visible.map((item) => <div key={item.id}><span>{item.name}{item.treatment_type && <small>{item.treatment_type.replaceAll("_", " ")}</small>}</span><button type="button" className="secondary-button" onClick={() => onToggle(kind, item)}>{item.active ? "Deactivate" : "Activate"}</button></div>)}</div>{items.length > pageSize && <nav className="operations-pagination" aria-label={`${kind === "breed" ? "Breed" : "Medicine"} pages`}><button type="button" className="secondary-button" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Previous</button><span>{start + 1}–{Math.min(start + pageSize, items.length)} of {items.length}</span><button type="button" className="secondary-button" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)}>Next</button></nav>}</>;
}

export default function ReferenceData() {
  const [data, setData] = useState<Data | null>(null), [error, setError] = useState("");
  async function load() { const response = await fetch("/api/reference-data", { cache: "no-store" }); if (response.ok) setData(await response.json()); }
  useEffect(() => { void Promise.resolve().then(load); }, []);
  async function add(event: FormEvent<HTMLFormElement>, kind: "breed" | "medicine") { event.preventDefault(); setError(""); const form = event.currentTarget, values = new FormData(form); const response = await fetch("/api/reference-data", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, name: values.get("name"), treatmentType: values.get("treatmentType") }) }); const body = await response.json(); if (!response.ok) { setError(body.error); return; } form.reset(); await load(); }
  async function toggle(kind: "breed" | "medicine", item: Item) { const response = await fetch("/api/reference-data", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, id: item.id, active: !item.active }) }); if (!response.ok) { setError((await response.json()).error); return; } await load(); }
  if (!data?.canManage) return null;
  return <section className="panel settings-section reference-data"><header><span><BookOpen size={19}/></span><div><h3>Reference data</h3><p>Veterinarian-managed cattle breeds and medicines.</p></div></header>{error && <p className="operations-error" role="alert">{error}</p>}<div className="reference-columns"><div><h4>Breeds</h4><form onSubmit={(event) => add(event, "breed")} className="reference-add"><label className="field">Breed name<input name="name" required maxLength={100}/></label><button className="primary-button">Add <Plus size={14}/></button></form><ReferenceList kind="breed" items={data.breeds} onToggle={toggle}/></div><div><h4>Medicines</h4><form onSubmit={(event) => add(event, "medicine")} className="reference-add"><label className="field">Medicine name<input name="name" required maxLength={200}/></label><label className="field">Treatment type<select name="treatmentType" required defaultValue=""><option value="" disabled>Select treatment type</option>{treatmentTypes.map((type) => <option key={type} value={type}>{type.replaceAll("_", " ")}</option>)}</select></label><button className="primary-button">Add <Plus size={14}/></button></form><ReferenceList kind="medicine" items={data.medicines} onToggle={toggle}/></div></div></section>;
}
