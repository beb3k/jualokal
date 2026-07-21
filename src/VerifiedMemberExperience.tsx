import { useState } from "react";

type VerifiedMemberExperienceProps = {
  buyerTier: "Verified Buyer" | "Reliable Buyer" | "Trusted Buyer";
  differentPartnerCount: number;
  onExit: () => Promise<boolean>;
  profilePictureAdded: boolean;
  publicIdentity: string;
  successfulHandoverCount: number;
};

function SellerActivationPanel({
  onActivated,
  onClose,
}: {
  onActivated: () => void;
  onClose: () => void;
}) {
  const [homeAnchorConfirmed, setHomeAnchorConfirmed] = useState(false);
  const [payoutConfirmed, setPayoutConfirmed] = useState(false);
  const [rulesAccepted, setRulesAccepted] = useState(false);
  const readyToActivate = homeAnchorConfirmed && payoutConfirmed && rulesAccepted;

  return (
    <div className="dialog-backdrop">
      <section
        aria-labelledby="seller-activation-title"
        aria-modal="true"
        className="registration-panel seller-activation-panel"
        role="dialog"
      >
        <button aria-label="Close Seller Activation" className="icon-button" onClick={onClose}>
          ×
        </button>
        <p className="eyebrow">Seller Activation · Simulation</p>
        <h2 id="seller-activation-title">Seller Activation</h2>
        <p className="panel-lead">
          This one-time step is separate from Identity Verification and activates selling
          immediately after every requirement is confirmed.
        </p>
        <div className="registration-note">
          <span aria-hidden="true">◇</span>
          <p>
            The exact Home Anchor is never shown to visitors, buyers, or other Sellers. No real
            payout details or money are collected.
          </p>
        </div>

        <fieldset className="activation-requirements">
          <legend>Confirm all three requirements</legend>
          <label>
            <input
              checked={homeAnchorConfirmed}
              onChange={(event) => setHomeAnchorConfirmed(event.target.checked)}
              type="checkbox"
            />
            <span>
              <strong>Use a fictional protected Home Anchor</strong>
              <small>Stored only as a private simulated confirmation; no address is entered.</small>
            </span>
          </label>
          <label>
            <input
              checked={payoutConfirmed}
              onChange={(event) => setPayoutConfirmed(event.target.checked)}
              type="checkbox"
            />
            <span>
              <strong>Confirm a simulated payout destination</strong>
              <small>No account number, payment details, funds, or money are requested.</small>
            </span>
          </label>
          <label>
            <input
              checked={rulesAccepted}
              onChange={(event) => setRulesAccepted(event.target.checked)}
              type="checkbox"
            />
            <span>
              <strong>Accept Jualokal's selling and handover rules</strong>
              <small>Listings and handovers must follow Jualokal's protected local rules.</small>
            </span>
          </label>
        </fieldset>

        <button
          className="button button-primary"
          disabled={!readyToActivate}
          onClick={onActivated}
        >
          Complete Seller Activation
        </button>
        <button className="text-button" onClick={onClose}>
          Keep buyer-only membership
        </button>
      </section>
    </div>
  );
}

function VerifiedMemberExperience({
  buyerTier,
  differentPartnerCount,
  onExit,
  profilePictureAdded,
  publicIdentity,
  successfulHandoverCount,
}: VerifiedMemberExperienceProps) {
  const [activationOpen, setActivationOpen] = useState(false);
  const [sellerActivated, setSellerActivated] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const initials = publicIdentity
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  async function handleSignOut() {
    setSignOutError(null);
    setSigningOut(true);
    const completed = await onExit();
    if (!completed) {
      setSignOutError("Sign out failed. Your session remains active; try again.");
      setSigningOut(false);
    }
  }

  return (
    <div className="member-shell">
      <header className="member-header">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            J
          </span>
          <span>jualokal</span>
        </div>
        <div className="member-header-actions">
          {signOutError ? <p role="alert">{signOutError}</p> : null}
          <button
            className="button button-compact button-outline"
            disabled={signingOut}
            onClick={handleSignOut}
          >
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </header>

      <main aria-label="Verified Member marketplace" className="member-main">
        <section className="member-hero">
          <div>
            <p className="eyebrow">Admission complete · Simulation</p>
            <h1>Verified Member</h1>
            <p>
              Simulated Identity Verification is complete. You can browse and buy as an
              accountable member without becoming a Seller.
            </p>
          </div>
          <span className="member-status">Identity · Simulated as verified</span>
        </section>

        <section aria-label="Marketplace next steps" className="member-next-steps">
          <div className="member-next-steps-heading">
            <p className="eyebrow">Your marketplace path</p>
            <h2>Ready for the next local exchange.</h2>
            <p>
              Membership unlocks buying now. Seller Activation remains a separate choice when
              you are ready to list an item.
            </p>
          </div>
          <div className="member-next-steps-grid">
            <article>
              <span>01</span>
              <h3>Discover nearby</h3>
              <p>Browse private local inventory using a current Browsing Location.</p>
            </article>
            <article>
              <span>02</span>
              <h3>Purchase with confidence</h3>
              <p>Review the full listing before a protected Checkout Hold and handover.</p>
            </article>
            <article>
              <span>03</span>
              <h3>Sell when ready</h3>
              <p>Complete Seller Activation separately without publishing a Home Anchor.</p>
            </article>
          </div>
        </section>

        <section aria-label="Marketplace access" className="member-card">
          <div className="member-card-heading">
            <div>
              <p className="eyebrow">Normal marketplace access</p>
              <h2>Membership permissions</h2>
            </div>
            <span className="status-pill status-success">Unlocked</span>
          </div>
          <div className="access-status-grid">
            <article>
              <small>Marketplace</small>
              <strong>Browse enabled</strong>
              <p>Listings can appear here when normal inventory is available.</p>
            </article>
            <article>
              <small>Buyer access</small>
              <strong>Buy enabled</strong>
              <p>Buyer eligibility is active; no checkout is included in this preview.</p>
            </article>
            <article>
              <small>Seller access</small>
              <strong>{sellerActivated ? "Selling enabled" : "Selling locked"}</strong>
              <p>
                {sellerActivated
                  ? "Seller Activation is complete."
                  : "Seller Activation is a separate one-time step."}
              </p>
            </article>
          </div>
        </section>

        <section aria-label="Public Identity" className="member-card public-identity-card">
          <div className="public-identity-profile">
            <div className="public-identity-avatar" aria-hidden="true">
              {initials}
            </div>
            <div>
              <p className="eyebrow">Visible to other Verified Members</p>
              <h2>{publicIdentity}</h2>
              <p className="profile-picture-status">
                Profile picture <strong>{profilePictureAdded ? "Optional · Added" : "Optional · Not added"}</strong>
              </p>
            </div>
          </div>
          <p>
            Public Identity uses only a verified first name and last initial. A member with a
            single name appears using that single name.
          </p>

          <section aria-label="Trust Summary" className="trust-summary">
            <article>
              <small>Identity Verification</small>
              <strong>Simulated as verified</strong>
            </article>
            <article>
              <small>Handovers</small>
              <strong>{successfulHandoverCount} successful handovers</strong>
            </article>
            <article>
              <small>Transaction partners</small>
              <strong>{differentPartnerCount} different partners</strong>
            </article>
            <article>
              <small>Buyer Tier</small>
              <strong>{buyerTier}</strong>
            </article>
          </section>

          <div className="privacy-note">
            <span aria-hidden="true">◇</span>
            <p>
              Full legal identity, verification evidence, private contacts, detailed Trust
              Records, and private locations remain hidden.
            </p>
          </div>
        </section>

        <section aria-label="Seller Activation" className="member-card seller-activation-card">
          <div>
            <p className="eyebrow">Separate from membership</p>
            <h2>Seller Activation</h2>
            {sellerActivated ? (
              <>
                <strong>Seller Activation complete</strong>
                <p>Selling enabled immediately · No manual approval</p>
              </>
            ) : (
              <p>
                Your Verified Member access is active. Selling remains unavailable until this
                separate simulated step is complete.
              </p>
            )}
          </div>
          <div className="seller-activation-action">
            <span className={sellerActivated ? "status-pill status-success" : "status-pill"}>
              {sellerActivated ? "Activated" : "Not activated"}
            </span>
            {sellerActivated ? null : (
              <button className="button button-primary" onClick={() => setActivationOpen(true)}>
                Activate selling
              </button>
            )}
          </div>
        </section>
      </main>

      {activationOpen ? (
        <SellerActivationPanel
          onActivated={() => {
            setSellerActivated(true);
            setActivationOpen(false);
          }}
          onClose={() => setActivationOpen(false)}
        />
      ) : null}
    </div>
  );
}

export default VerifiedMemberExperience;
