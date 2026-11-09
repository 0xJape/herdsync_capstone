"use client";

import { useState } from "react";
import BreedingPage from "@/app/breeding/page";

export default function ReproductionPage() {
  const [section, setSection] = useState<"breeding" | "pregnancy">("breeding");

  return <div className="breeding-page">
    <nav className="workspace-tabs" aria-label="Reproduction sections">
      <button type="button" className={section === "breeding" ? "active" : ""} aria-current={section === "breeding" ? "page" : undefined} onClick={() => setSection("breeding")}>Breeding</button>
      <button type="button" className={section === "pregnancy" ? "active" : ""} aria-current={section === "pregnancy" ? "page" : undefined} onClick={() => setSection("pregnancy")}>Pregnancy</button>
    </nav>
    <BreedingPage mode={section}/>
  </div>;
}