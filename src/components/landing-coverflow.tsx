import { useCallback, useEffect, useRef, useState } from "react";
import type { FocusEvent, KeyboardEvent, PointerEvent, TouchEvent } from "react";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";

type JourneySlide = {
  step: string;
  title: string;
  description: string;
  image: string;
  alt: string;
};

const journeySlides: JourneySlide[] = [
  {
    step: "01 · Access",
    title: "Browse from home",
    description: "Registration is public. Listings open once you become a Verified Member.",
    image: "/landing/journey-1-browse-from-home.png",
    alt: "Illustration of a woman at her desk at home, smiling at her phone, with Bandung rooftops and hills through the window.",
  },
  {
    step: "02 · Nearby",
    title: "Find what's close",
    description: "Portable secondhand goods, shown only as Under 1 km or 1–2 km away.",
    image: "/landing/journey-2-find-nearby.png",
    alt: "Illustration of the same woman walking a hillside neighbourhood street with her phone, as nearby books, a desk lamp, and a tote bag appear beside her.",
  },
  {
    step: "03 · Handover",
    title: "Hand it over in person",
    description: "Meet at an outdoor Handover Point the seller chooses near home—no delivery.",
    image: "/landing/journey-3-in-person-handover.png",
    alt: "Illustration of two women at an outdoor café table handing over a stack of books and a tote bag.",
  },
  {
    step: "04 · Privacy",
    title: "Home stays private",
    description: "Arrange a nearby handover without publicly exposing the seller's home address.",
    image: "/landing/journey-4-home-stays-private.png",
    alt: "Illustration of a phone showing a book listing and a map with a café handover pin, while the house icon stays locked.",
  },
];

const AUTOPLAY_DELAY = 5000;
const SWIPE_THRESHOLD = 45;

type SlidePosition = "center" | "next" | "prev" | "hidden";

function slidePosition(index: number, current: number, total: number): SlidePosition {
  const offset = (index - current + total) % total;
  if (offset === 0) return "center";
  if (offset === 1) return "next";
  if (offset === total - 1) return "prev";
  return "hidden";
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function LandingCoverflow() {
  const total = journeySlides.length;
  const [current, setCurrent] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(prefersReducedMotion);
  const [playing, setPlaying] = useState(() => !prefersReducedMotion());
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pageHidden, setPageHidden] = useState(() => document.hidden);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const autoplayRunning =
    playing && !reducedMotion && !hovered && !focused && !pageHidden && total > 1;

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      setReducedMotion(query.matches);
      if (query.matches) setPlaying(false);
    };
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const update = () => setPageHidden(document.hidden);
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);

  useEffect(() => {
    if (!autoplayRunning) return;
    const timer = window.setTimeout(() => setCurrent((index) => (index + 1) % total), AUTOPLAY_DELAY);
    return () => window.clearTimeout(timer);
  }, [autoplayRunning, current, total]);

  const goTo = useCallback(
    (index: number) => {
      setPlaying(false);
      setCurrent(((index % total) + total) % total);
    },
    [total],
  );

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      goTo(current - 1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      goTo(current + 1);
    }
  }

  // Focus on the play/pause control itself must not pause, or "Play" could never take effect.
  function handleFocus(event: FocusEvent<HTMLElement>) {
    setFocused(event.target !== toggleRef.current);
  }

  function handleBlur(event: FocusEvent<HTMLElement>) {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false);
  }

  function handlePointerEnter(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse") setHovered(true);
  }

  function handleTouchStart(event: TouchEvent<HTMLDivElement>) {
    const touch = event.touches[0];
    touchStart.current = { x: touch.clientX, y: touch.clientY };
  }

  function handleTouchEnd(event: TouchEvent<HTMLDivElement>) {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start) return;
    const touch = event.changedTouches[0];
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dx) < Math.abs(dy)) return;
    goTo(dx < 0 ? current + 1 : current - 1);
  }

  return (
    <section
      aria-labelledby="coverflow-title"
      aria-roledescription="carousel"
      className="coverflow"
      onBlur={handleBlur}
      onFocus={handleFocus}
      onKeyDown={handleKeyDown}
    >
      <h2 className="coverflow-title" id="coverflow-title">
        How a nearby handover works
      </h2>

      <div
        aria-live={playing && !reducedMotion ? "off" : "polite"}
        className="coverflow-stage"
        onPointerEnter={handlePointerEnter}
        onPointerLeave={() => setHovered(false)}
        onTouchEnd={handleTouchEnd}
        onTouchStart={handleTouchStart}
      >
        {journeySlides.map((slide, index) => {
          const position = slidePosition(index, current, total);
          const isCenter = position === "center";
          return (
            <div
              aria-hidden={!isCenter}
              aria-label={`${index + 1} of ${total}`}
              aria-roledescription="slide"
              className="coverflow-card"
              data-position={position}
              key={slide.image}
              onClick={isCenter ? undefined : () => goTo(index)}
              role="group"
            >
              <img
                alt={slide.alt}
                className="coverflow-image"
                decoding="async"
                height={512}
                src={slide.image}
                width={338}
              />
              <div className="coverflow-caption">
                <p className="coverflow-step">{slide.step}</p>
                <h3>{slide.title}</h3>
                <span aria-hidden="true" className="coverflow-rule" />
                <p>{slide.description}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="coverflow-controls">
        <button
          aria-label="Previous step"
          className="coverflow-arrow coverflow-arrow-prev"
          onClick={() => goTo(current - 1)}
          type="button"
        >
          <ChevronLeft aria-hidden="true" />
        </button>
        <div aria-label="Choose a step" className="coverflow-dots" role="group">
          {journeySlides.map((slide, index) => (
            <button
              aria-current={index === current ? "true" : undefined}
              aria-label={`Show step ${index + 1} of ${total}: ${slide.title}`}
              className="coverflow-dot"
              key={slide.image}
              onClick={() => goTo(index)}
              type="button"
            >
              <span aria-hidden="true" />
            </button>
          ))}
        </div>
        <button
          aria-label="Next step"
          className="coverflow-arrow coverflow-arrow-next"
          onClick={() => goTo(current + 1)}
          type="button"
        >
          <ChevronRight aria-hidden="true" />
        </button>
        {!reducedMotion && (
          <button
            className="coverflow-toggle"
            onClick={() => setPlaying((value) => !value)}
            ref={toggleRef}
            type="button"
          >
            {playing ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
            <span>{playing ? "Pause slideshow" : "Play slideshow"}</span>
          </button>
        )}
      </div>
    </section>
  );
}
