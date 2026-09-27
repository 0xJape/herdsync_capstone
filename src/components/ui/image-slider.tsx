"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";

interface ImageSliderProps extends React.HTMLAttributes<HTMLDivElement> {
  images: string[];
  interval?: number;
}

export const ImageSlider = React.forwardRef<HTMLDivElement, ImageSliderProps>(
  ({ images, interval = 5000, className = "", ...props }, ref) => {
    const [currentIndex, setCurrentIndex] = React.useState(0);

    React.useEffect(() => {
      if (images.length < 2) return;
      const timer = setInterval(() => setCurrentIndex((index) => (index + 1) % images.length), interval);
      return () => clearInterval(timer);
    }, [images.length, interval]);

    if (!images.length) return null;

    return (
      <div ref={ref} className={`relative h-full w-full overflow-hidden bg-[#0c3c01] ${className}`} {...props}>
        <AnimatePresence initial={false}>
          <motion.img
            key={currentIndex}
            src={images[currentIndex]}
            alt={`Farm view ${currentIndex + 1}`}
            initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.7 }} className="absolute inset-0 h-full w-full object-cover"
          />
        </AnimatePresence>
        <div className="absolute inset-x-0 bottom-6 flex justify-center gap-2">
          {images.map((_, index) => <button key={index} type="button" onClick={() => setCurrentIndex(index)} aria-label={`Show farm view ${index + 1}`} className={`size-2 rounded-full ${currentIndex === index ? "bg-white" : "bg-white/50"}`} />)}
        </div>
      </div>
    );
  },
);

ImageSlider.displayName = "ImageSlider";
