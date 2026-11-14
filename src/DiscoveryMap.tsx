import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import maplibreWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import type {
  GeoJSONSource,
  Map as MapLibreMap,
  MapOptions,
  Marker as MapLibreMarker,
} from "maplibre-gl";
import type { Feature, FeatureCollection, Polygon } from "geojson";
import { circleRing, type MapPoint } from "./map-points";

export const DEFAULT_MAP_STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";

const STYLE_TIMEOUT_MS = 8_000;
const MAP_LOAD_TIMEOUT_MS = 15_000;
const MIN_ZOOM = 10;
const MAX_ZOOM = 17;
const FIRST_FIT_MAX_ZOOM = 15;
const FIT_MAXIMUM_MAX_ZOOM = 11;
const SEPARABLE_GROUP_ZOOM = 16.5;
const MAXIMUM_BOUNDARY_RADIUS_KM = 10;
const MAXIMUM_BOUNDARY_POINTS = 128;
const BOUNDARY_SOURCE_ID = "maximum-browsing-boundary";
const BOUNDARY_FILL_LAYER_ID = "maximum-browsing-boundary-fill";
const BOUNDARY_LINE_LAYER_ID = "maximum-browsing-boundary-line";

const TINT = {
  background: "#f7f1e5",
  water: "#c9d8d2",
  park: "#e3e8d8",
  road: "#fffdf8",
  roadCasing: "#e5dccb",
  label: "#173c2b",
  mutedLabel: "#495b51",
  labelHalo: "#fffdf8",
} as const;

export type MapDetailLevel = "clean" | "detailed";

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

export type MapPhase = "loading" | "ready" | "error";

type DiscoveryMapProps = Readonly<{
  buyer: MapPoint;
  boundaryCenter: MapPoint | null;
  markers: readonly DiscoverySellerMarker[];
  panelOpen: boolean;
  status: string;
  detailLevel?: MapDetailLevel;
  mapFailure?: boolean;
  focusOnMount?: boolean;
  simulationNote?: string | null;
  onDetailLevelChange?: (next: MapDetailLevel) => void;
  onMapPhaseChange: (phase: MapPhase) => void;
  onRetry: () => void;
  onOpenSeller: (sellerId: string, trigger: HTMLButtonElement) => void;
  onSelectGroup: (
    group: DiscoverySellerGroupMarker,
    trigger: HTMLButtonElement,
  ) => void;
  onRecenter: () => void;
  onFitMaximum?: () => void;
  onUseListView: (trigger?: HTMLButtonElement) => void;
  onZoomChange?: (zoom: number) => void;
}>;

export type DiscoveryMapHandle = Readonly<{
  recenter: () => void;
  fitMaximumBoundary: () => void;
  focusSeller: (anchor: MapPoint) => void;
  restorePreviousCamera: () => void;
}>;

type SavedCamera = Readonly<{
  lat: number;
  lng: number;
  zoom: number;
  bearing: number;
  pitch: number;
  padding: Readonly<{ top: number; right: number; bottom: number; left: number }>;
}>;

// Reads the live panel box so camera moves account for the sheet or side panel
// without remounting or refitting the map when the panel opens or snaps.
function readPanelCoverage(map: MapLibreMap, container: HTMLElement | null) {
  const panel = container
    ?.closest(".demo-shell")
    ?.querySelector<HTMLElement>(".discovery-panel");
  if (!panel) return { right: 0, bottom: 0 };

  const mapRect = map.getCanvas().getBoundingClientRect();
  const panelRect = panel.getBoundingClientRect();
  if (panelRect.width < 1 || panelRect.height < 1) {
    return { right: 0, bottom: 0 };
  }

  const isSheet = panelRect.width >= mapRect.width - 2;
  return isSheet
    ? {
        right: 0,
        bottom: Math.max(0, Math.round(mapRect.bottom - panelRect.top)),
      }
    : {
        right: Math.max(0, Math.round(mapRect.right - panelRect.left)),
        bottom: 0,
      };
}

type MapLibreModule = typeof import("maplibre-gl");
type MapStyle = Exclude<NonNullable<MapOptions["style"]>, string>;

const EMPTY_BOUNDARY: FeatureCollection = {
  type: "FeatureCollection",
  features: [],
};

function createBoundaryFeature(center: MapPoint): Feature<Polygon> {
  const ring = circleRing(
    center,
    MAXIMUM_BOUNDARY_RADIUS_KM,
    MAXIMUM_BOUNDARY_POINTS,
  ).map((point) => [point.lng, point.lat] as [number, number]);

  return {
    type: "Feature",
    properties: {},
    geometry: {
      type: "Polygon",
      coordinates: [ring],
    },
  };
}

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function isValidMapPoint(
  point: MapPoint | null | undefined,
): point is MapPoint {
  if (!point) return false;
  return Number.isFinite(point.lat) && Number.isFinite(point.lng);
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
  "source-layer"?: string;
  filter?: unknown;
  layout?: Record<string, unknown>;
  paint?: Record<string, unknown>;
};

const NOTABLE_PUBLIC_POI_CLASSES = [
  "airport",
  "attraction",
  "bus",
  "castle",
  "cinema",
  "college",
  "community_centre",
  "ferry",
  "garden",
  "harbor",
  "hospital",
  "library",
  "marketplace",
  "monument",
  "museum",
  "park",
  "pitch",
  "place_of_worship",
  "playground",
  "police",
  "post",
  "rail",
  "railway",
  "school",
  "stadium",
  "station",
  "theatre",
  "town_hall",
  "university",
  "zoo",
] as const;

type DetailRuleKind =
  | "hide-in-clean"
  | "public-poi-filter"
  | "soften-minor-road"
  | "soften-symbol";

type BaseLayerSnapshot = Readonly<{
  kind: DetailRuleKind;
  visibility: "visible" | "none";
  filter: unknown;
  paint: Readonly<Record<string, unknown>>;
}>;

const DETAIL_PAINT_KEYS = [
  "line-opacity",
  "text-color",
  "text-opacity",
  "icon-opacity",
] as const;

function classifyLayerForDetail(layer: MutableStyleLayer): DetailRuleKind | null {
  const id = layer.id ?? "";
  if (id === BOUNDARY_FILL_LAYER_ID || id === BOUNDARY_LINE_LAYER_ID) {
    return null;
  }

  const sourceLayer = layer["source-layer"] ?? "";

  if (
    sourceLayer === "building" ||
    layer.type === "fill-extrusion" ||
    /^building/i.test(id) ||
    sourceLayer === "housenumber" ||
    /housenumber/i.test(id)
  ) {
    return "hide-in-clean";
  }

  if (sourceLayer === "poi" || /^poi_/i.test(id)) {
    if (/^poi_r1$/i.test(id)) return "public-poi-filter";
    if (/^poi_transit$/i.test(id)) return "soften-symbol";
    return "hide-in-clean";
  }

  if (
    /^(?:road|tunnel|bridge)_(?:service_track|path_pedestrian)/i.test(id) ||
    /^road_one_way_arrow/i.test(id) ||
    /^highway-name-(?:path|minor)$/i.test(id) ||
    /^(?:road_minor|tunnel_street|bridge_street)_casing$/i.test(id)
  ) {
    return "hide-in-clean";
  }

  if (/^(?:road_minor|tunnel_minor|bridge_street)$/i.test(id)) {
    return "soften-minor-road";
  }

  if (
    layer.type === "symbol" &&
    sourceLayer !== "place" &&
    !/^label_/i.test(id)
  ) {
    return "soften-symbol";
  }

  return null;
}

function captureBaseDetailState(style: MapStyle): Map<string, BaseLayerSnapshot> {
  const snapshots = new Map<string, BaseLayerSnapshot>();
  const layers = style.layers as unknown as MutableStyleLayer[] | undefined;

  for (const layer of layers ?? []) {
    const id = layer.id;
    if (!id) continue;
    const kind = classifyLayerForDetail(layer);
    if (!kind) continue;

    const paint: Record<string, unknown> = {};
    for (const key of DETAIL_PAINT_KEYS) {
      if (layer.paint && key in layer.paint) {
        paint[key] = layer.paint[key];
      }
    }

    snapshots.set(id, {
      kind,
      visibility: layer.layout?.visibility === "none" ? "none" : "visible",
      filter: layer.filter,
      paint,
    });
  }

  return snapshots;
}

function buildPublicPoiFilter(baseFilter: unknown) {
  const classMatch = [
    "match",
    ["get", "class"],
    [...NOTABLE_PUBLIC_POI_CLASSES],
    true,
    false,
  ];
  return baseFilter ? ["all", baseFilter, classMatch] : classMatch;
}

type DetailPaintKey = (typeof DETAIL_PAINT_KEYS)[number];

function resolveDetailChanges(base: BaseLayerSnapshot, detailLevel: MapDetailLevel) {
  const clean = detailLevel === "clean";
  let visibility = base.visibility;
  let filter = base.filter;
  const paint: Partial<Record<DetailPaintKey, unknown>> = {};

  switch (base.kind) {
    case "hide-in-clean":
      visibility = clean ? "none" : base.visibility;
      break;
    case "public-poi-filter":
      filter = clean ? buildPublicPoiFilter(base.filter) : base.filter;
      paint["text-color"] = clean ? TINT.mutedLabel : (base.paint["text-color"] ?? TINT.label);
      paint["text-opacity"] = clean ? 0.88 : (base.paint["text-opacity"] ?? 1);
      paint["icon-opacity"] = clean ? 0.88 : (base.paint["icon-opacity"] ?? 1);
      break;
    case "soften-minor-road":
      paint["line-opacity"] = clean ? 0.42 : (base.paint["line-opacity"] ?? 1);
      break;
    case "soften-symbol":
      paint["text-color"] = clean ? TINT.mutedLabel : (base.paint["text-color"] ?? TINT.label);
      paint["text-opacity"] = clean ? 0.85 : (base.paint["text-opacity"] ?? 1);
      paint["icon-opacity"] = clean ? 0.85 : (base.paint["icon-opacity"] ?? 1);
      break;
  }

  return { visibility, filter, paint };
}

function applyDetailToStyle(
  style: MapStyle,
  detailLevel: MapDetailLevel,
  baseState: Map<string, BaseLayerSnapshot>,
) {
  const layers = style.layers as unknown as MutableStyleLayer[] | undefined;
  for (const layer of layers ?? []) {
    const base = layer.id ? baseState.get(layer.id) : undefined;
    if (!base) continue;

    const changes = resolveDetailChanges(base, detailLevel);
    if (changes.visibility === "none") {
      layer.layout = { ...(layer.layout ?? {}), visibility: "none" };
    } else if (layer.layout && "visibility" in layer.layout) {
      layer.layout = { ...layer.layout, visibility: changes.visibility };
    }

    if (base.kind === "public-poi-filter") {
      if (changes.filter !== undefined) {
        layer.filter = changes.filter;
      } else {
        delete layer.filter;
      }
    }

    const paintEntries = Object.entries(changes.paint).filter(
      ([, value]) => value !== undefined,
    );
    if (paintEntries.length > 0) {
      layer.paint = {
        ...(layer.paint ?? {}),
        ...Object.fromEntries(paintEntries),
      };
    }
  }
  return style;
}

function applyDetailToMap(
  map: MapLibreMap,
  detailLevel: MapDetailLevel,
  baseState: Map<string, BaseLayerSnapshot>,
) {
  for (const [layerId, base] of baseState.entries()) {
    if (!map.getLayer(layerId)) continue;
    const changes = resolveDetailChanges(base, detailLevel);

    map.setLayoutProperty(layerId, "visibility", changes.visibility);
    if (base.kind === "public-poi-filter") {
      map.setFilter(
        layerId,
        (changes.filter ?? null) as Parameters<MapLibreMap["setFilter"]>[1],
      );
    }
    for (const key of DETAIL_PAINT_KEYS) {
      if (!(key in changes.paint)) continue;
      if (key === "text-color") {
        map.setPaintProperty(layerId, key, changes.paint[key] as string | undefined);
      } else {
        map.setPaintProperty(layerId, key, changes.paint[key] as number | undefined);
      }
    }
  }
}

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

const DiscoveryMap = forwardRef<DiscoveryMapHandle, DiscoveryMapProps>(
  function DiscoveryMap(
    {
      buyer,
      boundaryCenter,
      markers,
      panelOpen,
      status,
      detailLevel = "clean",
      mapFailure = false,
      focusOnMount = false,
      simulationNote = null,
      onDetailLevelChange,
      onMapPhaseChange,
      onRetry,
      onOpenSeller,
      onSelectGroup,
      onRecenter,
      onFitMaximum,
      onUseListView,
      onZoomChange,
    },
    ref,
  ) {
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const loadingRef = useRef<HTMLDivElement | null>(null);
  const retryButtonRef = useRef<HTMLButtonElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const moduleRef = useRef<MapLibreModule | null>(null);
  const buyerMarkerRef = useRef<MapLibreMarker | null>(null);
  const sellerMarkersRef = useRef<Array<{ key: string; marker: MapLibreMarker }>>([]);
  const loadedRef = useRef(false);
  const savedCameraRef = useRef<SavedCamera | null>(null);
  const focusPendingRef = useRef(focusOnMount);
  const baseDetailStateRef = useRef<Map<string, BaseLayerSnapshot>>(new Map());

  const buyerRef = useRef(buyer);
  buyerRef.current = buyer;
  const boundaryRef = useRef(boundaryCenter);
  boundaryRef.current = boundaryCenter;
  const panelOpenRef = useRef(panelOpen);
  panelOpenRef.current = panelOpen;
  const detailLevelRef = useRef(detailLevel);
  detailLevelRef.current = detailLevel;
  const markersRef = useRef(markers);
  markersRef.current = markers;
  const callbacksRef = useRef({
    onDetailLevelChange,
    onMapPhaseChange,
    onRetry,
    onOpenSeller,
    onSelectGroup,
    onRecenter,
    onFitMaximum,
    onUseListView,
    onZoomChange,
  });
  callbacksRef.current = {
    onDetailLevelChange,
    onMapPhaseChange,
    onRetry,
    onOpenSeller,
    onSelectGroup,
    onRecenter,
    onFitMaximum,
    onUseListView,
    onZoomChange,
  };

  const [phase, setPhase] = useState<MapPhase>("loading");
  const [errorDetail, setErrorDetail] = useState("");
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

    const reducedMotion = prefersReducedMotion();
    const canvas = map.getCanvas();
    const wide = canvas.clientWidth >= 1024;
    const coverage = readPanelCoverage(map, containerRef.current);
    map.fitBounds(bounds, {
      padding: wide
        ? {
            top: 120,
            bottom: 32,
            left: 48,
            right: Math.max(48, coverage.right + 8),
          }
        : {
            top: 120,
            bottom: panelOpenRef.current
              ? Math.max(120, coverage.bottom + 24)
              : 32,
            left: 24,
            right: 24,
          },
      maxZoom: FIRST_FIT_MAX_ZOOM,
      animate: !reducedMotion,
      duration: reducedMotion ? 0 : 450,
    });
  }, []);

  const syncBoundaryLayers = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    const center = boundaryRef.current;
    const data = center ? createBoundaryFeature(center) : EMPTY_BOUNDARY;
    let source = map.getSource(BOUNDARY_SOURCE_ID) as GeoJSONSource | undefined;

    if (!source) {
      if (!center) return;
      map.addSource(BOUNDARY_SOURCE_ID, {
        type: "geojson",
        data,
      });
      source = map.getSource(BOUNDARY_SOURCE_ID) as GeoJSONSource | undefined;
    } else {
      void source.setData(data);
    }

    if (!center) return;

    const beforeId = map
      .getStyle()
      .layers?.find((layer) => layer.type === "symbol")?.id;

    if (!map.getLayer(BOUNDARY_FILL_LAYER_ID)) {
      map.addLayer(
        {
          id: BOUNDARY_FILL_LAYER_ID,
          type: "fill",
          source: BOUNDARY_SOURCE_ID,
          paint: {
            "fill-color": TINT.label,
            "fill-opacity": 0.05,
          },
        },
        beforeId,
      );
    }

    if (!map.getLayer(BOUNDARY_LINE_LAYER_ID)) {
      map.addLayer(
        {
          id: BOUNDARY_LINE_LAYER_ID,
          type: "line",
          source: BOUNDARY_SOURCE_ID,
          layout: {
            "line-join": "round",
          },
          paint: {
            "line-color": TINT.label,
            "line-width": 1.5,
            "line-opacity": 0.55,
          },
        },
        beforeId,
      );
    }
  }, []);

  const recenter = useCallback(() => {
    savedCameraRef.current = null;
    fitView();
  }, [fitView]);

  const fitMaximumBoundary = useCallback(() => {
    const map = mapRef.current;
    const maplibre = moduleRef.current;
    const center = boundaryRef.current;
    if (!map || !maplibre || !center) return;

    const bounds = new maplibre.LngLatBounds();
    for (const point of circleRing(
      center,
      MAXIMUM_BOUNDARY_RADIUS_KM,
      MAXIMUM_BOUNDARY_POINTS,
    )) {
      bounds.extend([point.lng, point.lat]);
    }

    savedCameraRef.current = null;
    const reducedMotion = prefersReducedMotion();
    const canvas = map.getCanvas();
    const wide = canvas.clientWidth >= 1024;
    const coverage = readPanelCoverage(map, containerRef.current);
    map.fitBounds(bounds, {
      padding: wide
        ? {
            top: 120,
            bottom: 40,
            left: 40,
            right: Math.max(40, coverage.right + 8),
          }
        : {
            top: 160,
            bottom: panelOpenRef.current
              ? Math.max(40, coverage.bottom + 24)
              : 40,
            left: 24,
            right: 24,
          },
      maxZoom: FIT_MAXIMUM_MAX_ZOOM,
      animate: !reducedMotion,
      duration: reducedMotion ? 0 : 450,
    });
  }, []);

  const focusSeller = useCallback((anchor: MapPoint | null | undefined) => {
    const map = mapRef.current;
    if (!map || !isValidMapPoint(anchor)) return;

    const canvas = map.getCanvas();
    const point = map.project([anchor.lng, anchor.lat]);
    const wide = canvas.clientWidth >= 1024;
    const coverage = readPanelCoverage(map, containerRef.current);
    const padding = wide
      ? {
          top: 120,
          bottom: 80,
          left: 48,
          right: Math.max(80, coverage.right + 8),
        }
      : {
          top: 160,
          bottom: panelOpenRef.current
            ? Math.max(120, coverage.bottom + 24)
            : 120,
          left: 24,
          right: 24,
        };
    const offScreen =
      point.x < padding.left ||
      point.y < padding.top ||
      point.x > canvas.clientWidth - padding.right ||
      point.y > canvas.clientHeight - padding.bottom;
    if (!offScreen) return;

    if (!savedCameraRef.current) {
      const center = map.getCenter();
      const padding = map.getPadding();
      savedCameraRef.current = {
        lat: center.lat,
        lng: center.lng,
        zoom: map.getZoom(),
        bearing: map.getBearing(),
        pitch: map.getPitch(),
        padding: {
          top: padding.top ?? 0,
          right: padding.right ?? 0,
          bottom: padding.bottom ?? 0,
          left: padding.left ?? 0,
        },
      };
    }

    if (prefersReducedMotion()) {
      map.jumpTo({
        center: [anchor.lng, anchor.lat],
        zoom: Math.max(map.getZoom(), 15),
        padding,
      });
    } else {
      map.flyTo({
        center: [anchor.lng, anchor.lat],
        zoom: Math.max(map.getZoom(), 15),
        padding,
        duration: 600,
      });
    }
  }, []);

  const restorePreviousCamera = useCallback(() => {
    const map = mapRef.current;
    const saved = savedCameraRef.current;
    if (!map || !saved) return;

    savedCameraRef.current = null;
    if (prefersReducedMotion()) {
      map.jumpTo({
        center: [saved.lng, saved.lat],
        zoom: saved.zoom,
        bearing: saved.bearing,
        pitch: saved.pitch,
        padding: saved.padding,
      });
    } else {
      map.easeTo({
        center: [saved.lng, saved.lat],
        zoom: saved.zoom,
        bearing: saved.bearing,
        pitch: saved.pitch,
        padding: saved.padding,
        duration: 450,
      });
    }
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      recenter,
      fitMaximumBoundary,
      focusSeller,
      restorePreviousCamera,
    }),
    [fitMaximumBoundary, focusSeller, recenter, restorePreviousCamera],
  );

  const syncMarkers = useCallback(() => {
    const map = mapRef.current;
    const maplibre = moduleRef.current;
    if (!map || !maplibre) return;

    const focusedMarker = document.activeElement instanceof HTMLElement
      ? document.activeElement.closest<HTMLElement>("[data-discovery-marker]")
      : null;
    const focusedMarkerKey = focusedMarker?.dataset.discoveryMarker ?? null;

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
            if (prefersReducedMotion()) {
              map.jumpTo({
                center: [markerModel.anchor.lng, markerModel.anchor.lat],
                zoom: Math.max(map.getZoom(), SEPARABLE_GROUP_ZOOM),
              });
            } else {
              map.flyTo({
                center: [markerModel.anchor.lng, markerModel.anchor.lat],
                zoom: Math.max(map.getZoom(), SEPARABLE_GROUP_ZOOM),
                duration: 600,
              });
            }
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

    if (focusedMarkerKey) {
      const replacement = containerRef.current?.querySelector<HTMLButtonElement>(
        `[data-discovery-marker="${CSS.escape(focusedMarkerKey)}"] button`,
      );
      if (replacement) {
        replacement.focus({ preventScroll: true });
      } else {
        map.getCanvas().focus();
      }
    } else if (focusedMarker && !focusedMarker.isConnected) {
      map.getCanvas().focus();
    }
  }, []);

  useEffect(() => {
    if (mapFailure) {
      setErrorDetail("Map rendering is unavailable in this simulated scenario.");
      setPhase("error");
      callbacksRef.current.onMapPhaseChange("error");
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
    savedCameraRef.current = null;
    setPhase("loading");
    setErrorDetail("");
    setTileNotice(false);
    callbacksRef.current.onMapPhaseChange("loading");

    const fail = (detail: string) => {
      if (cancelled || failing) return;
      failing = true;
      setErrorDetail(detail);
      setPhase("error");
      callbacksRef.current.onMapPhaseChange("error");
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

        const tintedStyle = tintStyle(style);
        baseDetailStateRef.current = captureBaseDetailState(tintedStyle);

        map = new maplibre.Map({
          container,
          style: applyDetailToStyle(
            tintedStyle,
            detailLevelRef.current,
            baseDetailStateRef.current,
          ),
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
        const zoomGroup = container.querySelector<HTMLElement>(
          ".maplibregl-ctrl-top-right .maplibregl-ctrl-group",
        );
        if (zoomGroup) {
          zoomGroup.setAttribute("role", "group");
          zoomGroup.setAttribute("aria-label", "Map zoom controls");
        }
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

        map.on("style.load", () => {
          applyDetailToMap(
            createdMap,
            detailLevelRef.current,
            baseDetailStateRef.current,
          );
          syncBoundaryLayers();
        });

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
          syncBoundaryLayers();
          setPhase("ready");
          callbacksRef.current.onMapPhaseChange("ready");
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
        const offline =
          typeof navigator !== "undefined" && navigator.onLine === false;
        const message =
          error instanceof DOMException && error.name === "AbortError"
            ? "The street map style took too long to load. Check your connection and retry."
            : offline
              ? "This demo is offline, so the street map cannot load. Reconnect and retry."
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
      savedCameraRef.current = null;
      baseDetailStateRef.current = new Map();
    };
  }, [mapFailure]);

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

  useEffect(() => {
    if (phase !== "ready") return;
    syncBoundaryLayers();
  }, [boundaryCenter?.lat, boundaryCenter?.lng, phase, syncBoundaryLayers]);

  useEffect(() => {
    if (phase !== "ready" || !mapRef.current) return;
    applyDetailToMap(mapRef.current, detailLevel, baseDetailStateRef.current);
  }, [detailLevel, phase]);

  useEffect(() => {
    if (phase === "loading") {
      if (focusPendingRef.current) {
        loadingRef.current?.focus();
      }
      return;
    }

    if (phase === "ready") {
      if (focusPendingRef.current) {
        focusPendingRef.current = false;
        window.requestAnimationFrame(() => {
          mapRef.current?.getCanvas().focus();
        });
      }
      return;
    }

    if (phase === "error") {
      const focusWasInSurface = Boolean(
        surfaceRef.current &&
          document.activeElement instanceof HTMLElement &&
          surfaceRef.current.contains(document.activeElement),
      );
      if (focusPendingRef.current || focusWasInSurface) {
        focusPendingRef.current = false;
        window.requestAnimationFrame(() => {
          retryButtonRef.current?.focus();
        });
      }
    }
  }, [phase]);

  return (
    <div className="discovery-map-surface" ref={surfaceRef}>
      <div
        aria-hidden={phase !== "ready"}
        className="discovery-map-canvas"
        inert={phase !== "ready"}
        ref={containerRef}
      />

      <div className="map-context">
        <strong>Buyer-centered view</strong>
        <span>Moving the map does not change nearby results</span>
        {simulationNote ? (
          <em className="map-simulation-note">{simulationNote}</em>
        ) : null}
      </div>

      {phase === "loading" ? (
        <div className="map-loading" ref={loadingRef} role="status" tabIndex={-1}>
          <span className="map-loading-indicator" aria-hidden="true" />
          <span>Loading the street map...</span>
        </div>
      ) : null}

      {phase === "error" ? (
        <div className="map-error" role="alert">
          <div className="map-error-card">
            <h2>The street map did not load.</h2>
            <p>{errorDetail || "Check your connection and retry."}</p>
            <div className="map-error-actions">
              <button
                className="button button-primary"
                onClick={() => callbacksRef.current.onRetry()}
                ref={retryButtonRef}
                type="button"
              >
                Retry map
              </button>
              <button
                className="button button-outline"
                onClick={(event) =>
                  callbacksRef.current.onUseListView(event.currentTarget)
                }
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
                recenter();
                callbacksRef.current.onRecenter?.();
              }}
              type="button"
            >
              Recenter map
            </button>
            {onDetailLevelChange ? (
              <div
                aria-label="Map detail"
                className="map-detail-toggle"
                role="group"
              >
                {(
                  [
                    ["clean", "Clean"],
                    ["detailed", "Detailed"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    aria-pressed={detailLevel === value}
                    className="button button-compact button-outline"
                    key={value}
                    onClick={() => {
                      if (detailLevel !== value) {
                        callbacksRef.current.onDetailLevelChange?.(value);
                      }
                    }}
                    type="button"
                  >
                    {label}
                  </button>
                ))}
              </div>
            ) : null}
            {boundaryCenter ? (
              <button
                className="button button-compact button-outline map-fit-control"
                onClick={() => {
                  if (callbacksRef.current.onFitMaximum) {
                    callbacksRef.current.onFitMaximum();
                  } else {
                    fitMaximumBoundary();
                  }
                }}
                type="button"
              >
                Fit maximum area
              </button>
            ) : null}
          </div>
          {boundaryCenter ? (
            <div
              aria-label="Maximum browsing boundary legend"
              className="map-legend"
              role="group"
            >
              <strong>Maximum boundary 10 km</strong>
              <span>Active search 2 km</span>
              <button
                className="button button-compact button-outline"
                onClick={() => {
                  if (callbacksRef.current.onFitMaximum) {
                    callbacksRef.current.onFitMaximum();
                  } else {
                    fitMaximumBoundary();
                  }
                }}
                type="button"
              >
                Fit maximum area
              </button>
            </div>
          ) : null}
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
});

export default DiscoveryMap;

function createHoldStatus(summary: string) {
  const status = document.createElement("span");
  status.className = "marker-checkout-status";
  status.setAttribute("aria-hidden", "true");
  status.textContent = summary;
  return status;
}
