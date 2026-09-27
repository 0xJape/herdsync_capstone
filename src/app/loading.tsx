import Image from "next/image";

export default function Loading() {
  return (
    <div className="herdsync-loading" role="status" aria-live="polite">
      <div className="herdsync-loading-mark" aria-hidden="true">
        <Image src="/icons/icon-192.png" alt="" width={80} height={80} unoptimized />
      </div>
      <strong>HerdSync</strong>
      <span>Preparing your farm workspace…</span>
      <div className="herdsync-loading-track" aria-hidden="true" />
    </div>
  );
}