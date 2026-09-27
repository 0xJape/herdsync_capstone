"use client";

import { useEffect, useRef, useState } from "react";
import { Download, X } from "lucide-react";

type InstallEvent = Event & {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};
const dismissalKey = "herdsync-install-dismissed";

export default function PwaInstall() {
  const [offer, setOffer] = useState<"ios" | InstallEvent | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const dismissed = useRef(false);

  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator && window.isSecureContext) {
      navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" })
        .catch((cause) => console.warn("HerdSync offline support unavailable", cause));
    }
    const standalone = window.matchMedia("(display-mode: standalone)");
    const installed = () => standalone.matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    try { dismissed.current = localStorage.getItem(dismissalKey) === "1"; } catch { /* Storage may be disabled. Keep dismissal in this mount. */ }
    const eligible = () => !dismissed.current && !installed();
    const onPrompt = (event: Event) => {
      event.preventDefault();
      if (eligible()) setOffer(event as InstallEvent);
    };
    const onInstalled = () => { setOffer(null); };
    const onStorage = (event: StorageEvent) => {
      if (event.key === dismissalKey && event.newValue === "1") { dismissed.current = true; setOffer(null); }
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    window.addEventListener("storage", onStorage);
    standalone.addEventListener("change", onInstalled);
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    // Defer platform detection until after hydration, without delaying page content.
    const frame = requestAnimationFrame(() => { if (ios && eligible()) setOffer("ios"); });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      window.removeEventListener("storage", onStorage);
      standalone.removeEventListener("change", onInstalled);
    };
  }, []);

  function dismiss() {
    dismissed.current = true;
    try { localStorage.setItem(dismissalKey, "1"); } catch { /* Still dismiss when storage is unavailable. */ }
    setOffer(null);
  }

  async function install() {
    if (!offer || offer === "ios") return;
    setBusy(true);
    setError("");
    try {
      await offer.prompt();
      await offer.userChoice;
      dismiss();
    } catch {
      setError("Install unavailable. Use your browser menu to add HerdSync to your home screen.");
    } finally { setBusy(false); }
  }

  if (!offer) return null;
  return (
    <aside className="pwa-install no-print" aria-labelledby="pwa-install-title">
      <Download size={24} aria-hidden="true" />
      <div>
        <h2 id="pwa-install-title">Your herd, one tap away</h2>
        <p>{offer === "ios" ? "In Safari, tap Share, then Add to Home Screen to install HerdSync." : "Install HerdSync for quick access from your home screen."} Records require a connection.</p>
        {offer !== "ios" && <button className="primary-button" onClick={install} disabled={busy}>{busy ? "Opening installer…" : "Install HerdSync"}</button>}
        {error && <p role="status">{error}</p>}
      </div>
      <button className="pwa-dismiss" onClick={dismiss} aria-label="Dismiss installation suggestion"><X size={20} aria-hidden="true" /></button>
    </aside>
  );
}