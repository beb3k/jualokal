import { useEffect, useRef, type ReactNode } from "react";

export type DiscoveryPanelStage =
  | "list"
  | "chooser"
  | "seller"
  | "item"
  | "checkout";

type DiscoveryPanelProps = Readonly<{
  stage: DiscoveryPanelStage;
  stageKey: string;
  title: string;
  label: string;
  onBack: () => void;
  onClose: () => void;
  children: ReactNode;
}>;

// Non-modal panel. The map stays reachable behind it: there is no backdrop,
// no focus trap, and no aria-modal. Focus moves to Close on every stage change.
export default function DiscoveryPanel({
  stage,
  stageKey,
  title,
  label,
  onBack,
  onClose,
  children,
}: DiscoveryPanelProps) {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const scrollPositionsRef = useRef(new Map<string, number>());
  const restoringStageRef = useRef<string | null>(null);

  useEffect(() => {
    closeButtonRef.current?.focus();
  }, [stageKey]);

  useEffect(() => {
    restoringStageRef.current = stageKey;
    const frame = window.requestAnimationFrame(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollPositionsRef.current.get(stageKey) ?? 0;
      }
      restoringStageRef.current = null;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [stageKey]);

  return (
    <aside
      aria-label={label}
      className="discovery-panel"
      data-panel-stage={stage}
    >
      <header className="discovery-panel-heading">
        <button
          className="button button-compact button-outline"
          onClick={onBack}
          type="button"
        >
          Back
        </button>
        <p className="discovery-panel-title">{title}</p>
        <button
          aria-label="Close panel"
          className="button button-compact button-quiet"
          onClick={onClose}
          ref={closeButtonRef}
          type="button"
        >
          Close
        </button>
      </header>
      <div
        className="discovery-panel-scroll"
        onScroll={(event) => {
          if (restoringStageRef.current === stageKey) return;
          scrollPositionsRef.current.set(stageKey, event.currentTarget.scrollTop);
        }}
        ref={scrollRef}
      >
        {children}
      </div>
    </aside>
  );
}
