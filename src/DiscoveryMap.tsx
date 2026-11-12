import { useCallback, useEffect, useRef, useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import maplibreWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import type {
  Map as MapLibreMap,
  MapOptions,
  Marker as MapLibreMarker,
} from "maplibre-gl";
import type { MapPoint } from "./map-points";

export const DEFAULT_MAP_STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";

const STYLE_TIMEOUT_MS = 8_000;
const MAP_LOAD_TIMEOUT_MS = 15_000;
const MIN_ZOOM = 10;
const MAX_ZOOM = 17;
const FIRST_FIT_MAX_ZOOM = 15;
const SEPARABLE_GROUP_ZOOM = 16.5;

const TINT = {
  background: "#f7f1e5",
  water: "#c9d8d2",
  park: "#e3e8d8",
  road: "#fffdf8",
  roadCasing: "#e5dccb",
  label: "#173c2b",
  labelHalo: "#fffdf8",
} as const;

export type DiscoverySellerMarker =
  | Readonly<{
      kind: "individual";
      key: string;
      sellerId: string;
      initials: string;
      listingCount: number;
      anchor: MapPoint;
      holdSummary: string | null;
    }>
  | Readonly<{
      kind: "group";
      key: string;
      groupId: string;
      separation: "separable" | "inseparable";
      sellerIds: readonly string[];
      sellerCount: number;
      anchor: MapPoint;
      holdSummary: string | null;
    }>;

export type DiscoverySellerGroupMarker = Extract<
  DiscoverySellerMarker,
  { kind: "group" }
>;

type DiscoveryMapProps = Readonly<{
  buyer: MapPoint;
  markers: readonly DiscoverySellerMarker[];
  status: string;
  mapFailure?: boolean;
  simulationNote?: string | null;
  onOpenSeller: (sellerId: string, trigger: HTMLButtonElement) => void;
  onSelectGroup: (
    group: DiscoverySellerGroupMarker,
    trigger: HTMLButtonElement,
  ) => void;
  onRecenter: () => void;
  onUseListView: () => void;
  onZoomChange?: (zoom: number) => void;
}>;

type MapPhase = "loading" | "ready" | "error";
type MapLibreModule = typeof import("maplibre-gl");
type MapStyle = Exclude<NonNullable<MapOptions["style"]>, string>;

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function supportsWebGl() {
  if (typeof document === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    return Boolean(
      canvas.getContext("webgl2") ??
        canvas.getContext("webgl") ??
        canvas.getContext("experimental-webgl"),
    );
  } catch {
    return false;
  }
}

function resolveStyleUrl() {
  const env = import.meta.env as unknown as
    | Record<string, unknown>
    | undefined;
  const configured = env?.VITE_MAP_STYLE_URL;
  return typeof configured === "string" && configured.trim()
    ? configured.trim()
    : DEFAULT_MAP_STYLE_URL;
}

type MutableStyleLayer = {
  id?: string;
  type?: string;
  paint?: Record<string, unknown>;
};

function tintStyle(style: MapStyle): MapStyle {
  const layers = style.layers as unknown as MutableStyleLayer[] | undefined;
  for (const layer of layers ?? []) {
    const id = layer.id ?? "";
    const paint = layer.paint ?? {};
    let changed = false;

    switch (layer.type) {
      case "background":
        paint["background-color"] = TINT.background;
        changed = true;
        break;
      case "fill":
        if (/water|ocean|sea|lake|river|stream|canal|reservoir/i.test(id)) {
          paint["fill-color"] = TINT.water;
          changed = true;
        } else if (
          /park|grass|wood|forest|garden|pitch|cemetery|golf|meadow|scrub|heath|nature_reserve/i.test(
            id,
          )
        ) {
          paint["fill-color"] = TINT.park;
          changed = true;
        }
        break;
      case "line":
        if (
          /road|street|highway/i.test(id) ||
          (/^(bridge|tunnel)_/i.test(id) && !/rail|waterway|transit/i.test(id))
        ) {
          paint["line-color"] = /casing|outline/i.test(id)
            ? TINT.roadCasing
            : TINT.road;
          changed = true;
        }
        break;
      case "symbol":
        paint["text-color"] = TINT.label;
        paint["text-halo-color"] = TINT.labelHalo;
        changed = true;
        break;
      default:
        break;
    }

    if (changed) layer.paint = paint;
  }

  const sources = (style.sources ?? {}) as unknown as Record<
    string,
    { attribution?: string }
  >;
  for (const [sourceId, source] of Object.entries(sources)) {
    if (source && typeof source === "object" && !source.attribution) {
      source.attribution = /ne2|natural.?earth/i.test(sourceId)
        ? "Natural Earth"
        : "© OpenStreetMap contributors";
    }
  }

  return style;
}

function markerHoldSuffix(holdSummary: string | null) {
  return holdSummary ? `, ${holdSummary}` : "";
}

export default function DiscoveryMap({
  buyer,
  markers,
  status,
  mapFailure = false,
  simulationNote = null,
  onOpenSeller,
  onSelectGroup,
  onRecenter,
  onUseListView,
  onZoomChange,
}: DiscoveryMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const moduleRef = useRef<MapLibreModule | null>(null);
  const buyerMarkerRef = useRef<MapLibreMarker | null>(null);
  const sellerMarkersRef = useRef<Array<{ key: string; marker: MapLibreMarker }>>([]);
  const loadedRef = useRef(false);

  const buyerRef = useRef(buyer);
  buyerRef.current = buyer;
  const markersRef = useRef(markers);
  markersRef.current = markers;
  const callbacksRef = useRef({
    onOpenSeller,
    onSelectGroup,
    onRecenter,
    onUseListView,
    onZoomChange,
  });
  callbacksRef.current = {
    onOpenSeller,
    onSelectGroup,
    onRecenter,
    onUseListView,
    onZoomChange,
  };

  const [phase, setPhase] = useState<MapPhase>("loading");
  const [errorDetail, setErrorDetail] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [tileNotice, setTileNotice] = useState(false);

  const fitView = useCallback(() => {
    const map = mapRef.current;
    const maplibre = moduleRef.current;
    if (!map || !maplibre) return;

    const bounds = new maplibre.LngLatBounds();
    for (const point of [
      buyerRef.current,
      ...markersRef.current.map((marker) => marker.anchor),
    ]) {
      bounds.extend([point.lng, point.lat]);
    }

    map.fitBounds(bounds, {
      padding: { top: 120, bottom: 32, left: 48, right: 48 },
      maxZoom: FIRST_FIT_MAX_ZOOM,
      duration: prefersReducedMotion() ? 0 : 450,
    });
  }, []);

  const syncMarkers = useCallback(() => {
    const map = mapRef.current;
    const maplibre = moduleRef.current;
    if (!map || !maplibre) return;

    const focusedMarker = document.activeElement instanceof HTMLElement
      ? document.activeElement.closest<HTMLElement>("[data-discovery-marker]")
      : null;

    for (const { marker } of sellerMarkersRef.current) marker.remove();
    sellerMarkersRef.current = [];

    for (const markerModel of markersRef.current) {
      const wrapper = document.createElement("div");
      wrapper.className = "map-seller-marker";
      wrapper.dataset.discoveryMarker = markerModel.key;

      const button = document.createElement("button");
      button.type = "button";

      if (markerModel.kind === "group") {
        button.className = "seller-discovery-marker seller-marker-group";
        if (markerModel.separation === "inseparable") {
          button.setAttribute("aria-haspopup", "dialog");
        }
        button.setAttribute(
          "aria-label",
          `Seller marker group, ${markerModel.sellerCount} Sellers, ${
            markerModel.separation === "separable" ? "zoom to separate" : "choose Seller"
          }${markerHoldSuffix(markerModel.holdSummary)}`,
        );

        const label = document.createElement("span");
        label.className = "seller-marker-group-label";
        label.setAttribute("aria-hidden", "true");
        label.textContent = "Sellers";

        const count = document.createElement("span");
        count.className = "seller-marker-count";
        count.setAttribute("aria-hidden", "true");
        count.textContent = String(markerModel.sellerCount);

        button.append(label, count);
        if (markerModel.holdSummary) {
          button.append(createHoldStatus(markerModel.holdSummary));
        }

        button.addEventListener("click", (event) => {
          event.stopPropagation();
          if (markerModel.separation === "separable") {
            map.flyTo({
              center: [markerModel.anchor.lng, markerModel.anchor.lat],
              zoom: Math.max(map.getZoom(), SEPARABLE_GROUP_ZOOM),
              duration: prefersReducedMotion() ? 0 : 600,
            });
          }
          callbacksRef.current.onSelectGroup(markerModel, button);
        });
      } else {
        button.className = "seller-discovery-marker";
        button.setAttribute("aria-haspopup", "dialog");
        button.setAttribute(
          "aria-label",
          `Seller marker, ${markerModel.initials}, ${markerModel.listingCount} ${
            markerModel.listingCount === 1 ? "Listing" : "Listings"
          }${markerHoldSuffix(markerModel.holdSummary)}`,
        );

        const initials = document.createElement("span");
        initials.className = "seller-marker-initials";
        initials.setAttribute("aria-hidden", "true");
        initials.textContent = markerModel.initials;

        const count = document.createElement("span");
        count.className = "seller-marker-count";
        count.setAttribute("aria-hidden", "true");
        count.textContent = String(markerModel.listingCount);

        button.append(initials, count);
        if (markerModel.holdSummary) {
          button.append(createHoldStatus(markerModel.holdSummary));
        }

        button.addEventListener("click", (event) => {
          event.stopPropagation();
          callbacksRef.current.onOpenSeller(markerModel.sellerId, button);
        });
      }

      wrapper.append(button);
      const marker = new maplibre.Marker({ element: wrapper, anchor: "center" })
        .setLngLat([markerModel.anchor.lng, markerModel.anchor.lat])
        .addTo(map);
      sellerMarkersRef.current.push({ key: markerModel.key, marker });
    }

    if (focusedMarker && !focusedMarker.isConnected) {
      map.getCanvas().focus();
    }
  }, []);

  useEffect(() => {
    if (mapFailure) {
      setErrorDetail("Map rendering is unavailable in this simulated scenario.");
      setPhase("error");
      return;
    }

    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;
    let failing = false;
    let map: MapLibreMap | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let styleTimeout: number | undefined;
    let loadTimeout: number | undefined;
    const abortController = new AbortController();

    loadedRef.current = false;
    setPhase("loading");
    setErrorDetail("");
    setTileNotice(false);

    const fail = (detail: string) => {
      if (cancelled || failing) return;
      failing = true;
      setErrorDetail(detail);
      setPhase("error");
      resizeObserver?.disconnect();
      resizeObserver = null;
      window.clearTimeout(loadTimeout);
      map?.remove();
      map = null;
      mapRef.current = null;
      moduleRef.current = null;
      buyerMarkerRef.current = null;
      sellerMarkersRef.current = [];
    };

    const setup = async () => {
      if (!supportsWebGl()) {
        fail(
          "This browser could not start WebGL, so the street map cannot be drawn. Use List view instead.",
        );
        return;
      }
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        fail(
          "This demo is offline, so the street map cannot load. Reconnect and retry.",
        );
        return;
      }

      styleTimeout = window.setTimeout(
        () => abortController.abort(),
        STYLE_TIMEOUT_MS,
      );

      try {
        const response = await fetch(resolveStyleUrl(), {
          signal: abortController.signal,
          mode: "cors",
        });
        if (!response.ok) {
          throw new Error(`The map style request failed (${response.status}).`);
        }
        const style = (await response.json()) as MapStyle;
        if (cancelled) return;

        const maplibre = await import("maplibre-gl");
        if (cancelled) return;
        moduleRef.current = maplibre;
        maplibre.setWorkerUrl(maplibreWorkerUrl);

        map = new maplibre.Map({
          container,
          style: tintStyle(style),
          center: [buyerRef.current.lng, buyerRef.current.lat],
          zoom: 14,
          minZoom: MIN_ZOOM,
          maxZoom: MAX_ZOOM,
          attributionControl: false,
          dragRotate: false,
          pitchWithRotate: false,
          touchPitch: false,
          cooperativeGestures: false,
          keyboard: true,
        });
        mapRef.current = map;
        const createdMap = map;

        map.addControl(
          new maplibre.NavigationControl({ showCompass: false }),
          "top-right",
        );
        map.addControl(
          new maplibre.AttributionControl({
            compact: false,
            customAttribution:
              "OpenFreeMap · OpenMapTiles · © OpenStreetMap contributors",
          }),
          "bottom-right",
        );

        const canvas = map.getCanvas();
        canvas.tabIndex = 0;
        canvas.setAttribute(
          "aria-label",
          "Interactive street map. Use arrow keys to pan and plus or minus to zoom.",
        );
        canvas.addEventListener("webglcontextlost", () => {
          fail(
            "The street map lost its graphics context. Retry the map or use List view.",
          );
        });

        const buyerElement = document.createElement("div");
        buyerElement.className = "map-buyer-marker";
        buyerElement.setAttribute("role", "img");
        buyerElement.setAttribute("aria-label", "Your location");
        buyerMarkerRef.current = new maplibre.Marker({
          element: buyerElement,
          anchor: "center",
        })
          .setLngLat([buyerRef.current.lng, buyerRef.current.lat])
          .addTo(map);

        resizeObserver = new ResizeObserver(() => map?.resize());
        resizeObserver.observe(container);

        map.on("zoomend", () => {
          if (!cancelled) {
            callbacksRef.current.onZoomChange?.(map?.getZoom() ?? 14);
          }
        });

        map.on("error", () => {
          if (!cancelled && loadedRef.current) setTileNotice(true);
        });

        createdMap.once("load", () => {
          if (cancelled) return;
          loadedRef.current = true;
          window.clearTimeout(loadTimeout);
          setPhase("ready");
          callbacksRef.current.onZoomChange?.(createdMap.getZoom());
        });

        loadTimeout = window.setTimeout(() => {
          if (!loadedRef.current) {
            fail(
              "The street map took too long to load. Check your connection and retry.",
            );
          }
        }, MAP_LOAD_TIMEOUT_MS);
      } catch (error) {
        if (cancelled) return;
        const message =
          error instanceof DOMException && error.name === "AbortError"
            ? "The street map style took too long to load. Check your connection and retry."
            : error instanceof Error
              ? error.message
              : "The browser could not start the street map.";
        fail(message);
      } finally {
        window.clearTimeout(styleTimeout);
      }
    };

    void setup();

    return () => {
      cancelled = true;
      abortController.abort();
      window.clearTimeout(styleTimeout);
      window.clearTimeout(loadTimeout);
      resizeObserver?.disconnect();
      if (map) map.remove();
      map = null;
      mapRef.current = null;
      moduleRef.current = null;
      buyerMarkerRef.current = null;
      sellerMarkersRef.current = [];
      loadedRef.current = false;
    };
  }, [attempt, mapFailure]);

  const markersSignature = markers
    .map((marker) =>
      marker.kind === "group"
        ? `g:${marker.key}:${marker.groupId}:${marker.separation}:${marker.sellerIds.join(",")}:${marker.anchor.lat},${marker.anchor.lng}:${marker.holdSummary ?? ""}`
        : `i:${marker.key}:${marker.sellerId}:${marker.initials}:${marker.listingCount}:${marker.anchor.lat},${marker.anchor.lng}:${marker.holdSummary ?? ""}`,
    )
    .join("|");

  useEffect(() => {
    if (phase !== "ready") return;
    syncMarkers();
  }, [markersSignature, phase, syncMarkers]);

  useEffect(() => {
    if (phase !== "ready") return;
    buyerMarkerRef.current?.setLngLat([buyer.lng, buyer.lat]);
    fitView();
  }, [buyer.lat, buyer.lng, phase, fitView]);

  return (
    <div className="discovery-map-surface">
      <div ref={containerRef} className="discovery-map-canvas" />

      <div className="map-context">
        <strong>Buyer-centered view</strong>
        <span>Moving the map does not change nearby results</span>
        {simulationNote ? (
          <em className="map-simulation-note">{simulationNote}</em>
        ) : null}
      </div>

      {phase === "loading" ? (
        <div className="map-loading" role="status">
          <span className="map-loading-indicator" aria-hidden="true" />
          <span>Loading the street map...</span>
        </div>
      ) : null}

      {phase === "error" ? (
        <div className="map-error" role="alert">
          <div className="map-error-card">
            <h3>The street map did not load.</h3>
            <p>{errorDetail || "Check your connection and retry."}</p>
            <div className="map-error-actions">
              <button
                className="button button-primary"
                onClick={() => setAttempt((current) => current + 1)}
                type="button"
              >
                Retry map
              </button>
              <button
                className="button button-outline"
                onClick={() => callbacksRef.current.onUseListView()}
                type="button"
              >
                Use List view
              </button>
            </div>
            <small>
              The same nearby results and Distance Bands remain available in List
              view.
            </small>
          </div>
        </div>
      ) : null}

      {phase === "ready" ? (
        <>
          <div
            aria-label="Map viewport controls"
            className="map-controls"
            role="group"
          >
            <button
              className="button button-compact button-outline"
              onClick={() => {
                fitView();
                callbacksRef.current.onRecenter();
              }}
              type="button"
            >
              Recenter map
            </button>
          </div>
          <p className="map-status" role="status">
            {status}
          </p>
          {tileNotice ? (
            <p className="map-tile-notice" role="status">
              Some map tiles did not load. Seller markers remain available.
            </p>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function createHoldStatus(summary: string) {
  const status = document.createElement("span");
  status.className = "marker-checkout-status";
  status.setAttribute("aria-hidden", "true");
  status.textContent = summary;
  return status;
}
