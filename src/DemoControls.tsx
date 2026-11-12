import { useEffect, useRef } from "react";

export type DemoControlsAccount = Readonly<{
  id: string;
  label: string;
  group: "buyer" | "seller";
}>;

type DemoControlsBuyer = Readonly<{
  publicName: string;
  identityStatus: string;
  history: string;
}>;

type DemoControlsSeller = Readonly<{
  publicName: string;
  identityStatus: string;
  activationStatus: string;
  handovers: string;
}>;

type DemoControlsProps = Readonly<{
  open: boolean;
  onClose: () => void;
  selectedAccountId: string;
  accountOptions: readonly DemoControlsAccount[];
  onAccountChange: (accountId: string) => void;
  selectedBuyer: DemoControlsBuyer | null;
  selectedSeller: DemoControlsSeller | null;
  buyerTierLabel: string | null;
  activePurchaseLimit: number | null;
  currentRole: string;
  buyerCount: number;
  sellerCount: number;
  activeListingCount: number;
  activeWorkspace: "buyer" | "seller" | "inventory";
  onBuyerDiscovery: () => void;
  onSellerDiscovery: () => void;
  onSellerWorkspace: () => void;
  onInventory: () => void;
  onOrders: () => void;
  browsingLocation: string;
  browsingLocationOptions: readonly Readonly<{ value: string; label: string }>[];
  onBrowsingLocationChange: (value: string) => void;
  onRefreshNearby: () => void;
  onMarkStale: () => void;
  snapshotRevision: number;
  onSimulateMapFailure: () => void;
  onReset: () => void;
  onExit: () => void;
}>;

export default function DemoControls({
  open,
  onClose,
  selectedAccountId,
  accountOptions,
  onAccountChange,
  selectedBuyer,
  selectedSeller,
  buyerTierLabel,
  activePurchaseLimit,
  currentRole,
  buyerCount,
  sellerCount,
  activeListingCount,
  activeWorkspace,
  onBuyerDiscovery,
  onSellerDiscovery,
  onSellerWorkspace,
  onInventory,
  onOrders,
  browsingLocation,
  browsingLocationOptions,
  onBrowsingLocationChange,
  onRefreshNearby,
  onMarkStale,
  snapshotRevision,
  onSimulateMapFailure,
  onReset,
  onExit,
}: DemoControlsProps) {
  const dialogRef = useRef<HTMLElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    closeButtonRef.current?.focus();
    const handleDrawerKeyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(
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
    window.addEventListener("keydown", handleDrawerKeyboard);
    return () => window.removeEventListener("keydown", handleDrawerKeyboard);
  }, [open]);

  if (!open) return null;

  const buyerOptions = accountOptions.filter((account) => account.group === "buyer");
  const sellerOptions = accountOptions.filter((account) => account.group === "seller");

  return (
    <div className="demo-controls-backdrop" onClick={onClose}>
      <section
        aria-labelledby="demo-controls-title"
        aria-modal="true"
        className="demo-controls-drawer"
        id="demo-controls-drawer"
        onClick={(event) => event.stopPropagation()}
        ref={dialogRef}
        role="dialog"
      >
        <div className="demo-controls-heading">
          <div>
            <p className="eyebrow">Simulation only</p>
            <h2 id="demo-controls-title">Demo controls</h2>
          </div>
          <button
            aria-label="Close Demo controls"
            className="button button-compact button-outline"
            onClick={onClose}
            ref={closeButtonRef}
          >
            Close
          </button>
        </div>

        <section aria-labelledby="demo-controls-session" className="demo-controls-section">
          <h3 id="demo-controls-session">Session</h3>
          <div aria-label="Demo session totals" className="demo-controls-counts" role="group">
            <span>{buyerCount} Demo Buyers</span>
            <span>{sellerCount} Demo Sellers</span>
            <span>{activeListingCount} active Demo Listings</span>
          </div>
          <p className="demo-controls-role">Current role: {currentRole}</p>
          <label>
            Selected fictional account
            <select
              aria-label="Selected fictional account"
              onChange={(event) => onAccountChange(event.target.value)}
              value={selectedAccountId}
            >
              <optgroup label={`Fictional Demo Buyers (${buyerCount})`}>
                {buyerOptions.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.label}
                  </option>
                ))}
              </optgroup>
              <optgroup label={`Fictional Demo Sellers (${sellerCount})`}>
                {sellerOptions.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.label}
                  </option>
                ))}
              </optgroup>
            </select>
          </label>
          {selectedBuyer ? (
            <div className="demo-controls-identity">
              <span className="fictional-label">Fictional Demo Buyer</span>
              <strong>{selectedBuyer.publicName}</strong>
              <span>Identity status: {selectedBuyer.identityStatus}</span>
              {buyerTierLabel ? <span>Buyer Tier: {buyerTierLabel}</span> : null}
              {activePurchaseLimit !== null ? (
                <span>Active Purchase Commitment limit: {activePurchaseLimit}</span>
              ) : null}
              <p>{selectedBuyer.history}</p>
            </div>
          ) : selectedSeller ? (
            <div className="demo-controls-identity">
              <span className="fictional-label">Fictional Demo Seller</span>
              <strong>{selectedSeller.publicName}</strong>
              <span>Identity status: {selectedSeller.identityStatus}</span>
              <span>{selectedSeller.activationStatus}</span>
              <span>{selectedSeller.handovers}</span>
            </div>
          ) : null}
          <div className="demo-controls-actions">
            <button className="button button-outline" onClick={onReset}>
              Reset Demo
            </button>
            <button className="button button-outline" onClick={onExit}>
              Exit demo
              <span aria-hidden="true">×</span>
            </button>
          </div>
        </section>

        <section aria-labelledby="demo-controls-location" className="demo-controls-section">
          <h3 id="demo-controls-location">Location</h3>
          <label>
            Simulated Browsing Location
            <select
              aria-label="Simulated Browsing Location"
              onChange={(event) => onBrowsingLocationChange(event.target.value)}
              value={browsingLocation}
            >
              {browsingLocationOptions.map((location) => (
                <option key={location.value} value={location.value}>
                  {location.label}
                </option>
              ))}
            </select>
          </label>
          <div className="demo-controls-actions">
            <button className="button button-primary" onClick={onRefreshNearby}>
              Refresh nearby listings
            </button>
            <button className="button button-outline" onClick={onMarkStale}>
              Simulate stale resumed session
            </button>
          </div>
          <small>
            Active simulated snapshot {snapshotRevision}. Selection alone never changes
            discovery.
          </small>
        </section>

        <section aria-labelledby="demo-controls-simulation" className="demo-controls-section">
          <h3 id="demo-controls-simulation">Simulation</h3>
          <p className="demo-controls-hint">
            Failure scenarios stay simulated snapshots. Selecting one does not change discovery
            until Refresh nearby listings.
          </p>
          <button className="button button-outline" onClick={onSimulateMapFailure}>
            Simulate map failure
          </button>
          <p className="demo-controls-hint">
            Discovery failure is available as the &quot;Discovery service unavailable&quot;
            snapshot option.
          </p>
        </section>

        <section aria-labelledby="demo-controls-workspaces" className="demo-controls-section">
          <h3 id="demo-controls-workspaces">Workspaces</h3>
          <nav aria-label="Demo workspaces" className="demo-controls-workspaces">
            <button
              aria-current={
                activeWorkspace === "buyer" && selectedBuyer ? "page" : undefined
              }
              className="button button-outline"
              onClick={onBuyerDiscovery}
            >
              Buyer discovery
            </button>
            {selectedSeller ? (
              <button
                aria-current={activeWorkspace === "buyer" ? "page" : undefined}
                className="button button-outline"
                onClick={onSellerDiscovery}
              >
                View discovery as selected Seller
              </button>
            ) : null}
            <button
              aria-current={activeWorkspace === "seller" ? "page" : undefined}
              className="button button-outline"
              onClick={onSellerWorkspace}
            >
              Seller workspace
            </button>
            <button
              aria-current={activeWorkspace === "inventory" ? "page" : undefined}
              className="button button-outline"
              onClick={onInventory}
            >
              Demo inventory
            </button>
            <button className="button button-outline" onClick={onOrders}>
              Orders
            </button>
          </nav>
        </section>

        <section aria-labelledby="demo-controls-privacy" className="demo-controls-section">
          <h3 id="demo-controls-privacy">Privacy</h3>
          <p>
            Accounts, listings, location, identity status, and activity are fictional.
            Fictional pre-verified accounts enter directly; normal admission uses the separate
            simulated Identity Verification walkthrough.
          </p>
          <p>
            No real identity, contact, precise location, or payment information appears in Demo
            Mode. Protected account records, internal details, Home Anchors, and raw location
            coordinates stay absent.
          </p>
        </section>
      </section>
    </div>
  );
}
