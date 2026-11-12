import { useEffect, useRef, useState } from "react";
import {
  demoBuyer,
  demoBuyers,
  demoListing,
  demoListings,
  demoMapOrigin,
  demoSeller,
  demoSellerMarkerGroups,
  demoSellers,
  type DemoListingSeed,
} from "./demo-data";
import DiscoveryMap, {
  type DiscoveryMapHandle,
  type DiscoverySellerGroupMarker,
  type DiscoverySellerMarker,
} from "./DiscoveryMap";
import DiscoveryPanel, {
  type DiscoveryPanelHandle,
} from "./DiscoveryPanels";
import { kmOffset, offsetFromKm, offsetPoint } from "./map-points";
import {
  completeSimulatedPayment,
  createInitialCheckoutState,
  endCheckoutHold,
  expireCheckoutHolds,
  finalizePurchaseCommitment,
  getListingClaimability,
  purchaseCommitmentRemovesListing,
  refundPurchaseCommitment,
  startCheckoutHold,
  type ListingClaimability,
} from "./checkout";
import HandoverPanel, { type PresenceSimulation } from "./HandoverPanel";
import DemoControls, { type DemoControlsAccount } from "./DemoControls";
import ListingPanel, {
  CheckoutHoldPanel,
  SellerPreviewPanel,
  type ListingPanelCheckout,
  type ListingPanelNotice,
  type SellerPreviewListing,
} from "./ListingPanel";
import SafetyPanel from "./SafetyPanel";
import { formatRupiah, formatWibTime } from "./format";
import {
  buyerAcceptHandover,
  buyerConfirmHandover,
  buyerRequestScheduleAdjustment,
  cancelHandover,
  closeIncompleteHandoverMeeting,
  createInitialHandoverState,
  expireScheduling,
  openIncompleteHandoverDispute,
  raiseMaterialMismatchClaim,
  resolveMaterialMismatchDispute,
  respondToMaterialMismatchClaim,
  recordHandoverPresence,
  reportNoShow,
  reportSellerUnavailability,
  sellerApproveScheduleAdjustment,
  sellerConfirmHandover,
  sellerProposeHandover,
  sellerProposeRepeatHandover,
  HANDOVER_START_DEADLINE_MS,
  NO_SHOW_GRACE_MS,
  SCHEDULE_AGREEMENT_DEADLINE_MS,
  SELLER_PROPOSAL_DEADLINE_MS,
  type HandoverActionResult,
  type SellerUnavailabilityReason,
  type HandoverPoint,
  type MaterialMismatchReason,
  type HandoverState,
} from "./handover";
import {
  createInitialSafetyState,
  fileSafetyReport,
  isPairContactBlocked,
  resolveSafetyAppeal,
  reviewSafetyReport,
  submitSafetyAppeal,
  type SafetyActionResult,
  type SafetyCategory,
  type SafetyState,
} from "./safety";
import {
  activateTrustBlocker,
  addReliabilityStrike,
  clearReliabilityStrike,
  clearTrustBlocker,
  clearOverturnedPermanentTierBlock,
  permanentlyBlockHigherTiers,
  createInitialTrustState,
  getCheckoutAllowance,
  getPrivateTierProgress,
  getPublicTrustSummary,
  getTradingAvailability,
  recordSuccessfulHandover,
  type TrustState,
} from "./trust";
import {
  APPROVED_DISCOVERY_CATEGORIES,
  createSellerMapMarkers,
  classifyDiscoveryOutcome,
  createSellerDiscoveryMarker,
  discoverListings,
  getSellerMarkerInitials,
  type ApprovedDiscoveryCategory,
  type DiscoveryCategory,
  type DistanceBand,
} from "./discovery";

const discoveryCategoryLabels: Record<ApprovedDiscoveryCategory, string> = {
  Clothing: "Clothing",
  Accessories: "Accessories",
  "Small electronics": "Small Electronics",
  Books: "Books",
  Toys: "Toys",
  "Hobby equipment": "Hobby Equipment",
  "Portable household goods": "Portable Household Goods",
};

const discoveryCategoryOptions: ReadonlyArray<{ value: DiscoveryCategory; label: string }> = [
  { value: "All", label: "All" },
  ...APPROVED_DISCOVERY_CATEGORIES.map((value) => ({
    value,
    label: discoveryCategoryLabels[value],
  })),
];

const conditionGrades = ["Like New", "Very Good", "Good", "Fair", "Needs Repair"] as const;
const structuredQuestions = [
  "Condition",
  "Measurements",
  "Included parts",
  "Compatibility",
  "Additional photos",
] as const;

const prototypeDiscoveryRadiusKm = 2;
const discoveryViewStorageKey = "jualokal.discovery-view";
const mapHomeAnchorVersion = "fictional-anchor-v1";
const separableGroupZoom = 16.5;
const defaultIncludedParts = "Item and all parts shown in the fictional photos.";

type DiscoveryView = "map" | "list";

type DemoWorkspace = "buyer" | "seller" | "inventory" | "orders" | "trust";

type PanelStage =
  | Readonly<{ kind: "list" }>
  | Readonly<{ kind: "chooser"; groupId: string }>
  | Readonly<{ kind: "seller"; sellerId: string }>
  | Readonly<{ kind: "item"; listingId: string }>
  | Readonly<{ kind: "checkout"; listingId: string }>;

type PanelTrigger = Readonly<{
  element: HTMLElement | null;
  markerKey?: string;
}>;

function initialDiscoveryView(): DiscoveryView {
  if (typeof window === "undefined") return "map";
  const urlView = new URLSearchParams(window.location.search).get("view");
  if (urlView === "map" || urlView === "list") return urlView;
  return window.localStorage.getItem(discoveryViewStorageKey) === "list"
    ? "list"
    : "map";
}

function initialPanelStages(): PanelStage[] {
  return initialDiscoveryView() === "list" ? [{ kind: "list" }] : [];
}

function initialSelectedAccountId() {
  const accountId = new URLSearchParams(window.location.search).get("account");
  const accountExists =
    demoBuyers.some((buyer) => buyer.id === accountId) ||
    demoSellers.some((seller) => seller.id === accountId);
  return accountExists && accountId ? accountId : demoBuyer.id;
}

function initialActiveWorkspace(accountId: string): DemoWorkspace {
  const workspace = new URLSearchParams(window.location.search).get("workspace");
  if (workspace === "inventory") return "inventory";
  if (workspace === "orders") return "orders";
  if (workspace === "trust" && !accountId.startsWith("seller-")) return "trust";
  if (workspace === "seller") return "seller";
  if (workspace === "buyer") return "buyer";
  return accountId.startsWith("seller-") ? "seller" : "buyer";
}

function initialDiscoveryCategory(): DiscoveryCategory {
  const category = new URLSearchParams(window.location.search).get("category");
  return discoveryCategoryOptions.find((option) => option.value === category)?.value ?? "All";
}

function initialQualifyingSellerId() {
  const sellerId = new URLSearchParams(window.location.search).get("seller");
  return demoSellers.find((seller) => seller.id === sellerId)?.id ?? demoSellers[0].id;
}

function initialSelectedListingId() {
  const accountId = initialSelectedAccountId();
  if (!accountId.startsWith("seller-")) return demoListing.id;
  return demoListings.find((listing) => listing.sellerId === accountId)?.id ?? demoListing.id;
}

const browsingLocations = [
  {
    value: "current",
    label: "Current simulated location snapshot",
    kind: "valid",
    discovery: "success",
  },
  {
    value: "inside-edge",
    label: "Nearby boundary check",
    kind: "valid",
    discovery: "success",
    distanceKm: 1.99,
  },
  {
    value: "at-edge",
    label: "Discovery-radius edge",
    kind: "valid",
    discovery: "success",
    distanceKm: 2,
  },
  {
    value: "outside-edge",
    label: "Outside discovery-radius check",
    kind: "valid",
    discovery: "success",
    distanceKm: 2.01,
  },
  {
    value: "books-empty",
    label: "Valid snapshot with no nearby Books",
    kind: "valid",
    discovery: "success",
    emptyCategory: "Books",
  },
  {
    value: "at-maximum",
    label: "Permanent-maximum check",
    kind: "valid",
    discovery: "success",
    distanceKm: 10,
  },
  {
    value: "outside-maximum",
    label: "Beyond permanent-maximum check",
    kind: "valid",
    discovery: "success",
    distanceKm: 10.01,
  },
  {
    value: "discovery-failure",
    label: "Discovery service unavailable",
    kind: "valid",
    discovery: "failure",
  },
  {
    value: "map-failure",
    label: "Map rendering unavailable",
    kind: "valid",
    discovery: "success",
    mapFailure: true,
  },
  { value: "denied", label: "Location permission denied", kind: "denied" },
  { value: "unavailable", label: "Location unavailable", kind: "unavailable" },
] as const;

type BrowsingLocationScenario = (typeof browsingLocations)[number];
type BrowsingLocationValue = BrowsingLocationScenario["value"];
type BrowsingLocationSnapshot =
  | {
      kind: "valid";
      revision: number;
      value: BrowsingLocationValue;
      discovery: "success" | "failure";
      distanceKm?: number;
      emptyCategory?: ApprovedDiscoveryCategory;
    }
  | { kind: "denied"; revision: number }
  | { kind: "unavailable"; revision: number }
  | { kind: "stale"; revision: number };

const initialBrowsingLocationSnapshot: BrowsingLocationSnapshot = {
  kind: "valid",
  revision: 1,
  value: "current",
  discovery: "success",
};

function createBrowsingLocationSnapshot(
  scenario: BrowsingLocationScenario,
  revision: number,
): BrowsingLocationSnapshot {
  if (scenario.kind === "denied") return { kind: "denied", revision };
  if (scenario.kind === "unavailable") return { kind: "unavailable", revision };

  return {
    kind: "valid",
    revision,
    value: scenario.value,
    discovery: scenario.discovery,
    ...("distanceKm" in scenario ? { distanceKm: scenario.distanceKm } : {}),
    ...("emptyCategory" in scenario ? { emptyCategory: scenario.emptyCategory } : {}),
  };
}

function QualifyingSellerSelect({
  selectedSellerId,
  onSelect,
}: {
  selectedSellerId: string;
  onSelect: (sellerId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const selectedIndex = Math.max(
    0,
    demoSellers.findIndex((seller) => seller.id === selectedSellerId),
  );
  const [activeIndex, setActiveIndex] = useState(selectedIndex);
  const selectedSeller = demoSellers[selectedIndex];

  useEffect(() => {
    if (!open) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!(event.target instanceof Node)) return;
      if (!wrapperRef.current?.contains(event.target)) setOpen(false);
    };
    window.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => window.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, [open]);

  function focusOption(index: number) {
    const wrappedIndex = (index + demoSellers.length) % demoSellers.length;
    setActiveIndex(wrappedIndex);
    window.requestAnimationFrame(() => optionRefs.current[wrappedIndex]?.focus());
  }

  function openOptions() {
    setOpen(true);
    focusOption(selectedIndex);
  }

  function closeOptions() {
    setOpen(false);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  }

  function chooseSeller(sellerId: string) {
    onSelect(sellerId);
    closeOptions();
  }

  return (
    <div className="custom-select" ref={wrapperRef}>
      <span className="custom-select-label" id="qualifying-seller-label">
        Qualifying Demo Seller
      </span>
      <button
        aria-controls="qualifying-seller-options"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-labelledby="qualifying-seller-label"
        className="custom-select-trigger"
        onClick={() => (open ? closeOptions() : openOptions())}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            openOptions();
          } else if (event.key === "Escape" && open) {
            event.preventDefault();
            closeOptions();
          }
        }}
        ref={triggerRef}
        role="combobox"
        type="button"
      >
        <span>{selectedSeller.publicName} - fictional</span>
        <span aria-hidden="true">⌄</span>
      </button>
      {open ? (
        <div
          aria-labelledby="qualifying-seller-label"
          className="custom-select-options"
          id="qualifying-seller-options"
          role="listbox"
        >
          {demoSellers.map((seller, index) => (
            <button
              aria-selected={seller.id === selectedSellerId}
              className="custom-select-option"
              key={seller.id}
              onClick={() => chooseSeller(seller.id)}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  focusOption(activeIndex + 1);
                } else if (event.key === "ArrowUp") {
                  event.preventDefault();
                  focusOption(activeIndex - 1);
                } else if (event.key === "Home") {
                  event.preventDefault();
                  focusOption(0);
                } else if (event.key === "End") {
                  event.preventDefault();
                  focusOption(demoSellers.length - 1);
                } else if (event.key === "Escape") {
                  event.preventDefault();
                  closeOptions();
                }
              }}
              ref={(element) => {
                optionRefs.current[index] = element;
              }}
              role="option"
              tabIndex={index === activeIndex ? 0 : -1}
              type="button"
            >
              <span>{seller.publicName}</span>
              <small>Fictional Demo Seller</small>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

type PublishedListing = {
  title: string;
  category: string;
  conditionGrade: string;
  price: number;
  description: string;
  conditionDisclosure: string;
  specifications: string;
  includedParts: string;
  photos: string[];
  photoPrivacyConfirmed: boolean;
};

type ListingStatus =
  | "active"
  | "deactivated"
  | "cross-listed-unavailable"
  | "paused-for-correction"
  | "removed-fraud-review"
  | "paused"
  | "removed";

function checkoutAvailabilityLabel(claimability: ListingClaimability) {
  if (claimability.kind === "held-by-viewer") return "Your Checkout Hold";
  if (claimability.kind === "held-by-other") {
    return "Checkout Hold · unavailable to claim";
  }
  return null;
}

function getDemoSellerDistanceKm(sellerId: DemoListingSeed["sellerId"]) {
  return demoSellers.find((seller) => seller.id === sellerId)?.distanceKm ?? 0;
}

type SessionListing = DemoListingSeed & {
  status: ListingStatus;
  originalPublicationTimeMs: number;
  photos: string[];
  includedParts: string;
  photoPrivacyConfirmed: boolean;
};

function createInitialSessionListings(): SessionListing[] {
  return demoListings.map((listing, index) => ({
    ...listing,
    originalPublicationTimeMs: Date.UTC(2026, 0, 1) + index,
    status: "active",
    photos: ["Complete-item view", "Detail view", "Second detail view"],
    includedParts: defaultIncludedParts,
    photoPrivacyConfirmed: true,
  }));
}


function createInitialTrustStates(): Record<string, TrustState> {
  const buyerStates = demoBuyers.map((buyer) => [
    buyer.id,
    createInitialTrustState({
      identityVerified: true,
      successfulSellerIds: demoSellers
        .slice(0, buyer.differentPartners)
        .map((seller) => seller.id),
    }),
  ] as const);
  const sellerStates = demoSellers.map((seller) => [
    seller.id,
    createInitialTrustState({ identityVerified: true }),
  ] as const);

  return Object.fromEntries([...buyerStates, ...sellerStates]);
}

function buyerTierLabel(tier: "Verified" | "Reliable" | "Trusted") {
  return `${tier} Buyer` as const;
}
const initialPublishedListing: PublishedListing = {
  title: demoListing.title,
  category: demoListing.category,
  conditionGrade: demoListing.condition,
  price: 185000,
  description: demoListing.description,
  includedParts: defaultIncludedParts,
  conditionDisclosure: "Light surface wear near the rim; the handle is secure.",
  specifications: "42 cm wide × 30 cm high; approximately 650 g.",
  photos: ["Complete-item view", "Detail view", "Second detail view"],
  photoPrivacyConfirmed: true,
};

function createDemoHandoverWindows(committedAtMs: number) {
  const wibDate = new Date(committedAtMs + 7 * 60 * 60 * 1000);
  const timestamp = (hour: number, minute: number) =>
    Date.UTC(
      wibDate.getUTCFullYear(),
      wibDate.getUTCMonth(),
      wibDate.getUTCDate() + 1,
      hour - 7,
      minute,
    );

  return {
    proposed: [
      { id: "morning", startsAtMs: timestamp(10, 0), endsAtMs: timestamp(10, 30) },
      { id: "afternoon", startsAtMs: timestamp(17, 0), endsAtMs: timestamp(17, 30) },
    ],
    adjustment: {
      id: "buyer-adjustment",
      startsAtMs: timestamp(11, 0),
      endsAtMs: timestamp(11, 30),
    },
    repeat: [
      { id: "repeat-early", startsAtMs: timestamp(16, 0), endsAtMs: timestamp(16, 30) },
      { id: "repeat-late", startsAtMs: timestamp(17, 0), endsAtMs: timestamp(17, 30) },
    ],
  } as const;
}

function DemoExperience({ onExit }: { onExit: () => void }) {
  const [selectedAccountId, setSelectedAccountId] = useState(initialSelectedAccountId);
  const [activeWorkspace, setActiveWorkspace] = useState<DemoWorkspace>(
    () => initialActiveWorkspace(initialSelectedAccountId()),
  );
  const [sessionListings, setSessionListings] = useState<SessionListing[]>(
    createInitialSessionListings,
  );
  const [checkoutState, setCheckoutState] = useState(createInitialCheckoutState);
  const [checkoutNotice, setCheckoutNotice] = useState("");
  const [handoverStates, setHandoverStates] = useState<Record<string, HandoverState>>({});
  const [handoverNotices, setHandoverNotices] = useState<Record<string, string>>({});
  const [safetyStates, setSafetyStates] = useState<Record<string, SafetyState>>({});
  const [trustStates, setTrustStates] = useState<Record<string, TrustState>>(
    createInitialTrustStates,
  );
  const [selectedQualifyingSellerId, setSelectedQualifyingSellerId] = useState<string>(
    initialQualifyingSellerId,
  );
  const [clockNowMs, setClockNowMs] = useState(Date.now);
  const [clockOffsetMs, setClockOffsetMs] = useState(0);
  const [demoClockPaused, setDemoClockPaused] = useState(false);
  const [selectedListingId, setSelectedListingId] = useState(initialSelectedListingId);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [resetConfirmationOpen, setResetConfirmationOpen] = useState(false);
  const [demoControlsOpen, setDemoControlsOpen] = useState(false);
  const [title, setTitle] = useState<string>(demoListing.title);
  const [category, setCategory] = useState<string>(demoListing.category);
  const [conditionGrade, setConditionGrade] = useState<string>(demoListing.condition);
  const [price, setPrice] = useState("185000");
  const [description, setDescription] = useState<string>(demoListing.description);
  const [specifications, setSpecifications] = useState(initialPublishedListing.specifications);
  const [includedParts, setIncludedParts] = useState(initialPublishedListing.includedParts);
  const [itemType, setItemType] = useState("One portable item");
  const [hasKnownDefects, setHasKnownDefects] = useState(true);
  const [conditionDisclosure, setConditionDisclosure] = useState(
    initialPublishedListing.conditionDisclosure,
  );
  const [completePhotoIncluded, setCompletePhotoIncluded] = useState(true);
  const [detailPhotoIncluded, setDetailPhotoIncluded] = useState(true);
  const [secondDetailPhotoIncluded, setSecondDetailPhotoIncluded] = useState(true);
  const [defectPhotoIncluded, setDefectPhotoIncluded] = useState(false);
  const [photoPrivacyConfirmed, setPhotoPrivacyConfirmed] = useState(true);
  const [publicationErrors, setPublicationErrors] = useState<string[]>([]);
  const [publicationNotice, setPublicationNotice] = useState("");
  const [publishedListing, setPublishedListing] =
    useState<PublishedListing>(initialPublishedListing);
  const [listingStatus, setListingStatus] = useState<ListingStatus>("active");
  const [managementNotice, setManagementNotice] = useState("");
  const [selectedQuestion, setSelectedQuestion] = useState<string>(structuredQuestions[0]);
  const [pendingQuestion, setPendingQuestion] = useState<{
    listingId: string;
    question: string;
  } | null>(null);
  const [questionUpdateNotice, setQuestionUpdateNotice] = useState("");
  const [browsingLocation, setBrowsingLocation] =
    useState<BrowsingLocationValue>("current");
  const [browsingLocationSnapshot, setBrowsingLocationSnapshot] =
    useState<BrowsingLocationSnapshot>(initialBrowsingLocationSnapshot);
  const [discoveryCategory, setDiscoveryCategory] =
    useState<DiscoveryCategory>(initialDiscoveryCategory);
  const [discoveryView, setDiscoveryView] = useState<DiscoveryView>(initialDiscoveryView);
  const [mapRendering, setMapRendering] = useState<"ready" | "failed">("ready");
  const [discoveryAnnouncement, setDiscoveryAnnouncement] = useState(
    "Nearby discovery ready with simulated snapshot 1",
  );
  const [panelStages, setPanelStages] = useState<PanelStage[]>(initialPanelStages);
  const [completedCheckoutCommitmentId, setCompletedCheckoutCommitmentId] = useState<
    string | null
  >(null);
  const [mapZoom, setMapZoom] = useState(14);
  const [mapInstanceKey, setMapInstanceKey] = useState(0);
  const [mapStatus, setMapStatus] = useState("Buyer-centered view ready");
  const panelReturnFocusRef = useRef<PanelTrigger | null>(null);
  const panelWasOpenRef = useRef(false);
  const resultPillRef = useRef<HTMLButtonElement | null>(null);
  const discoveryMapRef = useRef<DiscoveryMapHandle | null>(null);
  const discoveryPanelRef = useRef<DiscoveryPanelHandle | null>(null);
  const listingDetailRef = useRef<HTMLElement | null>(null);
  const demoControlsTriggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (demoClockPaused) return;
    const clock = window.setInterval(
      () => setClockNowMs(Date.now() + clockOffsetMs),
      1000,
    );
    return () => window.clearInterval(clock);
  }, [clockOffsetMs, demoClockPaused]);

  useEffect(() => {
    setCheckoutState((currentState) => expireCheckoutHolds(currentState, clockNowMs));
  }, [clockNowMs]);

  useEffect(() => {
    if (
      demoClockPaused &&
      checkoutState.holds.length === 0 &&
      Object.keys(handoverStates).length === 0
    ) {
      setDemoClockPaused(false);
    }
  }, [checkoutState.holds.length, demoClockPaused, handoverStates]);

  useEffect(() => {
    if (panelStages.length === 0) return;
    const handlePanelKeyboard = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (demoControlsOpen || resetConfirmationOpen) return;
      event.preventDefault();
      setPanelStages((current) => current.slice(0, -1));
    };
    window.addEventListener("keydown", handlePanelKeyboard);
    return () => window.removeEventListener("keydown", handlePanelKeyboard);
  }, [demoControlsOpen, panelStages.length, resetConfirmationOpen]);

  useEffect(() => {
    const nextView: DiscoveryView = panelStages.some(
      (stage) => stage.kind === "list",
    )
      ? "list"
      : "map";
    setDiscoveryView(nextView);
    window.localStorage.setItem(discoveryViewStorageKey, nextView);
  }, [panelStages]);

  useEffect(() => {
    if (panelStages.length > 0) {
      panelWasOpenRef.current = true;
      return;
    }
    if (!panelWasOpenRef.current) return;
    panelWasOpenRef.current = false;
    discoveryMapRef.current?.restorePreviousCamera();
    if (activeWorkspace !== "buyer") return;

    const target = panelReturnFocusRef.current;
    panelReturnFocusRef.current = null;
    window.requestAnimationFrame(() => {
      if (target?.element?.isConnected) {
        target.element.focus();
        return;
      }
      if (target?.markerKey) {
        const marker = document.querySelector<HTMLElement>(
          `[data-discovery-marker="${CSS.escape(target.markerKey)}"] button`,
        );
        if (marker) {
          marker.focus();
          return;
        }
      }
      resultPillRef.current?.focus();
    });
  }, [activeWorkspace, panelStages.length]);

  useEffect(() => {
    let pageWasHidden = document.visibilityState === "hidden";
    const markPersistedResumeStale = (event: PageTransitionEvent) => {
      if (event.persisted) markBrowsingLocationStale();
    };
    const markBackgroundResumeStale = () => {
      if (document.visibilityState === "hidden") {
        pageWasHidden = true;
      } else if (pageWasHidden) {
        pageWasHidden = false;
        markBrowsingLocationStale();
      }
    };
    window.addEventListener("pagehide", markBrowsingLocationStale);
    window.addEventListener("pageshow", markPersistedResumeStale);
    document.addEventListener("visibilitychange", markBackgroundResumeStale);
    return () => {
      window.removeEventListener("pagehide", markBrowsingLocationStale);
      window.removeEventListener("pageshow", markPersistedResumeStale);
      document.removeEventListener("visibilitychange", markBackgroundResumeStale);
    };
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("demo", "1");
    url.searchParams.set("account", selectedAccountId);
    url.searchParams.set("workspace", activeWorkspace);
    url.searchParams.set("category", discoveryCategory);
    url.searchParams.set("view", discoveryView);
    url.searchParams.set("seller", selectedQualifyingSellerId);
    window.history.replaceState(null, "", url);
  }, [
    activeWorkspace,
    discoveryCategory,
    discoveryView,
    selectedAccountId,
    selectedQualifyingSellerId,
  ]);

  const selectedBuyer = demoBuyers.find((buyer) => buyer.id === selectedAccountId);
  const selectedSeller = demoSellers.find(
    (seller) => seller.id === selectedAccountId,
  );
  const selectedSellerListings = selectedSeller
    ? sessionListings.filter((listing) => listing.sellerId === selectedSeller.id)
    : [];
  const selectedSessionListing = sessionListings.find(
    (listing) => listing.id === selectedListingId,
  );

  useEffect(() => {
    if (!selectedAccountId.startsWith("seller-")) return;
    const firstSellerListing = sessionListings.find(
      (listing) => listing.sellerId === selectedAccountId,
    );
    if (firstSellerListing) loadListingForEditing(firstSellerListing);
  }, [selectedAccountId]);
  const selectedBuyerHold = selectedBuyer
    ? checkoutState.holds.find(
        (hold) =>
          hold.buyerId === selectedBuyer.id && hold.listingId === selectedListingId,
      )
    : undefined;
  const currentBuyerHold = selectedBuyer
    ? checkoutState.holds.find((hold) => hold.buyerId === selectedBuyer.id)
    : undefined;
  const selectedListingHold = checkoutState.holds.find(
    (hold) => hold.listingId === selectedListingId,
  );
  const selectedBuyerCommitments = selectedBuyer
    ? checkoutState.commitments.filter(
        (commitment) => commitment.buyerId === selectedBuyer.id,
      )
    : [];
  const selectedBuyerActiveCommitments = selectedBuyerCommitments.filter(
    (commitment) => commitment.lifecycleStatus === "Active",
  );
  const selectedTrustState = selectedBuyer
    ? trustStates[selectedBuyer.id]
    : undefined;
  const selectedTierProgress = selectedTrustState
    ? getPrivateTierProgress(selectedTrustState, clockNowMs)
    : undefined;
  const selectedPublicTrustSummary = selectedTrustState
    ? getPublicTrustSummary(selectedTrustState, clockNowMs)
    : undefined;
  const selectedTradingAvailability = selectedTrustState
    ? getTradingAvailability(selectedTrustState, clockNowMs)
    : undefined;
  const selectedCheckoutAllowance = selectedTrustState
    ? getCheckoutAllowance(selectedTrustState, {
        nowMs: clockNowMs,
        activeCommitmentCount: selectedBuyerActiveCommitments.length,
        hasActiveCheckoutHold: Boolean(currentBuyerHold),
      })
    : undefined;
  const selectedActiveStrikes = selectedTrustState
    ? selectedTrustState.strikes.filter((strike) => strike.expiresAtMs > clockNowMs)
    : [];
  const selectedSellerCommitments = selectedSeller
    ? checkoutState.commitments.filter(
        (commitment) => commitment.sellerId === selectedSeller.id,
      )
    : [];
  const visibleCommitments = selectedBuyer
    ? selectedBuyerCommitments
    : selectedSellerCommitments;
  const fallbackHandoverCommitment = selectedBuyer
    ? selectedBuyerCommitments.find(
        (commitment) => commitment.lifecycleStatus === "Active",
      ) ?? selectedBuyerCommitments[0]
    : selectedSeller
      ? selectedSellerCommitments.find(
          (commitment) => commitment.listingId === selectedListingId,
        ) ?? selectedSellerCommitments[0]
      : undefined;
  const visibleHandoverCommitment =
    visibleCommitments.find((commitment) => commitment.id === selectedOrderId) ??
    fallbackHandoverCommitment;
  const storedVisibleHandoverState = visibleHandoverCommitment
    ? handoverStates[visibleHandoverCommitment.id]
    : undefined;
  const visibleBuyerTrustState = visibleHandoverCommitment
    ? trustStates[visibleHandoverCommitment.buyerId]
    : undefined;
  const visibleBuyerTier = visibleBuyerTrustState
    ? getPrivateTierProgress(visibleBuyerTrustState, clockNowMs).tier
    : undefined;
  const visibleHandoverState = storedVisibleHandoverState && visibleBuyerTier
    ? Object.freeze({ ...storedVisibleHandoverState, buyerTier: buyerTierLabel(visibleBuyerTier) })
    : storedVisibleHandoverState;
  const visibleSafetyState = visibleHandoverCommitment
    ? safetyStates[visibleHandoverCommitment.id]
    : undefined;
  const visibleContactBlocked = Boolean(
    visibleSafetyState &&
      isPairContactBlocked(
        visibleSafetyState,
        visibleSafetyState.buyerId,
        visibleSafetyState.sellerId,
      ),
  );
  const visibleSafetyTransactionResolved = Boolean(
    visibleHandoverCommitment?.lifecycleStatus === "Completed" &&
      visibleSafetyState?.report?.review,
  );
  const restrictedAccountIds = new Set(
    Object.values(safetyStates)
      .filter((state) => state.restriction !== null)
      .map((state) => state.report?.reportedMemberId)
      .filter((memberId): memberId is string => Boolean(memberId)),
  );
  const selectedAccountRestricted = restrictedAccountIds.has(selectedAccountId);
  const selectedAccountTrustState = trustStates[selectedAccountId];
  const selectedAccountTradingAvailability = selectedAccountTrustState
    ? getTradingAvailability(selectedAccountTrustState, clockNowMs)
    : undefined;
  const selectedAccountSuspended = Boolean(
    selectedAccountTradingAvailability &&
      (!selectedAccountTradingAvailability.canBuy || !selectedAccountTradingAvailability.canSell),
  );
  const selectedListingCommitment = checkoutState.commitments.find(
    (commitment) =>
      commitment.listingId === selectedListingId &&
      purchaseCommitmentRemovesListing(commitment),
  );
  const selectedListingIsLocked = Boolean(
    selectedListingHold || selectedListingCommitment,
  );
  const committedListingIds = new Set(
    checkoutState.commitments
      .filter(purchaseCommitmentRemovesListing)
      .map((commitment) => commitment.listingId),
  );
  const selectedHoldRemainingSeconds = selectedBuyerHold
    ? Math.max(0, Math.ceil((selectedBuyerHold.expiresAtMs - clockNowMs) / 1000))
    : 0;
  const selectedListingSeller =
    demoSellers.find((seller) => seller.id === selectedSessionListing?.sellerId) ?? demoSeller;
  const activeListingCount = sessionListings.filter(
    (listing) => listing.status === "active" && !committedListingIds.has(listing.id),
  ).length;
  const currentRoleLabel =
    activeWorkspace === "inventory"
      ? "Demo inventory"
      : activeWorkspace === "seller"
        ? "Seller workspace"
        : activeWorkspace === "orders"
          ? "Orders"
          : activeWorkspace === "trust"
            ? "Trust overview"
            : selectedSeller
              ? "View discovery as selected Seller"
              : "Buyer discovery";
  const headerRoleLabel =
    activeWorkspace === "inventory"
      ? "Inventory"
      : activeWorkspace === "seller"
        ? "Seller"
        : activeWorkspace === "orders"
          ? "Orders"
          : activeWorkspace === "trust"
            ? "Trust"
            : selectedSeller
              ? "Seller discovery"
              : "Buyer";
  const selectedAccountName =
    (selectedBuyer ?? selectedSeller)?.publicName ?? "No simulated account";
  const selectedBuyerTierLabel = selectedBuyer
    ? buyerTierLabel(selectedTierProgress?.tier ?? "Verified")
    : null;
  const selectedBuyerPurchaseLimit = selectedBuyer
    ? selectedTierProgress?.activePurchaseLimit ?? selectedBuyer.activePurchaseLimit
    : null;
  const demoAccountOptions: DemoControlsAccount[] = [
    ...demoBuyers.map((buyer) => ({
      id: buyer.id,
      group: "buyer" as const,
      label: `${buyer.publicName} - ${buyerTierLabel(getPublicTrustSummary(trustStates[buyer.id], clockNowMs).tier)} - simulated`,
    })),
    ...demoSellers.map((seller) => ({
      id: seller.id,
      group: "seller" as const,
      label: `${seller.publicName} - Demo Seller - simulated`,
    })),
  ];
  const selectedPendingQuestion =
    pendingQuestion?.listingId === selectedListingId ? pendingQuestion.question : null;

  const browsingLocationIsAvailable = browsingLocationSnapshot.kind === "valid";
  const discoverySucceeded =
    browsingLocationSnapshot.kind === "valid" &&
    browsingLocationSnapshot.discovery === "success";
  const browsingDistanceOverrideKm =
    browsingLocationSnapshot.kind === "valid"
      ? browsingLocationSnapshot.distanceKm
      : undefined;
  const emptyDiscoveryCategory =
    browsingLocationSnapshot.kind === "valid"
      ? browsingLocationSnapshot.emptyCategory
      : undefined;
  const discoveryResults = discoverySucceeded ? discoverListings({
    viewer: {
      id: selectedAccountId,
      verified: Boolean(selectedAccountTrustState?.identityVerified),
      locationAvailable: browsingLocationIsAvailable,
    },
    category: discoveryCategory,
    listings: sessionListings.map((listing) => ({
      id: listing.id,
      sellerId: listing.sellerId,
      category: listing.category,
      distanceKm:
        emptyDiscoveryCategory === listing.category
          ? prototypeDiscoveryRadiusKm + 0.01
          : browsingDistanceOverrideKm ?? getDemoSellerDistanceKm(listing.sellerId),
      originalPublicationTimeMs: listing.originalPublicationTimeMs,
      status: listing.status,
      sellerAvailable:
        !restrictedAccountIds.has(listing.sellerId) &&
        !committedListingIds.has(listing.id),
    })),
  }) : [];
  const discoveryOutcome = classifyDiscoveryOutcome({
    location:
      browsingLocationSnapshot.kind === "valid"
        ? "valid"
        : browsingLocationSnapshot.kind,
    discoverySucceeded,
    category: discoveryCategory,
    resultCount: discoveryResults.length,
  });
  const visibleDemoListings: Array<{
    listing: SessionListing;
    distanceBand: DistanceBand;
  }> = discoveryResults.flatMap((result) => {
    const listing = sessionListings.find((candidate) => candidate.id === result.listingId);
    return listing ? [{ listing, distanceBand: result.distanceBand }] : [];
  });
  const visibleHeldListings = visibleDemoListings.flatMap(({ listing }) => {
    const claimability = getListingClaimability(checkoutState, {
      listingId: listing.id,
      viewerId: selectedAccountId,
      nowMs: clockNowMs,
    });
    return claimability.kind === "held-by-viewer" || claimability.kind === "held-by-other"
      ? [{ listing, claimability }]
      : [];
  });
  const selectedListingDistanceBand = visibleDemoListings.find(
    ({ listing }) => listing.id === selectedListingId,
  )?.distanceBand;
  const buyerPoint = offsetPoint(
    demoMapOrigin,
    0,
    browsingDistanceOverrideKm ?? 0,
  );
  const mapSellerMarkers = demoSellers.flatMap((seller) => {
    const sellerListings = sessionListings.filter(
      (listing) => listing.sellerId === seller.id,
    );
    const marker = createSellerDiscoveryMarker({
      sellerId: seller.id,
      homeAnchorVersion: mapHomeAnchorVersion,
      sellerListingIds: sellerListings.map((listing) => listing.id),
      discoveryResults,
    });
    if (!marker) return [];
    return [{
      marker,
      anchorOffset: kmOffset(demoMapOrigin, seller.discoveryAnchor),
    }];
  });
  const expandedGroupId =
    mapZoom >= separableGroupZoom
      ? demoSellerMarkerGroups.find((group) => group.separation === "separable")?.id ??
        null
      : null;
  const sellerMapMarkers = createSellerMapMarkers({
    markers: mapSellerMarkers.map(({ marker, anchorOffset }) => ({
      marker,
      projection: {
        stableMarkerKey: marker.stableMarkerKey,
        offsetXKm: anchorOffset.eastKm,
        offsetYKm: anchorOffset.northKm,
        frameKm: 2 as const,
      },
    })),
    groups: demoSellerMarkerGroups,
    expandedGroupId,
  });
  const discoveryMarkerViews: DiscoverySellerMarker[] = sellerMapMarkers.flatMap(
    (mapMarker) => {
      const representedSellerIds = mapMarker.kind === "group"
        ? mapMarker.sellerIds
        : [mapMarker.marker.sellerId];
      const representedHeldListings = visibleHeldListings.filter(({ listing }) =>
        representedSellerIds.includes(listing.sellerId),
      );
      const competingHoldCount = representedHeldListings.filter(
        ({ claimability }) => claimability.kind === "held-by-other",
      ).length;
      const ownHoldCount = representedHeldListings.filter(
        ({ claimability }) => claimability.kind === "held-by-viewer",
      ).length;
      const holdSummary = competingHoldCount > 0
        ? `${competingHoldCount} held ${
            competingHoldCount === 1 ? "Listing" : "Listings"
          } unavailable to claim`
        : ownHoldCount > 0
          ? `${ownHoldCount} ${
              ownHoldCount === 1 ? "Listing" : "Listings"
            } in your Checkout Hold`
          : null;
      const anchor = offsetFromKm(
        demoMapOrigin,
        mapMarker.projection.offsetXKm,
        mapMarker.projection.offsetYKm,
      );

      if (mapMarker.kind === "group") {
        return [{
          kind: "group" as const,
          key: mapMarker.projection.stableMarkerKey,
          groupId: mapMarker.groupId,
          separation: mapMarker.separation,
          sellerIds: mapMarker.sellerIds,
          sellerCount: mapMarker.sellerCount,
          anchor,
          holdSummary,
        }];
      }

      const seller = demoSellers.find(
        (candidate) => candidate.id === mapMarker.marker.sellerId,
      );
      if (!seller) return [];
      return [{
        kind: "individual" as const,
        key: mapMarker.marker.stableMarkerKey,
        sellerId: seller.id,
        initials: getSellerMarkerInitials(seller.publicName),
        listingCount: mapMarker.marker.listingCount,
        anchor,
        holdSummary,
      }];
    },
  );
  const mapFallbackActive =
    browsingLocationIsAvailable &&
    discoverySucceeded &&
    mapRendering === "failed";
  const mapScreenActive = activeWorkspace === "buyer";
  const panelStage = panelStages.at(-1);
  const panelOpen = panelStages.length > 0;
  const panelStageKey = panelStage
    ? panelStage.kind === "chooser"
      ? `chooser:${panelStage.groupId}`
      : panelStage.kind === "seller"
        ? `seller:${panelStage.sellerId}`
        : panelStage.kind === "item" || panelStage.kind === "checkout"
          ? `${panelStage.kind}:${panelStage.listingId}`
          : "list"
    : "closed";
  const chooserGroup =
    panelStage?.kind === "chooser"
      ? discoveryMarkerViews.find(
          (marker): marker is DiscoverySellerGroupMarker =>
            marker.kind === "group" && marker.groupId === panelStage.groupId,
        )
      : undefined;
  const chooserSellers = chooserGroup?.kind === "group"
    ? chooserGroup.sellerIds.flatMap((sellerId) => {
        const seller = demoSellers.find((candidate) => candidate.id === sellerId);
        return seller ? [seller] : [];
      })
    : [];
  const previewSeller =
    panelStage?.kind === "seller"
      ? demoSellers.find((seller) => seller.id === panelStage.sellerId)
      : undefined;
  const previewListings = previewSeller
    ? visibleDemoListings.filter(
        ({ listing }) => listing.sellerId === previewSeller.id,
      )
    : [];
  const previewDistanceBand = previewListings[0]?.distanceBand;
  const previewTrustSummary = previewSeller
    ? getPublicTrustSummary(trustStates[previewSeller.id], clockNowMs)
    : undefined;
  const panelTitle = panelStage
    ? panelStage.kind === "list"
      ? "Nearby listings"
      : panelStage.kind === "chooser"
        ? "Choose a Seller"
        : panelStage.kind === "seller"
          ? "Seller Preview"
          : panelStage.kind === "item"
            ? "Item detail"
            : "Checkout"
    : "Nearby listings";
  const panelLabel = panelStage
    ? panelStage.kind === "list"
      ? "Nearby listings panel"
      : panelStage.kind === "chooser"
        ? "Seller chooser panel"
        : panelStage.kind === "seller"
          ? "Seller Preview panel"
          : panelStage.kind === "item"
            ? "Item detail"
            : "Checkout panel"
    : "Nearby listings panel";

  useEffect(() => {
    if (!panelStage) return;
    if (panelStage.kind === "seller") {
      const seller = demoSellers.find(
        (candidate) => candidate.id === panelStage.sellerId,
      );
      if (seller) discoveryMapRef.current?.focusSeller(seller.discoveryAnchor);
    } else if (panelStage.kind === "chooser") {
      // Chooser groups are stored as projections; the rendered marker view is
      // the source that carries the resolved coarse map anchor.
      if (chooserGroup) {
        discoveryMapRef.current?.focusSeller(chooserGroup.anchor);
      }
    }
  }, [panelStageKey]);
  const selectedListingDistanceKm =
    browsingDistanceOverrideKm ??
    (selectedSessionListing ? selectedListingSeller.distanceKm : undefined);
  const listingIsDiscoverable = Boolean(selectedListingDistanceBand);
  const selectedListingClaimability: ListingClaimability = selectedSessionListing
    ? getListingClaimability(checkoutState, {
        listingId: selectedSessionListing.id,
        viewerId: selectedAccountId,
        nowMs: clockNowMs,
      })
    : { kind: "available" };
  const selectedListingAvailabilityLabel = checkoutAvailabilityLabel(
    selectedListingClaimability,
  );
  const sellerPreviewListings: SellerPreviewListing[] = previewListings.map(
    ({ listing }) => ({
      id: listing.id,
      title: listing.title,
      category: listing.category,
      condition: listing.condition,
      price: listing.price,
      availabilityLabel: checkoutAvailabilityLabel(
        getListingClaimability(checkoutState, {
          listingId: listing.id,
          viewerId: selectedAccountId,
          nowMs: clockNowMs,
        }),
      ),
    }),
  );
  const listingPanelNotice: ListingPanelNotice =
    discoveryOutcome.kind === "results" &&
    selectedListingDistanceKm !== undefined &&
    selectedListingDistanceKm > prototypeDiscoveryRadiusKm
      ? {
          title: "No nearby listings",
          body: "This item is outside the 2 km Discovery Radius.",
        }
      : discoveryOutcome.kind === "results" &&
          selectedListingDistanceKm !== undefined &&
          selectedListingDistanceKm <= prototypeDiscoveryRadiusKm &&
          listingStatus !== "active"
        ? {
            title: "Listing unavailable",
            body:
              listingStatus === "deactivated"
                ? "The seller deactivated this listing before checkout."
                : "This cross-listed item is unavailable before checkout.",
          }
        : null;
  const listingPanelCheckout: ListingPanelCheckout | null =
    selectedBuyer && selectedSessionListing
      ? selectedBuyerHold
        ? {
            kind: "hold",
            listingTitle: selectedBuyerHold.listingTitle,
            transactionPrice: selectedBuyerHold.transactionPrice,
            expiresAtMs: selectedBuyerHold.expiresAtMs,
            remainingSeconds: selectedHoldRemainingSeconds,
            onAdvanceToExpiryBoundary: advanceSelectedHoldToExpiryBoundary,
            onExpire: expireSelectedHold,
            onAbandon: abandonSelectedHold,
            onSimulateFailedPayment: simulateFailedSelectedPayment,
            onSimulateSuccessfulPayment: simulateSuccessfulSelectedPayment,
          }
        : {
            kind: "entry",
            disabled: Boolean(
              selectedListingHold || !selectedCheckoutAllowance?.allowed,
            ),
            heldByOther: Boolean(selectedListingHold),
            currentHoldTitle: currentBuyerHold?.listingTitle ?? null,
            blockedReason:
              selectedCheckoutAllowance?.reason === "account-suspended"
                ? "account-suspended"
                : selectedCheckoutAllowance?.reason === "purchase-capacity-reached"
                  ? "purchase-capacity-reached"
                  : null,
            tierLabel: buyerTierLabel(selectedTierProgress?.tier ?? "Verified"),
            activePurchaseLimit: selectedTierProgress?.activePurchaseLimit ?? 1,
            onStart: startSelectedCheckoutHold,
          }
      : null;

  function openDemoControls() {
    setDemoControlsOpen(true);
  }

  function closeDemoControls() {
    setDemoControlsOpen(false);
    window.requestAnimationFrame(() => demoControlsTriggerRef.current?.focus());
  }

  function selectDemoAccount(nextAccountId: string) {
    setSelectedAccountId(nextAccountId);
    if (nextAccountId.startsWith("seller-")) {
      const firstSellerListing = sessionListings.find(
        (listing) => listing.sellerId === nextAccountId,
      );
      if (firstSellerListing) {
        loadListingForEditing(firstSellerListing);
      }
    }
    setActiveWorkspace(nextAccountId.startsWith("seller-") ? "seller" : "buyer");
    setPanelStages([]);
    setCompletedCheckoutCommitmentId(null);
    closeDemoControls();
  }

  function selectBrowsingLocation(nextLocation: string) {
    const selectedScenario = browsingLocations.find(
      (scenario) => scenario.value === nextLocation,
    );
    if (selectedScenario) setBrowsingLocation(selectedScenario.value);
  }

  function simulateMapFailure() {
    setBrowsingLocation("map-failure");
    setDiscoveryAnnouncement(
      "Map failure snapshot selected. Refresh nearby listings to apply it.",
    );
  }

  function refreshNearbyFromControls() {
    refreshNearbyListings();
    closeDemoControls();
  }

  function markStaleFromControls() {
    markBrowsingLocationStale();
    closeDemoControls();
  }

  function openBuyerDiscovery() {
    setSelectedAccountId(demoBuyer.id);
    setActiveWorkspace("buyer");
    setPanelStages([]);
    setCompletedCheckoutCommitmentId(null);
    closeDemoControls();
  }

  function openSellerDiscovery() {
    setActiveWorkspace("buyer");
    setPanelStages([]);
    setCompletedCheckoutCommitmentId(null);
    closeDemoControls();
  }

  function openSellerWorkspace() {
    const nextSeller = selectedSeller ?? demoSeller;
    setSelectedAccountId(nextSeller.id);
    const nextListing =
      sessionListings.find(
        (listing) =>
          listing.id === selectedListingId && listing.sellerId === nextSeller.id,
      ) ?? sessionListings.find((listing) => listing.sellerId === nextSeller.id);
    if (nextListing) loadListingForEditing(nextListing);
    setActiveWorkspace("seller");
    setPanelStages([]);
    closeDemoControls();
  }

  function openInventory() {
    setActiveWorkspace("inventory");
    setPanelStages([]);
    closeDemoControls();
  }

  function showOrders() {
    setDemoControlsOpen(false);
    setPanelStages([]);
    setActiveWorkspace("orders");
    window.requestAnimationFrame(() => {
      document
        .getElementById("purchase-commitments")
        ?.focus({ preventScroll: true });
    });
  }

  function openTrustOverview() {
    if (!selectedBuyer) return;
    setDemoControlsOpen(false);
    setPanelStages([]);
    setActiveWorkspace("trust");
  }

  function returnToMap() {
    setDemoControlsOpen(false);
    setPanelStages([]);
    setActiveWorkspace("buyer");
    setDiscoveryAnnouncement("Returned to the map. Map state is preserved.");
    window.requestAnimationFrame(() => {
      if (resultPillRef.current) {
        resultPillRef.current.focus();
        return;
      }
      document.querySelector<HTMLElement>(".maplibregl-canvas")?.focus();
    });
  }

  function openResetConfirmation() {
    closeDemoControls();
    setResetConfirmationOpen(true);
  }

  function exitDemo() {
    setDemoControlsOpen(false);
    onExit();
  }

  function selectDiscoveryCategory(nextCategory: string) {
    const selectedOption = discoveryCategoryOptions.find(
      (option) => option.value === nextCategory,
    );
    if (selectedOption) {
      setDiscoveryCategory(selectedOption.value);
      setPanelStages([]);
      setDiscoveryAnnouncement(
        `${selectedOption.label} Category Filter applied; Map and List updated from the same result.`,
      );
    }
  }

  function markerKeyFromTrigger(trigger: HTMLElement | null) {
    return trigger?.closest<HTMLElement>("[data-discovery-marker]")?.dataset
      .discoveryMarker;
  }

  function rememberPanelTrigger(
    trigger: HTMLElement | null,
    markerKey?: string,
  ) {
    if (panelStages.length > 0) return;
    panelReturnFocusRef.current = trigger
      ? { element: trigger, markerKey }
      : markerKey
        ? { element: null, markerKey }
        : null;
  }

  function openListPanel(trigger?: HTMLElement | null) {
    rememberPanelTrigger(trigger ?? null);
    setPanelStages([{ kind: "list" }]);
    setDiscoveryAnnouncement("Nearby listings opened in the List panel.");
  }

  function backPanelStage() {
    setPanelStages((current) => current.slice(0, -1));
  }

  function closePanel() {
    setPanelStages([]);
    setCompletedCheckoutCommitmentId(null);
    setDiscoveryAnnouncement(
      "Returned to the map. Moving the map does not change nearby results.",
    );
  }

  function pushItemStage(listingId: string) {
    setCompletedCheckoutCommitmentId(null);
    setPanelStages((current) => {
      const base = current.filter(
        (stage) => stage.kind === "list" || stage.kind === "seller",
      );
      return [...base, { kind: "item", listingId }];
    });
  }

  function openCheckoutStage(listingId: string) {
    setCompletedCheckoutCommitmentId(null);
    setPanelStages((current) => [
      ...current.filter((stage) => stage.kind !== "checkout"),
      { kind: "checkout", listingId },
    ]);
  }

  function markBrowsingLocationStale() {
    setBrowsingLocationSnapshot((currentSnapshot) =>
      currentSnapshot.kind === "valid"
        ? { kind: "stale", revision: currentSnapshot.revision }
        : currentSnapshot,
    );
    setPanelStages([]);
    setCompletedCheckoutCommitmentId(null);
    setDiscoveryAnnouncement(
      "Browsing Location is stale after resume. Refresh nearby listings to continue.",
    );
  }

  function refreshNearbyListings() {
    const scenario = browsingLocations.find(
      (candidate) => candidate.value === browsingLocation,
    );
    if (!scenario) return;

    const nextRevision = browsingLocationSnapshot.revision + 1;
    setBrowsingLocationSnapshot(createBrowsingLocationSnapshot(scenario, nextRevision));
    setMapRendering(
      scenario.kind === "valid" && "mapFailure" in scenario ? "failed" : "ready",
    );
    setMapStatus("Buyer-centered view restored after refresh");
    setCompletedCheckoutCommitmentId(null);
    setPanelStages(
      scenario.kind === "valid" && "mapFailure" in scenario
        ? [{ kind: "list" }]
        : [],
    );
    discoveryMapRef.current?.recenter();

    if (scenario.kind === "denied") {
      setDiscoveryAnnouncement("Location permission denied. Nearby discovery not run.");
    } else if (scenario.kind === "unavailable") {
      setDiscoveryAnnouncement("Location unavailable. Nearby discovery not run.");
    } else if (scenario.discovery === "failure") {
      setDiscoveryAnnouncement("Discovery service failed. Existing emptiness was not inferred.");
    } else if ("mapFailure" in scenario) {
      setDiscoveryAnnouncement(
        "Browsing Location replaced and results recalculated. Map failed, so the same results are shown in List View.",
      );
    } else {
      setDiscoveryAnnouncement(
        `Browsing Location replaced with simulated snapshot ${nextRevision}; nearby results and Distance Bands recalculated.`,
      );
    }
  }

  function retryMap() {
    setMapRendering("ready");
    setMapStatus("Buyer-centered view restored");
    setDiscoveryAnnouncement("Map rendering recovered. Map View restored.");
  }

  function openSellerPreview(
    sellerId: string,
    trigger: HTMLButtonElement,
  ) {
    rememberPanelTrigger(trigger, markerKeyFromTrigger(trigger));
    setPanelStages((current) => {
      const list = current.filter((stage) => stage.kind === "list");
      return [...list, { kind: "seller", sellerId }];
    });
  }

  function selectSellerMarkerGroup(
    group: DiscoverySellerGroupMarker,
    trigger: HTMLButtonElement,
  ) {
    if (group.separation === "separable") {
      setMapStatus(
        `${group.sellerCount} Sellers separate as the map zooms in`,
      );
      return;
    }
    rememberPanelTrigger(trigger, markerKeyFromTrigger(trigger));
    setPanelStages((current) => {
      const list = current.filter((stage) => stage.kind === "list");
      return [...list, { kind: "chooser", groupId: group.groupId }];
    });
  }

  function openSellerFromChooser(sellerId: string) {
    setPanelStages((current) =>
      current.map((stage) =>
        stage.kind === "chooser" ? { kind: "seller", sellerId } : stage,
      ),
    );
  }

  function openPreviewListing(listingId: string) {
    const listing = sessionListings.find((candidate) => candidate.id === listingId);
    if (!listing) return;
    loadListingForEditing(listing);
    pushItemStage(listing.id);
  }

  function openListingDetail(
    listing: SessionListing,
    trigger?: HTMLElement | null,
  ) {
    if (trigger) rememberPanelTrigger(trigger);
    loadListingForEditing(listing);
    pushItemStage(listing.id);
  }

  function recenterMap() {
    setMapStatus("Buyer-centered view restored");
    setDiscoveryAnnouncement("Buyer-centered view restored.");
  }

  function fitMaximumMap() {
    // On phones the sheet moves out of the way first, so the fit can use the
    // smallest snap's camera padding.
    discoveryPanelRef.current?.collapseToSmallest();
    window.requestAnimationFrame(() => {
      discoveryMapRef.current?.fitMaximumBoundary();
    });
    setMapStatus("Maximum browsing boundary fitted");
    setDiscoveryAnnouncement(
      "Fit maximum area. The full 10 km Maximum Browsing Boundary is visible.",
    );
  }

  function loadListingForEditing(listing: SessionListing) {
    setSelectedListingId(listing.id);
    setTitle(listing.title);
    setCategory(listing.category);
    setConditionGrade(listing.condition);
    setPrice(String(listing.price));
    setDescription(listing.description);
    setSpecifications(listing.specifications);
    setIncludedParts(listing.includedParts);
    setItemType("One portable item");
    setHasKnownDefects(
      !listing.conditionDisclosure.toLowerCase().startsWith("no known defects"),
    );
    setConditionDisclosure(listing.conditionDisclosure);
    setCompletePhotoIncluded(listing.photos.includes("Complete-item view"));
    setDetailPhotoIncluded(listing.photos.includes("Detail view"));
    setSecondDetailPhotoIncluded(listing.photos.includes("Second detail view"));
    setDefectPhotoIncluded(listing.photos.includes("Defect view"));
    setPhotoPrivacyConfirmed(listing.photoPrivacyConfirmed);
    setPublishedListing({
      title: listing.title,
      category: listing.category,
      conditionGrade: listing.condition,
      price: listing.price,
      description: listing.description,
      conditionDisclosure: listing.conditionDisclosure,
      specifications: listing.specifications,
      includedParts: listing.includedParts,
      photos: listing.photos,
      photoPrivacyConfirmed: listing.photoPrivacyConfirmed,
    });
    setListingStatus(listing.status);
    setPublicationErrors([]);
    setPublicationNotice("");
    setManagementNotice("");
    setQuestionUpdateNotice("");
  }

  function startSelectedCheckoutHold() {
    if (!selectedCheckoutAllowance?.allowed) return;
    if (!selectedBuyer || !selectedSessionListing) return;
    const actionNowMs = demoClockPaused ? clockNowMs : Date.now() + clockOffsetMs;
    setClockNowMs(actionNowMs);

    setCheckoutState((currentState) =>
      startCheckoutHold(currentState, {
        buyerId: selectedBuyer.id,
        sellerId: selectedSessionListing.sellerId,
        listingId: selectedSessionListing.id,
        listingTitle: selectedSessionListing.title,
        transactionPrice: selectedSessionListing.price,
        snapshot: {
          sellerPublicName: selectedListingSeller.publicName,
          title: selectedSessionListing.title,
          category: selectedSessionListing.category,
          description: selectedSessionListing.description,
          conditionDisclosure: selectedSessionListing.conditionDisclosure,
          conditionGrade: selectedSessionListing.condition,
          specifications: selectedSessionListing.specifications,
          includedParts: selectedSessionListing.includedParts,
          photos: selectedSessionListing.photos,
          transactionPrice: selectedSessionListing.price,
        },
        nowMs: actionNowMs,
      }),
    );
    setCheckoutNotice("");
    setCompletedCheckoutCommitmentId(null);
    openCheckoutStage(selectedSessionListing.id);
  }

  function advanceSelectedHoldToExpiryBoundary() {
    if (!selectedBuyerHold) return;
    setDemoClockPaused(true);
    setClockOffsetMs(selectedBuyerHold.expiresAtMs - 1000 - Date.now());
    setClockNowMs(selectedBuyerHold.expiresAtMs - 1000);
  }

  function expireSelectedHold() {
    if (!selectedBuyerHold) return;
    setClockOffsetMs(selectedBuyerHold.expiresAtMs - Date.now());
    setClockNowMs(selectedBuyerHold.expiresAtMs);
    setDemoClockPaused(false);
    setCheckoutState((currentState) =>
      expireCheckoutHolds(currentState, selectedBuyerHold.expiresAtMs),
    );
    setCheckoutNotice(
      "Checkout Hold expired. The item returned to sale with no commitment or money movement.",
    );
  }

  function abandonSelectedHold() {
    if (!selectedBuyerHold) return;
    setCheckoutState((currentState) =>
      endCheckoutHold(
        currentState,
        selectedBuyerHold.buyerId,
        selectedBuyerHold.listingId,
      ),
    );
    setCheckoutNotice("Checkout abandoned. The item returned to sale with no commitment.");
  }

  function simulateFailedSelectedPayment() {
    if (!selectedBuyerHold) return;
    setCheckoutState((currentState) =>
      endCheckoutHold(
        currentState,
        selectedBuyerHold.buyerId,
        selectedBuyerHold.listingId,
      ),
    );
    setCheckoutNotice("Simulated payment failed. The item returned to sale with no commitment.");
  }

  function simulateSuccessfulSelectedPayment() {
    if (!selectedBuyerHold || !selectedSessionListing) return;
    const actionNowMs = demoClockPaused ? clockNowMs : Date.now() + clockOffsetMs;
    const nextState = completeSimulatedPayment(checkoutState, {
      buyerId: selectedBuyerHold.buyerId,
      sellerId: selectedSessionListing.sellerId,
      listingId: selectedBuyerHold.listingId,
      nowMs: actionNowMs,
      activePurchaseLimit: selectedTierProgress?.activePurchaseLimit ?? 1,
    });
    const createdCommitment = nextState.commitments.find(
      (commitment) =>
        !checkoutState.commitments.some((current) => current.id === commitment.id),
    );
    const commitmentCreated = Boolean(createdCommitment);
    setCheckoutState(nextState);
    if (createdCommitment) {
      setHandoverStates((current) => ({
        ...current,
        [createdCommitment.id]: createInitialHandoverState({
          commitmentId: createdCommitment.id,
          buyerId: createdCommitment.buyerId,
          sellerId: createdCommitment.sellerId,
          listingId: createdCommitment.listingId,
          committedAtMs: createdCommitment.createdAtMs,
          buyerTier: buyerTierLabel(selectedTierProgress?.tier ?? "Verified"),
        }),
      }));
      setSafetyStates((current) => ({
        ...current,
        [createdCommitment.id]: createInitialSafetyState({
          transactionId: createdCommitment.id,
          buyerId: createdCommitment.buyerId,
          sellerId: createdCommitment.sellerId,
        }),
      }));
    }
    setCheckoutNotice(
      commitmentCreated
        ? "Simulated payment succeeded. Purchase Commitment, unchangeable Purchase Snapshot, and simulated Escrow created."
        : "Simulated payment did not complete. The hold expired or the buyer reached the active purchase limit.",
    );
    setCompletedCheckoutCommitmentId(createdCommitment?.id ?? null);
  }

  function publishListing() {
    const errors = [];

    if (!title.trim()) {
      errors.push("Add a title");
    }

    const numericPrice = Number(price);
    const selectedPhotos = [
      completePhotoIncluded ? "Complete-item view" : null,
      detailPhotoIncluded ? "Detail view" : null,
      secondDetailPhotoIncluded ? "Second detail view" : null,
      defectPhotoIncluded ? "Defect view" : null,
    ].filter((photo): photo is string => photo !== null);
    if (!Number.isInteger(numericPrice) || numericPrice <= 0) {
      errors.push("Add a fixed rupiah price");
    }

    if (!description.trim()) {
      errors.push("Add a description");
    }

    if (!conditionDisclosure.trim()) {
      errors.push("Add a written Condition Disclosure");
    }

    if (!specifications.trim()) {
      errors.push("Add relevant measurements or specifications");
    }

    if (!includedParts.trim()) {
      errors.push("Describe the included parts");
    }

    if (!APPROVED_DISCOVERY_CATEGORIES.some((approvedCategory) => approvedCategory === category)) {
      errors.push("Choose an approved category");
    }

    if (!conditionGrades.includes(conditionGrade as (typeof conditionGrades)[number])) {
      errors.push("Choose one of the five Condition Grades");
    }

    if (itemType !== "One portable item") {
      errors.push("List one portable item only");
    }

    const normalizedDisclosure = conditionDisclosure
      .trim()
      .toLowerCase()
      .replace(/[.!]+$/, "");
    if (
      hasKnownDefects &&
      (!normalizedDisclosure || normalizedDisclosure === "no known defects")
    ) {
      errors.push("Describe every known defect in writing; a photo cannot replace it");
    }

    if (!completePhotoIncluded) {
      errors.push("Include at least one complete-item photo");
    }

    if (selectedPhotos.length < 3) {
      errors.push("Add at least three actual-item photos");
    }

    if (!photoPrivacyConfirmed) {
      errors.push("Confirm photos exclude private details and location metadata");
    }

    setPublicationNotice("");

    if (errors.length) {
      setPublicationErrors(errors);
      return;
    }

    const nextPublishedListing: PublishedListing = {
      title: title.trim(),
      category,
      conditionGrade,
      price: numericPrice,
      description: description.trim(),
      conditionDisclosure: conditionDisclosure.trim(),
      specifications: specifications.trim(),
      includedParts: includedParts.trim(),
      photos: selectedPhotos,
      photoPrivacyConfirmed,
    };

    if (
      selectedPendingQuestion &&
      JSON.stringify(nextPublishedListing) === JSON.stringify(publishedListing)
    ) {
      setPublicationErrors([
        "Change at least one shared listing detail to answer this request",
      ]);
      return;
    }

    setPublicationErrors([]);
    setPublishedListing(nextPublishedListing);
    setSessionListings((currentListings) =>
      currentListings.map((listing) =>
        listing.id === selectedListingId
          ? {
              ...listing,
              title: nextPublishedListing.title,
              category: nextPublishedListing.category as SessionListing["category"],
              condition: nextPublishedListing.conditionGrade as SessionListing["condition"],
              price: nextPublishedListing.price,
              description: nextPublishedListing.description,
              conditionDisclosure: nextPublishedListing.conditionDisclosure,
              specifications: nextPublishedListing.specifications,
              includedParts: nextPublishedListing.includedParts,
              photos: nextPublishedListing.photos,
              photoPrivacyConfirmed: nextPublishedListing.photoPrivacyConfirmed,
              status: "active",
            }
          : listing,
      ),
    );
    setListingStatus("active");
    setManagementNotice("");
    setPublicationNotice("Listing published - simulated activity");

    if (selectedPendingQuestion) {
      setQuestionUpdateNotice(
        `Shared listing updated for ${selectedPendingQuestion} - simulated activity`,
      );
      setPendingQuestion(null);
    }
  }

  function deactivateListing() {
    setListingStatus("deactivated");
    setSessionListings((currentListings) =>
      currentListings.map((listing) =>
        listing.id === selectedListingId
          ? { ...listing, status: "deactivated" }
          : listing,
      ),
    );
    setPublicationNotice("");
    setManagementNotice("Listing deactivated - simulated activity");
  }

  function markCrossListedUnavailable() {
    setListingStatus("cross-listed-unavailable");
    setSessionListings((currentListings) =>
      currentListings.map((listing) =>
        listing.id === selectedListingId
          ? { ...listing, status: "cross-listed-unavailable" }
          : listing,
      ),
    );
    setPublicationNotice("");
    setManagementNotice("Cross-listed item marked unavailable - simulated activity");
  }

  function requestListingUpdate() {
    setPendingQuestion({
      listingId: selectedListingId,
      question: selectedQuestion,
    });
    setQuestionUpdateNotice("");
  }

  function currentActionNowMs() {
    return demoClockPaused ? clockNowMs : Date.now() + clockOffsetMs;
  }


  function updateBuyerTrust(
    buyerId: string,
    update: (state: TrustState) => TrustState,
  ) {
    setTrustStates((current) =>
      current[buyerId]
        ? { ...current, [buyerId]: update(current[buyerId]) }
        : current,
    );
  }
  function updateSelectedBuyerTrust(
    update: (state: TrustState) => TrustState,
  ) {
    if (!selectedBuyer) return;
    setTrustStates((current) => ({
      ...current,
      [selectedBuyer.id]: update(current[selectedBuyer.id]),
    }));
  }

  function recordGuidedSuccessfulHandover() {
    const nowMs = currentActionNowMs();
    updateSelectedBuyerTrust((state) =>
      recordSuccessfulHandover(state, {
        sellerId: selectedQualifyingSellerId,
        nowMs,
      }),
    );
  }

  function addGuidedReliabilityStrike() {
    const nowMs = currentActionNowMs();
    updateSelectedBuyerTrust((state) =>
      addReliabilityStrike(state, {
        id: `guided-strike-${state.strikes.length + 1}-${nowMs}`,
        reason: "Private simulated Reliability Strike",
        issuedAtMs: nowMs,
      }),
    );
  }

  function clearGuidedOrdinaryIssue() {
    const nowMs = currentActionNowMs();
    updateSelectedBuyerTrust((state) => {
      let next = state.strikes
        .filter((strike) => strike.expiresAtMs > nowMs)
        .reduce(
          (current, strike) => clearReliabilityStrike(current, strike.id, nowMs),
          state,
        );
      next = clearTrustBlocker(next, "active-dispute");
      next = clearTrustBlocker(next, "payment-reversal");
      return clearTrustBlocker(next, "confirmed-safety-finding");
    });
  }

  function setGuidedStrikeBoundary(offsetMs: number) {
    if (!selectedTierProgress?.strikeExpiresAtMs) return;
    const timestampMs = selectedTierProgress.strikeExpiresAtMs + offsetMs;
    setDemoClockPaused(true);
    setClockOffsetMs(timestampMs - Date.now());
    setClockNowMs(timestampMs);
  }

  function applyHandoverResult(
    result: HandoverActionResult,
    successNotice: string,
  ) {
    const commitmentId = result.state.commitmentId;
    if (visibleContactBlocked) {
      setHandoverNotices((current) => ({
        ...current,
        [commitmentId]:
          "Action blocked: contact is unavailable during the private safety process.",
      }));
      return null;
    }
    if (result.ok) {
      const previousHandoverState = handoverStates[commitmentId];
      if (result.state.activeDispute && !previousHandoverState?.activeDispute) {
        updateBuyerTrust(result.state.buyerId, (state) =>
          activateTrustBlocker(state, {
            kind: "active-dispute",
            reason: "Private simulated Active Dispute",
            appealPath: "Open the private dispute review",
          }),
        );
      } else if (
        previousHandoverState?.activeDispute &&
        !result.state.activeDispute
      ) {
        updateBuyerTrust(result.state.buyerId, (state) =>
          clearTrustBlocker(state, "active-dispute"),
        );
      }
      setHandoverStates((current) => ({ ...current, [commitmentId]: result.state }));
      setHandoverNotices((current) => ({ ...current, [commitmentId]: successNotice }));
      return result.state;
    }

    setHandoverNotices((current) => ({
      ...current,
      [commitmentId]: `Action blocked: ${result.reason.replaceAll("-", " ")}.`,
    }));
    return null;
  }

  function applyHandoverResultAndFinalize(
    result: HandoverActionResult,
    successNotice: string,
  ) {
    const completed = applyHandoverResult(result, successNotice);
    const successRecord = completed?.successRecord;
    if (successRecord && visibleHandoverCommitment) {
      updateBuyerTrust(completed.buyerId, (state) =>
        recordSuccessfulHandover(state, {
          sellerId: completed.sellerId,
          nowMs: successRecord.completedAtMs,
        }),
      );
      setCheckoutState((current) =>
        finalizePurchaseCommitment(
          current,
          visibleHandoverCommitment.id,
          successRecord.completedAtMs,
        ),
      );
    }
    return completed;
  }

  function applyHandoverFailure(result: HandoverActionResult, successNotice: string) {
    const completed = applyHandoverResult(result, successNotice);
    if (!completed?.failureRecord) return;
    const reliabilityStrike = completed.failureRecord.reliabilityStrikes[0];
    if (reliabilityStrike) {
      const struckMemberId =
        reliabilityStrike.party === "buyer" ? completed.buyerId : completed.sellerId;
      updateBuyerTrust(struckMemberId, (state) =>
        addReliabilityStrike(state, {
          id: `handover-${completed.commitmentId}-${reliabilityStrike.party}`,
          reason: reliabilityStrike.reason,
          issuedAtMs: completed.failureRecord!.endedAtMs,
        }),
      );
    }

    setCheckoutState((current) =>
      refundPurchaseCommitment(
        current,
        completed.commitmentId,
        completed.failureRecord!.endedAtMs,
        "No successful handover",
      ),
    );
    const nextListingStatus: ListingStatus =
      completed.failureRecord.listingStatus === "For Sale"
        ? "active"
        : completed.failureRecord.listingStatus === "Paused"
          ? "paused"
          : "removed";
    setSessionListings((current) =>
      current.map((listing) =>
        listing.id === completed.listingId ? { ...listing, status: nextListingStatus } : listing,
      ),
    );
    if (completed.listingId === selectedListingId) setListingStatus(nextListingStatus);
  }

  function applySafetyResult(
    result: SafetyActionResult,
    successNotice: string,
  ) {
    const commitmentId = result.state.transactionId;
    if (result.ok) {
      setSafetyStates((current) => ({
        ...current,
        [commitmentId]: result.state,
      }));
      setHandoverNotices((current) => ({
        ...current,
        [commitmentId]: successNotice,
      }));
      return;
    }
    setHandoverNotices((current) => ({
      ...current,
      [commitmentId]: "Safety action blocked: " + result.reason.replaceAll("-", " ") + ".",
    }));
  }

  function reportVisibleSafety(
    category: SafetyCategory,
    description: string,
    evidenceLabel?: string,
  ) {
    if (!visibleSafetyState || !visibleHandoverCommitment) return;
    const reportedMemberId =
      selectedAccountId === visibleHandoverCommitment.buyerId
        ? visibleHandoverCommitment.sellerId
        : visibleHandoverCommitment.buyerId;
    const escrowStatus = visibleHandoverCommitment.escrowStatus.startsWith("Held")
      ? "held"
      : visibleHandoverCommitment.escrowStatus.startsWith("Released")
        ? "released"
        : "refunded";
    applySafetyResult(
      fileSafetyReport(visibleSafetyState, {
        reportId: "safety-" + visibleHandoverCommitment.id,
        actorId: selectedAccountId,
        reportedMemberId,
        category,
        description,
        evidenceLabel,
        credibleImmediateDanger: category === "immediate-physical-danger",
        reportedAtMs: currentActionNowMs(),
        transaction: {
          status:
            visibleHandoverCommitment.lifecycleStatus === "Active"
              ? "active"
              : "final",
          paid: true,
          escrowStatus,
        },
      }),
      category === "immediate-physical-danger" &&
        visibleHandoverCommitment.lifecycleStatus === "Active"
        ? "Private Safety Report submitted. Contact is blocked and the paid transaction is on Safety Hold."
        : "Private Safety Report submitted for guided prototype review. Completed settlement is unchanged.",
    );
  }

  function reviewVisibleSafety(outcome: "confirmed" | "dismissed") {
    if (!visibleSafetyState || !visibleHandoverCommitment) return;
    const result = reviewSafetyReport(visibleSafetyState, {
      reviewerId: "simulated-reviewer-1",
      outcome,
      redactedOutcome:
        outcome === "confirmed"
          ? "A simulated reviewer confirmed serious safety misconduct without identifying the reporter."
          : "The guided prototype review did not confirm the private allegation.",
      reviewedAtMs: currentActionNowMs(),
    });
    applySafetyResult(
      result,
      outcome === "confirmed"
        ? "Written confirmed finding recorded privately. The active transaction was resolved with a full simulated refund and an account restriction."
        : "Written dismissed outcome recorded. No Trust Record effect or lasting restriction was created.",
    );
    const reportedBuyerId = result.state.report?.reportedMemberId;
    if (
      result.ok &&
      outcome === "confirmed" &&
      reportedBuyerId &&
      demoBuyers.some((buyer) => buyer.id === reportedBuyerId)
    ) {
      updateBuyerTrust(reportedBuyerId, (state) =>
        permanentlyBlockHigherTiers(state, {
          kind: "serious-safety-misconduct",
          reason: "Private confirmed simulated safety finding",
          appealPath: "Submit a Safety Appeal",
        }),
      );
    }
    if (
      !result.ok ||
      outcome !== "confirmed" ||
      visibleHandoverCommitment.lifecycleStatus !== "Active"
    ) {
      return;
    }
    setCheckoutState((current) =>
      refundPurchaseCommitment(
        current,
        visibleHandoverCommitment.id,
        currentActionNowMs(),
        "No successful handover",
      ),
    );
    setSessionListings((current) =>
      current.map((listing) =>
        listing.id === visibleHandoverCommitment.listingId
          ? { ...listing, status: "paused" }
          : listing,
      ),
    );
    if (visibleHandoverCommitment.listingId === selectedListingId) {
      setListingStatus("paused");
    }
  }

  function appealVisibleSafety(response: string) {
    if (!visibleSafetyState) return;
    applySafetyResult(
      submitSafetyAppeal(visibleSafetyState, {
        actorId: selectedAccountId,
        response,
        submittedAtMs: currentActionNowMs(),
      }),
      "One Safety Appeal submitted to a different simulated reviewer. Applicable restrictions remain.",
    );
  }

  function resolveVisibleSafetyAppeal(outcome: "upheld" | "overturned") {
    if (!visibleSafetyState) return;
    const result = resolveSafetyAppeal(visibleSafetyState, {
      reviewerId: "simulated-reviewer-2",
      outcome,
      writtenOutcome:
        outcome === "upheld"
          ? "A different simulated reviewer upheld the written finding."
          : "A different simulated reviewer overturned the finding and removed its lasting restriction.",
      resolvedAtMs: currentActionNowMs(),
    });
    applySafetyResult(
      result,
      outcome === "upheld"
        ? "Final written appeal outcome: finding upheld."
        : "Final written appeal outcome: finding overturned.",
    );
    const reportedBuyerId = result.state.report?.reportedMemberId;
    if (result.ok && outcome === "overturned" && reportedBuyerId) {
      updateBuyerTrust(reportedBuyerId, clearOverturnedPermanentTierBlock);
    }
  }

  function setVisibleAppealTime(timestampMs: number) {
    setDemoClockPaused(true);
    setClockOffsetMs(timestampMs - Date.now());
    setClockNowMs(timestampMs);
  }

  function setVisibleBoundaryTime(boundary: string) {
    if (!visibleHandoverState) return;
    const scheduleStart = visibleHandoverState.schedule?.window.startsAtMs;
    const agreementDeadlineBase =
      visibleHandoverState.meetingNumber > 1 && visibleHandoverState.proposal
        ? visibleHandoverState.proposal.proposedAtMs
        : visibleHandoverState.committedAtMs;
    const timestampByBoundary: Record<string, number> = {
      "proposal-exact": visibleHandoverState.committedAtMs + SELLER_PROPOSAL_DEADLINE_MS,
      "proposal-after": visibleHandoverState.committedAtMs + SELLER_PROPOSAL_DEADLINE_MS + 1,
      "agreement-exact": agreementDeadlineBase + SCHEDULE_AGREEMENT_DEADLINE_MS,
      "agreement-after": agreementDeadlineBase + SCHEDULE_AGREEMENT_DEADLINE_MS + 1,
      "handover-exact": visibleHandoverState.committedAtMs + HANDOVER_START_DEADLINE_MS,
      "handover-after": visibleHandoverState.committedAtMs + HANDOVER_START_DEADLINE_MS + 1,
      "cancel-before": (scheduleStart ?? 0) - SELLER_PROPOSAL_DEADLINE_MS - 1,
      "cancel-exact": (scheduleStart ?? 0) - SELLER_PROPOSAL_DEADLINE_MS,
      "no-show-exact": (scheduleStart ?? 0) + NO_SHOW_GRACE_MS,
      "no-show-after": (scheduleStart ?? 0) + NO_SHOW_GRACE_MS + 1,
    };
    advanceToHandoverWindow(timestampByBoundary[boundary] ?? currentActionNowMs());
  }

  function expireVisibleScheduling(overdueParty: "buyer" | "seller" | null) {
    if (!visibleHandoverState) return;
    applyHandoverFailure(
      expireScheduling(visibleHandoverState, { expiredAtMs: clockNowMs, overdueParty }),
      overdueParty ? `Scheduling Expiry: ${overdueParty} response was overdue.` : "Scheduling Expiry: no compatible availability; neither party is penalized.",
    );
  }

  function cancelVisibleHandover() {
    if (!visibleHandoverState) return;
    applyHandoverFailure(
      cancelHandover(visibleHandoverState, { party: selectedBuyer ? "buyer" : "seller", cancelledAtMs: clockNowMs }),
      "Cancellation recorded. A full simulated refund was issued.",
    );
  }

  function reportVisibleNoShow(absentParty: "buyer" | "seller") {
    if (!visibleHandoverState) return;
    applyHandoverFailure(
      reportNoShow(visibleHandoverState, { absentParty, reportedAtMs: clockNowMs }),
      `${absentParty === "buyer" ? "Buyer" : "Seller"} No-Show recorded after the grace period.`,
    );
  }

  function reportVisibleSellerUnavailability(reason: SellerUnavailabilityReason) {
    if (!visibleHandoverState) return;
    applyHandoverFailure(
      reportSellerUnavailability(visibleHandoverState, { unavailabilityReason: reason, reportedAtMs: clockNowMs }),
      "Seller Unavailability recorded. The item was removed and a full simulated refund was issued.",
    );
  }
  function proposeVisibleHandover(point: HandoverPoint) {
    if (!visibleHandoverState) return;
    const result = sellerProposeHandover(visibleHandoverState, {
      proposedAtMs: currentActionNowMs(),
      point,
      windows: createDemoHandoverWindows(visibleHandoverState.committedAtMs).proposed,
    });
    applyHandoverResult(result, "Seller proposal recorded within the simulated two-hour deadline.");
  }

  function acceptVisibleHandover(windowId: string) {
    if (!visibleHandoverState) return;
    applyHandoverResult(
      buyerAcceptHandover(visibleHandoverState, {
        windowId,
        acceptedAtMs: currentActionNowMs(),
      }),
      "Handover Schedule accepted by the buyer.",
    );
  }

  function requestVisibleAdjustment() {
    if (!visibleHandoverState) return;
    applyHandoverResult(
      buyerRequestScheduleAdjustment(visibleHandoverState, {
        requestedAtMs: currentActionNowMs(),
        window: createDemoHandoverWindows(visibleHandoverState.committedAtMs).adjustment,
      }),
      "Buyer adjustment requested; the existing schedule remains unchanged until seller approval.",
    );
  }

  function approveVisibleAdjustment() {
    if (!visibleHandoverState) return;
    applyHandoverResult(
      sellerApproveScheduleAdjustment(visibleHandoverState, {
        approvedAtMs: currentActionNowMs(),
      }),
      "Seller approved the buyer adjustment. The updated Handover Schedule is accepted.",
    );
  }

  function advanceToHandoverWindow(timestampMs: number) {
    if (visibleContactBlocked) {
      if (visibleHandoverCommitment) {
        setHandoverNotices((current) => ({
          ...current,
          [visibleHandoverCommitment.id]:
            "Action blocked: contact is unavailable during the private safety process.",
        }));
      }
      return;
    }
    const outsideAcceptedWindow = Boolean(
      visibleHandoverState?.schedule &&
        timestampMs > visibleHandoverState.schedule.window.endsAtMs,
    );
    setDemoClockPaused(true);
    setClockOffsetMs(timestampMs - Date.now());
    setClockNowMs(timestampMs);
    if (visibleHandoverCommitment) {
      setHandoverNotices((current) => ({
        ...current,
        [visibleHandoverCommitment.id]: outsideAcceptedWindow
          ? "Outside the accepted handover window."
          : "Demo clock advanced into the accepted Handover Schedule.",
      }));
    }
  }

  function closeVisibleIncompleteHandover() {
    if (!visibleHandoverState) return;
    applyHandoverResult(
      closeIncompleteHandoverMeeting(visibleHandoverState, {
        actorId: selectedAccountId,
        closedAtMs: currentActionNowMs(),
      }),
      "Incomplete handover evidence preserved. Remote confirmation is unavailable after separation.",
    );
  }

  function proposeVisibleRepeatHandover() {
    if (!visibleHandoverState?.schedule) return;
    applyHandoverResult(
      sellerProposeRepeatHandover(visibleHandoverState, {
        actorId: selectedAccountId,
        proposedAtMs: currentActionNowMs(),
        point: visibleHandoverState.schedule.point,
        windows: createDemoHandoverWindows(visibleHandoverState.committedAtMs).repeat,
      }),
      "Seller proposed a repeat meeting under the same handover rules.",
    );
  }

  function openVisibleIncompleteHandoverDispute() {
    if (!visibleHandoverState) return;
    applyHandoverResult(
      openIncompleteHandoverDispute(visibleHandoverState, {
        actorId: selectedAccountId,
        openedAtMs: currentActionNowMs(),
      }),
      "Active Dispute opened for guided prototype review. Simulated Escrow remains held.",
    );
  }

  function recordVisiblePresence(
    party: "buyer" | "seller",
    simulation: PresenceSimulation,
  ) {
    if (!visibleHandoverState) return;
    const result = recordHandoverPresence(visibleHandoverState, {
      party,
      timestampMs: currentActionNowMs(),
      locationAvailable: simulation.locationAvailable,
      accuracyState: simulation.accuracyState,
      accuracyM: simulation.accuracyM,
      distanceFromPointM: simulation.distanceFromPointM,
    });
    const partyName = party === "buyer" ? "Buyer" : "Seller";
    const notice =
      simulation.value === "boundary" && result.ok && result.state.buyerPresence?.eligible
        ? "Buyer eligible at the 100 m boundary."
        : simulation.value === "poor"
          ? `${partyName} not eligible: reported accuracy is poor.`
          : simulation.value === "unavailable"
            ? `${partyName} not eligible: location is unavailable.`
            : simulation.value === "outside"
              ? `${partyName} not eligible: outside the 100 m area.`
              : `${partyName} Presence Check recorded.`;
    applyHandoverResult(result, notice);
  }

  function confirmVisibleBuyerHandover() {
    if (!visibleHandoverState) return;
    const result = buyerConfirmHandover(visibleHandoverState, {
      actorId: selectedAccountId,
      confirmedAtMs: currentActionNowMs(),
    });
    applyHandoverResultAndFinalize(
      result,
      result.ok && result.state.successRecord
        ? "Matching confirmations recorded. The sale is final and simulated payout is released."
        : "Buyer confirmation recorded. Simulated Escrow remains held until the Seller confirms.",
    );
  }

  function confirmVisibleSellerHandover() {
    if (!visibleHandoverState) return;
    const result = sellerConfirmHandover(visibleHandoverState, {
      actorId: selectedAccountId,
      confirmedAtMs: currentActionNowMs(),
    });
    applyHandoverResultAndFinalize(
      result,
      result.ok && result.state.successRecord
        ? "Matching confirmations recorded. The sale is final and simulated payout is released."
        : "Seller confirmation recorded. Simulated Escrow remains held until the Buyer confirms.",
    );
  }

  function applyMismatchListingDisposition(state: HandoverState) {
    const disposition = state.materialMismatchClaim?.listingDisposition;
    if (!disposition || disposition === "unchanged") return;
    const status: ListingStatus =
      disposition === "removed-for-fraud-review"
        ? "removed-fraud-review"
        : "paused-for-correction";
    setSessionListings((current) =>
      current.map((listing) =>
        listing.id === state.listingId ? { ...listing, status } : listing,
      ),
    );
  }

  function refundVisibleMismatch(state: HandoverState) {
    if (!visibleHandoverCommitment) return;
    setCheckoutState((current) =>
      refundPurchaseCommitment(
        current,
        visibleHandoverCommitment.id,
        currentActionNowMs(),
        "Material mismatch refund",
      ),
    );
    applyMismatchListingDisposition(state);
  }

  function raiseVisibleMaterialMismatch(
    reason: MaterialMismatchReason,
    description: string,
    photoLabel?: string,
  ) {
    if (!visibleHandoverState) return;
    const next = applyHandoverResult(
      raiseMaterialMismatchClaim(visibleHandoverState, {
        actorId: selectedAccountId,
        raisedAtMs: currentActionNowMs(),
        reason,
        description,
        photoLabel,
      }),
      "Material Mismatch Claim recorded against the immutable Purchase Snapshot.",
    );
    if (next) applyMismatchListingDisposition(next);
  }

  function respondToVisibleMaterialMismatch(
    response: "acknowledged" | "contested",
  ) {
    if (!visibleHandoverState) return;
    const next = applyHandoverResult(
      respondToMaterialMismatchClaim(visibleHandoverState, {
        actorId: selectedAccountId,
        respondedAtMs: currentActionNowMs(),
        response,
      }),
      response === "acknowledged"
        ? "Seller acknowledged the Material Mismatch; a full simulated refund was recorded."
        : "Seller contested the Material Mismatch; simulated Escrow remains held in an Active Dispute.",
    );
    if (!next) return;
    if (response === "acknowledged") refundVisibleMismatch(next);
    else applyMismatchListingDisposition(next);
  }

  function resolveVisibleMaterialMismatch() {
    if (!visibleHandoverState) return;
    const next = applyHandoverResult(
      resolveMaterialMismatchDispute(visibleHandoverState),
      "Guided prototype review recorded a full simulated refund.",
    );
    if (next) refundVisibleMismatch(next);
  }
  function resetDemo() {
    setActiveWorkspace("buyer");
    setSelectedAccountId(demoBuyer.id);
    setCheckoutState(createInitialCheckoutState());
    setCheckoutNotice("");
    setHandoverStates({});
    setHandoverNotices({});
    setSafetyStates({});
    setTrustStates(createInitialTrustStates());
    setSelectedQualifyingSellerId(demoSellers[0].id);
    setClockOffsetMs(0);
    setClockNowMs(Date.now());
    setDemoClockPaused(false);
    setSessionListings(createInitialSessionListings());
    setSelectedListingId(demoListing.id);
    setTitle(demoListing.title);
    setCategory(demoListing.category);
    setConditionGrade(demoListing.condition);
    setPrice("185000");
    setDescription(demoListing.description);
    setSpecifications(initialPublishedListing.specifications);
    setIncludedParts(initialPublishedListing.includedParts);
    setItemType("One portable item");
    setHasKnownDefects(true);
    setConditionDisclosure(initialPublishedListing.conditionDisclosure);
    setCompletePhotoIncluded(true);
    setDetailPhotoIncluded(true);
    setSecondDetailPhotoIncluded(true);
    setDefectPhotoIncluded(false);
    setPhotoPrivacyConfirmed(true);
    setPublicationErrors([]);
    setPublicationNotice("");
    setPublishedListing(initialPublishedListing);
    setListingStatus("active");
    setManagementNotice("");
    setSelectedQuestion(structuredQuestions[0]);
    setPendingQuestion(null);
    setQuestionUpdateNotice("");
    setBrowsingLocation("current");
    setBrowsingLocationSnapshot(initialBrowsingLocationSnapshot);
    setDiscoveryCategory("All");
    setMapRendering("ready");
    setDiscoveryView("map");
    window.localStorage.setItem(discoveryViewStorageKey, "map");
    setPanelStages([]);
    setCompletedCheckoutCommitmentId(null);
    setMapZoom(14);
    setMapInstanceKey((current) => current + 1);
    setMapStatus("Buyer-centered view ready");
    setDiscoveryAnnouncement("Demo reset with simulated snapshot 1");
    setResetConfirmationOpen(false);
    setDemoControlsOpen(false);
  }

  function renderDiscoveryState() {
    if (discoveryOutcome.kind === "results") return null;

    if (discoveryOutcome.kind === "location-denied") {
      return (
        <section aria-label="Nearby discovery status" className="demo-state-card">
          <p className="eyebrow">Simulated Browsing Location · Bandung</p>
          <h1>Location permission denied</h1>
          <p>Choose a simulated replacement and refresh. No discovery request was run.</p>
          <button className="button button-primary" onClick={refreshNearbyListings}>
            Refresh nearby listings
          </button>
        </section>
      );
    }

    if (discoveryOutcome.kind === "location-unavailable") {
      return (
        <section aria-label="Nearby discovery status" className="demo-state-card">
          <p className="eyebrow">Simulated Browsing Location · Bandung</p>
          <h1>Location unavailable</h1>
          <p>Try a new simulated snapshot when location is available.</p>
          <button className="button button-primary" onClick={refreshNearbyListings}>
            Refresh nearby listings
          </button>
        </section>
      );
    }

    if (discoveryOutcome.kind === "stale-location") {
      return (
        <section aria-label="Nearby discovery status" className="demo-state-card">
          <p className="eyebrow">Simulated Browsing Location · Bandung</p>
          <h1>Browsing Location needs refresh</h1>
          <p>The resumed session is stale. Refresh explicitly to continue nearby discovery.</p>
          <button className="button button-primary" onClick={refreshNearbyListings}>
            Refresh nearby listings
          </button>
        </section>
      );
    }

    if (discoveryOutcome.kind === "discovery-failure") {
      return (
        <section aria-label="Nearby discovery status" className="demo-state-card">
          <p className="eyebrow">Simulated Browsing Location · Bandung</p>
          <h1>Nearby discovery unavailable</h1>
          <p>Your snapshot is valid, but discovery failed. This is not an empty result.</p>
        </section>
      );
    }

    if (discoveryOutcome.kind === "category-empty") {
      return (
        <section
          aria-label="Nearby discovery status"
          className="demo-state-card marketplace-empty"
        >
          <p className="eyebrow">Nearby Demo Listings - Simulation</p>
          <h1>No {discoveryCategoryLabels[discoveryOutcome.category]} listings nearby</h1>
          <p>Other nearby listings may still be available.</p>
          <button
            className="button button-primary"
            onClick={() => {
              setDiscoveryCategory("All");
              setDiscoveryAnnouncement("All categories restored; nearby results updated.");
            }}
          >
            Show All categories
          </button>
        </section>
      );
    }

    return (
      <section
        aria-label="Nearby discovery status"
        className="demo-state-card marketplace-empty"
      >
        <p className="eyebrow">Nearby Demo Listings - Simulation</p>
        <h1>No nearby listings yet</h1>
        <p>The valid 2 km discovery result is empty. The radius was not widened.</p>
        <div className="empty-state-actions">
          <button className="button button-primary" onClick={refreshNearbyListings}>
            Refresh nearby listings
          </button>
          <button
            className="button button-outline"
            onClick={() => {
              setSelectedAccountId(demoSeller.id);
              const nextListing = sessionListings.find(
                (listing) => listing.sellerId === demoSeller.id,
              );
              if (nextListing) loadListingForEditing(nextListing);
              setActiveWorkspace("seller");
            }}
          >
            Sell an item nearby
          </button>
        </div>
      </section>
    );
  }

  function renderDiscoveryList() {
    return (
      <section aria-label="Demo marketplace listings" className="discovery-panel-list">
        <div className="inventory-heading discovery-heading">
          <div>
            <p className="eyebrow">Nearby Demo Listings - Simulation</p>
            <h2>{visibleDemoListings.length} nearby simulated listings</h2>
            <p>
              Map and List use the same fixed 2 km discovery result. Viewport changes never
              search a new area or change eligibility.
            </p>
          </div>
        </div>

        {mapFallbackActive ? (
          <section aria-label="Map Fallback" className="discovery-recovery" role="status">
            <h3>Map unavailable — showing List View</h3>
            <p>
              The same results, Browsing Location, Category Filter, and Distance Bands remain
              unchanged for this session.
            </p>
            <button className="button button-primary" onClick={retryMap}>
              Retry map
            </button>
          </section>
        ) : null}

        <div className="discovery-grid">
          {visibleDemoListings.map(({ listing, distanceBand }) => {
            const seller = demoSellers.find(
              (candidate) => candidate.id === listing.sellerId,
            );
            const sellerTrustSummary = seller
              ? getPublicTrustSummary(trustStates[seller.id], clockNowMs)
              : undefined;
            const availabilityLabel = checkoutAvailabilityLabel(
              getListingClaimability(checkoutState, {
                listingId: listing.id,
                viewerId: selectedAccountId,
                nowMs: clockNowMs,
              }),
            );
            return (
              <article
                aria-label={`Nearby simulated listing: ${listing.title}`}
                className="marketplace-listing-card"
                key={listing.id}
              >
                <div
                  aria-label={`Synthetic presentation for ${listing.title}`}
                  className="listing-card-media"
                  role="img"
                >
                  <span aria-hidden="true">{listing.category.slice(0, 1)}</span>
                  <small>Fictional item presentation</small>
                  <strong>{listing.imageLabel}</strong>
                </div>
                <div className="listing-card-content">
                  <div className="listing-card-topline">
                    <span className="fictional-label">Simulated Demo Listing</span>
                    <span className={availabilityLabel ? "listing-availability is-held" : "listing-availability"}>
                      {availabilityLabel ?? "Available"}
                    </span>
                  </div>
                  <h3>{listing.title}</h3>
                  {seller ? (
                    <section
                      aria-label={`Seller credibility: ${seller.publicName}`}
                      className="listing-seller-credibility"
                    >
                      <div className="avatar avatar-seller" aria-hidden="true">
                        {seller.initials}
                      </div>
                      <div>
                        <button
                          className="text-button seller-identity-button"
                          onClick={(event) =>
                            openSellerPreview(seller.id, event.currentTarget)
                          }
                        >
                          {seller.publicName}
                        </button>
                        <span>{seller.identityStatus}</span>
                      </div>
                      <small>
                        {sellerTrustSummary?.successfulHandoverCount ?? 0} successful handovers
                      </small>
                    </section>
                  ) : null}
                  <div className="inventory-facts listing-card-facts">
                    <span>{listing.category}</span>
                    <span>{listing.condition}</span>
                    <span>{distanceBand}</span>
                  </div>
                  <div className="listing-card-footer">
                    <div>
                      <small>Transaction Price</small>
                      <strong>{formatRupiah(listing.price)}</strong>
                    </div>
                    <button
                      className="button button-primary"
                      onClick={(event) =>
                        openListingDetail(listing, event.currentTarget)
                      }
                    >
                      View item
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    );
  }

  function renderSellerPanel() {
    if (!previewSeller || !previewDistanceBand || !previewTrustSummary) {
      return (
        <p className="discovery-panel-empty">
          This Seller has no nearby listings in the current result.
        </p>
      );
    }

    return (
      <SellerPreviewPanel
        seller={previewSeller}
        distanceBand={previewDistanceBand}
        trustSummary={{
          successfulHandoverCount: previewTrustSummary.successfulHandoverCount,
          differentPartnerCount: previewTrustSummary.differentPartnerCount,
          tierLabel: buyerTierLabel(previewTrustSummary.tier),
        }}
        listings={sellerPreviewListings}
        onViewItem={openPreviewListing}
      />
    );
  }

  function renderItemPanel() {
    return (
      <ListingPanel
        sectionRef={listingDetailRef}
        isDiscoverable={listingIsDiscoverable}
        listing={publishedListing}
        seller={selectedListingSeller}
        distanceBand={selectedListingDistanceBand}
        handoverTime={selectedSessionListing?.handoverTime ?? demoListing.handoverTime}
        availabilityLabel={selectedListingAvailabilityLabel}
        notice={listingPanelNotice}
        checkout={listingPanelCheckout}
        onOpenCheckout={() => openCheckoutStage(selectedListingId)}
        questions={{
          options: structuredQuestions,
          selected: selectedQuestion,
          pendingQuestion: selectedPendingQuestion,
          updateNotice: questionUpdateNotice,
          onSelect: setSelectedQuestion,
          onRequestUpdate: requestListingUpdate,
        }}
      />
    );
  }

  function renderCheckoutPanel() {
    const holdCheckout =
      listingPanelCheckout?.kind === "hold" ? listingPanelCheckout : null;

    return (
      <section aria-label="Checkout" className="discovery-checkout-stage">
        <p className="eyebrow">Checkout - Simulation</p>
        <h2>Checkout</h2>
        {holdCheckout ? (
          <CheckoutHoldPanel checkout={holdCheckout} />
        ) : completedCheckoutCommitmentId ? (
          <section aria-label="Checkout complete" className="checkout-panel">
            <h3>Simulated payment succeeded</h3>
            <p>{checkoutNotice}</p>
            <div className="listing-actions">
              <button className="button button-primary" onClick={showOrders}>
                View order
              </button>
              <button className="button button-outline" onClick={closePanel}>
                Back to map
              </button>
            </div>
          </section>
        ) : (
          <section className="checkout-panel">
            <p>No active Checkout Hold.</p>
            {checkoutNotice ? <p role="status">{checkoutNotice}</p> : null}
            <button className="button button-outline" onClick={backPanelStage}>
              Back to item
            </button>
          </section>
        )}
        {holdCheckout && checkoutNotice ? (
          <p role="status">{checkoutNotice}</p>
        ) : null}
      </section>
    );
  }

  function renderChooserPanel() {
    return (
      <section aria-label="Seller chooser" className="seller-preview seller-chooser">
        <div className="seller-preview-heading">
          <div>
            <p className="eyebrow">Shared fictional area</p>
            <h2>Choose a Demo Seller</h2>
          </div>
        </div>
        <p>
          These Sellers share one coarse marker and cannot be separated without inventing
          locations. Choose a fictional Seller to open the same Seller Preview.
        </p>
        <div className="seller-chooser-options">
          {chooserSellers.map((seller) => (
            <button
              className="button button-outline"
              key={seller.id}
              onClick={() => openSellerFromChooser(seller.id)}
            >
              {seller.publicName} · Fictional Demo Seller
              {visibleHeldListings.some(
                ({ listing }) => listing.sellerId === seller.id,
              )
                ? " · Checkout Hold on a Listing"
                : ""}
            </button>
          ))}
        </div>
      </section>
    );
  }

  return (
    <div
      className={`demo-shell ${
        mapScreenActive ? "demo-shell-map" : "demo-shell-workspace"
      }`}
    >
      <header className="demo-header">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            J
          </span>
          <span>jualokal</span>
        </div>
        <div className="demo-header-actions">
          <span
            aria-label="Demo Mode simulation"
            className="demo-header-simulation"
            role="status"
          >
            <span aria-hidden="true">●</span> Demo - simulation
          </span>
          <label className="demo-header-filter">
            Category Filter
            <select
              aria-label="Category Filter"
              onChange={(event) => selectDiscoveryCategory(event.target.value)}
              value={discoveryCategory}
            >
              {discoveryCategoryOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <button className="button button-compact button-outline" onClick={showOrders}>
            Orders
          </button>
          <span className="demo-account-chip">
            <small>{headerRoleLabel}</small>
            <strong>{selectedAccountName}</strong>
          </span>
          <button
            aria-controls="demo-controls-drawer"
            aria-expanded={demoControlsOpen}
            aria-haspopup="dialog"
            className="button button-compact button-primary"
            onClick={openDemoControls}
            ref={demoControlsTriggerRef}
          >
            Demo controls
          </button>
        </div>
      </header>

      {!selectedAccountRestricted && !selectedAccountSuspended ? (
        <section
          aria-hidden={!mapScreenActive}
          aria-label="Seller discovery map"
          className={`demo-map-frame${mapScreenActive ? "" : " is-covered"}${
            panelOpen ? " is-panel-open" : ""
          }`}
          inert={!mapScreenActive}
          role="region"
        >
          {discoveryOutcome.kind === "results" ? (
            <DiscoveryMap
              boundaryCenter={
                browsingLocationSnapshot.kind === "valid" ? buyerPoint : null
              }
              buyer={buyerPoint}
              key={mapInstanceKey}
              markers={discoveryMarkerViews}
              mapFailure={mapRendering === "failed"}
              onFitMaximum={fitMaximumMap}
              onOpenSeller={openSellerPreview}
              onRecenter={recenterMap}
              onSelectGroup={selectSellerMarkerGroup}
              onUseListView={() => openListPanel()}
              onZoomChange={setMapZoom}
              panelOpen={panelOpen}
              ref={discoveryMapRef}
              simulationNote={
                browsingDistanceOverrideKm !== undefined
                  ? "Simulated evaluation scenario"
                  : null
              }
              status={mapStatus}
            />
          ) : (
            <div className="demo-state-screen">{renderDiscoveryState()}</div>
          )}
        </section>
      ) : null}

      {(selectedAccountRestricted || selectedAccountSuspended) && activeWorkspace !== "inventory" ? (
        <main className="demo-main demo-screen" aria-label="Restricted account screen">
          <section aria-label="Restricted simulated account" className="registration-panel">
            <p className="eyebrow">Private account status - Simulation</p>
            <h1>Account unavailable</h1>
            <p>
              Buying and selling are unavailable while this private simulated account
              restriction applies. Other members see only that this account is unavailable,
              never the strike, report, finding, appeal, or restriction reason.
            </p>
          </section>
        </main>
      ) : activeWorkspace === "buyer" ? (
        <>
          <p aria-atomic="true" className="visually-hidden" role="status">
            {discoveryAnnouncement}
          </p>
          <p aria-atomic="true" className="visually-hidden" role="status">
            {checkoutNotice}
          </p>

          {!panelOpen && discoveryOutcome.kind === "results" ? (
            <button
              aria-label={`Open List panel: ${discoveryMarkerViews.length} seller areas, ${visibleDemoListings.length} listings`}
              className="discovery-result-pill"
              onClick={() => openListPanel(resultPillRef.current)}
              ref={resultPillRef}
              type="button"
            >
              <strong>{discoveryMarkerViews.length} seller areas</strong>
              <span aria-hidden="true">·</span>
              <span>{visibleDemoListings.length} listings</span>
              <span className="discovery-result-pill-action">List</span>
            </button>
          ) : null}

          {panelOpen && panelStage ? (
            <DiscoveryPanel
              label={panelLabel}
              onBack={backPanelStage}
              onClose={closePanel}
              ref={discoveryPanelRef}
              stage={panelStage.kind}
              stageKey={panelStageKey}
              title={panelTitle}
            >
              {panelStage.kind === "list"
                ? renderDiscoveryList()
                : panelStage.kind === "chooser"
                  ? renderChooserPanel()
                  : panelStage.kind === "seller"
                    ? renderSellerPanel()
                    : panelStage.kind === "item"
                      ? renderItemPanel()
                      : renderCheckoutPanel()}
            </DiscoveryPanel>
          ) : null}
        </>
      ) : null}

      {activeWorkspace === "inventory" ? (
        <main className="demo-main demo-screen" aria-label="Demo inventory">
          <div className="demo-screen-bar">
            <button className="button button-compact button-outline" onClick={returnToMap}>
              Back to map
            </button>
          </div>
          <section aria-label="Complete simulated inventory" className="demo-inventory">
            <div className="inventory-heading">
              <p className="eyebrow">Complete session inventory - Simulation</p>
              <h1>{activeListingCount} active Demo Listings</h1>
              <p>
                Five fictional Demo Sellers each provide five simulated listings. Items
                outside the Discovery Radius remain here but do not appear in nearby discovery.
              </p>
            </div>
            <div className="inventory-grid">
              {sessionListings.map((listing) => {
                const seller = demoSellers.find(
                  (candidate) => candidate.id === listing.sellerId,
                );
                const isPurchaseCommitted = committedListingIds.has(listing.id);
                const completedCommitment = checkoutState.commitments.find(
                  (commitment) =>
                    commitment.listingId === listing.id &&
                    commitment.lifecycleStatus === "Completed" &&
                    commitment.trustOutcome === "Successful handover",
                );
                return (
                  <article aria-label={`Simulated listing: ${listing.title}`} key={listing.id}>
                    <span className="fictional-label">Simulated Demo Listing</span>
                    <span>
                      {completedCommitment?.trustOutcome === "Successful handover"
                        ? "Sold"
                        : listing.status === "paused-for-correction"
                          ? "Paused for correction"
                          : listing.status === "removed-fraud-review"
                            ? "Removed - fictional fraud review"
                            : listing.status === "deactivated"
                              ? "Deactivated"
                              : listing.status === "cross-listed-unavailable"
                                ? "Cross-listed unavailable"
                                : listing.status === "paused"
                                  ? "Paused"
                                  : listing.status === "removed"
                                    ? "Removed"
                                    : isPurchaseCommitted
                                      ? "Purchase committed"
                                      : "Active"}{" "}
                      &middot; simulated
                    </span>
                    <h2>{listing.title}</h2>
                    <p>{seller?.publicName} - Fictional Demo Seller</p>
                    <div className="inventory-facts">
                      <span>{listing.category}</span>
                      <span>{listing.condition}</span>
                      <span>{formatRupiah(listing.price)}</span>
                      <span>{listing.handoverTime}</span>
                    </div>
                    <small>{listing.imageLabel}</small>
                  </article>
                );
              })}
            </div>
          </section>
        </main>
      ) : null}

      {activeWorkspace === "seller" ? (
        <main className="demo-main demo-screen" aria-label="Seller workspace">
          <div className="demo-screen-bar">
            <button className="button button-compact button-outline" onClick={returnToMap}>
              Back to map
            </button>
          </div>
          <section
            aria-labelledby="seller-workspace-title"
            className="registration-panel seller-workspace"
          >
            <p className="eyebrow">Pre-activated Demo Seller · Simulation</p>
            <h1 id="seller-workspace-title">Manage demo listing</h1>
            {selectedPendingQuestion ? (
              <section aria-label="Structured Question Request" className="question-request">
                <h2>Structured Question Request</h2>
                <p>{selectedPendingQuestion}</p>
                <p>Answer by improving the shared listing below. There is no private reply.</p>
              </section>
            ) : null}
            <label>
              Selected seller listing
              <select
                aria-label="Selected seller listing"
                value={selectedListingId}
                onChange={(event) => {
                  const nextListing = sessionListings.find(
                    (listing) => listing.id === event.target.value,
                  );
                  if (nextListing) loadListingForEditing(nextListing);
                }}
              >
                {selectedSellerListings.map((listing) => (
                  <option key={listing.id} value={listing.id}>
                    {listing.title} -{" "}
                    {committedListingIds.has(listing.id)
                        ? "purchase committed"
                        : listing.status === "paused"
                          ? "Paused"
                          : listing.status === "removed"
                            ? "Removed"
                            : listing.status}
                    {" "}- simulated
                  </option>
                ))}
              </select>
            </label>
            {selectedListingHold ? (
              <p role="status">
                Checkout Hold active. Editing and sale actions are locked until checkout ends.
              </p>
            ) : null}
            {selectedListingCommitment ? (
              <p role="status">
                {selectedListingCommitment.lifecycleStatus === "Completed"
                  ? "Sale final. This sold listing remains locked."
                  : "Purchase Commitment active. This listing is locked for the transaction."}
              </p>
            ) : null}
            <fieldset disabled={selectedListingIsLocked}>
              <legend>Listing details and actions</legend>
            <label>
              Title
              <input value={title} onChange={(event) => setTitle(event.target.value)} />
            </label>
            <label>
              Category
              <select value={category} onChange={(event) => setCategory(event.target.value)}>
                {APPROVED_DISCOVERY_CATEGORIES.map((approvedCategory) => (
                  <option key={approvedCategory}>{approvedCategory}</option>
                ))}
                <option>Food</option>
                <option>Prohibited goods</option>
              </select>
            </label>
            <label>
              Fixed rupiah price
              <input
                inputMode="numeric"
                min="1"
                onChange={(event) => setPrice(event.target.value)}
                type="number"
                value={price}
              />
            </label>
            <label>
              Condition Grade
              <select
                value={conditionGrade}
                onChange={(event) => setConditionGrade(event.target.value)}
              >
                <option value="">Choose a grade</option>
                {conditionGrades.map((grade) => (
                  <option key={grade}>{grade}</option>
                ))}
              </select>
            </label>
            <label>
              Description
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </label>
            <label>
              Item type
              <select value={itemType} onChange={(event) => setItemType(event.target.value)}>
                <option>One portable item</option>
                <option>Bundle</option>
                <option>Food</option>
                <option>Prohibited goods</option>
                <option>Requires a vehicle, hired help, or special equipment</option>
              </select>
            </label>
            <label>
              <input
                checked={hasKnownDefects}
                onChange={(event) => setHasKnownDefects(event.target.checked)}
                type="checkbox"
              />
              This item has known defects
            </label>
            <label>
              Condition Disclosure
              <textarea
                value={conditionDisclosure}
                onChange={(event) => setConditionDisclosure(event.target.value)}
              />
            </label>
            <label>
              Measurements or specifications
              <textarea
                value={specifications}
                onChange={(event) => setSpecifications(event.target.value)}
              />
            </label>
            <label>
              Included parts
              <textarea
                value={includedParts}
                onChange={(event) => setIncludedParts(event.target.value)}
              />
            </label>
            <label>
              <input
                checked={completePhotoIncluded}
                onChange={(event) => setCompletePhotoIncluded(event.target.checked)}
                type="checkbox"
              />
              Complete-item photo
            </label>
            <label>
              <input
                checked={detailPhotoIncluded}
                onChange={(event) => setDetailPhotoIncluded(event.target.checked)}
                type="checkbox"
              />
              Detail photo
            </label>
            <label>
              <input
                checked={secondDetailPhotoIncluded}
                onChange={(event) => setSecondDetailPhotoIncluded(event.target.checked)}
                type="checkbox"
              />
              Second detail photo
            </label>
            <label>
              <input
                checked={defectPhotoIncluded}
                onChange={(event) => setDefectPhotoIncluded(event.target.checked)}
                type="checkbox"
              />
              Defect photo (optional supplement)
            </label>
            <label>
              <input
                checked={photoPrivacyConfirmed}
                onChange={(event) => setPhotoPrivacyConfirmed(event.target.checked)}
                type="checkbox"
              />
              Photos exclude private details and location metadata
            </label>
            {publicationErrors.length ? (
              <section aria-label="Listing publication errors" role="alert">
                {publicationErrors.map((error) => (
                  <p key={error}>{error}</p>
                ))}
              </section>
            ) : null}
            {publicationNotice ? <p role="status">{publicationNotice}</p> : null}
            {managementNotice ? <p role="status">{managementNotice}</p> : null}
            <div className="listing-actions">
              <button className="button button-primary" onClick={publishListing}>
                {selectedPendingQuestion ? "Update shared listing" : "Publish listing"}
              </button>
              <button className="button button-outline" onClick={deactivateListing}>
                Deactivate listing
              </button>
              <button className="button button-outline" onClick={markCrossListedUnavailable}>
                Mark cross-listed item unavailable
              </button>
            </div>
            </fieldset>
          </section>
        </main>
      ) : null}

      {activeWorkspace === "orders" && (selectedBuyer || selectedSeller) ? (
        <main className="demo-main demo-screen" aria-label="Orders screen">
          <div className="demo-screen-bar">
            <button className="button button-compact button-outline" onClick={returnToMap}>
              Back to map
            </button>
          </div>
          <section
            aria-label="Purchase Commitments"
            className="registration-panel orders-workspace"
            id="purchase-commitments"
            tabIndex={-1}
          >
          <header className="orders-heading">
            <div>
              <p className="eyebrow">Orders · Transaction workspace</p>
              <h2>Orders</h2>
              <p>
                Review each frozen purchase, settlement state, deadline, and next permitted
                action without exposing private contact or location information.
              </p>
            </div>
            <div className="orders-capacity" aria-label="Active Order capacity">
              <small>Current capacity</small>
              <strong>
                {selectedBuyer
                  ? `${selectedBuyerActiveCommitments.length} of ${selectedTierProgress?.activePurchaseLimit ?? 0} active Purchase Commitments`
                  : `${selectedSellerCommitments.filter((commitment) => commitment.lifecycleStatus === "Active").length} active seller Orders`}
              </strong>
            </div>
          </header>

          {(selectedBuyer ? selectedBuyerCommitments : selectedSellerCommitments).length ? (
            <div className="orders-list">
              {(selectedBuyer ? selectedBuyerCommitments : selectedSellerCommitments).map(
                (commitment) => {
                  const handover = handoverStates[commitment.id];
                  const safety = safetyStates[commitment.id];
                  const actorRole = selectedBuyer ? "buyer" : "seller";
                  const counterpart = selectedBuyer
                    ? commitment.snapshot.sellerPublicName
                    : demoBuyers.find((buyer) => buyer.id === commitment.buyerId)?.publicName ??
                      "Fictional Demo Buyer";
                  const actorPresence =
                    actorRole === "buyer" ? handover?.buyerPresence : handover?.sellerPresence;
                  const actorConfirmedAtMs =
                    actorRole === "buyer"
                      ? handover?.buyerConfirmedAtMs
                      : handover?.sellerConfirmedAtMs;
                  const contactBlocked = Boolean(
                    safety && isPairContactBlocked(safety, safety.buyerId, safety.sellerId),
                  );
                  const bothEligible = Boolean(
                    handover?.buyerPresence?.eligible && handover?.sellerPresence?.eligible,
                  );
                  const insideAcceptedWindow = Boolean(
                    handover?.schedule &&
                      clockNowMs >= handover.schedule.window.startsAtMs &&
                      clockNowMs <= handover.schedule.window.endsAtMs,
                  );
                  const actorCanConfirm = Boolean(
                    handover?.schedule &&
                      bothEligible &&
                      insideAcceptedWindow &&
                      actorConfirmedAtMs === null &&
                      handover.meetingClosedAtMs === null &&
                      handover.activeDispute === null &&
                      handover.materialMismatchClaim === null &&
                      !contactBlocked,
                  );
                  const agreementDeadlineBase =
                    handover?.meetingNumber && handover.meetingNumber > 1 && handover.proposal
                      ? handover.proposal.proposedAtMs
                      : handover?.committedAtMs;
                  const deadline =
                    commitment.lifecycleStatus === "Completed"
                      ? "Closed"
                      : !handover
                        ? "Transaction setup pending"
                        : !handover.proposal
                          ? `Seller proposal · ${formatWibTime(handover.committedAtMs + SELLER_PROPOSAL_DEADLINE_MS)}`
                          : !handover.schedule
                            ? `Schedule agreement · ${formatWibTime((agreementDeadlineBase ?? handover.committedAtMs) + SCHEDULE_AGREEMENT_DEADLINE_MS)}`
                            : `Handover window ends · ${formatWibTime(handover.schedule.window.endsAtMs)}`;
                  const nextAction = contactBlocked
                    ? "Leave the unsafe situation and await the private safety outcome"
                    : commitment.lifecycleStatus === "Completed"
                      ? commitment.trustOutcome === "Successful handover"
                        ? "Review the final settlement and frozen Purchase Snapshot"
                        : "Review the final refund outcome and frozen Purchase Snapshot"
                      : !handover
                        ? "Wait for transaction setup"
                        : handover.materialMismatchClaim
                          ? handover.materialMismatchClaim.status === "raised"
                            ? actorRole === "seller"
                              ? "Acknowledge or contest the Material Mismatch Claim"
                              : "Await the Seller response to the Material Mismatch Claim"
                            : handover.materialMismatchClaim.status === "contested"
                              ? "Continue the guided Active Dispute review"
                              : "Review the completed Material Mismatch refund"
                          : handover.activeDispute
                            ? "Continue the guided Active Dispute review"
                            : handover.meetingClosedAtMs !== null
                              ? "Review the closed meeting outcome or use the guided ending actions"
                              : !handover.proposal
                                ? actorRole === "seller"
                                  ? "Propose two handover windows"
                                  : "Wait for the Seller to propose a Handover Point and windows"
                                : handover.pendingAdjustment
                                  ? actorRole === "seller"
                                    ? "Approve the requested schedule adjustment"
                                    : "Wait for Seller approval of the schedule adjustment"
                                  : !handover.schedule
                                    ? actorRole === "buyer"
                                      ? "Accept a proposed window or request an adjustment"
                                      : "Wait for the Buyer schedule response"
                                    : !actorPresence?.eligible
                                      ? `Record ${actorRole} Presence Check`
                                      : !bothEligible
                                        ? "Wait for the counterpart's eligible Presence Check"
                                        : !insideAcceptedWindow
                                          ? "Set simulated handover time inside the accepted window"
                                          : actorCanConfirm
                                            ? actorRole === "buyer"
                                              ? "Buyer confirms inspected and accepted"
                                              : "Seller confirms handover"
                                            : "Await the counterpart confirmation or use the guided ending actions";
                  const escrowLabel =
                    commitment.escrowStatus === "Held - simulated"
                      ? "Held"
                      : commitment.escrowStatus === "Refunded - simulated"
                        ? "Refunded in full"
                        : "Released";
                  const payoutLabel =
                    commitment.payoutStatus === "Pending - simulated"
                      ? "Pending"
                      : commitment.payoutStatus === "Not paid - simulated"
                        ? "Not paid"
                        : "Paid";
                  const refundLabel =
                    commitment.escrowStatus === "Refunded - simulated" ||
                    Boolean(handover?.failureRecord) ||
                    handover?.materialMismatchClaim?.status === "acknowledged" ||
                    handover?.materialMismatchClaim?.status === "refunded"
                      ? "Full refund issued"
                      : "Not issued";
                  const orderIsSelected = commitment.id === visibleHandoverCommitment?.id;

                  return (
                    <article
                      aria-label={`Purchase Commitment: ${commitment.snapshot.title}`}
                      className={`checkout-panel order-card order-card-${commitment.lifecycleStatus.toLowerCase()}${orderIsSelected ? " order-card-selected" : ""}`}
                      key={commitment.id}
                    >
                      <header className="order-card-heading">
                        <div>
                          <span className="order-kicker">
                            {commitment.lifecycleStatus === "Active" ? "Action required" : "Order history"}
                          </span>
                          <h3>{commitment.snapshot.title}</h3>
                          <p>
                            {actorRole === "buyer" ? "Seller" : "Buyer"}: {counterpart} ·
                            Fictional Verified Member
                          </p>
                        </div>
                        <div className="order-card-controls">
                          <strong className={`order-status order-status-${commitment.lifecycleStatus.toLowerCase()}`}>
                            {commitment.lifecycleStatus}
                          </strong>
                          <button
                            aria-pressed={orderIsSelected}
                            className="button button-outline order-select-button"
                            onClick={() => setSelectedOrderId(commitment.id)}
                            type="button"
                          >
                            {orderIsSelected ? "Selected Order" : `Open transaction for ${commitment.snapshot.title}`}
                          </button>
                        </div>
                      </header>

                      <dl className="order-summary-grid">
                        <div>
                          <dt>Simulated Escrow:</dt>
                          <dd>{" "}{escrowLabel}</dd>
                        </div>
                        <div>
                          <dt>Simulated payout:</dt>
                          <dd>{" "}{payoutLabel}</dd>
                        </div>
                        <div>
                          <dt>Simulated refund:</dt>
                          <dd>{" "}{refundLabel}</dd>
                        </div>
                        <div>
                          <dt>Deadline</dt>
                          <dd>{deadline}</dd>
                        </div>
                        <div className="order-next-action">
                          <dt>Next permitted action</dt>
                          <dd>{nextAction}</dd>
                        </div>
                      </dl>

                      {commitment.trustOutcome === "Successful handover" ? (
                        <p className="order-outcome">Successful handover recorded for private Tier Progress.</p>
                      ) : null}

                      <details
                        className="order-snapshot"
                        open={orderIsSelected}
                      >
                        <summary>Purchase Snapshot - unchangeable</summary>
                        <section aria-label={`Purchase Snapshot: ${commitment.snapshot.title}`}>
                          <p>{commitment.snapshot.sellerPublicName} - Fictional Demo Seller</p>
                          <p><strong>Category:</strong> {commitment.snapshot.category}</p>
                          <p><strong>Description:</strong> {commitment.snapshot.description}</p>
                          <p><strong>Condition Disclosure:</strong> {commitment.snapshot.conditionDisclosure}</p>
                          <p><strong>Condition Grade:</strong> {commitment.snapshot.conditionGrade}</p>
                          <p><strong>Measurements / specifications:</strong> {commitment.snapshot.specifications}</p>
                          <p><strong>Included parts:</strong> {commitment.snapshot.includedParts}</p>
                          <p><strong>Frozen fictional item photos:</strong></p>
                          <ul>
                            {commitment.snapshot.photos.map((photo) => <li key={photo}>{photo}</li>)}
                          </ul>
                          <p>Buyer total: {formatRupiah(commitment.snapshot.transactionPrice)}</p>
                          <p>Seller payout: {formatRupiah(commitment.snapshot.transactionPrice)}</p>
                          <p>No platform or payment fee - simulation only.</p>
                        </section>
                      </details>
                    </article>
                  );
                },
              )}
            </div>
          ) : (
            <div className="orders-empty">
              <strong>No active Purchase Commitments</strong>
              <p>Successful simulated payments will appear here as task-oriented Orders.</p>
            </div>
          )}

          {visibleHandoverCommitment && visibleHandoverState ? (
            <div className="order-workflow">
              <header className="order-workflow-heading">
                <span>Selected Order</span>
                <h3>Transaction communication and actions</h3>
                <p>
                  Scheduling, system messages, safety, presence, confirmations, disputes, and
                  settlement stay inside this Order. Free-form chat and contact exchange remain unavailable.
                </p>
              </header>
              <HandoverPanel
                actionsBlocked={visibleContactBlocked || visibleSafetyTransactionResolved}
                actorRole={selectedBuyer ? "buyer" : "seller"}
                commitment={visibleHandoverCommitment}
                contactBlocked={visibleContactBlocked}
                handover={visibleHandoverState}
                notice={handoverNotices[visibleHandoverCommitment.id] ?? ""}
                nowMs={clockNowMs}
                safetyContent={
                  visibleSafetyState ? (
                    <SafetyPanel
                      actorId={selectedAccountId}
                      commitment={visibleHandoverCommitment}
                      key={visibleHandoverCommitment.id + ":" + selectedAccountId}
                      nowMs={clockNowMs}
                      safety={visibleSafetyState}
                      onAppeal={appealVisibleSafety}
                      onReport={reportVisibleSafety}
                      onResolveAppeal={resolveVisibleSafetyAppeal}
                      onReview={reviewVisibleSafety}
                      onSetAppealTime={setVisibleAppealTime}
                    />
                  ) : null
                }
                onAccept={acceptVisibleHandover}
                onAdvance={advanceToHandoverWindow}
                onApproveAdjustment={approveVisibleAdjustment}
                onBuyerConfirm={confirmVisibleBuyerHandover}
                onCloseIncomplete={closeVisibleIncompleteHandover}
                onOpenDispute={openVisibleIncompleteHandoverDispute}
                onRaiseMismatch={raiseVisibleMaterialMismatch}
                onRespondMismatch={respondToVisibleMaterialMismatch}
                onResolveMismatch={resolveVisibleMaterialMismatch}
                onPropose={proposeVisibleHandover}
                onProposeRepeat={proposeVisibleRepeatHandover}
                onRecordPresence={recordVisiblePresence}
                onRequestAdjustment={requestVisibleAdjustment}
                onSellerConfirm={confirmVisibleSellerHandover}
                onSetBoundaryTime={setVisibleBoundaryTime}
                onExpireScheduling={expireVisibleScheduling}
                onCancel={cancelVisibleHandover}
                onReportNoShow={reportVisibleNoShow}
                onReportSellerUnavailability={reportVisibleSellerUnavailability}
              />
            </div>
          ) : null}
        </section>
        </main>
      ) : null}

      {activeWorkspace === "trust" && selectedBuyer && selectedTrustState && selectedTierProgress &&
      selectedPublicTrustSummary && selectedTradingAvailability ? (
        <main className="demo-main demo-screen" aria-label="Trust overview">
          <div className="demo-screen-bar">
            <button className="button button-compact button-outline" onClick={returnToMap}>
              Back to map
            </button>
          </div>
          <div
            aria-label="Buyer trust and reviewer context"
            className="trust-overview demo-support-region"
            role="region"
          >
          <div className="demo-support-heading">
            <span className="shell-region-label">Supporting context</span>
            <strong>Buyer trust and reviewer controls</strong>
            <small>Private progress stays separate from the active marketplace task.</small>
          </div>
          <section aria-label="Tier Progress" className="registration-panel">
            <p className="eyebrow">Private Tier Progress - Simulation</p>
            <h2>{buyerTierLabel(selectedTierProgress.tier)}</h2>
            <p>
              {selectedTierProgress.activePurchaseLimit} active Purchase Commitment
              {selectedTierProgress.activePurchaseLimit === 1 ? "" : "s"} permitted.
              Every tier permits one Checkout Hold.
            </p>
            <p>{selectedTrustState.successfulHandoverCount} successful handovers</p>
            <p>
              {selectedTierProgress.qualifyingProgress.completed} qualifying different Demo{" "}
              {selectedTierProgress.qualifyingProgress.completed === 1 ? "seller" : "sellers"}{" "}
              ({selectedTierProgress.qualifyingProgress.completed} of{" "}
              {selectedTierProgress.qualifyingProgress.required} qualifying target)
            </p>
            <p>
              {selectedActiveStrikes.length
                ? `${selectedActiveStrikes.length} active Reliability ${selectedActiveStrikes.length === 1 ? "Strike" : "Strikes"}`
                : "No active Reliability Strikes"}
            </p>
            {selectedTradingAvailability.reliabilityWarning ? (
              <p>Reliability warning active.</p>
            ) : null}
            {!selectedTradingAvailability.canBuy || !selectedTradingAvailability.canSell ? (
              <p>Buying and selling are suspended in this simulated session.</p>
            ) : null}
            {selectedTierProgress.strikeExpiresAtMs ? (
              <p>Strike expiry: {formatWibTime(selectedTierProgress.strikeExpiresAtMs)}</p>
            ) : null}
            {selectedTierProgress.blockers.length ? (
              <ul>
                {selectedTierProgress.blockers.map((blocker, index) => (
                  <li key={`${blocker.kind}-${index}`}>Private blocker: {blocker.reason}</li>
                ))}
              </ul>
            ) : (
              <p>No active issues.</p>
            )}
            {selectedTierProgress.appealPath ? (
              <p>Applicable appeal path: {selectedTierProgress.appealPath}</p>
            ) : null}
          </section>
          <section aria-label="Trust Summary preview" className="registration-panel">
            <p className="eyebrow">Member-visible summary</p>
            <h2>{buyerTierLabel(selectedPublicTrustSummary.tier)}</h2>
            <p>{selectedPublicTrustSummary.identityVerified ? "Simulated as verified" : "Not verified"}</p>
            <p>{selectedPublicTrustSummary.successfulHandoverCount} successful handovers</p>
            <p>{selectedPublicTrustSummary.differentPartnerCount} different partners</p>
          </section>
          <section
            aria-label="Reviewer controls"
            className="registration-panel demo-reviewer-panel"
          >
            <p className="eyebrow">Guided prototype tools · Simulation</p>
            <h2>Reviewer controls</h2>
            <p>
              Change only this fictional buyer's trust history to inspect private account
              outcomes. These controls are not member marketplace actions.
            </p>
            <div className="listing-actions">
              <QualifyingSellerSelect
                selectedSellerId={selectedQualifyingSellerId}
                onSelect={setSelectedQualifyingSellerId}
              />
              <button className="button button-outline" onClick={recordGuidedSuccessfulHandover}>
                Record successful handover
              </button>
              <button className="button button-outline" onClick={addGuidedReliabilityStrike}>
                Add Reliability Strike
              </button>
              <button className="button button-outline" onClick={clearGuidedOrdinaryIssue}>
                Clear ordinary issue
              </button>
              <button
                className="button button-outline"
                disabled={!selectedTierProgress.strikeExpiresAtMs}
                onClick={() => setGuidedStrikeBoundary(-1)}
              >
                Advance to one millisecond before strike expiry
              </button>
              <button
                className="button button-outline"
                disabled={!selectedTierProgress.strikeExpiresAtMs}
                onClick={() => setGuidedStrikeBoundary(0)}
              >
                Advance to exact strike expiry
              </button>
            </div>
            <p>This guided history and every trust outcome are fictional and simulated.</p>
          </section>
          </div>
        </main>
      ) : null}

      <DemoControls
        accountOptions={demoAccountOptions}
        activeListingCount={activeListingCount}
        activePurchaseLimit={selectedBuyerPurchaseLimit}
        activeWorkspace={activeWorkspace}
        browsingLocation={browsingLocation}
        browsingLocationOptions={browsingLocations.map(({ value, label }) => ({
          value,
          label,
        }))}
        buyerCount={demoBuyers.length}
        buyerTierLabel={selectedBuyerTierLabel}
        currentRole={currentRoleLabel}
        onAccountChange={selectDemoAccount}
        onBrowsingLocationChange={selectBrowsingLocation}
        onBuyerDiscovery={openBuyerDiscovery}
        onClose={closeDemoControls}
        onExit={exitDemo}
        onInventory={openInventory}
        onMarkStale={markStaleFromControls}
        onOrders={showOrders}
        onRefreshNearby={refreshNearbyFromControls}
        onReset={openResetConfirmation}
        onSellerDiscovery={openSellerDiscovery}
        onSellerWorkspace={openSellerWorkspace}
        onSimulateMapFailure={simulateMapFailure}
        onTrust={openTrustOverview}
        open={demoControlsOpen}
        selectedAccountId={selectedAccountId}
        selectedBuyer={
          selectedBuyer
            ? {
                publicName: selectedBuyer.publicName,
                identityStatus: selectedBuyer.identityStatus,
                history: selectedBuyer.history,
              }
            : null
        }
        selectedSeller={
          selectedSeller
            ? {
                publicName: selectedSeller.publicName,
                identityStatus: selectedSeller.identityStatus,
                activationStatus: selectedSeller.activationStatus,
                handovers: selectedSeller.handovers,
              }
            : null
        }
        sellerCount={demoSellers.length}
        snapshotRevision={browsingLocationSnapshot.revision}
      />

      {resetConfirmationOpen ? (
        <div className="dialog-backdrop">
          <section
            aria-labelledby="reset-demo-title"
            aria-modal="true"
            className="registration-panel"
            role="dialog"
          >
            <p className="eyebrow">Demo Mode reset - Simulation</p>
            <h2 id="reset-demo-title">Reset Demo</h2>
            <p>
              Only this browser session's simulated accounts, listings, histories, and locations
              will return to their original fictional state. Other sessions and non-demo
              experiences are never affected.
            </p>
            <div className="listing-actions">
              <button className="button button-outline" onClick={() => setResetConfirmationOpen(false)}>
                Cancel reset
              </button>
              <button className="button button-primary" onClick={resetDemo}>
                Reset this simulated session
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

export default DemoExperience;
