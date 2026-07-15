import { demoBuyer, demoListing, demoSeller } from "./demo-data";

function DemoExperience({ onExit }: { onExit: () => void }) {
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
        <button className="button button-compact button-outline" onClick={onExit}>
          Exit demo
          <span aria-hidden="true">×</span>
        </button>
      </header>

      <main className="demo-main">
        <section className="demo-intro">
          <div>
            <p className="eyebrow">Simulated Browsing Location · Bandung</p>
            <h1>Nearby in Bandung</h1>
            <p>
              A small, read-only preview of the private marketplace. No device location or
              personal details were requested.
            </p>
          </div>
          <div className="distance-badge" aria-label="Simulated discovery area">
            <span aria-hidden="true">◎</span>
            <strong>2 km</strong>
            <small>simulated area</small>
          </div>
        </section>

        <div className="demo-layout">
          <section aria-label="Demo Listing" className="listing-card">
            <div
              aria-label="Fictional illustration of a rattan market basket"
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
              <span className="fictional-image-label">Fictional listing illustration</span>
            </div>
            <div className="listing-body">
              <div className="listing-meta">
                <span>{demoListing.category}</span>
                <span>{demoListing.distance}</span>
              </div>
              <h2>{demoListing.title}</h2>
              <p className="listing-description">{demoListing.description}</p>
              <div className="listing-facts">
                <span>
                  <small>Condition Grade</small>
                  <strong>{demoListing.condition}</strong>
                </span>
                <span>
                  <small>Example handover</small>
                  <strong>{demoListing.handoverTime}</strong>
                </span>
              </div>
              <div className="listing-footer">
                <div>
                  <small>Transaction Price</small>
                  <strong>{demoListing.price}</strong>
                </div>
                <span className="read-only-badge">Read-only preview</span>
              </div>
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
                No real identity, contact, precise location, or payment information appears in
                this preview.
              </p>
            </div>
          </aside>
        </div>
      </main>

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
