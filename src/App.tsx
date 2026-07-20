import { lazy, Suspense, useState } from "react";
import VerifiedMemberExperience from "./VerifiedMemberExperience";

const DemoExperience = lazy(() => import("./DemoExperience"));

function RegistrationPanel({
  onClose,
  onVerified,
}: {
  onClose: () => void;
  onVerified: () => void;
}) {
  const [step, setStep] = useState<"registration" | "verification">("registration");
  const [simulationAcknowledged, setSimulationAcknowledged] = useState(false);

  if (step === "verification") {
    return (
      <div className="dialog-backdrop">
        <section
          aria-labelledby="verification-title"
          aria-modal="true"
          className="registration-panel"
          role="dialog"
        >
          <button aria-label="Close verification" className="icon-button" onClick={onClose}>
            ×
          </button>
          <p className="eyebrow">Identity Verification walkthrough · Simulation</p>
          <h2 id="verification-title">Identity Verification walkthrough</h2>
          <p className="panel-lead">
            This simulated admission check shows how Jualokal establishes accountable
            membership before marketplace access.
          </p>
          <div className="registration-note">
            <span aria-hidden="true">!</span>
            <p>
              This is not a real identity check. Do not enter or upload real ID, selfies,
              biometrics, passwords, payment methods, or other sensitive evidence.
            </p>
          </div>
          <label className="verification-confirmation">
            <input
              checked={simulationAcknowledged}
              onChange={(event) => setSimulationAcknowledged(event.target.checked)}
              type="checkbox"
            />
            <span>
              I understand this is a simulation and will not provide real personal data.
            </span>
          </label>
          <button
            className="button button-primary"
            disabled={!simulationAcknowledged}
            onClick={onVerified}
          >
            Complete simulated verification
          </button>
          <button className="text-button" onClick={() => setStep("registration")}>
            Back to registration
          </button>
        </section>
      </div>
    );
  }

  return (
    <div className="dialog-backdrop">
      <section
        aria-labelledby="registration-title"
        aria-modal="true"
        className="registration-panel"
        role="dialog"
      >
        <button aria-label="Close registration" className="icon-button" onClick={onClose}>
          ×
        </button>
        <p className="eyebrow">Registration · Step 1</p>
        <h2 id="registration-title">Begin registration</h2>
        <p className="panel-lead">
          Create your accountable membership before entering the private marketplace.
          Identity Verification comes next as a clearly simulated walkthrough.
        </p>
        <div className="registration-note">
          <span aria-hidden="true">✓</span>
          <p>
            This prototype does not ask for a name, password, identity document, payment
            method, or physical location here.
          </p>
        </div>
        <button className="button button-primary" onClick={() => setStep("verification")}>
          Continue to simulated verification
        </button>
        <button className="text-button" onClick={onClose}>
          Back to the public explanation
        </button>
      </section>
    </div>
  );
}

function App() {
  const [registrationOpen, setRegistrationOpen] = useState(false);
  const [demoOpen, setDemoOpen] = useState(
    () => new URLSearchParams(window.location.search).get("demo") === "1",
  );
  const [memberVerified, setMemberVerified] = useState(false);

  function openDemo() {
    const url = new URL(window.location.href);
    url.searchParams.set("demo", "1");
    window.history.replaceState(null, "", url);
    setDemoOpen(true);
  }

  function closeDemo() {
    const url = new URL(window.location.href);
    for (const key of ["demo", "account", "workspace", "category", "view", "seller"]) {
      url.searchParams.delete(key);
    }
    window.history.replaceState(null, "", url);
    setDemoOpen(false);
  }

  if (memberVerified) {
    return <VerifiedMemberExperience onExit={() => setMemberVerified(false)} />;
  }

  if (demoOpen) {
    return (
      <Suspense fallback={<p className="loading">Opening the fictional demo…</p>}>
        <DemoExperience onExit={closeDemo} />
      </Suspense>
    );
  }

  return (
    <div className="public-shell">
      <header className="site-header">
        <a aria-label="Jualokal home" className="brand" href="#top">
          <span className="brand-mark" aria-hidden="true">
            J
          </span>
          <span>jualokal</span>
        </a>
        <button className="button button-compact button-outline" onClick={openDemo}>
          Demo Mode
          <span aria-hidden="true">↗</span>
        </button>
      </header>

      <main id="top">
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">Private by design · Bandung context</p>
            <h1>Secondhand goods, handed over nearby.</h1>
            <p className="hero-lead">
              Jualokal is a private, hyperlocal marketplace for accountable people to buy
              and sell portable secondhand goods near home—without turning the neighbourhood
              into a public catalogue.
            </p>
            <div className="hero-actions">
              <button className="button button-primary" onClick={() => setRegistrationOpen(true)}>
                Begin registration
                <span aria-hidden="true">→</span>
              </button>
              <button className="button button-quiet" onClick={openDemo}>
                Explore Demo Mode
                <span aria-hidden="true">↗</span>
              </button>
            </div>
            <p className="access-note">
              <span aria-hidden="true">●</span>
              Listings stay private until Identity Verification—or inside the clearly
              fictional demo.
            </p>
          </div>

          <div aria-label="Jualokal privacy promise" className="marketplace-window" role="img">
            <div className="marketplace-window-heading">
              <span>Private marketplace</span>
              <strong>Bandung · nearby</strong>
            </div>
            <div className="marketplace-window-path">
              <span>01</span>
              <div>
                <strong>Verified access</strong>
                <small>Accountable members enter first</small>
              </div>
            </div>
            <div className="marketplace-window-path marketplace-window-path-featured">
              <span>02</span>
              <div>
                <strong>Nearby discovery</strong>
                <small>Portable goods within a fixed local area</small>
              </div>
            </div>
            <div className="marketplace-window-path">
              <span>03</span>
              <div>
                <strong>Protected handover</strong>
                <small>Meet nearby without publishing a home</small>
              </div>
            </div>
            <div className="marketplace-window-footer">
              <span aria-hidden="true">⌂</span>
              <div>
                <strong>Close to home.</strong>
                <small>Private from the start.</small>
                <span className="marketplace-window-terms">
                  <span>Portable goods</span>
                  <span>Nearby handover</span>
                  <span>Protected location</span>
                </span>
              </div>
            </div>
          </div>
        </section>

        <section aria-label="Marketplace paths" className="marketplace-paths">
          <div className="marketplace-paths-heading">
            <p className="eyebrow">Choose your path</p>
            <h2 id="marketplace-paths-title">One local marketplace. Two clear ways in.</h2>
            <p>
              Every participant begins with accountable membership. Selling becomes available
              through a separate Seller Activation step.
            </p>
          </div>
          <div className="marketplace-path-grid">
            <article className="marketplace-path marketplace-path-buyer">
              <span className="path-label">Buyer · included with membership</span>
              <h3>Buy nearby</h3>
              <p>
                Discover portable secondhand goods, inspect the full listing, and complete a
                protected in-person handover.
              </p>
              <button
                className="button button-primary"
                onClick={() => setRegistrationOpen(true)}
              >
                Join Jualokal to buy
                <span aria-hidden="true">→</span>
              </button>
            </article>
            <article className="marketplace-path marketplace-path-seller">
              <span className="path-label">Seller · activated separately</span>
              <h3>Sell nearby</h3>
              <p>
                Join as a member first, then activate selling while keeping your exact Home
                Anchor private.
              </p>
              <button
                className="button button-outline"
                onClick={() => setRegistrationOpen(true)}
              >
                Join Jualokal to sell
                <span aria-hidden="true">→</span>
              </button>
            </article>
          </div>
        </section>

        <section className="principles" aria-labelledby="principles-title">
          <div className="section-heading">
            <p className="eyebrow">A more deliberate marketplace</p>
            <h2 id="principles-title">Local exchange without public exposure.</h2>
          </div>
          <div className="principle-grid">
            <article>
              <span className="principle-number">01</span>
              <h3>Accountable access</h3>
              <p>Registration begins publicly. Marketplace details wait behind verification.</p>
            </article>
            <article>
              <span className="principle-number">02</span>
              <h3>Neighbourhood scale</h3>
              <p>Portable goods move through short, in-person handovers—not delivery.</p>
            </article>
            <article>
              <span className="principle-number">03</span>
              <h3>Location stays protected</h3>
              <p>People can meet nearby without publishing where a seller lives.</p>
            </article>
          </div>
        </section>

        <section className="demo-invitation">
          <div>
            <p className="eyebrow">Safe to explore</p>
            <h2>See the idea without sharing anything private.</h2>
          </div>
          <div className="invitation-copy">
            <p>
              Demo Mode opens immediately with three fictional buyers, five fictional sellers,
              and 25 simulated listings in an Indonesian setting. Each browser session is
              isolated and resettable; nothing shown is real marketplace activity.
            </p>
            <button className="button button-light" onClick={openDemo}>
              Open the fictional demo
              <span aria-hidden="true">→</span>
            </button>
          </div>
        </section>
      </main>

      <footer>
        <a className="brand brand-footer" href="#top">
          <span className="brand-mark" aria-hidden="true">
            J
          </span>
          <span>jualokal</span>
        </a>
        <p>Nearby secondhand handovers, designed around privacy.</p>
        <span>Prototype · English / Indonesia</span>
      </footer>

      {registrationOpen ? (
        <RegistrationPanel
          onClose={() => setRegistrationOpen(false)}
          onVerified={() => {
            setRegistrationOpen(false);
            setMemberVerified(true);
          }}
        />
      ) : null}
    </div>
  );
}

export default App;
