import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";

export type DiscoveryPanelStage =
  | "list"
  | "chooser"
  | "seller"
  | "item"
  | "checkout";

const SHEET_SNAPS = [0.22, 0.55, 0.9] as const;
export type DiscoverySheetSnap = (typeof SHEET_SNAPS)[number];

export type DiscoveryPanelHandle = Readonly<{
  collapseToSmallest: () => void;
}>;

// The sheet measures its snap points against the usable demo viewport: the
// area below the floating header. Keeping the reference here means 22/55/90
// percent always resolve to the same band that the drag gesture uses, and the
// sheet can never grow over the header. The scroll area owns the safe-area
// inset so the last content clears the home indicator.
const SHEET_HEADER_GAP_PX = 8;
const SHEET_DRAG_THRESHOLD_PX = 4;

const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

function snapForStage(stage: DiscoveryPanelStage): DiscoverySheetSnap {
  return stage === "seller" || stage === "chooser" ? 0.55 : 0.9;
}

function nearestSnap(fraction: number): DiscoverySheetSnap {
  let nearest: DiscoverySheetSnap = SHEET_SNAPS[0];
  for (const snap of SHEET_SNAPS) {
    if (Math.abs(snap - fraction) < Math.abs(nearest - fraction)) {
      nearest = snap;
    }
  }
  return nearest;
}

type SheetDrag = {
  pointerId: number;
  startY: number;
  startHeight: number;
  available: number;
  latestFraction: number;
  moved: boolean;
};

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
// On phones the same shell becomes a bottom sheet; only the handle starts a
// resize gesture, so panel content keeps its own scrolling and the map keeps
// the gestures that begin outside the sheet.
const DiscoveryPanel = forwardRef<DiscoveryPanelHandle, DiscoveryPanelProps>(
  function DiscoveryPanel(
    { stage, stageKey, title, label, onBack, onClose, children },
    ref,
  ) {
    const panelRef = useRef<HTMLElement | null>(null);
    const closeButtonRef = useRef<HTMLButtonElement | null>(null);
    const scrollRef = useRef<HTMLDivElement | null>(null);
    const scrollPositionsRef = useRef(new Map<string, number>());
    const restoringStageRef = useRef<string | null>(null);
    const availableRef = useRef(0);
    const dragRef = useRef<SheetDrag | null>(null);
    const suppressClickRef = useRef(false);
    const [snap, setSnap] = useState<DiscoverySheetSnap>(() =>
      snapForStage(stage),
    );
    const [dragging, setDragging] = useState(false);

    useEffect(() => {
      closeButtonRef.current?.focus();
    }, [stageKey]);

    useEffect(() => {
      restoringStageRef.current = stageKey;
      const frame = window.requestAnimationFrame(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop =
            scrollPositionsRef.current.get(stageKey) ?? 0;
        }
        restoringStageRef.current = null;
      });
      return () => window.cancelAnimationFrame(frame);
    }, [stageKey]);

    useIsomorphicLayoutEffect(() => {
      setSnap(snapForStage(stage));
    }, [stage]);

    useIsomorphicLayoutEffect(() => {
      const panel = panelRef.current;
      const shell = panel?.closest<HTMLElement>(".demo-shell");
      if (!panel || !shell) return;

      const header = shell.querySelector<HTMLElement>(".demo-header");
      const measure = () => {
        const shellRect = shell.getBoundingClientRect();
        const headerBottom = header
          ? header.getBoundingClientRect().bottom - shellRect.top
          : 0;
        const available = Math.max(
          0,
          shellRect.height - headerBottom - SHEET_HEADER_GAP_PX,
        );
        availableRef.current = available;
        shell.style.setProperty("--sheet-available", `${available}px`);
        shell.style.setProperty(
          "--demo-header-bottom",
          `${Math.max(0, Math.round(headerBottom))}px`,
        );
      };

      measure();

      const observer =
        typeof ResizeObserver === "undefined"
          ? null
          : new ResizeObserver(measure);
      if (observer) {
        observer.observe(shell);
        if (header) observer.observe(header);
      }
      window.addEventListener("resize", measure);
      window.visualViewport?.addEventListener("resize", measure);

      return () => {
        observer?.disconnect();
        window.removeEventListener("resize", measure);
        window.visualViewport?.removeEventListener("resize", measure);
        shell.style.removeProperty("--sheet-available");
        shell.style.removeProperty("--sheet-snap");
        shell.style.removeProperty("--demo-header-bottom");
        delete shell.dataset.sheetSnap;
      };
    }, []);

    useIsomorphicLayoutEffect(() => {
      const shell = panelRef.current?.closest<HTMLElement>(".demo-shell");
      if (!shell) return;
      shell.style.setProperty("--sheet-snap", String(snap));
      shell.dataset.sheetSnap =
        snap === SHEET_SNAPS[2]
          ? "expanded"
          : snap === SHEET_SNAPS[0]
            ? "collapsed"
            : "medium";
    }, [snap]);

    function writeSheetSnap(fraction: number) {
      panelRef.current
        ?.closest<HTMLElement>(".demo-shell")
        ?.style.setProperty("--sheet-snap", String(fraction));
    }

    useImperativeHandle(
      ref,
      () => ({
        collapseToSmallest: () => {
          // Update the layout variable before React commits so a following
          // camera fit measures the smallest sheet, not the previous snap.
          writeSheetSnap(SHEET_SNAPS[0]);
          setSnap(SHEET_SNAPS[0]);
        },
      }),
      [],
    );

    function handleSheetPointerDown(
      event: ReactPointerEvent<HTMLButtonElement>,
    ) {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      const panel = panelRef.current;
      if (!panel) return;

      dragRef.current = {
        pointerId: event.pointerId,
        startY: event.clientY,
        startHeight: panel.getBoundingClientRect().height,
        available: availableRef.current || panel.getBoundingClientRect().height,
        latestFraction: snap,
        moved: false,
      };
      suppressClickRef.current = false;
      setDragging(true);
      event.currentTarget.setPointerCapture(event.pointerId);
    }

    function handleSheetPointerMove(
      event: ReactPointerEvent<HTMLButtonElement>,
    ) {
      const drag = dragRef.current;
      if (!drag || event.pointerId !== drag.pointerId) return;

      const deltaY = event.clientY - drag.startY;
      if (Math.abs(deltaY) > SHEET_DRAG_THRESHOLD_PX) drag.moved = true;

      const minHeight = SHEET_SNAPS[0] * drag.available;
      const maxHeight = SHEET_SNAPS[2] * drag.available;
      const height = Math.min(
        maxHeight,
        Math.max(minHeight, drag.startHeight - deltaY),
      );
      drag.latestFraction = height / drag.available;
      writeSheetSnap(drag.latestFraction);
    }

    function finishSheetDrag(
      event: ReactPointerEvent<HTMLButtonElement>,
      cancelled: boolean,
    ) {
      const drag = dragRef.current;
      if (!drag || event.pointerId !== drag.pointerId) return;

      dragRef.current = null;
      setDragging(false);
      if (event.currentTarget.hasPointerCapture(drag.pointerId)) {
        event.currentTarget.releasePointerCapture(drag.pointerId);
      }

      if (cancelled) {
        writeSheetSnap(snap);
        suppressClickRef.current = true;
        return;
      }

      const next = nearestSnap(drag.latestFraction);
      suppressClickRef.current = drag.moved;
      setSnap(next);
      writeSheetSnap(next);
    }

    function handleSheetClick() {
      if (suppressClickRef.current) {
        suppressClickRef.current = false;
        return;
      }
      const index = SHEET_SNAPS.indexOf(snap);
      setSnap(SHEET_SNAPS[(index + 1) % SHEET_SNAPS.length]);
    }

    function handleSheetKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
      const index = SHEET_SNAPS.indexOf(snap);
      let nextIndex = index;
      switch (event.key) {
        case "ArrowUp":
        case "ArrowRight":
          nextIndex = Math.min(index + 1, SHEET_SNAPS.length - 1);
          break;
        case "ArrowDown":
        case "ArrowLeft":
          nextIndex = Math.max(index - 1, 0);
          break;
        case "Home":
          nextIndex = 0;
          break;
        case "End":
          nextIndex = SHEET_SNAPS.length - 1;
          break;
        default:
          return;
      }
      event.preventDefault();
      setSnap(SHEET_SNAPS[nextIndex]);
    }

    return (
      <aside
        aria-label={label}
        className="discovery-panel"
        data-panel-stage={stage}
        ref={panelRef}
      >
        <button
          aria-label="Resize panel"
          className={`discovery-sheet-handle${dragging ? " is-dragging" : ""}`}
          onClick={handleSheetClick}
          onKeyDown={handleSheetKeyDown}
          onLostPointerCapture={(event) => {
            if (dragRef.current) finishSheetDrag(event, true);
          }}
          onPointerCancel={(event) => finishSheetDrag(event, true)}
          onPointerDown={handleSheetPointerDown}
          onPointerMove={handleSheetPointerMove}
          onPointerUp={(event) => finishSheetDrag(event, false)}
          title="Drag to resize; activate to cycle snap points"
          type="button"
        >
          <span aria-hidden="true" />
        </button>
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
            scrollPositionsRef.current.set(
              stageKey,
              event.currentTarget.scrollTop,
            );
          }}
          ref={scrollRef}
        >
          {children}
        </div>
      </aside>
    );
  },
);

export default DiscoveryPanel;
