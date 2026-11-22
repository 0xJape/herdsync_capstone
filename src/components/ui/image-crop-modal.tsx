"use client";

import { ImageIcon, RotateCcw, X } from "lucide-react";
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { createPortal } from "react-dom";

type Crop = { zoom: number; x: number; y: number };

type Props = {
  src: string;
  onCancel: () => void;
  onSave: (image: string) => void;
  title?: string;
  description?: string;
  outputWidth?: number;
  outputHeight?: number;
  circular?: boolean;
};

const initialCrop: Crop = { zoom: 1, x: 50, y: 50 };

export default function ImageCropModal({ src, onCancel, onSave, title = "Adjust photo", description = "Choose how the photo will appear.", outputWidth = 1200, outputHeight = 675, circular = false }: Props) {
  const [crop, setCrop] = useState(initialCrop);
  const [saving, setSaving] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const dragRef = useRef<{ pointerId: number; x: number; y: number } | null>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => event.key === "Escape" && onCancel();
    document.addEventListener("keydown", closeOnEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.body.style.overflow = "";
    };
  }, [onCancel]);

  function save() {
    setSaving(true);
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = outputWidth;
      canvas.height = outputHeight;
      const context = canvas.getContext("2d");
      if (!context) { setSaving(false); return; }
      if (circular) {
        context.beginPath();
        context.arc(outputWidth / 2, outputHeight / 2, Math.min(outputWidth, outputHeight) / 2, 0, Math.PI * 2);
        context.clip();
      }
      const scale = Math.max(outputWidth / image.width, outputHeight / image.height) * crop.zoom;
      const width = image.width * scale;
      const height = image.height * scale;
      context.drawImage(image, -(width - outputWidth) * crop.x / 100, -(height - outputHeight) * crop.y / 100, width, height);
      onSave(canvas.toDataURL(circular ? "image/png" : "image/jpeg", .88));
    };
    image.onerror = () => setSaving(false);
    image.src = src;
  }

  function startDrag(event: ReactPointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
  }

  function drag(event: ReactPointerEvent<HTMLDivElement>) {
    const previous = dragRef.current;
    if (!previous || previous.pointerId !== event.pointerId) return;
    const { width, height } = event.currentTarget.getBoundingClientRect();
    setCrop((value) => ({
      ...value,
      x: Math.max(0, Math.min(100, value.x - (event.clientX - previous.x) / width * 100)),
      y: Math.max(0, Math.min(100, value.y - (event.clientY - previous.y) / height * 100)),
    }));
    dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
  }

  function stopDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
  }

  return createPortal(
    <div className="image-crop-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onCancel()}>
      <section className="image-crop-modal" role="dialog" aria-modal="true" aria-labelledby="image-crop-title" aria-describedby="image-crop-description">
        <header className="image-crop-header">
          <div className="image-crop-heading"><span aria-hidden="true"><ImageIcon size={20}/></span><div><h2 id="image-crop-title">{title}</h2><p id="image-crop-description">{description}</p></div></div>
          <button ref={closeRef} type="button" className="icon-button" aria-label="Close photo editor" onClick={onCancel}><X size={19}/></button>
        </header>
        <div className={`image-crop-stage${circular ? " is-circular" : ""}`} style={{ aspectRatio: `${outputWidth} / ${outputHeight}` }} onPointerDown={startDrag} onPointerMove={drag} onPointerUp={stopDrag} onPointerCancel={stopDrag}>
          <img src={src} alt="Crop preview" draggable="false" style={{ transform: `scale(${crop.zoom})`, transformOrigin: `${crop.x}% ${crop.y}%`, objectPosition: `${crop.x}% ${crop.y}%` }}/>
          <span>Final crop</span><div className="image-crop-guide" aria-hidden="true"/><p><span aria-hidden="true">✥</span> Drag photo to reposition</p>
        </div>
        <div className="image-crop-controls">
          <label><span>Zoom <output>{crop.zoom.toFixed(1)}×</output></span><input type="range" min=".5" max="3" step=".05" value={crop.zoom} onChange={(event) => setCrop((value) => ({ ...value, zoom: Number(event.target.value) }))}/></label>
        </div>
        <footer className="image-crop-actions"><button type="button" className="text-button" onClick={() => setCrop(initialCrop)}><RotateCcw size={15}/> Reset</button><div><button type="button" className="secondary-button" onClick={onCancel}>Cancel</button><button type="button" className="primary-button" disabled={saving} onClick={save}>{saving ? "Saving…" : "Use photo"}</button></div></footer>
      </section>
    </div>,
    document.body,
  );
}
