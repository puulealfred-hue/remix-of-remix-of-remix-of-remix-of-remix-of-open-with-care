import { useEffect, useState } from "react";

import type { Slide } from "@/lib/admin-types";

type Props = {
  slides: Slide[];
  ready: boolean;
  /** Tailwind height classes for the banner box. */
  heightClass?: string;
  emptyText?: string;
};

/** Renders admin-published slides only — image only, no overlay or text. */
export function SlideCarousel({
  slides,
  ready,
  heightClass = "h-[240px]",
  emptyText = "No promotions published yet.",
}: Props) {
  const [i, setI] = useState(0);

  useEffect(() => {
    setI(0);
  }, [slides.length]);

  useEffect(() => {
    if (slides.length < 2) return;
    const t = setInterval(() => setI((p) => (p + 1) % slides.length), 6000);
    return () => clearInterval(t);
  }, [slides.length]);

  if (!ready) {
    return (
      <div
        className={`relative ${heightClass} animate-pulse overflow-hidden rounded-none sm:rounded-2xl bg-xb-panel-alt font-xb shadow-sm`}
      >
        <div className="flex h-full flex-col justify-center gap-3 px-14">
          <div className="h-8 w-2/5 rounded bg-xb-odds" />
          <div className="h-3 w-3/5 rounded bg-xb-odds" />
          <div className="h-9 w-32 rounded-full bg-xb-odds" />
        </div>
      </div>
    );
  }

  if (slides.length === 0) {
    return (
      <div
        className={`grid ${heightClass} place-items-center rounded-none sm:rounded-2xl bg-xb-panel-alt font-xb text-[12px] text-xb-text-muted shadow-sm`}
      >
        {emptyText}
      </div>
    );
  }

  const slide = slides[Math.min(i, slides.length - 1)]!;

  const image = slide.image ? (
    <img
      key={slide.image}
      src={slide.image}
      alt={slide.title || "Promotion"}
      className="block h-full w-full object-cover"
    />
  ) : null;

  return (
    <div className={`relative ${heightClass} overflow-hidden rounded-none sm:rounded-2xl bg-black font-xb shadow-sm`}>
      {slide.link ? (
        <a href={slide.link} className="block h-full w-full" aria-label={slide.title || "Promotion"}>
          {image}
        </a>
      ) : (
        image
      )}

      {slides.length > 1 && (
        <>
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5">
            {slides.map((s, idx) => (
              <button
                key={s.id}
                aria-label={`Go to ${s.title}`}
                onClick={() => setI(idx)}
                className={
                  idx === i
                    ? "h-1.5 w-5 rounded-full bg-xb-on-dark"
                    : "h-1.5 w-1.5 rounded-full bg-xb-on-dark/50 hover:bg-xb-on-dark/80"
                }
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
