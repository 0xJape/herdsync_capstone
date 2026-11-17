"use client";

import { ImagePlus, Pencil, X } from "lucide-react";
import { useEffect, useState, type ChangeEvent } from "react";
import ImageCropModal from "@/components/ui/image-crop-modal";

export const markingPresets = [
  { label: "Cream", value: "#f1eee5" },
  { label: "Natural brown", value: "#8b5e3c" },
  { label: "Black", value: "#202522" },
  { label: "White", value: "#fffaf0" },
  { label: "Red", value: "#a94a36" },
  { label: "Golden", value: "#c89442" },
];

type Props = {
  marking?: string;
  category?: string;
  photos?: string[];
  onPhotosChange?: (photos: string[]) => void | Promise<void>;
  onPhotoAdd?: (image: string) => Promise<void>;
  onEdit?: () => void;
};

export default function CattlePreview({ photos = [], onPhotosChange, onPhotoAdd, onEdit }: Props) {
  const [error, setError] = useState("");
  const [localPhotos, setLocalPhotos] = useState(photos);
  const [activePhoto, setActivePhoto] = useState(0);
  const [pending, setPending] = useState<string[]>([]);
  const [editingPhotos, setEditingPhotos] = useState(false);
  const currentPhotos = onPhotosChange || onPhotoAdd ? photos : localPhotos;

  useEffect(() => {
    if (currentPhotos.length < 2) return;
    const timer = window.setInterval(() => setActivePhoto((index) => (index + 1) % currentPhotos.length), 3500);
    return () => window.clearInterval(timer);
  }, [currentPhotos.length]);

  function addPhotos(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []);
    const oversized = selected.find((file) => file.size > 5 * 1024 * 1024);
    if (oversized) {
      setError(`${oversized.name} exceeds 5 MB.`);
      event.target.value = "";
      return;
    }
    setError("");
    const files = selected.slice(0, 3 - currentPhotos.length);
    if (!files.length) return;
    Promise.all(files.map((file) => new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    }))).then(setPending);
    event.target.value = "";
  }

  async function saveCrop(image: string) {
    if (onPhotoAdd) {
      try { await onPhotoAdd(image); setPending((photos) => photos.slice(1)); }
      catch (cause) { setError(cause instanceof Error ? cause.message : "Photo save failed"); }
      return;
    }
    const next = [...currentPhotos, image];
    if (onPhotosChange) onPhotosChange(next); else setLocalPhotos(next);
    setPending((photos) => photos.slice(1));
  }

  const shownPhoto = currentPhotos[activePhoto] ?? currentPhotos[0];
  return <div className="cattle-preview photo-preview" aria-label="Cattle photos">
    <div className="photo-preview-main">{shownPhoto ? <img key={shownPhoto} className="photo-slide" src={shownPhoto} alt={`Cattle photo ${activePhoto + 1}`}/> : <div className="cow-placeholder"><img src="/icons/calf_icon.png" alt=""/><small>No photo added</small></div>}</div>
    <span className="photo-count">{currentPhotos.length}/3 photos</span>
    {currentPhotos.length > 1 && <div className="photo-dots" aria-label="Choose cattle photo">{currentPhotos.map((photo, index) => <button type="button" className={index === activePhoto ? "active" : ""} key={`${photo.slice(-16)}-${index}`} aria-label={`Show photo ${index + 1}`} onClick={() => setActivePhoto(index)}/>)}</div>}
    {!onPhotosChange && currentPhotos.length < 3 && <label className="secondary-button photo-edit-button"><ImagePlus size={16}/> Add photo ({3 - currentPhotos.length} left)<input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={addPhotos}/></label>}
    {onPhotosChange && <div className="photo-preview-actions">
      {editingPhotos && currentPhotos.map((photo, index) => <div className="photo-thumb" key={`${photo.slice(-24)}-${index}`}><img src={photo} alt={`Cattle photo ${index + 1}`}/><button type="button" aria-label={`Remove photo ${index + 1}`} onClick={async () => { try { await onPhotosChange(currentPhotos.filter((_, i) => i !== index)); } catch (cause) { setError(cause instanceof Error ? cause.message : "Photo removal failed"); } }}><X size={13}/></button></div>)}
      {editingPhotos && currentPhotos.length < 3 && <label className="photo-add"><ImagePlus size={18}/><span>Add photo</span><small>Max 5 MB each</small><input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={addPhotos}/></label>}
      <button type="button" className="secondary-button photo-toggle-edit" aria-pressed={editingPhotos} onClick={() => setEditingPhotos((editing) => !editing)}>{!editingPhotos && <Pencil size={15}/>} {editingPhotos ? "Done" : "Edit photos"}</button>
    </div>}
    {error && <p className="cattle-error" role="alert">{error}</p>}
    {pending[0] && <ImageCropModal key={pending[0]} src={pending[0]} onCancel={() => setPending([])} onSave={saveCrop} description={`Frame this cattle photo before adding it.${pending.length > 1 ? ` ${pending.length} photos remaining.` : ""}`}/>} 
  </div>;
}
