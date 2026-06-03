"use client";

import { useState } from "react";

// Hero + thumbnail grid with a click-to-zoom lightbox. Reserved aspect ratios
// prevent layout shift on load (spec §10).
export function PropertyGallery({ photos, title }: { photos: string[]; title: string }) {
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState(false);
  const has = photos.length > 0;
  const hero = has ? photos[active] : null;

  return (
    <div>
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => has && setZoom(true)}
          className="col-span-3 sm:col-span-2 aspect-[4/3] rounded-lg overflow-hidden bg-surface-2 relative group"
        >
          {hero ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={hero} alt={title} className="w-full h-full object-cover transition-transform group-hover:scale-[1.02]" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-ink-faint text-sm">No photos</div>
          )}
        </button>
        <div className="hidden sm:grid grid-rows-2 gap-2">
          {[1, 2].map((i) => {
            const p = photos[i];
            return (
              <button
                key={i}
                type="button"
                onClick={() => p && setActive(i)}
                className="aspect-[4/3] rounded-md overflow-hidden bg-surface-2 relative"
              >
                {p ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full" />
                )}
                {i === 2 && photos.length > 3 && p && (
                  <div className="absolute inset-0 bg-ink/50 text-white text-sm font-medium flex items-center justify-center">
                    +{photos.length - 3} more
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {photos.length > 1 && (
        <div className="flex gap-2 mt-2 overflow-x-auto pb-1">
          {photos.map((p, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActive(i)}
              className={`h-14 w-20 shrink-0 rounded-md overflow-hidden border ${i === active ? "border-accent" : "border-line"}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {zoom && hero && (
        <div className="fixed inset-0 z-50 bg-ink/90 flex items-center justify-center p-6" onClick={() => setZoom(false)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={hero} alt={title} className="max-h-full max-w-full rounded-lg object-contain" />
          <button className="absolute top-5 right-6 text-white text-3xl leading-none">×</button>
        </div>
      )}
    </div>
  );
}
