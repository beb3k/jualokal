import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent, PointerEvent, ReactNode } from "react";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";

const ASSET_DIR = "/landing/principles";
const COVER_SIZE = 2048;

type Scene = {
  src: string;
  width: number;
  height: number;
  alt: string;
  stripPosition: string;
};

const scenes = {
  browsing: {
    src: `${ASSET_DIR}/3-considered-browsing.webp`,
    width: 1250,
    height: 1350,
    alt: "Illustration of a woman at a café table smiling at her phone, a book and a cup of coffee beside her.",
    stripPosition: "55% 35%",
  },
  walk: {
    src: `${ASSET_DIR}/4-short-walk.webp`,
    width: 1100,
    height: 1500,
    alt: "Illustration of the same woman walking along a leafy neighbourhood street with a tote bag on her shoulder.",
    stripPosition: "40% 40%",
  },
  finds: {
    src: `${ASSET_DIR}/5-portable-finds.webp`,
    width: 1050,
    height: 1350,
    alt: "Still life of two secondhand books, a compact camera, and a folded green tote bag on a wooden table.",
    stripPosition: "50% 50%",
  },
  cafe: {
    src: `${ASSET_DIR}/6-nearby-cafe.webp`,
    width: 950,
    height: 1250,
    alt: "Illustration of an empty table and two rattan chairs on a public café terrace, with a coffee and a book on the table.",
    stripPosition: "50% 55%",
  },
  street: {
    src: `${ASSET_DIR}/7-nearby-street.webp`,
    width: 1000,
    height: 1360,
    alt: "Illustration of a leafy local street lined with low houses and a small café, with people walking in the distance.",
    stripPosition: "50% 50%",
  },
  boundary: {
    src: `${ASSET_DIR}/8-home-boundary.webp`,
    width: 960,
    height: 1600,
    alt: "Illustration of a closed green residential gate between cream walls, screened by foliage.",
    stripPosition: "50% 58%",
  },
  meetup: {
    src: `${ASSET_DIR}/9-public-meetup.webp`,
    width: 1080,
    height: 1440,
    alt: "Illustration of the woman handing a book to a man across a table at a public café.",
    stripPosition: "50% 45%",
  },
} satisfies Record<string, Scene>;

type SceneId = keyof typeof scenes;

const stripScenes: SceneId[] = ["walk", "finds", "cafe", "street", "meetup", "boundary", "browsing"];
// Roughly one card every 2.05 s, matching the reference band.
const STRIP_LOOP_SECONDS = stripScenes.length * 2.05;

type Principle = {
  id: "access" | "nearby" | "private";
  number: string;
  lines: [string, string];
  copy: string;
  pieces: SceneId[];
};

const principles: Principle[] = [
  {
    id: "access",
    number: "01",
    lines: ["Accountable", "access"],
    copy: "Registration begins publicly. Marketplace details wait behind verification.",
    pieces: ["browsing"],
  },
  {
    id: "nearby",
    number: "02",
    lines: ["Neighbourhood", "scale"],
    copy: "Portable goods move through short, in-person handovers—not delivery.",
    pieces: ["street", "walk", "finds", "cafe"],
  },
  {
    id: "private",
    number: "03",
    lines: ["Location stays", "protected"],
    copy: "People can meet nearby without publishing where a seller lives.",
    pieces: ["boundary", "meetup", "cafe"],
  },
];

const slideLabels = ["Cover", ...principles.map((principle) => principle.lines.join(" ")), "Fictional demo"];

const SWIPE_LOCK = 6;
const EDGE_RESISTANCE = 0.28;
const WHEEL_STEP = 40;

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function trackTransform(index: number, dragOffset = 0) {
  return `translate3d(calc(${-index * 100}% + ${dragOffset}px), 0, 0)`;
}

function MaskedLine({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={className ? `mp-line ${className}` : "mp-line"}>
      <span>{children}</span>
    </span>
  );
}

function CollagePiece({
  scene,
  slot,
  order,
  children,
}: {
  scene: SceneId;
  slot: string;
  order: number;
  children?: ReactNode;
}) {
  const { src, width, height, alt } = scenes[scene];
  return (
    <div
      className="mp-piece"
      data-piece={slot}
      style={{ "--k": order, aspectRatio: `${width} / ${height}` } as CSSProperties}
    >
      {children}
      <img
        alt={alt}
        className="mp-piece-img"
        decoding="async"
        draggable={false}
        height={height}
        loading="lazy"
        src={src}
        width={width}
      />
    </div>
  );
}

function PrincipleSlide({ principle }: { principle: Principle }) {
  return (
    <div className="mp-principle" data-principle={principle.id}>
      <p className="mp-principle-copy">{principle.copy}</p>
      <div className="mp-collage">
        {principle.id === "nearby" && (
          <svg aria-hidden="true" className="mp-route" preserveAspectRatio="none" viewBox="0 0 120 100">
            <path d="M4 86C30 98 52 64 60 52S96 18 114 10" />
            <circle cx="114" cy="10" r="3.2" />
          </svg>
        )}
        {principle.id === "private" && <span aria-hidden="true" className="mp-divide" />}
        {principle.pieces.map((scene, order) => (
          <CollagePiece key={scene} order={order} scene={scene} slot={`${principle.id}-${scene}`}>
            {principle.id === "access" && <span aria-hidden="true" className="mp-arch" />}
            {principle.id === "private" && scene === "boundary" && (
              <span aria-hidden="true" className="mp-ring" />
            )}
          </CollagePiece>
        ))}
      </div>
      <div className="mp-principle-title">
        <p className="mp-num">{principle.number}</p>
        <h3>
          <MaskedLine>{principle.lines[0]}</MaskedLine> <MaskedLine>{principle.lines[1]}</MaskedLine>
        </h3>
      </div>
    </div>
  );
}

export function MarketplacePrinciples({ onOpenDemo }: { onOpenDemo: () => void }) {
  const total = slideLabels.length;
  const last = total - 1;
  const [current, setCurrent] = useState(0);
  const [entered, setEntered] = useState(false);
  const [inView, setInView] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(prefersReducedMotion);
  const [motionPaused, setMotionPaused] = useState(false);
  const [pageHidden, setPageHidden] = useState(() => document.hidden);
  const [cutoutReady, setCutoutReady] = useState(false);
  const [dragging, setDragging] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const bandRowRef = useRef<HTMLDivElement>(null);
  const cutoutRef = useRef<HTMLImageElement>(null);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const focusedSlide = useRef<number | null>(null);
  const bandHovered = useRef(false);
  const strip = useRef({ offset: 0, speed: 1 });
  const drag = useRef<{
    id: number;
    x: number;
    y: number;
    time: number;
    axis: "x" | "y" | null;
    offset: number;
  } | null>(null);

  const stripRunning =
    cutoutReady && inView && current === 0 && !reducedMotion && !motionPaused && !pageHidden;

  const go = useCallback(
    (index: number) => {
      setEntered(true);
      setCurrent(Math.min(last, Math.max(0, index)));
    },
    [last],
  );

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const update = () => setPageHidden(document.hidden);
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    // Entrance motion starts once the carousel is meaningfully visible, even when zoom makes it taller than the screen.
    const observer = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting);
        const visibleHeight = entry.intersectionRect.height;
        if (entry.intersectionRatio >= 0.3 || visibleHeight >= window.innerHeight * 0.5) {
          setEntered(true);
        }
      },
      { threshold: [0, 0.1, 0.2, 0.3] },
    );
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const cutout = cutoutRef.current;
    if (cutout?.complete && cutout.naturalWidth > 0) setCutoutReady(true);
  }, []);

  useEffect(() => {
    const row = bandRowRef.current;
    if (!row || !stripRunning) return;
    let frame = 0;
    let previous = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - previous) / 1000);
      previous = now;
      const state = strip.current;
      state.speed += ((bandHovered.current ? 0.22 : 1) - state.speed) * Math.min(1, dt * 3);
      state.offset = (state.offset + (dt / STRIP_LOOP_SECONDS) * state.speed) % 1;
      // The row holds the card set twice, so half its width is one seamless loop.
      row.style.transform = `translate3d(${-state.offset * 50}%, 0, 0)`;
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [stripRunning]);

  // Only horizontal-dominant wheel gestures belong to the carousel; vertical scrolling stays with the page.
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    let accumulated = 0;
    let locked = false;
    let settle = 0;
    const onWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
      event.preventDefault();
      window.clearTimeout(settle);
      settle = window.setTimeout(() => {
        accumulated = 0;
        locked = false;
      }, 220);
      if (locked) return;
      accumulated += event.deltaX;
      if (Math.abs(accumulated) < WHEEL_STEP) return;
      locked = true;
      const step = accumulated > 0 ? 1 : -1;
      setEntered(true);
      setCurrent((index) => Math.min(last, Math.max(0, index + step)));
    };
    viewport.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      viewport.removeEventListener("wheel", onWheel);
      window.clearTimeout(settle);
    };
  }, [last]);

  // A slide that leaves the view becomes inert; rescue focus that would otherwise drop to <body>.
  useLayoutEffect(() => {
    const slide = focusedSlide.current;
    if (slide === null || slide === current) return;
    const focused = document.activeElement;
    if (focused === document.body || slideRefs.current[slide]?.contains(focused)) {
      viewportRef.current?.focus({ preventScroll: true });
    }
    focusedSlide.current = null;
  }, [current]);

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const targets: Record<string, number> = {
      ArrowLeft: current - 1,
      ArrowRight: current + 1,
      Home: 0,
      End: last,
    };
    if (!(event.key in targets)) return;
    event.preventDefault();
    go(targets[event.key]);
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!event.isPrimary || (event.pointerType === "mouse" && event.button !== 0)) return;
    if ((event.target as Element).closest("a, button")) return;
    drag.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      time: event.timeStamp,
      axis: null,
      offset: 0,
    };
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const gesture = drag.current;
    const track = trackRef.current;
    if (!gesture || gesture.id !== event.pointerId || !track) return;
    const dx = event.clientX - gesture.x;
    const dy = event.clientY - gesture.y;
    if (!gesture.axis) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_LOCK) return;
      if (Math.abs(dy) >= Math.abs(dx)) {
        drag.current = null;
        return;
      }
      gesture.axis = "x";
      event.currentTarget.setPointerCapture(event.pointerId);
      setDragging(true);
    }
    const pastEdge = (current === 0 && dx > 0) || (current === last && dx < 0);
    gesture.offset = pastEdge ? dx * EDGE_RESISTANCE : dx;
    track.style.transform = trackTransform(current, gesture.offset);
  }

  function finishDrag(event: PointerEvent<HTMLDivElement>, cancelled: boolean) {
    const gesture = drag.current;
    if (!gesture || gesture.id !== event.pointerId) return;
    drag.current = null;
    if (gesture.axis !== "x") return;
    setDragging(false);
    const width = viewportRef.current?.offsetWidth ?? 1;
    const velocity = Math.abs(gesture.offset) / Math.max(1, event.timeStamp - gesture.time);
    const travelled = Math.abs(gesture.offset);
    let next = current;
    if (!cancelled && (travelled > width * 0.18 || (travelled > 30 && velocity > 0.45))) {
      next = Math.min(last, Math.max(0, current + (gesture.offset < 0 ? 1 : -1)));
    }
    if (trackRef.current) trackRef.current.style.transform = trackTransform(next);
    go(next);
  }

  return (
    <section
      aria-labelledby="principles-title"
      aria-roledescription="carousel"
      className="mp"
      onKeyDown={handleKeyDown}
    >
      <div className="mp-frame">
        <div
          aria-label="Slides"
          className="mp-viewport"
          data-dragging={dragging ? "true" : undefined}
          onPointerCancel={(event) => finishDrag(event, true)}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={(event) => finishDrag(event, false)}
          ref={viewportRef}
          role="group"
          tabIndex={0}
        >
          <div className="mp-track" ref={trackRef} style={{ transform: trackTransform(current) }}>
            {slideLabels.map((label, index) => {
              const kind =
                index === 0 ? "cover" : index === last ? "demo" : principles[index - 1].id;
              return (
                <div
                  aria-label={`Slide ${index + 1} of ${total}: ${label}`}
                  aria-roledescription="slide"
                  className={`mp-slide mp-slide-${kind}`}
                  data-current={entered && index === current ? "true" : undefined}
                  inert={index !== current}
                  key={label}
                  onBlur={(event) => {
                    if (event.relatedTarget) focusedSlide.current = null;
                  }}
                  onFocus={() => {
                    focusedSlide.current = index;
                  }}
                  ref={(node) => {
                    slideRefs.current[index] = node;
                  }}
                  role="group"
                >
                  {kind === "cover" && (
                    <>
                      <p className="eyebrow mp-cover-kicker">A more deliberate marketplace</p>
                      <h2 className="mp-cover-title" id="principles-title">
                        <MaskedLine className="mp-cover-local">Local</MaskedLine>{" "}
                        <MaskedLine className="mp-cover-exchange">exchange</MaskedLine>{" "}
                        <MaskedLine className="mp-cover-rest">without public exposure.</MaskedLine>
                      </h2>
                      <img
                        alt="Illustration of a smiling woman in a green overshirt sitting cross-legged on a cream plinth, pointing down."
                        className="mp-cover-layer mp-cover-master"
                        decoding="async"
                        draggable={false}
                        height={COVER_SIZE}
                        loading="lazy"
                        src={`${ASSET_DIR}/1-master-cover.webp`}
                        width={COVER_SIZE}
                      />
                      <div
                        aria-hidden="true"
                        className="mp-band"
                        data-ready={cutoutReady ? "true" : undefined}
                        onPointerEnter={(event) => {
                          if (event.pointerType === "mouse") bandHovered.current = true;
                        }}
                        onPointerLeave={() => {
                          bandHovered.current = false;
                        }}
                      >
                        <div className="mp-band-row" ref={bandRowRef}>
                          {[...stripScenes, ...stripScenes].map((scene, card) => (
                            <img
                              alt=""
                              className="mp-band-card"
                              decoding="async"
                              draggable={false}
                              height={scenes[scene].height}
                              key={`${scene}-${card}`}
                              loading="lazy"
                              src={scenes[scene].src}
                              style={{ objectPosition: scenes[scene].stripPosition }}
                              width={scenes[scene].width}
                            />
                          ))}
                        </div>
                      </div>
                      <img
                        alt=""
                        aria-hidden="true"
                        className="mp-cover-layer mp-cover-cutout"
                        decoding="async"
                        draggable={false}
                        height={COVER_SIZE}
                        loading="lazy"
                        onLoad={() => setCutoutReady(true)}
                        ref={cutoutRef}
                        src={`${ASSET_DIR}/2-master-cover-cutout.webp`}
                        width={COVER_SIZE}
                      />
                      <p className="mp-cover-note">Three principles, then a fictional demo.</p>
                      <svg aria-hidden="true" className="mp-cover-arrow" viewBox="0 0 100 40">
                        <path d="M0 20H96M78 4l18 16-18 16" />
                      </svg>
                    </>
                  )}

                  {kind === "demo" && (
                    <>
                      <div>
                        <p className="eyebrow">Safe to explore</p>
                        <h3 className="mp-demo-title">
                          See the marketplace without sharing anything private.
                        </h3>
                      </div>
                      <p className="mp-demo-note">
                        Demo Mode uses isolated fictional accounts, listings, locations, and
                        transaction history. Nothing shown is real marketplace activity.
                      </p>
                      <div className="mp-demo-actions">
                        <span className="mp-demo-cta">
                          <button className="button button-light" onClick={onOpenDemo} type="button">
                            Open the fictional demo
                            <span aria-hidden="true">→</span>
                          </button>
                          <svg
                            aria-hidden="true"
                            className="mp-demo-loop"
                            preserveAspectRatio="none"
                            viewBox="0 0 200 80"
                          >
                            <path
                              d="M150 14C112 2 34 6 12 30c-18 20 22 38 82 38 62 0 104-12 102-32C194 16 140 8 96 10 58 12 28 20 22 28"
                              pathLength={1}
                            />
                          </svg>
                        </span>
                        <span aria-hidden="true" className="mp-demo-brand">
                          jualokal.
                        </span>
                      </div>
                    </>
                  )}

                  {kind !== "cover" && kind !== "demo" && (
                    <PrincipleSlide principle={principles[index - 1]} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="mp-controls">
          <p aria-hidden="true" className="mp-counter">
            <span className="mp-counter-index">{pad(current + 1)}</span>
            <span className="mp-counter-total">/{pad(total)}</span>
            <span className="mp-counter-label">{slideLabels[current]}</span>
          </p>
          <div aria-label="Choose a slide" className="mp-dots" role="group">
            {slideLabels.map((label, index) => (
              <button
                aria-current={index === current ? "true" : undefined}
                aria-label={`Show slide ${index + 1} of ${total}: ${label}`}
                className="mp-dot"
                key={label}
                onClick={() => go(index)}
                type="button"
              >
                <span aria-hidden="true" />
              </button>
            ))}
          </div>
          <div className="mp-buttons">
            {!reducedMotion && (
              <button
                className="mp-motion"
                onClick={() => setMotionPaused((paused) => !paused)}
                type="button"
              >
                {motionPaused ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}
                <span>{motionPaused ? "Play motion" : "Pause motion"}</span>
              </button>
            )}
            <button
              aria-disabled={current === 0}
              aria-label="Previous slide"
              className="mp-arrow"
              onClick={() => go(current - 1)}
              type="button"
            >
              <ChevronLeft aria-hidden="true" />
            </button>
            <button
              aria-disabled={current === last}
              aria-label="Next slide"
              className="mp-arrow"
              onClick={() => go(current + 1)}
              type="button"
            >
              <ChevronRight aria-hidden="true" />
            </button>
          </div>
        </div>
        <p aria-atomic="true" aria-live="polite" className="visually-hidden">
          {`Slide ${current + 1} of ${total}: ${slideLabels[current]}`}
        </p>
      </div>
    </section>
  );
}
