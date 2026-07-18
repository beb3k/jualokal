import { useEffect, useRef, useState } from "react";
import {
  demoBuyer,
  demoBuyers,
  demoListing,
  demoListings,
  demoSeller,
  demoSellers,
  type DemoListingSeed,
} from "./demo-data";
import {
  completeSimulatedPayment,
  createInitialCheckoutState,
  endCheckoutHold,
  expireCheckoutHolds,
  finalizePurchaseCommitment,
  refundPurchaseCommitment,
  startCheckoutHold,
  type PurchaseCommitment,
} from "./checkout";
import HandoverPanel, { type PresenceSimulation } from "./HandoverPanel";
import SafetyPanel from "./SafetyPanel";
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
  createSellerDiscoveryMarker,
  discoverListings,
  getSellerMarkerInitials,
  projectSellerDiscoveryMarker,
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
const defaultIncludedParts = "Item and all parts shown in the fictional photos.";

type DiscoveryView = "map" | "list";

function initialDiscoveryView(): DiscoveryView {
  if (typeof window === "undefined") return "map";
  return window.localStorage.getItem(discoveryViewStorageKey) === "list"
    ? "list"
    : "map";
}

const browsingLocations = [
  { value: "current", label: "Current simulated location snapshot", available: true },
  { value: "inside-edge", label: "Nearby boundary check", available: true, distanceKm: 1.99 },
  { value: "at-edge", label: "Discovery-radius edge", available: true, distanceKm: 2 },
  { value: "outside-edge", label: "Outside discovery-radius check", available: true, distanceKm: 2.01 },
  { value: "at-maximum", label: "Permanent-maximum check", available: true, distanceKm: 10 },
  { value: "outside-maximum", label: "Beyond permanent-maximum check", available: true, distanceKm: 10.01 },
  { value: "denied", label: "Location permission denied", available: false },
  { value: "unavailable", label: "Location unavailable", available: false },
] as const;

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

function commitmentRemovesListing(commitment: PurchaseCommitment) {
  return commitment.trustOutcome !== "No successful handover";
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

function formatRupiah(price: number) {
  return `Rp ${price.toLocaleString("id-ID")}`;
}

function formatWibTime(timestampMs: number) {
  return `${new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Jakarta",
  }).format(new Date(timestampMs))} WIB`;
}

function formatCountdown(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

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
  const [activeWorkspace, setActiveWorkspace] = useState<"buyer" | "seller" | "inventory">("buyer");
  const [selectedAccountId, setSelectedAccountId] = useState<string>(demoBuyer.id);
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
    demoSellers[0].id,
  );
  const [clockNowMs, setClockNowMs] = useState(Date.now);
  const [clockOffsetMs, setClockOffsetMs] = useState(0);
  const [demoClockPaused, setDemoClockPaused] = useState(false);
  const [selectedListingId, setSelectedListingId] = useState(demoListing.id);
  const [resetConfirmationOpen, setResetConfirmationOpen] = useState(false);
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
  const [browsingLocation, setBrowsingLocation] = useState("current");
  const [discoveryCategory, setDiscoveryCategory] = useState<DiscoveryCategory>("All");
  const [discoveryView, setDiscoveryView] = useState<DiscoveryView>(initialDiscoveryView);
  const [previewSellerId, setPreviewSellerId] = useState<string | null>(null);
  const [mapViewport, setMapViewport] = useState({ panX: 0, zoom: 1 });
  const [mapStatus, setMapStatus] = useState("Buyer-centered view ready");
  const previewTriggerRef = useRef<HTMLButtonElement | null>(null);
  const previewDialogRef = useRef<HTMLElement | null>(null);
  const previewCloseButtonRef = useRef<HTMLButtonElement | null>(null);
  const listingDetailRef = useRef<HTMLElement | null>(null);

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
    if (!previewSellerId) return;
    previewCloseButtonRef.current?.focus();
    const handlePreviewKeyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeSellerPreview();
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = Array.from(
        previewDialogRef.current?.querySelectorAll<HTMLElement>(
          "button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])",
        ) ?? [],
      );
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) return;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", handlePreviewKeyboard);
    return () => window.removeEventListener("keydown", handlePreviewKeyboard);
  }, [previewSellerId]);

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
  const visibleHandoverCommitment = selectedBuyer
    ? selectedBuyerCommitments.find(
        (commitment) => commitment.lifecycleStatus === "Active",
      ) ?? selectedBuyerCommitments[0]
    : selectedSeller
      ? selectedSellerCommitments.find(
          (commitment) => commitment.listingId === selectedListingId,
        ) ?? selectedSellerCommitments[0]
      : undefined;
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
      commitment.listingId === selectedListingId && commitmentRemovesListing(commitment),
  );
  const selectedListingIsLocked = Boolean(
    selectedListingHold || selectedListingCommitment,
  );
  const committedListingIds = new Set(
    checkoutState.commitments
      .filter(commitmentRemovesListing)
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
  const selectedPendingQuestion =
    pendingQuestion?.listingId === selectedListingId ? pendingQuestion.question : null;

  const browsingLocationScenario = browsingLocations.find(
    (location) => location.value === browsingLocation,
  );
  const browsingLocationIsAvailable = browsingLocationScenario?.available === true;
  const browsingDistanceOverrideKm =
    browsingLocationScenario && "distanceKm" in browsingLocationScenario
      ? browsingLocationScenario.distanceKm
      : undefined;
  const discoveryResults = discoverListings({
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
      distanceKm: browsingDistanceOverrideKm ?? listing.distanceKm,
      originalPublicationTimeMs: listing.originalPublicationTimeMs,
      status: listing.status,
      sellerAvailable:
        !restrictedAccountIds.has(listing.sellerId) &&
        !committedListingIds.has(listing.id),
    })),
  });
  const visibleDemoListings: Array<{
    listing: SessionListing;
    distanceBand: DistanceBand;
  }> = discoveryResults.flatMap((result) => {
    const listing = sessionListings.find((candidate) => candidate.id === result.listingId);
    return listing ? [{ listing, distanceBand: result.distanceBand }] : [];
  });
  const selectedListingDistanceBand = visibleDemoListings.find(
    ({ listing }) => listing.id === selectedListingId,
  )?.distanceBand;
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
    const homeDistanceKm =
      browsingDistanceOverrideKm ?? sellerListings[0]?.distanceKm ?? 0;
    return [{
      seller,
      marker,
      projection: projectSellerDiscoveryMarker(marker, homeDistanceKm),
    }];
  });
  const mapFrameKm = mapSellerMarkers.some(({ projection }) => projection.frameKm === 3)
    ? 3
    : 2;
  const previewSeller = previewSellerId
    ? demoSellers.find((seller) => seller.id === previewSellerId)
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
  const selectedListingDistanceKm =
    browsingDistanceOverrideKm ?? selectedSessionListing?.distanceKm;
  const listingIsDiscoverable = Boolean(selectedListingDistanceBand);

  function selectDiscoveryView(nextView: DiscoveryView) {
    setDiscoveryView(nextView);
    window.localStorage.setItem(discoveryViewStorageKey, nextView);
  }

  function openSellerPreview(
    sellerId: string,
    trigger: HTMLButtonElement,
  ) {
    previewTriggerRef.current = trigger;
    setPreviewSellerId(sellerId);
  }

  function closeSellerPreview() {
    setPreviewSellerId(null);
    window.requestAnimationFrame(() => previewTriggerRef.current?.focus());
  }

  function openPreviewListing(listing: SessionListing) {
    loadListingForEditing(listing);
    setPreviewSellerId(null);
    window.requestAnimationFrame(() => listingDetailRef.current?.focus());
  }

  function adjustMapViewport(next: { panX: number; zoom: number }) {
    setMapViewport(next);
    setMapStatus("Viewport adjusted; discovery results unchanged");
  }

  function recenterMap() {
    setMapViewport({ panX: 0, zoom: 1 });
    setMapStatus("Buyer-centered view restored");
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
    setDiscoveryCategory("All");
    setResetConfirmationOpen(false);
  }

  return (
    <div className="demo-shell">
      <div aria-label="Demo Mode simulation" className="demo-notice" role="status">
        <span className="simulation-pill">
          <span aria-hidden="true">●</span> Demo Mode · Simulation
        </span>
        <p>
          Accounts, listing, location, identity status, and activity are fictional.
          Fictional pre-verified accounts enter directly; normal admission uses the separate
          simulated Identity Verification walkthrough.
        </p>
      </div>

      <header className="demo-header">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            J
          </span>
          <span>jualokal</span>
        </div>
        <button
          className="button button-compact button-outline"
          onClick={() => setResetConfirmationOpen(true)}
        >
          Reset Demo
        </button>
        <button className="button button-compact button-outline" onClick={onExit}>
          Exit demo
          <span aria-hidden="true">×</span>
        </button>
      </header>

      <section aria-label="Demo marketplace summary" className="demo-summary">
        <div>
          <span className="fictional-label">Session-only simulated marketplace</span>
          <strong>{demoBuyers.length} Demo Buyers</strong>
          <strong>{demoSellers.length} Demo Sellers</strong>
          <strong>{activeListingCount} active Demo Listings</strong>
        </div>
        <label>
          Selected fictional account
          <select
            aria-label="Selected fictional account"
            value={selectedAccountId}
            onChange={(event) => {
              const nextAccountId = event.target.value;
              setSelectedAccountId(nextAccountId);
              if (nextAccountId.startsWith("seller-")) {
                const firstSellerListing = sessionListings.find(
                  (listing) => listing.sellerId === nextAccountId,
                );
                if (firstSellerListing) {
                  loadListingForEditing(firstSellerListing);
                }
              }
              setActiveWorkspace(
                nextAccountId.startsWith("seller-") ? "seller" : "buyer",
              );
            }}
          >
            <optgroup label="Fictional Demo Buyers (3)">
              {demoBuyers.map((buyer) => (
                <option key={buyer.id} value={buyer.id}>
                  {buyer.publicName} - {buyerTierLabel(getPublicTrustSummary(trustStates[buyer.id], clockNowMs).tier)} - simulated
                </option>
              ))}
            </optgroup>
            <optgroup label="Fictional Demo Sellers (5)">
              {demoSellers.map((seller) => (
                <option key={seller.id} value={seller.id}>
                  {seller.publicName} - Demo Seller - simulated
                </option>
              ))}
            </optgroup>
          </select>
        </label>
        <section aria-label="Selected simulated identity" className="selected-account-card">
          {selectedBuyer ? (
            <>
              <span className="fictional-label">Fictional Demo Buyer</span>
              <strong>{selectedBuyer.publicName}</strong>
              <span>Current role: Buyer discovery</span>
              <span>Identity status: {selectedBuyer.identityStatus}</span>
              <span>
                Buyer Tier: {selectedTierProgress
                  ? buyerTierLabel(selectedTierProgress.tier)
                  : selectedBuyer.tier}
              </span>
              <span>
                Active Purchase Commitment limit:{" "}
                {selectedTierProgress?.activePurchaseLimit ?? selectedBuyer.activePurchaseLimit}
              </span>
              <div>
                <strong>Fictional history</strong>
                <p>{selectedBuyer.history}</p>
              </div>
            </>
          ) : selectedSeller ? (
            <>
              <span className="fictional-label">Fictional Demo Seller</span>
              <strong>{selectedSeller.publicName}</strong>
              <span>Current role: Seller workspace</span>
              <span>Identity status: {selectedSeller.identityStatus}</span>
              <span>{selectedSeller.activationStatus}</span>
              <span>{selectedSeller.handovers}</span>
            </>
          ) : null}
        </section>
        <p className="persistent-privacy-note">
          No real identity, contact, precise location, or payment information appears in Demo
          Mode. Protected account records, internal details, Home Anchors, and raw location
          coordinates stay absent.
        </p>
      </section>

      {selectedBuyer && selectedTrustState && selectedTierProgress &&
      selectedPublicTrustSummary && selectedTradingAvailability ? (
        <div className="demo-main">
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
            <div className="listing-actions">
              <label>
                Qualifying Demo Seller
                <select
                  aria-label="Qualifying Demo Seller"
                  value={selectedQualifyingSellerId}
                  onChange={(event) => setSelectedQualifyingSellerId(event.target.value)}
                >
                  {demoSellers.map((seller) => (
                    <option key={seller.id} value={seller.id}>
                      {seller.publicName} - fictional
                    </option>
                  ))}
                </select>
              </label>
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
          <section aria-label="Trust Summary preview" className="registration-panel">
            <p className="eyebrow">Member-visible summary</p>
            <h2>{buyerTierLabel(selectedPublicTrustSummary.tier)}</h2>
            <p>{selectedPublicTrustSummary.identityVerified ? "Simulated as verified" : "Not verified"}</p>
            <p>{selectedPublicTrustSummary.successfulHandoverCount} successful handovers</p>
            <p>{selectedPublicTrustSummary.differentPartnerCount} different partners</p>
          </section>
        </div>
      ) : null}

      <nav aria-label="Demo workspaces" className="workspace-tabs">
        <button
          className="button button-compact button-outline"
          onClick={() => {
            setSelectedAccountId(demoBuyer.id);
            setActiveWorkspace("buyer");
          }}
        >
          Buyer discovery
        </button>
        <button
          className="button button-compact button-outline"
          onClick={() => {
            const nextSeller = selectedSeller ?? demoSeller;
            setSelectedAccountId(nextSeller.id);
            const nextListing =
              sessionListings.find(
                (listing) =>
                  listing.id === selectedListingId && listing.sellerId === nextSeller.id,
              ) ??
              sessionListings.find((listing) => listing.sellerId === nextSeller.id);
            if (nextListing) loadListingForEditing(nextListing);
            setActiveWorkspace("seller");
          }}
        >
          Seller workspace
        </button>
        <button
          className="button button-compact button-outline"
          onClick={() => setActiveWorkspace("inventory")}
        >
          Demo inventory
        </button>
      </nav>

      {visibleHandoverCommitment && visibleHandoverState ? (
        <HandoverPanel
          actionsBlocked={
            visibleContactBlocked || visibleSafetyTransactionResolved
          }
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
      ) : null}

      {(selectedAccountRestricted || selectedAccountSuspended) && activeWorkspace !== "inventory" ? (
        <main className="demo-main">
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
        <main className="demo-main">
        <section className="demo-intro">
          <div>
            <p className="eyebrow">Simulated Browsing Location · Bandung</p>
            <h1>Nearby in Bandung</h1>
            <p>
              Browse the private marketplace with a current simulated location. No device
              location or personal details are requested.
            </p>
            <label>
              Simulated Browsing Location
              <select
                value={browsingLocation}
                onChange={(event) => setBrowsingLocation(event.target.value)}
              >
                {browsingLocations.map((location) => (
                  <option key={location.value} value={location.value}>
                    {location.label}
                  </option>
                ))}
              </select>
            </label>
            <p>
              Prototype Discovery Radius: 2 km · The permanent maximum is 10 km and cannot be
              overridden.
            </p>
          </div>
          <div className="distance-badge" aria-label="Simulated discovery area">
            <span aria-hidden="true">◎</span>
            <strong>2 km</strong>
            <small>simulated area</small>
          </div>
        </section>

        <section aria-label="Purchase Commitments" className="registration-panel">
          <p className="eyebrow">Purchase Commitments - Simulation</p>
          <h2>
            {selectedBuyerActiveCommitments.length} of {selectedTierProgress?.activePurchaseLimit ?? 0} active
            Purchase Commitments
          </h2>
          {selectedBuyerCommitments.length ? (
            selectedBuyerCommitments.map((commitment) => (
              <article
                aria-label={`Purchase Commitment: ${commitment.snapshot.title}`}
                className="checkout-panel"
                key={commitment.id}
              >
                <p className="eyebrow">Purchase Commitment - Simulation</p>
                <h3>{commitment.snapshot.title}</h3>
                <p>Transaction status: {commitment.lifecycleStatus}</p>
                <p>
                  Simulated Escrow:{" "}
                  {commitment.escrowStatus === "Held - simulated"
                    ? "Held"
                    : commitment.escrowStatus === "Refunded - simulated"
                      ? "Refunded in full"
                      : "Released"}
                </p>
                <p>
                  Simulated payout:{" "}
                  {commitment.payoutStatus === "Pending - simulated"
                    ? "Pending"
                    : commitment.payoutStatus === "Not paid - simulated"
                      ? "Not paid"
                      : "Paid"}
                </p>
                {commitment.trustOutcome === "Successful handover" ? (
                  <p>Successful handover recorded for private Tier Progress.</p>
                ) : null}
                <section aria-label={`Purchase Snapshot: ${commitment.snapshot.title}`}>
                  <h4>Purchase Snapshot - unchangeable</h4>
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
              </article>
            ))
          ) : (
            <p>No active Purchase Commitments. Successful simulated payments will appear here.</p>
          )}
        </section>
        {checkoutNotice ? (
          <p role="status">{checkoutNotice}</p>
        ) : null}

        <section aria-label="Demo marketplace listings" className="discovery-catalog">
          <div className="inventory-heading discovery-heading">
            <div>
              <p className="eyebrow">Nearby Demo Listings - Simulation</p>
              <h2>{visibleDemoListings.length} nearby simulated listings</h2>
              <p>
                Map and List use the same fixed 2 km discovery result. Viewport changes never
                search a new area or change eligibility.
              </p>
            </div>
            <div aria-label="Discovery View" className="discovery-view-control" role="group">
              <button
                aria-pressed={discoveryView === "map"}
                className="button button-compact button-outline"
                onClick={() => selectDiscoveryView("map")}
              >
                Map
              </button>
              <button
                aria-pressed={discoveryView === "list"}
                className="button button-compact button-outline"
                onClick={() => selectDiscoveryView("list")}
              >
                List
              </button>
            </div>
            <label className="discovery-filter">
              Category Filter
              <select
                aria-label="Category Filter"
                value={discoveryCategory}
                onChange={(event) => {
                  const selectedOption = discoveryCategoryOptions.find(
                    (option) => option.value === event.target.value,
                  );
                  if (selectedOption) {
                    setDiscoveryCategory(selectedOption.value);
                  }
                }}
              >
                {discoveryCategoryOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {browsingLocationIsAvailable ? discoveryView === "map" ? (
            <section aria-label="Seller discovery map" className="discovery-map">
              <div className="map-context">
                <strong>Buyer-centered {mapFrameKm} km context</strong>
                <span>No radius or Seller Convenience Zone is drawn</span>
              </div>
              <div
                aria-label="Your location"
                className="buyer-location-marker"
                role="img"
              >
                <span aria-hidden="true" />
              </div>
              {mapSellerMarkers.map(({ seller, marker, projection }) => (
                <div
                  className="seller-marker-position"
                  key={marker.stableMarkerKey}
                  style={{
                    left: `${50 + (projection.offsetXKm / mapFrameKm) * 40 + mapViewport.panX}%`,
                    top: `${50 - (projection.offsetYKm / mapFrameKm) * 40}%`,
                    transform: `translate(-50%, -50%) scale(${mapViewport.zoom})`,
                  }}
                >
                  <button
                    aria-label={`Seller marker, ${getSellerMarkerInitials(seller.publicName)}, ${marker.listingCount} ${marker.listingCount === 1 ? "Listing" : "Listings"}`}
                    className="seller-discovery-marker"
                    onClick={(event) => openSellerPreview(seller.id, event.currentTarget)}
                  >
                    <span className="seller-marker-initials" aria-hidden="true">
                      {getSellerMarkerInitials(seller.publicName)}
                    </span>
                    <span className="seller-marker-count" aria-hidden="true">
                      {marker.listingCount}
                    </span>
                  </button>
                </div>
              ))}
              <div aria-label="Map viewport controls" className="map-controls" role="group">
                <button
                  className="button button-compact button-outline"
                  onClick={() =>
                    adjustMapViewport({ ...mapViewport, panX: mapViewport.panX + 4 })
                  }
                >
                  Pan map east
                </button>
                <button
                  className="button button-compact button-outline"
                  onClick={() =>
                    adjustMapViewport({
                      ...mapViewport,
                      zoom: Math.min(1.5, mapViewport.zoom + 0.25),
                    })
                  }
                >
                  Zoom in
                </button>
                <button
                  className="button button-compact button-outline"
                  onClick={() =>
                    adjustMapViewport({
                      ...mapViewport,
                      zoom: Math.max(0.75, mapViewport.zoom - 0.25),
                    })
                  }
                >
                  Zoom out
                </button>
                <button
                  className="button button-compact button-outline"
                  onClick={recenterMap}
                >
                  Recenter map
                </button>
              </div>
              <p className="map-status" role="status">{mapStatus}</p>
            </section>
          ) : (
            <div className="discovery-grid">
              {visibleDemoListings.map(({ listing, distanceBand }) => {
                const seller = demoSellers.find(
                  (candidate) => candidate.id === listing.sellerId,
                );
                return (
                  <article aria-label={`Nearby simulated listing: ${listing.title}`} key={listing.id}>
                    <span className="fictional-label">Simulated Demo Listing</span>
                    <h3>{listing.title}</h3>
                    {seller ? (
                      <p>
                        <button
                          className="text-button seller-identity-button"
                          onClick={(event) => openSellerPreview(seller.id, event.currentTarget)}
                        >
                          {seller.publicName}
                        </button>{" "}
                        - Fictional Demo Seller
                      </p>
                    ) : null}
                    <div className="inventory-facts">
                      <span>{listing.category}</span>
                      <span>{listing.condition}</span>
                      <span>{distanceBand}</span>
                      <span>{formatRupiah(listing.price)}</span>
                    </div>
                    <small>{listing.imageLabel}</small>
                    <button
                      className="button button-outline"
                      onClick={() => loadListingForEditing(listing)}
                    >
                      View item
                    </button>
                  </article>
                );
              })}
            </div>
          ) : null}
        </section>

        {previewSeller && previewDistanceBand && previewTrustSummary ? (
          <div className="seller-preview-backdrop">
            <section
              aria-label={`Seller Preview: ${previewSeller.publicName}`}
              aria-modal="true"
              className="seller-preview"
              ref={previewDialogRef}
              role="dialog"
            >
              <div className="seller-preview-heading">
                <div>
                  <p className="eyebrow">Seller Preview · Fictional Demo Seller</p>
                  <h2>{previewSeller.publicName}</h2>
                </div>
                <button
                  aria-label="Close Seller Preview"
                  className="button button-compact button-outline"
                  onClick={closeSellerPreview}
                  ref={previewCloseButtonRef}
                >
                  Close
                </button>
              </div>
              <section aria-label="Trust Summary" className="seller-preview-summary">
                <strong>Trust Summary</strong>
                <span>{previewSeller.identityStatus}</span>
                <span>{previewTrustSummary.successfulHandoverCount} successful handovers</span>
                <span>{previewTrustSummary.differentPartnerCount} different partners</span>
                <span>{buyerTierLabel(previewTrustSummary.tier)}</span>
                <span>{previewDistanceBand}</span>
              </section>
              <div className="seller-preview-listings">
                {previewListings.map(({ listing }) => (
                  <article
                    aria-label={`Seller Preview Listing: ${listing.title}`}
                    key={listing.id}
                  >
                    <span className="fictional-label">Simulated Demo Listing</span>
                    <h3>{listing.title}</h3>
                    <p>{listing.category} · {listing.condition}</p>
                    <p>{formatRupiah(listing.price)}</p>
                    <button
                      className="button button-outline"
                      onClick={() => openPreviewListing(listing)}
                    >
                      View item
                    </button>
                  </article>
                ))}
              </div>
            </section>
          </div>
        ) : null}

        <div className="demo-layout">
          {!browsingLocationIsAvailable ? (
            <section className="registration-panel marketplace-empty">
              <h2>No listings shown</h2>
              <p>
                {browsingLocation === "denied"
                  ? "Browsing Location was denied. Allow a current location to discover listings."
                  : "Browsing Location is unavailable. Try again when a current location is available."}
              </p>
            </section>
          ) : null}
          {browsingLocationIsAvailable &&
          selectedListingDistanceKm !== undefined &&
          selectedListingDistanceKm > prototypeDiscoveryRadiusKm ? (
            <section className="registration-panel marketplace-empty">
              <h2>No nearby listings</h2>
              <p>This item is outside the 2 km Discovery Radius.</p>
            </section>
          ) : null}
          {browsingLocationIsAvailable &&
          selectedListingDistanceKm !== undefined &&
          selectedListingDistanceKm <= prototypeDiscoveryRadiusKm &&
          listingStatus !== "active" ? (
            <section className="registration-panel marketplace-empty">
              <h2>Listing unavailable</h2>
              <p>
                {listingStatus === "deactivated"
                  ? "The seller deactivated this listing before checkout."
                  : "This cross-listed item is unavailable before checkout."}
              </p>
            </section>
          ) : null}
          <section
            aria-label="Demo Listing"
            className="listing-card"
            hidden={!listingIsDiscoverable}
            ref={listingDetailRef}
            tabIndex={-1}
          >
            <div
              aria-label="Synthetic fallback illustration, not an item photo"
              className="listing-art"
              role="img"
            >
              <div className="sun-shape" />
              <div className="basket-handle" />
              <div className="basket-body">
                <span />
                <span />
                <span />
                <span />
              </div>
              <span className="fictional-image-label">
                Synthetic fallback image · not an item photo
              </span>
            </div>
            <div className="listing-body">
              <section aria-label="Published item photos" className="listing-photo-gallery">
                {publishedListing.photos.map((photo, index) => (
                  <div
                    aria-label={`Fictional simulated item photo ${index + 1}: ${photo}`}
                    className="published-photo"
                    key={photo}
                    role="img"
                  >
                    <span>Fictional simulated item photo {index + 1}</span>
                    <strong>{photo}</strong>
                  </div>
                ))}
              </section>
              <div className="listing-meta">
                <span>{publishedListing.category}</span>
                <span>{selectedListingSeller.publicName} - Fictional Demo Seller</span>
                <span>{selectedListingDistanceBand}</span>
              </div>
              <h2>{publishedListing.title}</h2>
              <p className="listing-description">{publishedListing.description}</p>
              <p className="listing-description">
                <strong>Condition Disclosure:</strong> {publishedListing.conditionDisclosure}
              </p>
              <p className="listing-description">
                <strong>Measurements / specifications:</strong> {publishedListing.specifications}
              </p>
              <p className="listing-description">
                <strong>Included parts:</strong> {publishedListing.includedParts}
              </p>
              <p className="listing-description">
                {publishedListing.photos.length} item photos · complete-item view included ·{" "}
                {publishedListing.photoPrivacyConfirmed
                  ? "location metadata removed"
                  : "photo privacy not confirmed"}
              </p>
              <div className="listing-facts">
                <span>
                  <small>Condition Grade</small>
                  <strong>{publishedListing.conditionGrade}</strong>
                </span>
                <span>
                  <small>Example handover</small>
                  <strong>
                    {selectedSessionListing?.handoverTime ?? demoListing.handoverTime}
                  </strong>
                </span>
              </div>
              <div className="listing-footer">
                <div>
                  <small>Transaction Price</small>
                  <strong>{formatRupiah(publishedListing.price)}</strong>
                </div>
                <span className="read-only-badge">Shared listing</span>
              </div>
              {selectedBuyer && selectedSessionListing ? (
                selectedBuyerHold ? (
                  <section aria-label="Checkout Hold" className="checkout-panel">
                    <p className="eyebrow">Checkout Hold - Simulation</p>
                    <h3>{selectedBuyerHold.listingTitle}</h3>
                    <strong role="timer">
                      {formatCountdown(selectedHoldRemainingSeconds)} remaining
                    </strong>
                    <p>Expires {formatWibTime(selectedBuyerHold.expiresAtMs)}</p>
                    <p>Transaction Price: {formatRupiah(selectedBuyerHold.transactionPrice)}</p>
                    <p>
                      Simulation only. No real payment information or money is requested.
                    </p>
                    <div className="listing-actions">
                      <button
                        className="button button-outline"
                        onClick={() => {
                          setDemoClockPaused(true);
                          setClockOffsetMs(
                            selectedBuyerHold.expiresAtMs - 1000 - Date.now(),
                          );
                          setClockNowMs(selectedBuyerHold.expiresAtMs - 1000);
                        }}
                      >
                        Advance to one second before hold expiry
                      </button>
                      <button
                        className="button button-outline"
                        onClick={() => {
                          setClockOffsetMs(selectedBuyerHold.expiresAtMs - Date.now());
                          setClockNowMs(selectedBuyerHold.expiresAtMs);
                          setDemoClockPaused(false);
                          setCheckoutState((currentState) =>
                            expireCheckoutHolds(currentState, selectedBuyerHold.expiresAtMs),
                          );
                          setCheckoutNotice(
                            "Checkout Hold expired. The item returned to sale with no commitment or money movement.",
                          );
                        }}
                      >
                        Advance to exact hold expiry
                      </button>
                      <button
                        className="button button-outline"
                        onClick={() => {
                          setCheckoutState((currentState) =>
                            endCheckoutHold(
                              currentState,
                              selectedBuyerHold.buyerId,
                              selectedBuyerHold.listingId,
                            ),
                          );
                          setCheckoutNotice("Checkout abandoned. The item returned to sale with no commitment.");
                        }}
                      >
                        Abandon checkout
                      </button>
                      <button
                        className="button button-outline"
                        onClick={() => {
                          setCheckoutState((currentState) =>
                            endCheckoutHold(
                              currentState,
                              selectedBuyerHold.buyerId,
                              selectedBuyerHold.listingId,
                            ),
                          );
                          setCheckoutNotice("Simulated payment failed. The item returned to sale with no commitment.");
                        }}
                      >
                        Simulate failed payment
                      </button>
                      <button
                        className="button button-primary"
                        onClick={() => {
                          const actionNowMs = demoClockPaused
                            ? clockNowMs
                            : Date.now() + clockOffsetMs;
                          const nextState = completeSimulatedPayment(checkoutState, {
                            buyerId: selectedBuyerHold.buyerId,
                            sellerId: selectedSessionListing.sellerId,
                            listingId: selectedBuyerHold.listingId,
                            nowMs: actionNowMs,
                            activePurchaseLimit: selectedTierProgress?.activePurchaseLimit ?? 1,
                          });
                          const createdCommitment = nextState.commitments.find(
                            (commitment) =>
                              !checkoutState.commitments.some(
                                (current) => current.id === commitment.id,
                              ),
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
                        }}
                      >
                        Simulate successful payment
                      </button>
                    </div>
                  </section>
                ) : (
                  <section aria-label="Checkout" className="checkout-panel">
                    <p className="eyebrow">Single-item checkout - Simulation</p>
                    <button
                      className="button button-primary"
                      disabled={Boolean(selectedListingHold || !selectedCheckoutAllowance?.allowed)}
                      onClick={startSelectedCheckoutHold}
                    >
                      Start 5-minute Checkout Hold
                    </button>
                    {selectedListingHold ? (
                      <p>
                        Checkout is already in progress for another buyer. The holder's identity stays private.
                      </p>
                    ) : currentBuyerHold ? (
                      <p>
                        You already have a Checkout Hold for {currentBuyerHold.listingTitle}.
                        Finish or abandon it before starting another.
                      </p>
                    ) : selectedCheckoutAllowance?.reason === "account-suspended" ? (
                      <p>Buying and selling are suspended in this simulated session.</p>
                    ) : selectedCheckoutAllowance?.reason === "purchase-capacity-reached" ? (
                      <p>
                        {buyerTierLabel(selectedTierProgress?.tier ?? "Verified")} limit of {selectedTierProgress?.activePurchaseLimit ?? 1} active {(selectedTierProgress?.activePurchaseLimit ?? 1) === 1
                          ? "Purchase Commitment" : "Purchase Commitments"} reached.
                      </p>
                    ) : null}
                    <p>No real payment information or money is requested.</p>
                  </section>
                )
              ) : null}
              <section aria-label="Structured listing questions" className="listing-questions">
                <h3>Ask about this item</h3>
                <label>
                  Structured question
                  <select
                    value={selectedQuestion}
                    onChange={(event) => setSelectedQuestion(event.target.value)}
                  >
                    {structuredQuestions.map((question) => (
                      <option key={question}>{question}</option>
                    ))}
                  </select>
                </label>
                <button className="button button-outline" onClick={requestListingUpdate}>
                  Request listing update
                </button>
                {selectedPendingQuestion ? (
                  <p role="status">
                    Request sent: {selectedPendingQuestion}. Simulated activity; the seller must update the shared listing.
                  </p>
                ) : null}
                {questionUpdateNotice ? <p role="status">{questionUpdateNotice}</p> : null}
                <p>
                  No free-form chat, contact exchange, price negotiation, or off-platform
                  arrangements are available.
                </p>
              </section>
            </div>
          </section>

          <aside className="people-panel" aria-label="Fictional demo accounts">
            <div className="people-heading">
              <p className="eyebrow">Current account references</p>
              <h2>Selected fictional profiles</h2>
            </div>
            <section aria-label="Demo Buyer" className="person-card">
              <div className="avatar avatar-buyer" aria-hidden="true">
                {(selectedBuyer ?? demoBuyer).initials}
              </div>
              <div>
                <span className="fictional-label">Fictional Demo Buyer</span>
                <h3>{(selectedBuyer ?? demoBuyer).publicName}</h3>
                <p>{buyerTierLabel(selectedTierProgress?.tier ?? "Verified")}</p>
                <small>Identity · {(selectedBuyer ?? demoBuyer).identityStatus}</small>
              </div>
            </section>
            <section aria-label="Demo Seller" className="person-card">
              <div className="avatar avatar-seller" aria-hidden="true">
                {selectedListingSeller.initials}
              </div>
              <div>
                <span className="fictional-label">Fictional Demo Seller</span>
                <h3>{selectedListingSeller.publicName}</h3>
                <p>{selectedListingSeller.handovers}</p>
                <small>Identity · {selectedListingSeller.identityStatus}</small>
              </div>
            </section>
            <div className="privacy-note">
              <span aria-hidden="true">◇</span>
              <p>
                Current-use only; no buyer location history is retained. Seller Home Anchors and
                convenience zones stay private. No real identity, contact, precise location, or
                payment information appears in this preview.
              </p>
            </div>
          </aside>
        </div>
        </main>
      ) : activeWorkspace === "inventory" ? (
        <main className="demo-main">
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
      ) : (
        <main className="demo-main">
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
      )}

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
      <footer className="demo-footer">
        <p>Everything in this Demo Mode is fictional and exists only to explain Jualokal.</p>
        <button className="text-button" onClick={onExit}>
          Return to public page
        </button>
      </footer>
    </div>
  );
}

export default DemoExperience;
