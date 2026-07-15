import { useState } from "react";
import { demoBuyer, demoListing, demoSeller } from "./demo-data";

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
  const [activeWorkspace, setActiveWorkspace] = useState<"buyer" | "seller">("buyer");
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
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);
  const [questionUpdateNotice, setQuestionUpdateNotice] = useState("");
  const [browsingLocation, setBrowsingLocation] = useState("0.85");

  const browsingDistanceKm = Number(browsingLocation);
  const browsingLocationIsAvailable = Number.isFinite(browsingDistanceKm);
  const listingIsDiscoverable =
    listingStatus === "active" &&
    browsingLocationIsAvailable &&
    browsingDistanceKm <= prototypeDiscoveryRadiusKm &&
    browsingDistanceKm <= permanentDiscoveryMaximumKm;

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
      pendingQuestion &&
      JSON.stringify(nextPublishedListing) === JSON.stringify(publishedListing)
    ) {
      setPublicationErrors([
        "Change at least one shared listing detail to answer this request",
      ]);
      return;
    }

    setPublicationErrors([]);
    setPublishedListing(nextPublishedListing);
    setListingStatus("active");
    setManagementNotice("");
    setPublicationNotice("Listing published");

    if (pendingQuestion) {
      setQuestionUpdateNotice(`Shared listing updated for ${pendingQuestion}`);
      setPendingQuestion(null);
    }
  }

  function deactivateListing() {
    setListingStatus("deactivated");
    setPublicationNotice("");
    setManagementNotice("Listing deactivated");
  }

  function markCrossListedUnavailable() {
    setListingStatus("cross-listed-unavailable");
    setPublicationNotice("");
    setManagementNotice("Cross-listed item marked unavailable");
  }

  function requestListingUpdate() {
    setPendingQuestion(selectedQuestion);
    setQuestionUpdateNotice("");
  }

  return (
    <div className="demo-shell">
      <div aria-label="Demo Mode simulation" className="demo-notice" role="status">
        <span className="simulation-pill">
          <span aria-hidden="true">●</span> Demo Mode · Simulation
        </span>
        <p>Accounts, listing, location, identity status, and activity are fictional.</p>
      </div>

      <header className="demo-header">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            J
          </span>
          <span>jualokal</span>
        </div>
        <button className="button button-compact button-outline" onClick={onExit}>
          Exit demo
          <span aria-hidden="true">×</span>
        </button>
      </header>

      <nav aria-label="Demo workspaces" className="workspace-tabs">
        <button
          className="button button-compact button-outline"
          onClick={() => setActiveWorkspace("buyer")}
        >
          Buyer discovery
        </button>
        <button
          className="button button-compact button-outline"
          onClick={() => setActiveWorkspace("seller")}
        >
          Seller workspace
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
                <span>{formatRoundedDistance(browsingDistanceKm)}</span>
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
                  <strong>{demoListing.handoverTime}</strong>
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
                {pendingQuestion ? (
                  <p role="status">
                    Request sent: {pendingQuestion}. The seller must update the shared listing.
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
              <p className="eyebrow">This demo contains</p>
              <h2>Two fictional people</h2>
            </div>
            <section aria-label="Demo Buyer" className="person-card">
              <div className="avatar avatar-buyer" aria-hidden="true">
                AR
              </div>
              <div>
                <span className="fictional-label">Fictional Demo Buyer</span>
                <h3>{demoBuyer.publicName}</h3>
                <p>{demoBuyer.tier}</p>
                <small>Identity · {demoBuyer.identityStatus}</small>
              </div>
            </section>
            <section aria-label="Demo Seller" className="person-card">
              <div className="avatar avatar-seller" aria-hidden="true">
                DP
              </div>
              <div>
                <span className="fictional-label">Fictional Demo Seller</span>
                <h3>{demoSeller.publicName}</h3>
                <p>{demoSeller.handovers}</p>
                <small>Identity · {demoSeller.identityStatus}</small>
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
      ) : (
        <main className="demo-main">
          <section
            aria-labelledby="seller-workspace-title"
            className="registration-panel seller-workspace"
          >
            <p className="eyebrow">Pre-activated Demo Seller · Simulation</p>
            <h1 id="seller-workspace-title">Manage demo listing</h1>
            {pendingQuestion ? (
              <section aria-label="Structured Question Request" className="question-request">
                <h2>Structured Question Request</h2>
                <p>{pendingQuestion}</p>
                <p>Answer by improving the shared listing below. There is no private reply.</p>
              </section>
            ) : null}
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
                {pendingQuestion ? "Update shared listing" : "Publish listing"}
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
