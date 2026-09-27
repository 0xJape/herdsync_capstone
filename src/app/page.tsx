"use client";

import { FormEvent, useState } from "react";
import { ArrowRight, Eye, EyeOff, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Home() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: form.get("email"), password: form.get("password") }) });
    const body = await response.json();
    if (!response.ok) { setMessage(body.error ?? "Sign in failed"); return; }
    router.push(body.role === "admin" ? "/activity" : "/dashboard");
  }

  return (
    <main className="min-h-screen bg-[#f6f7f2]">
      <header className="border-b border-[#0c3c01]/10 bg-white px-6 py-5 sm:px-10">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link href="/" className="flex items-center gap-3 text-base font-semibold text-[#0c3c01]"><Image src="/herdsync_logo.png" alt="HerdSync" width={40} height={40} className="h-auto w-10 object-contain" />HerdSync</Link>
          <button onClick={() => setOpen(true)} className="rounded-lg border border-[#0c3c01] px-4 py-2 text-sm font-semibold text-[#0c3c01] transition hover:bg-[#0c3c01] hover:text-white">Sign in</button>
        </div>
      </header>
      <section className="mx-auto grid max-w-6xl gap-12 px-6 py-16 sm:px-10 sm:py-24 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-20">
        <div>
          <p className="mb-5 text-xs font-bold uppercase tracking-[0.18em] text-[#5b6d49]">MSU-GenSan Animal Science Farm</p>
          <h1 className="max-w-2xl text-4xl font-bold leading-[1.12] tracking-tight text-[#172019] sm:text-6xl">Clear records for healthier herds.</h1>
          <p className="mt-6 max-w-xl text-base leading-8 text-black/60">HerdSync organizes cattle identification, health, treatment, breeding, pregnancy, birth, alerts, and farm reporting in one dependable workspace.</p>
          <button onClick={() => setOpen(true)} className="mt-8 inline-flex items-center gap-2 rounded-lg bg-[#0c3c01] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#145408]">Open dashboard <ArrowRight size={17} /></button>
        </div>
        <div className="relative overflow-hidden rounded-2xl border border-[#d9ded4] bg-white p-7 text-[#172019] shadow-lg sm:p-9">
          <p className="text-sm font-medium text-black/55">Farm overview</p>
          <p className="mt-4 text-5xl font-bold text-[#214e34]">25</p>
          <p className="mt-1 text-black/55">Cattle records ready to manage</p>
          <div className="mt-9 grid grid-cols-3 gap-2">
            {["Health", "Breeding", "Reports"].map((item) => <div key={item} className="rounded-lg border border-white/15 bg-white/10 px-3 py-3 text-center text-xs font-semibold">{item}</div>)}
          </div>
        </div>
      </section>
      {open && <div className="fixed inset-0 z-50 grid place-items-center bg-[#071d03]/55 px-4 py-6 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="signin-title">
        <div className="relative w-full max-w-md rounded-2xl border border-black/10 bg-white p-6 shadow-2xl sm:p-9">
          <button onClick={() => setOpen(false)} aria-label="Close sign-in" className="absolute right-5 top-5 rounded-md p-1 text-black/45 hover:bg-black/5 hover:text-black"><X size={19} /></button>
          <div className="mb-8"><Image src="/herdsync_logo.png" alt="HerdSync" width={40} height={40} className="h-auto w-10 rounded-lg object-contain" /><p className="mt-7 text-xs font-bold uppercase tracking-[0.16em] text-[#5b6d49]">Welcome back</p><h2 id="signin-title" className="mt-2 text-2xl font-bold text-[#0c3c01]">Sign in to HerdSync</h2><p className="mt-2 text-sm leading-6 text-black/55">Access cattle records and farm operations.</p></div>
          <form onSubmit={submit} className="space-y-5"><label className="block text-sm font-semibold text-black/75">Email<input name="email" type="email" required placeholder="name@msugensan.edu.ph" className="mt-2 h-12 w-full rounded-lg border border-black/15 bg-[#f1f2ed]/45 px-4 text-sm font-normal outline-none transition focus:border-[#0c3c01] focus:ring-2 focus:ring-[#0c3c01]/10" /></label><label className="block text-sm font-semibold text-black/75">Password<div className="relative mt-2"><input name="password" type={showPassword ? "text" : "password"} required className="h-12 w-full rounded-lg border border-black/15 bg-[#f1f2ed]/45 px-4 pr-12 text-sm font-normal outline-none transition focus:border-[#0c3c01] focus:ring-2 focus:ring-[#0c3c01]/10" /><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"} className="absolute right-3 top-3 rounded p-1 text-black/45 hover:text-black">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></label><button type="submit" className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#0c3c01] text-sm font-semibold text-white transition hover:bg-[#145408]">Sign in <ArrowRight size={17} /></button></form>
          {message && <p role="status" className="mt-4 rounded-lg bg-[#a2ac82]/25 px-3 py-2 text-xs leading-5 text-[#0c3c01]">{message}</p>}
          <p className="mt-7 text-center text-xs leading-5 text-black/45">Use your authorized HerdSync account. Contact your administrator if access is unavailable.</p>
        </div>
      </div>}
    </main>
  );
}
