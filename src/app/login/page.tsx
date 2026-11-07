"use client";
/* eslint-disable @next/next/no-html-link-for-pages */

import { FormEvent, useState } from "react";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import Image from "next/image";
import { ImageSlider } from "@/components/ui/image-slider";
import { useRouter } from "next/navigation";

const farmImages = [
  "/msu_login/cattles.png",
  "/msu_login/mindanao_state_university_drone.png",
];

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: data.get("email"), password: data.get("password") }) });
    const body = await response.json();
    if (!response.ok) { setMessage(body.error ?? "Sign in failed"); return; }
    const next = new URLSearchParams(window.location.search).get("next");
    const home = body.role === "admin" ? "/activity" : "/dashboard";
    router.replace(next?.startsWith("/") && !next.startsWith("//") ? next : home);
  }

  return (
    <div className="min-h-screen bg-[#f1f2ed]">
      <header className="border-b border-[#0c3c01]/10 bg-white px-6 py-3 sm:px-10">
        <nav className="mx-auto flex max-w-6xl items-center justify-between" aria-label="Main navigation">
          <a href="/" className="flex items-center gap-3 font-semibold text-[#0c3c01]"><Image src="/herdsync_logo.png" alt="HerdSync" width={36} height={36} className="size-9 object-contain" />HerdSync</a>
          <a href="/about" className="rounded-lg border border-[#0c3c01] px-4 py-2 text-sm font-semibold text-[#0c3c01] transition hover:bg-[#0c3c01] hover:text-white">About us</a>
        </nav>
      </header>
      <main className="flex min-h-[calc(100vh-61px)] items-center justify-center p-4 sm:p-6">
      <section className="grid h-[min(650px,calc(100vh-93px))] min-h-[540px] w-full max-w-6xl overflow-hidden rounded-3xl bg-white shadow-xl lg:grid-cols-2">
        <div className="relative hidden lg:block"><ImageSlider images={farmImages} interval={5000} /><div className="absolute inset-0 bg-gradient-to-t from-[#0c3c01]/90 via-transparent to-transparent" /><div className="absolute bottom-9 left-10 right-10 text-white"><p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#a2ac82]">MSU-GenSan Animal Science Farm</p><h2 className="text-3xl font-semibold leading-tight">Every record helps care for the herd.</h2></div></div>
        <div className="flex items-center justify-center p-6 sm:p-10"><div className="w-full max-w-sm"><a href="/" className="mb-7 flex items-center gap-3 font-semibold text-[#0c3c01]"><Image src="/herdsync_logo.png" alt="HerdSync" width={36} height={36} className="size-9 rounded-xl object-contain" />HerdSync</a><p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#5b6d49]">Welcome back</p><h1 className="text-3xl font-semibold text-[#0c3c01]">Sign in to HerdSync</h1><p className="mt-2 text-sm leading-6 text-black/60">Access cattle records, health updates, and farm operations.</p><form onSubmit={handleSubmit} className="mt-6 space-y-4"><label className="block text-sm font-medium">Email<input name="email" type="email" required placeholder="name@msugensan.edu.ph" className="mt-2 h-11 w-full rounded-xl border border-black/15 bg-[#f1f2ed]/50 px-4 outline-none focus:border-[#0c3c01]" /></label><label className="block text-sm font-medium">Password<div className="relative mt-2"><input name="password" type={showPassword ? "text" : "password"} required className="h-11 w-full rounded-xl border border-black/15 bg-[#f1f2ed]/50 px-4 pr-12 outline-none focus:border-[#0c3c01]" /><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"} className="absolute right-4 top-2.5 text-black/50">{showPassword ? <EyeOff size={20} /> : <Eye size={20} />}</button></div></label><button type="submit" className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#0c3c01] font-semibold text-white transition hover:bg-[#145408]">Sign in <ArrowRight size={18} /></button></form>{message && <p role="status" className="mt-3 text-sm text-[#5b6d49]">{message}</p>}<p className="mt-5 text-center text-xs leading-5 text-black/50">Use your authorized HerdSync account. Contact your administrator if access is unavailable.</p></div></div>
      </section>
      </main>
    </div>
  );
}
