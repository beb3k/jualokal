import { useState } from "react";
import {
  demoBuyer,
  demoBuyers,
  demoListing,
  demoListings,
  demoSeller,
  demoSellers,
  type DemoListingSeed,
} from "./demo-data";

const approvedCategories = [
  "Clothing",
  "Accessories",
  "Small electronics",
  "Books",
  "Toys",
  "Hobby equipment",
  "Portable household goods",
] as const;

const conditionGrades = ["Like New", "Very Good", "Good", "Fair", "Needs Repair"] as const;
const structuredQuestions = [
  "Condition",
  "Measurements",
  "Included parts",
  "Compatibility",
  "Additional photos",
] as const;

const prototypeDiscoveryRadiusKm = 2;
const permanentDiscoveryMaximumKm = 10;

const browsingLocations = [
  { value: "0.85", label: "Current simulated location · about 850 m" },
  { value: "1.99", label: "Nearby boundary check" },
  { value: "2.00", label: "Discovery-radius edge" },
  { value: "2.01", label: "Outside discovery-radius check" },
  { value: "10.00", label: "Permanent-maximum check" },
  { value: "10.01", label: "Beyond permanent-maximum check" },
  { value: "denied", label: "Location permission denied" },
  { value: "unavailable", label: "Location unavailable" },
] as const;

type PublishedListing = {
  title: string;
  category: string;
  conditionGrade: string;
  price: number;
  description: string;
  conditionDisclosure: string;
  specifications: string;
  photos: string[];
  photoPrivacyConfirmed: boolean;
};

type ListingStatus = "active" | "deactivated" | "cross-listed-unavailable";

type SessionListing = DemoListingSeed & {
  status: ListingStatus;
  photos: string[];
  photoPrivacyConfirmed: boolean;
};

function createInitialSessionListings(): SessionListing[] {
  return demoListings.map((listing) => ({
    ...listing,
    status: "active",
    photos: ["Complete-item view", "Detail view", "Second detail view"],
    photoPrivacyConfirmed: true,
  }));
}

const initialPublishedListing: PublishedListing = {
  title: demoListing.title,
  category: demoListing.category,
  conditionGrade: demoListing.condition,
  price: 185000,
  description: demoListing.description,
  conditionDisclosure: "Light surface wear near the rim; the handle is secure.",
  specifications: "42 cm wide × 30 cm high; approximately 650 g.",
  photos: ["Complete-item view", "Detail view", "Second detail view"],
  photoPrivacyConfirmed: true,
};

function formatRupiah(price: number) {
  return `Rp ${price.toLocaleString("id-ID")}`;
}

function formatRoundedDistance(distanceKm: number) {
  if (distanceKm < 1) {
    return `${Math.round((distanceKm * 1000) / 50) * 50} m away`;
  }

  return `${distanceKm.toFixed(1)} km away`;
}

function DemoExperience({ onExit }: { onExit: () => void }) {
  const [activeWorkspace, setActiveWorkspace] = useState<"buyer" | "seller" | "inventory">("buyer");
  const [selectedAccountId, setSelectedAccountId] = useState<string>(demoBuyer.id);
  const [sessionListings, setSessionListings] = useState<SessionListing[]>(
    createInitialSessionListings,
  );
  const [selectedListingId, setSelectedListingId] = useState(demoListing.id);
  const [resetConfirmationOpen, setResetConfirmationOpen] = useState(false);
  const [title, setTitle] = useState<string>(demoListing.title);
  const [category, setCategory] = useState<string>(demoListing.category);
  const [conditionGrade, setConditionGrade] = useState<string>(demoListing.condition);
  const [price, setPrice] = useState("185000");
  const [description, setDescription] = useState<string>(demoListing.description);
  const [specifications, setSpecifications] = useState(initialPublishedListing.specifications);
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
  const [browsingLocation, setBrowsingLocation] = useState("0.85");
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
  const selectedListingSeller =
    demoSellers.find((seller) => seller.id === selectedSessionListing?.sellerId) ?? demoSeller;
  const activeListingCount = sessionListings.filter(
    (listing) => listing.status === "active",
  ).length;
  const selectedPendingQuestion =
    pendingQuestion?.listingId === selectedListingId ? pendingQuestion.question : null;

  const browsingDistanceKm = Number(browsingLocation);
  const browsingLocationIsAvailable = Number.isFinite(browsingDistanceKm);
  const selectedListingDistanceKm =
    browsingLocation === "0.85"
      ? (selectedSessionListing?.distanceKm ?? browsingDistanceKm)
      : browsingDistanceKm;
  const listingIsDiscoverable =
    listingStatus === "active" &&
    browsingLocationIsAvailable &&
    selectedListingDistanceKm <= prototypeDiscoveryRadiusKm &&
    selectedListingDistanceKm <= permanentDiscoveryMaximumKm;
  const visibleDemoListings = browsingLocationIsAvailable
    ? sessionListings.filter((listing) => {
        const distanceKm =
          browsingLocation === "0.85" ? listing.distanceKm : browsingDistanceKm;
        return (
          listing.status === "active" &&
          distanceKm <= prototypeDiscoveryRadiusKm &&
          distanceKm <= permanentDiscoveryMaximumKm
        );
      })
    : [];


  function loadListingForEditing(listing: SessionListing) {
    setSelectedListingId(listing.id);
    setTitle(listing.title);
    setCategory(listing.category);
    setConditionGrade(listing.condition);
    setPrice(String(listing.price));
    setDescription(listing.description);
    setSpecifications(listing.specifications);
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
      photos: listing.photos,
      photoPrivacyConfirmed: listing.photoPrivacyConfirmed,
    });
    setListingStatus(listing.status);
    setPublicationErrors([]);
    setPublicationNotice("");
    setManagementNotice("");
    setQuestionUpdateNotice("");
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

    if (!approvedCategories.includes(category as (typeof approvedCategories)[number])) {
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

  function resetDemo() {
    setActiveWorkspace("buyer");
    setSelectedAccountId(demoBuyer.id);
    setSessionListings(createInitialSessionListings());
    setSelectedListingId(demoListing.id);
    setTitle(demoListing.title);
    setCategory(demoListing.category);
    setConditionGrade(demoListing.condition);
    setPrice("185000");
    setDescription(demoListing.description);
    setSpecifications(initialPublishedListing.specifications);
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
    setBrowsingLocation("0.85");
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
                  {buyer.publicName} - {buyer.tier} - simulated
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
              <span>Buyer Tier: {selectedBuyer.tier}</span>
              <span>Active Purchase Commitment limit: {selectedBuyer.activePurchaseLimit}</span>
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

      {activeWorkspace === "buyer" ? (
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

        <section aria-label="Demo marketplace listings" className="discovery-catalog">
          <div className="inventory-heading">
            <p className="eyebrow">Nearby Demo Listings - Simulation</p>
            <h2>{visibleDemoListings.length} nearby simulated listings</h2>
            <p>
              Discovery uses the fixed 2 km radius. Out-of-radius inventory remains hidden
              here and available only in the complete simulated inventory.
            </p>
          </div>
          <div className="discovery-grid">
            {visibleDemoListings.map((listing) => {
              const seller = demoSellers.find(
                (candidate) => candidate.id === listing.sellerId,
              );
              const distanceKm =
                browsingLocation === "0.85" ? listing.distanceKm : browsingDistanceKm;
              return (
                <article aria-label={`Nearby simulated listing: ${listing.title}`} key={listing.id}>
                  <span className="fictional-label">Simulated Demo Listing</span>
                  <h3>{listing.title}</h3>
                  <p>{seller?.publicName} - Fictional Demo Seller</p>
                  <div className="inventory-facts">
                    <span>{listing.category}</span>
                    <span>{listing.condition}</span>
                    <span>{distanceKm < 1 ? "Under 1 km" : "1-2 km"}</span>
                    <span>{formatRupiah(listing.price)}</span>
                  </div>
                  <small>{listing.imageLabel}</small>
                </article>
              );
            })}
          </div>
        </section>

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
          {browsingLocationIsAvailable && browsingDistanceKm > prototypeDiscoveryRadiusKm ? (
            <section className="registration-panel marketplace-empty">
              <h2>No nearby listings</h2>
              <p>This item is outside the 2 km Discovery Radius.</p>
            </section>
          ) : null}
          {browsingLocationIsAvailable &&
          browsingDistanceKm <= prototypeDiscoveryRadiusKm &&
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
                <span>{formatRoundedDistance(selectedListingDistanceKm)}</span>
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
                <p>{(selectedBuyer ?? demoBuyer).tier}</p>
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
                return (
                  <article aria-label={`Simulated listing: ${listing.title}`} key={listing.id}>
                    <span className="fictional-label">Simulated Demo Listing</span>
                    <span>
                      {listing.status === "active"
                        ? "Active"
                        : listing.status === "deactivated"
                          ? "Deactivated"
                          : "Cross-listed unavailable"} &middot; simulated
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
                    {listing.title} - {listing.status} - simulated
                  </option>
                ))}
              </select>
            </label>
            <label>
              Title
              <input value={title} onChange={(event) => setTitle(event.target.value)} />
            </label>
            <label>
              Category
              <select value={category} onChange={(event) => setCategory(event.target.value)}>
                {approvedCategories.map((approvedCategory) => (
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
