import { lazy, Suspense, useState } from "react";
import { House, MapPin, Package, ShieldCheck, UserRoundCheck } from "lucide-react";

const DemoExperience = lazy(() => import("./DemoExperience"));

function App() {
  const [demoOpen, setDemoOpen] = useState(
    () => new URLSearchParams(window.location.search).get("demo") === "1",
  );

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
        <a className="button button-compact button-outline" href="/login">
          Log in
          <span aria-hidden="true">→</span>
        </a>
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
              <a className="button button-primary" href="/register">
                See listing
                <span aria-hidden="true">→</span>
              </a>
              <button className="button button-outline" onClick={openDemo} type="button">
                Explore Demo Mode
                <span aria-hidden="true">↗</span>
              </button>
              <a className="button button-quiet" href="/login">
                Log in
                <span aria-hidden="true">→</span>
              </a>
            </div>
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
              <a className="button button-primary" href="/register">
                Join Jualokal to buy
                <span aria-hidden="true">→</span>
              </a>
            </article>
            <article className="marketplace-path marketplace-path-seller">
              <span className="path-label">Seller · activated separately</span>
              <h3>Sell nearby</h3>
              <p>
                Join as a member first, then activate selling while keeping your exact Home
                Anchor private.
              </p>
              <a className="button button-outline" href="/register">
                Join Jualokal to sell
                <span aria-hidden="true">→</span>
              </a>
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
              <div aria-hidden="true" className="principle-art principle-art-access">
                <UserRoundCheck className="art-access-person" />
                <span className="art-access-gate" />
              </div>
              <h3>Accountable access</h3>
              <p>Registration begins publicly. Marketplace details wait behind verification.</p>
            </article>
            <article>
              <span className="principle-number">02</span>
              <div aria-hidden="true" className="principle-art principle-art-nearby">
                <House className="art-nearby-home art-nearby-home-start" />
                <span className="art-nearby-path" />
                <Package className="art-nearby-package" />
                <House className="art-nearby-home art-nearby-home-end" />
              </div>
              <h3>Neighbourhood scale</h3>
              <p>Portable goods move through short, in-person handovers—not delivery.</p>
            </article>
            <article>
              <span className="principle-number">03</span>
              <div aria-hidden="true" className="principle-art principle-art-private">
                <span className="art-private-radius" />
                <MapPin className="art-private-pin" />
                <ShieldCheck className="art-private-shield" />
              </div>
              <h3>Location stays protected</h3>
              <p>People can meet nearby without publishing where a seller lives.</p>
            </article>
          </div>
        </section>

        <section className="demo-invitation">
          <div>
            <p className="eyebrow">Safe to explore</p>
            <h2>See the marketplace without sharing anything private.</h2>
          </div>
          <div className="invitation-copy">
            <p>
              Demo Mode uses isolated fictional accounts, listings, locations, and transaction
              history. Nothing shown is real marketplace activity.
            </p>
            <button className="button button-light" onClick={openDemo} type="button">
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
        <nav aria-label="Footer">
          <a href="https://github.com/beb3k/jualokal">GitHub</a>
          <a href="/terms">Terms</a>
          <a href="/privacy">Privacy</a>
        </nav>
      </footer>
    </div>
  );
}

export default App;
