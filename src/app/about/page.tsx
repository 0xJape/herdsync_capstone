import { ArrowRight, CalendarCheck, HeartPulse, Sprout } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const capabilities = [
  { icon: HeartPulse, label: "Health records", text: "Keep treatment, vaccination, follow-up, and withdrawal information together." },
  { icon: Sprout, label: "Breeding cycles", text: "Follow breeding, pregnancy, calving, and lineage from one animal history." },
  { icon: CalendarCheck, label: "Daily decisions", text: "See what needs attention now, without digging through old notes." },
];

const faqs = [
  { question: "Who is HerdSync for?", answer: "HerdSync is built for the MSU-GenSan Animal Science Farm team and the people responsible for keeping herd records current." },
  { question: "What can be tracked?", answer: "Animal identity, health records, breeding events, pregnancy, calving, lineage, and daily care priorities." },
  { question: "Why keep records in one place?", answer: "Connected records give the farm team context for decisions and make follow-ups easier to see." },
  { question: "How do I access HerdSync?", answer: "Use the sign-in button above to open the application." },
];

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-[#f4f1e9] text-[#17241c]">
      <header className="border-b border-[#17241c]/10 px-6 py-5 sm:px-10"><nav className="mx-auto flex max-w-6xl items-center justify-between" aria-label="Main navigation"><Link href="/" className="flex items-center gap-3 text-sm font-bold tracking-tight"><Image src="/herdsync_logo.png" alt="HerdSync" width={38} height={38} className="size-9 object-contain" />HerdSync</Link><Link href="/login" className="rounded-full border border-[#17241c]/25 px-5 py-2 text-sm font-semibold transition hover:bg-[#17241c] hover:text-white">Sign in</Link></nav></header>
      <section className="mx-auto grid max-w-6xl gap-12 px-6 py-16 sm:px-10 lg:grid-cols-[.9fr_1.1fr] lg:items-center lg:py-24"><div><p className="text-xs font-bold uppercase tracking-[.22em] text-[#55704f]">About HerdSync</p><h1 className="mt-5 max-w-xl text-5xl font-medium leading-[.98] tracking-[-.06em] sm:text-7xl">The farm runs on good records.</h1><p className="mt-7 max-w-lg text-lg leading-8 text-[#17241c]/65">HerdSync is a practical workspace for MSU-GenSan Animal Science Farm. It keeps animal identity, care, breeding, and decisions close to the people who use them.</p><Link href="/login" className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#173d2b] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#0d2c1e]">Open HerdSync <ArrowRight size={17}/></Link></div><div className="relative min-h-[390px] overflow-hidden rounded-[2rem] bg-[#173d2b]"><div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1500595046743-cd271d694d30?auto=format&fit=crop&w=1200&q=85')] bg-cover bg-center opacity-65"/><div className="absolute inset-0 bg-gradient-to-t from-[#102d20] via-transparent to-transparent"/><div className="absolute bottom-6 left-6 right-6 flex items-end justify-between text-white"><p className="max-w-xs text-sm leading-6 text-white/75">One connected view of the herd, from first record to daily care.</p><span className="text-5xl font-light">01</span></div></div></section>
      <section id="why" className="border-y border-[#17241c]/10 bg-[#e3e4d7] px-6 py-16 sm:px-10 sm:py-20"><div className="mx-auto max-w-6xl"><div className="max-w-2xl"><p className="text-xs font-bold uppercase tracking-[.22em] text-[#55704f]">What it brings together</p><h2 className="mt-4 text-3xl font-medium tracking-[-.04em] sm:text-5xl">Less searching. More knowing.</h2></div><div className="mt-12 grid gap-0 border-t border-[#17241c]/15 md:grid-cols-3">{capabilities.map(({ icon: Icon, label, text }, index) => <article key={label} className="border-b border-[#17241c]/15 py-7 md:border-b-0 md:border-r md:px-7 md:first:pl-0 md:last:border-r-0"><div className="flex items-center justify-between"><Icon size={22} className="text-[#55704f]"/><span className="text-xs font-bold text-[#17241c]/35">0{index + 1}</span></div><h3 className="mt-10 text-lg font-semibold">{label}</h3><p className="mt-3 max-w-xs text-sm leading-7 text-[#17241c]/60">{text}</p></article>)}</div></div></section>
      <section className="mx-auto max-w-4xl px-6 py-16 sm:px-10 sm:py-20"><div><p className="text-xs font-bold uppercase tracking-[.22em] text-[#55704f]">FAQs</p><h2 className="mt-4 text-3xl font-medium tracking-[-.04em] sm:text-5xl">Questions, answered.</h2></div><div className="mt-10 border-t border-[#17241c]/15">{faqs.map(({ question, answer }) => <details key={question} className="group border-b border-[#17241c]/15 py-5"><summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-base font-semibold marker:hidden"><span>{question}</span><span className="text-2xl font-light text-[#55704f] transition group-open:rotate-45">+</span></summary><p className="max-w-2xl pt-4 text-sm leading-7 text-[#17241c]/60">{answer}</p></details>)}</div></section>
      <footer className="border-t border-[#17241c]/10 px-6 py-8 sm:px-10"><div className="mx-auto flex max-w-6xl flex-col gap-3 text-sm text-[#17241c]/55 sm:flex-row sm:items-center sm:justify-between"><span>HerdSync · MSU-GenSan Animal Science Farm</span><span>Jalel Prince G. Gayo · Marlo Gel P. Alkuino · Kyle Stephen A. Silaya</span></div></footer>
    </main>
  );
}
