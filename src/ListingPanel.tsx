import type { RefObject } from "react";
import { formatCountdown, formatRupiah, formatWibTime } from "./format";

// Presentation-only panel boundary. Checkout state, transitions, selection, and
// focus return stay with the caller so the page and the future map overlay share them.

export type ListingPanelSeller = Readonly<{
  publicName: string;
  initials: string;
  identityStatus: string;
  handovers: string;
}>;

export type ListingPanelListing = Readonly<{
  title: string;
  category: string;
  conditionGrade: string;
  price: number;
  description: string;
  conditionDisclosure: string;
  specifications: string;
  includedParts: string;
  photos: readonly string[];
  photoPrivacyConfirmed: boolean;
}>;

export type SellerPreviewListing = Readonly<{
  id: string;
  title: string;
  category: string;
  condition: string;
  price: number;
  availabilityLabel: string | null;
}>;

export type ListingPanelNotice =
  | Readonly<{ title: string; body: string }>
  | null;

export type ListingPanelCheckout =
  | Readonly<{
      kind: "hold";
      listingTitle: string;
      transactionPrice: number;
      expiresAtMs: number;
      remainingSeconds: number;
      onAdvanceToExpiryBoundary: () => void;
      onExpire: () => void;
      onAbandon: () => void;
      onSimulateFailedPayment: () => void;
      onSimulateSuccessfulPayment: () => void;
    }>
  | Readonly<{
      kind: "entry";
      disabled: boolean;
      heldByOther: boolean;
      currentHoldTitle: string | null;
      blockedReason: "account-suspended" | "purchase-capacity-reached" | null;
      tierLabel: string;
      activePurchaseLimit: number;
      onStart: () => void;
    }>;

export type ListingPanelQuestions = Readonly<{
  options: readonly string[];
  selected: string;
  pendingQuestion: string | null;
  updateNotice: string;
  onSelect: (question: string) => void;
  onRequestUpdate: () => void;
}>;

type SellerPreviewPanelProps = Readonly<{
  seller: Pick<ListingPanelSeller, "publicName" | "identityStatus">;
  distanceBand: string;
  trustSummary: Readonly<{
    successfulHandoverCount: number;
    differentPartnerCount: number;
    tierLabel: string;
  }>;
  listings: readonly SellerPreviewListing[];
  dialogRef: RefObject<HTMLElement | null>;
  closeButtonRef: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  onViewItem: (listingId: string) => void;
}>;

export function SellerPreviewPanel({
  seller,
  distanceBand,
  trustSummary,
  listings,
  dialogRef,
  closeButtonRef,
  onClose,
  onViewItem,
}: SellerPreviewPanelProps) {
  return (
    <div className="seller-preview-backdrop">
      <section
        aria-label={`Seller Preview: ${seller.publicName}`}
        aria-modal="true"
        className="seller-preview"
        ref={dialogRef}
        role="dialog"
      >
        <div className="seller-preview-heading">
          <div>
            <p className="eyebrow">Seller Preview · Fictional Demo Seller</p>
            <h2>{seller.publicName}</h2>
          </div>
          <button
            aria-label="Close Seller Preview"
            className="button button-compact button-outline"
            onClick={onClose}
            ref={closeButtonRef}
          >
            Close
          </button>
        </div>
        <section aria-label="Trust Summary" className="seller-preview-summary">
          <strong>Trust Summary</strong>
          <span>{seller.identityStatus}</span>
          <span>{trustSummary.successfulHandoverCount} successful handovers</span>
          <span>{trustSummary.differentPartnerCount} different partners</span>
          <span>{trustSummary.tierLabel}</span>
          <span>{distanceBand}</span>
        </section>
        <div className="seller-preview-listings">
          {listings.map((listing) => (
            <article
              aria-label={`Seller Preview Listing: ${listing.title}`}
              className="seller-preview-listing-card"
              key={listing.id}
            >
              <div
                aria-label={`Synthetic presentation for ${listing.title}`}
                className="seller-preview-listing-media"
                role="img"
              >
                <span aria-hidden="true">{listing.category.slice(0, 1)}</span>
              </div>
              <div>
                <span className="fictional-label">Simulated Demo Listing</span>
                <h3>{listing.title}</h3>
                {listing.availabilityLabel ? (
                  <p className="checkout-availability-badge">
                    {listing.availabilityLabel}
                  </p>
                ) : null}
                <p>
                  {listing.category} · {listing.condition}
                </p>
                <div className="seller-preview-listing-footer">
                  <strong>{formatRupiah(listing.price)}</strong>
                  <button
                    className="button button-primary"
                    onClick={() => onViewItem(listing.id)}
                  >
                    View item
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

type ListingPanelProps = Readonly<{
  sectionRef: RefObject<HTMLElement | null>;
  isDiscoverable: boolean;
  listing: ListingPanelListing;
  seller: ListingPanelSeller;
  distanceBand: string | undefined;
  handoverTime: string;
  availabilityLabel: string | null;
  notice: ListingPanelNotice;
  checkout: ListingPanelCheckout | null;
  questions: ListingPanelQuestions;
}>;

export default function ListingPanel({
  sectionRef,
  isDiscoverable,
  listing,
  seller,
  distanceBand,
  handoverTime,
  availabilityLabel,
  notice,
  checkout,
  questions,
}: ListingPanelProps) {
  return (
    <>
      {notice ? (
        <section className="registration-panel marketplace-empty">
          <h2>{notice.title}</h2>
          <p>{notice.body}</p>
        </section>
      ) : null}
      <section
        aria-label="Demo Listing"
        className="listing-card"
        hidden={!isDiscoverable}
        ref={sectionRef}
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
            {listing.photos.map((photo, index) => (
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
            <span>{listing.category}</span>
            <span>{seller.publicName} - Fictional Demo Seller</span>
            <span>{distanceBand}</span>
          </div>
          <h2>{listing.title}</h2>
          <p className="listing-description">{listing.description}</p>
          <p className="listing-description">
            <strong>Condition Disclosure:</strong> {listing.conditionDisclosure}
          </p>
          <p className="listing-description">
            <strong>Measurements / specifications:</strong> {listing.specifications}
          </p>
          <p className="listing-description">
            <strong>Included parts:</strong> {listing.includedParts}
          </p>
          <p className="listing-description">
            {listing.photos.length} item photos · complete-item view included ·{" "}
            {listing.photoPrivacyConfirmed
              ? "location metadata removed"
              : "photo privacy not confirmed"}
          </p>
          <div className="listing-facts">
            <span>
              <small>Condition Grade</small>
              <strong>{listing.conditionGrade}</strong>
            </span>
            <span>
              <small>Example handover</small>
              <strong>{handoverTime}</strong>
            </span>
          </div>
          <div className="listing-footer">
            <div>
              <small>Transaction Price</small>
              <strong>{formatRupiah(listing.price)}</strong>
            </div>
            <span className="read-only-badge">Shared listing</span>
          </div>
          {availabilityLabel ? (
            <p className="checkout-availability-badge">{availabilityLabel}</p>
          ) : null}
          {checkout ? (
            checkout.kind === "hold" ? (
              <section aria-label="Checkout Hold" className="checkout-panel">
                <p className="eyebrow">Checkout Hold - Simulation</p>
                <h3>{checkout.listingTitle}</h3>
                <strong role="timer">
                  {formatCountdown(checkout.remainingSeconds)} remaining
                </strong>
                <p>Expires {formatWibTime(checkout.expiresAtMs)}</p>
                <p>Transaction Price: {formatRupiah(checkout.transactionPrice)}</p>
                <p>
                  Simulation only. No real payment information or money is requested.
                </p>
                <div className="listing-actions">
                  <button
                    className="button button-outline"
                    onClick={checkout.onAdvanceToExpiryBoundary}
                  >
                    Advance to one second before hold expiry
                  </button>
                  <button className="button button-outline" onClick={checkout.onExpire}>
                    Advance to exact hold expiry
                  </button>
                  <button className="button button-outline" onClick={checkout.onAbandon}>
                    Abandon checkout
                  </button>
                  <button
                    className="button button-outline"
                    onClick={checkout.onSimulateFailedPayment}
                  >
                    Simulate failed payment
                  </button>
                  <button
                    className="button button-primary"
                    onClick={checkout.onSimulateSuccessfulPayment}
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
                  disabled={checkout.disabled}
                  onClick={checkout.onStart}
                >
                  Start 5-minute Checkout Hold
                </button>
                {checkout.heldByOther ? (
                  <p>
                    Checkout is already in progress for another buyer. The holder's
                    identity stays private.
                  </p>
                ) : checkout.currentHoldTitle ? (
                  <p>
                    You already have a Checkout Hold for {checkout.currentHoldTitle}.
                    Finish or abandon it before starting another.
                  </p>
                ) : checkout.blockedReason === "account-suspended" ? (
                  <p>Buying and selling are suspended in this simulated session.</p>
                ) : checkout.blockedReason === "purchase-capacity-reached" ? (
                  <p>
                    {checkout.tierLabel} limit of {checkout.activePurchaseLimit} active{" "}
                    {checkout.activePurchaseLimit === 1
                      ? "Purchase Commitment"
                      : "Purchase Commitments"}{" "}
                    reached.
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
                value={questions.selected}
                onChange={(event) => questions.onSelect(event.target.value)}
              >
                {questions.options.map((question) => (
                  <option key={question}>{question}</option>
                ))}
              </select>
            </label>
            <button className="button button-outline" onClick={questions.onRequestUpdate}>
              Request listing update
            </button>
            {questions.pendingQuestion ? (
              <p role="status">
                Request sent: {questions.pendingQuestion}. Simulated activity; the seller
                must update the shared listing.
              </p>
            ) : null}
            {questions.updateNotice ? <p role="status">{questions.updateNotice}</p> : null}
            <p>
              No free-form chat, contact exchange, price negotiation, or off-platform
              arrangements are available.
            </p>
          </section>
        </div>
      </section>
    </>
  );
}
