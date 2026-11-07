import { Activity, ArrowRight, CalendarCheck, HeartPulse, ShieldCheck, Sprout } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const capabilities = [
  { icon: HeartPulse, label: "Health", text: "Treatment histories, follow-ups, and medicine withdrawal safeguards." },
  { icon: Sprout, label: "Breeding", text: "Breeding, pregnancy, calving, and lineage records in one connected flow." },
  { icon: CalendarCheck, label: "Daily care", text: "Priority schedules turn due dates into clear work for the farm team." },
];

export default function AboutPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#f1f2ed] text-[#10210e]">
      <header className="border-b border-[#0c3c01]/10 bg-white/90 px-6 py-3 backdrop-blur sm:px-10">
        <nav className="mx-auto flex max-w-6xl items-center justify-between" aria-label="Main navigation">
          <Link href="/" className="flex items-center gap-3 font-semibold text-[#0c3c01]"><Image src="/herdsync_logo.png" alt="HerdSync" width={36} height={36} className="size-9 object-contain" />HerdSync</Link>
          <Link href="/login" className="rounded-lg bg-[#0c3c01] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#145408]">Sign in</Link>
        </nav>
      </header>

      <section className="relative mx-auto grid max-w-6xl gap-10 px-6 pb-16 pt-12 sm:px-10 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:py-20">
        <div className="pointer-events-none absolute -left-32 top-10 size-80 rounded-full bg-[#a2ac82]/25 blur-3xl" />
        <div className="relative z-10">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#0c3c01]/15 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[.16em] text-[#416339]"><Activity size={14} /> Built for better herd care</div>
          <h1 className="max-w-2xl text-5xl font-semibold leading-[1.02] tracking-[-.04em] text-[#0c3c01] sm:text-7xl">Farm knowledge,<br /><span className="text-[#718157]">kept alive.</span></h1>
          <p className="mt-7 max-w-xl text-base leading-8 text-black/60 sm:text-lg">HerdSync gives MSU-GenSan Animal Science Farm one dependable place for cattle identity, care, breeding, pregnancy, and farm decisions.</p>
          <div className="mt-8 flex flex-wrap gap-3"><Link href="/login" className="inline-flex items-center gap-2 rounded-xl bg-[#0c3c01] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#145408]">Open HerdSync <ArrowRight size={17} /></Link><a href="#why" className="rounded-xl border border-[#0c3c01]/20 bg-white px-5 py-3 text-sm font-semibold text-[#0c3c01]">See how it helps</a></div>
        </div>

        <div className="relative min-h-[460px]">
          <div className="absolute inset-x-8 inset-y-0 rotate-3 overflow-hidden rounded-[2.5rem] bg-[#0c3c01] shadow-2xl">
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1500595046743-cd271d694d30?auto=format&fit=crop&w=1200&q=85')] bg-cover bg-center opacity-70" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#062900] via-[#0c3c01]/20 to-transparent" />
          </div>
          <div className="absolute bottom-6 left-0 max-w-xs rounded-2xl border border-white/60 bg-white/90 p-5 shadow-xl backdrop-blur"><ShieldCheck className="mb-3 text-[#0c3c01]" /><p className="font-semibold">Records that protect the herd</p><p className="mt-1 text-sm leading-6 text-black/55">Withdrawal periods and follow-up dates stay visible when decisions matter.</p></div>
          <div className="absolute right-0 top-8 rounded-2xl bg-[#a2ac82] p-5 shadow-xl"><p className="text-4xl font-semibold text-[#0c3c01]">One</p><p className="mt-1 text-xs font-semibold uppercase tracking-widest text-[#0c3c01]/70">shared history</p></div>
        </div>
      </section>

      <section id="why" className="bg-[#0c3c01] px-6 py-16 text-white sm:px-10 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-8 lg:grid-cols-[.8fr_1.2fr] lg:items-end"><div><p className="text-xs font-semibold uppercase tracking-[.18em] text-[#a2ac82]">Why HerdSync</p><h2 className="mt-4 text-3xl font-semibold leading-tight sm:text-5xl">A living story for every animal.</h2></div><p className="max-w-xl text-base leading-8 text-white/65 lg:justify-self-end">Good care depends on what happened yesterday and what comes due tomorrow. HerdSync joins those moments so farm teams can act with context, not guesswork.</p></div>
          <div className="mt-12 grid gap-4 md:grid-cols-3">{capabilities.map(({ icon: Icon, label, text }, index) => <article key={label} className="group rounded-3xl border border-white/10 bg-white/[.06] p-6 transition hover:-translate-y-1 hover:bg-white/[.1]"><div className="flex items-center justify-between"><span className="grid size-11 place-items-center rounded-2xl bg-[#a2ac82] text-[#0c3c01]"><Icon size={21} /></span><span className="text-sm text-white/30">0{index + 1}</span></div><h3 className="mt-8 text-xl font-semibold">{label}</h3><p className="mt-3 text-sm leading-7 text-white/60">{text}</p></article>)}</div>
        </div>
      </section>

      <section className="px-6 py-16 sm:px-10 sm:py-20"><div className="mx-auto flex max-w-6xl flex-col gap-8 rounded-[2rem] bg-[#dfe5d1] p-8 sm:p-12 lg:flex-row lg:items-center lg:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[.18em] text-[#5b6d49]">MSU-GenSan Animal Science Farm</p><h2 className="mt-3 max-w-2xl text-3xl font-semibold text-[#0c3c01] sm:text-4xl">Every record helps care for the herd.</h2></div><Link href="/login" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#0c3c01] px-6 py-3 font-semibold text-white transition hover:bg-[#145408]">Sign in <ArrowRight size={18} /></Link></div></section>
    </main>
  );
}
