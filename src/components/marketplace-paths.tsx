import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";

type PathStage = {
  id: "buy" | "sell";
  control: string;
  label: string;
  title: string;
  description: string;
  cta: { label: string; href: string; variant: "button-primary" | "button-outline" };
  image: string;
  alt: string;
  imagePosition: string;
  mediaSide: "left" | "right";
};

const pathStages: PathStage[] = [
  {
    id: "buy",
    control: "Buy",
    label: "Buyer · included with membership",
    title: "Buy nearby",
    description:
      "Discover portable secondhand goods, inspect the full listing, and complete a protected in-person handover.",
    cta: { label: "Join Jualokal to buy", href: "/register", variant: "button-primary" },
    image: "/landing/path-1-buy-nearby.png",
    alt: "Illustration of a woman in a forest-green overshirt smiling as she leafs through a secondhand book at a Bandung café table, more books stacked beside her coffee.",
    imagePosition: "40% 52%",
    mediaSide: "left",
  },
  {
    id: "sell",
    control: "Sell",
    label: "Seller · activated separately",
    title: "Sell nearby",
    description:
      "Join as a member first, then activate selling while keeping your exact Home Anchor private.",
    cta: { label: "Join Jualokal to sell", href: "/register", variant: "button-outline" },
    image: "/landing/path-2-sell-nearby.png",
    alt: "Illustration of the same woman showing a secondhand camera to a man across a café table, with Bandung's hills behind them.",
    imagePosition: "62% 45%",
    mediaSide: "right",
  },
];

// em-based so the split layout also gives way when the reader enlarges the default font size.
const PINNED_QUERY =
  "(min-width: 64em) and (min-height: 40em) and (prefers-reduced-motion: no-preference)";

type StageState = "before" | "active" | "after";

function stageState(index: number, active: number): StageState {
  if (index === active) return "active";
  return index < active ? "before" : "after";
}

export function MarketplacePaths() {
  const total = pathStages.length;
  const [pinned, setPinned] = useState(() => window.matchMedia(PINNED_QUERY).matches);
  const [active, setActive] = useState(0);
  const [ready, setReady] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const stageRefs = useRef<(HTMLElement | null)[]>([]);
  const controlRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const focusedStage = useRef<number | null>(null);

  useEffect(() => {
    const query = window.matchMedia(PINNED_QUERY);
    const update = () => setPinned(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useLayoutEffect(() => {
    const track = trackRef.current;
    const sticky = stickyRef.current;
    if (!pinned || !track || !sticky) return;

    let frame = 0;
    const measure = () => {
      frame = 0;
      const range = track.offsetHeight - sticky.offsetHeight;
      const progress = range > 0 ? -track.getBoundingClientRect().top / range : 0;
      setActive(Math.min(total - 1, Math.max(0, Math.floor(progress * total))));
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(measure);
    };

    measure();
    // Transitions stay off until the restored scroll position has been applied once.
    const readyFrame = window.requestAnimationFrame(() => setReady(true));
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.cancelAnimationFrame(frame);
      window.cancelAnimationFrame(readyFrame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      setReady(false);
    };
  }, [pinned, total]);

  // A stage that leaves the view becomes inert; rescue focus that would otherwise drop to <body>.
  useLayoutEffect(() => {
    const stage = focusedStage.current;
    if (stage === null || stage === active) return;
    const focused = document.activeElement;
    if (focused === document.body || stageRefs.current[stage]?.contains(focused)) {
      controlRefs.current[active]?.focus({ preventScroll: true });
    }
    focusedStage.current = null;
  }, [active]);

  function goTo(index: number) {
    const track = trackRef.current;
    const sticky = stickyRef.current;
    if (!track || !sticky) return;
    const range = track.offsetHeight - sticky.offsetHeight;
    const trackTop = track.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: trackTop + (range * (index + 0.5)) / total });
  }

  return (
    <section
      aria-label="Marketplace paths"
      className="marketplace-paths"
      data-mode={pinned ? "pinned" : "flow"}
      data-ready={pinned && ready ? "true" : undefined}
    >
      <div className="paths-track" ref={trackRef} style={{ "--path-count": total } as CSSProperties}>
        <div className="paths-sticky" ref={stickyRef}>
          <header className="paths-heading">
            <div>
              <p className="eyebrow">Choose your path</p>
              <h2 id="marketplace-paths-title">One local marketplace. Two clear ways in.</h2>
            </div>
            <div className="paths-heading-aside">
              <p>
                Every participant begins with accountable membership. Selling becomes available
                through a separate Seller Activation step.
              </p>
              {pinned && (
                <div aria-label="Marketplace path stages" className="paths-controls" role="group">
                  {pathStages.map((stage, index) => (
                    <button
                      aria-current={index === active ? "step" : undefined}
                      className="paths-control"
                      key={stage.id}
                      onClick={() => goTo(index)}
                      ref={(node) => {
                        controlRefs.current[index] = node;
                      }}
                      type="button"
                    >
                      <span aria-hidden="true" className="paths-control-step">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      {stage.control}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </header>

          <div className="paths-stages">
            {pathStages.map((stage, index) => {
              const hidden = pinned && index !== active;
              const copySide = stage.mediaSide === "left" ? "right" : "left";
              return (
                <article
                  aria-labelledby={`path-${stage.id}-title`}
                  className={`path-stage path-stage-${stage.id}`}
                  data-media-side={stage.mediaSide}
                  data-state={pinned ? stageState(index, active) : undefined}
                  inert={hidden}
                  key={stage.id}
                  onBlur={(event) => {
                    if (event.relatedTarget) focusedStage.current = null;
                  }}
                  onFocus={() => {
                    focusedStage.current = index;
                  }}
                  ref={(node) => {
                    stageRefs.current[index] = node;
                  }}
                >
                  <div className="path-panel path-copy" data-column={copySide}>
                    <span className="path-label">{stage.label}</span>
                    <h3 id={`path-${stage.id}-title`}>{stage.title}</h3>
                    <p>{stage.description}</p>
                    <a className={`button ${stage.cta.variant}`} href={stage.cta.href}>
                      {stage.cta.label}
                      <span aria-hidden="true">→</span>
                    </a>
                  </div>
                  <div className="path-panel path-media" data-column={stage.mediaSide}>
                    <img
                      alt={stage.alt}
                      decoding="async"
                      height={1536}
                      src={stage.image}
                      style={{ objectPosition: stage.imagePosition }}
                      width={1024}
                    />
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
