"use client";

import { CheckCircle2, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

export default function SuccessModal({ message, onClose }: { message: string; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return createPortal(
    <div className="cattle-modal-backdrop success-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="success-modal" role="dialog" aria-modal="true" aria-labelledby="success-modal-title" aria-describedby="success-modal-message">
        <button ref={closeRef} type="button" className="icon-button success-modal-close" aria-label="Close confirmation" onClick={onClose}><X size={17}/></button>
        <div className="success-modal-icon" aria-hidden="true"><CheckCircle2 size={30}/></div>
        <span>Completed</span>
        <h2 id="success-modal-title">Success</h2>
        <p id="success-modal-message">{message}</p>
        <button type="button" className="primary-button" onClick={onClose}>Done</button>
      </section>
    </div>,
    document.body,
  );
}
