import { lazy, Suspense, useState } from "react";
import { LandingCoverflow } from "./components/landing-coverflow";
import { MarketplacePaths } from "./components/marketplace-paths";
import { MarketplacePrinciples } from "./components/marketplace-principles";

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
            <ul className="hero-terms">
              <li>Portable goods</li>
              <li>Nearby handover</li>
              <li>Protected location</li>
            </ul>
          </div>

          <LandingCoverflow />
        </section>

        <MarketplacePaths />

        <MarketplacePrinciples onOpenDemo={openDemo} />
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
