import { lazy, Suspense, useState } from "react";
import { House, MapPin, Package, ShieldCheck, UserRoundCheck } from "lucide-react";

const DemoExperience = lazy(() => import("./DemoExperience"));

function App() {
  const [demoOpen, setDemoOpen] = useState(
    () => new URLSearchParams(window.location.search).get("demo") === "1",
  );

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
              <a className="button button-quiet" href="/login">
                Log in
                <span aria-hidden="true">→</span>
              </a>
            </div>
          </div>

          <div aria-label="Jualokal privacy promise" className="promise-card" role="img">
            <div className="promise-orbit promise-orbit-one" />
            <div className="promise-orbit promise-orbit-two" />
            <div className="promise-centre">
              <span className="promise-lock" aria-hidden="true">
                ⌂
              </span>
              <strong>Close to home.</strong>
              <span>Private from the start.</span>
            </div>
            <span className="promise-label-orbit orbit-top">
              <span className="promise-label label-top">Portable goods</span>
            </span>
            <span className="promise-label-orbit orbit-right">
              <span className="promise-label label-right">Nearby handover</span>
            </span>
            <span className="promise-label-orbit orbit-bottom">
              <span className="promise-label label-bottom">Protected location</span>
            </span>
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
            <p className="eyebrow">Already a member?</p>
            <h2>Your neighbourhood marketplace is waiting.</h2>
          </div>
          <div className="invitation-copy">
            <p>
              Sign in to browse nearby secondhand goods, manage your listings, and arrange
              private in-person handovers.
            </p>
            <a className="button button-light" href="/login">
              Log in to Jualokal
              <span aria-hidden="true">→</span>
            </a>
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
          <a href="https://github.com/zulfaza/jualokal">GitHub</a>
          <a href="/terms">Terms</a>
          <a href="/privacy">Privacy</a>
        </nav>
      </footer>

    </div>
  );
}

export default App;
