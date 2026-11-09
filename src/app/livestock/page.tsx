import { Suspense } from "react";
import RegistrationForm from "./registration-form";

export default function LivestockPage() {
  return <Suspense fallback={<p className="muted">Loading cattle…</p>}><RegistrationForm /></Suspense>;
}

/*

import { Pencil, Plus, Search, Trash2, X } from "lucide-react";
import Link from "next/link";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";

type Animal = { id: number; tag_number: string; name: string | null; sex: string; breed: string; birth_date: string | null; status: string; acquisition_date: string | null; notes: string | null };
const empty = { tag_number: "", name: "", sex: "female", breed: "", birth_date: "", status: "active", acquisition_date: "", notes: "" };

export default function LivestockPage() {
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const load = useCallback(async () => { const response = await fetch(`/api/livestock?search=${encodeURIComponent(search)}`); setAnimals(await response.json()); }, [search]);
  useEffect(() => {
    fetch(`/api/livestock?search=${encodeURIComponent(search)}`).then((response) => response.json()).then(setAnimals).catch(() => setError("Could not load livestock"));
  }, [search]);

  async function submit(event: FormEvent) {
    event.preventDefault(); setError("");
    const response = await fetch(editing ? `/api/livestock/${editing}` : "/api/livestock", { method: editing ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    if (!response.ok) { const body = await response.json(); setError(body.error ?? "Save failed"); return; }
    setForm(empty); setEditing(null); await load();
  }
  function edit(animal: Animal) { setEditing(animal.id); setForm({ tag_number: animal.tag_number, name: animal.name ?? "", sex: animal.sex, breed: animal.breed, birth_date: animal.birth_date?.slice(0, 10) ?? "", status: animal.status, acquisition_date: animal.acquisition_date?.slice(0, 10) ?? "", notes: animal.notes ?? "" }); }
  async function archive(animal: Animal) { if (!confirm(`Archive ${animal.tag_number}?`)) return; await fetch(`/api/livestock/${animal.id}`, { method: "DELETE" }); await load(); }

  const formRef = useRef<HTMLFormElement>(null);
  const active = animals.filter((animal) => animal.status === "active").length;
  const male = animals.filter((animal) => animal.sex === "male").length;
  const female = animals.filter((animal) => animal.sex === "female").length;
  const scrollToForm = () => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  const labelStatus = (status: string) => status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <main className="cattle-page"><div className="cattle-content">
      <header className="cattle-header"><div><h1>Cattle</h1><p className="muted">Manage herd records, ownership, and animal status.</p></div><button type="button" className="primary-button cattle-add-button" onClick={() => { setEditing(null); setForm(empty); scrollToForm(); }}><Plus size={17} /> Add cattle</button></header>
      <section className="cattle-summary" aria-label="Cattle summary"><div><span>Total records</span><strong>{animals.length}</strong></div><div><span>Active</span><strong>{active}</strong></div><div><span>Male</span><strong>{male}</strong></div><div><span>Female</span><strong>{female}</strong></div></section>
      <section className="cattle-toolbar" aria-label="Search cattle"><div className="cattle-search"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by tag, name, or breed" aria-label="Search cattle" /></div><span className="muted cattle-result-count">{animals.length} records</span></section>
      <div className="cattle-layout"><form ref={formRef} onSubmit={submit} className="panel cattle-form"><div className="cattle-panel-heading"><div><span className="cattle-eyebrow">Herd records</span><h2>{editing ? "Edit cattle" : "Add cattle"}</h2></div>{editing && <button type="button" onClick={() => { setEditing(null); setForm(empty); }} className="icon-button" aria-label="Cancel editing"><X size={17} /></button>}</div>{error && <p role="alert" className="cattle-error">{error}</p>}<label className="field">Tag number<input required value={form.tag_number} onChange={(e) => setForm({ ...form, tag_number: e.target.value })} /></label><label className="field">Name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label><label className="field">Breed<input required value={form.breed} onChange={(e) => setForm({ ...form, breed: e.target.value })} /></label><div className="grid grid-cols-2 gap-3"><label className="field">Sex<select value={form.sex} onChange={(e) => setForm({ ...form, sex: e.target.value })}><option value="female">Female</option><option value="male">Male</option></select></label><label className="field">Status<select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option value="active">Active</option><option value="sold">Sold</option><option value="deceased">Deceased</option><option value="transferred">Transferred</option></select></label></div><label className="field">Birth date<input type="date" value={form.birth_date} onChange={(e) => setForm({ ...form, birth_date: e.target.value })} /></label><label className="field">Acquisition date<input type="date" value={form.acquisition_date} onChange={(e) => setForm({ ...form, acquisition_date: e.target.value })} /></label><label className="field">Notes<textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label><button className="primary-button cattle-submit" type="submit">{editing ? "Save changes" : "Add cattle"}</button></form>
        <section className="panel cattle-inventory"><div className="cattle-panel-heading"><div><span className="cattle-eyebrow">Inventory</span><h2>All cattle</h2></div><span className="muted cattle-desktop-note">Current records</span></div><div className="cattle-table-wrap"><table className="cattle-table"><thead><tr><th>Cattle ID</th><th>Breed</th><th>Sex</th><th>Status</th><th>Birth date</th><th aria-label="Actions" /></tr></thead><tbody>{animals.map((animal) => <tr key={animal.id}><td><strong>{animal.tag_number}</strong><span>{animal.name || "Unnamed animal"}</span></td><td>{animal.breed}</td><td>{animal.sex}</td><td><span className={`cattle-status cattle-status-${animal.status}`}>{labelStatus(animal.status)}</span></td><td>{animal.birth_date?.slice(0, 10) || "—"}</td><td><div className="cattle-actions"><button onClick={() => edit(animal)} className="icon-button" aria-label={`Edit ${animal.tag_number}`}><Pencil size={16} /></button><button onClick={() => archive(animal)} className="icon-button" aria-label={`Archive ${animal.tag_number}`}><Trash2 size={16} /></button></div></td></tr>)}</tbody></table>{!animals.length && <p className="muted cattle-empty">No cattle records found.</p>}</div></section>
      </div></div>
    </main>
  );
}
*/
