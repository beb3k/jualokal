import { lazy, Suspense, useState } from "react";
import type { FormEvent } from "react";
import { completeSimulatedIdentityVerification, registerAccount } from "./utils/auth";

const DemoExperience = lazy(() => import("./DemoExperience"));

function RegistrationPanel({
  initialStep,
  onClose,
  onVerified,
}: {
  initialStep: "registration" | "verification";
  onClose: () => void;
  onVerified: () => void;
}) {
  const [step, setStep] = useState<"registration" | "confirmation" | "verification">(
    initialStep,
  );
  const [simulationAcknowledged, setSimulationAcknowledged] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submitRegistration(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const form = new FormData(event.currentTarget);
    const email = form.get("email");
    const password = form.get("password");
    if (typeof email !== "string" || typeof password !== "string") {
      setError("Email and password are required.");
      setSubmitting(false);
      return;
    }

    try {
      const result = await registerAccount({ data: { email, password } });
      if (result.status === "error") {
        setError(result.message);
      } else if (result.status === "confirmation-required") {
        setStep("confirmation");
      } else {
        setStep("verification");
      }
    } catch {
      setError("Registration is temporarily unavailable. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function finishVerification() {
    setError(null);
    setSubmitting(true);
    try {
      const result = await completeSimulatedIdentityVerification();
      if (result.status === "verified") {
        onVerified();
      } else if (result.status === "authentication-required") {
        setError("Confirm your email or sign in before completing this walkthrough.");
      } else {
        setError("Verification simulation could not be saved. Try again.");
      }
    } catch {
      setError("Verification simulation is temporarily unavailable. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (step === "confirmation") {
    return (
      <div className="dialog-backdrop">
        <section
          aria-labelledby="confirmation-title"
          aria-modal="true"
          className="registration-panel"
          role="dialog"
        >
          <button aria-label="Close registration" className="icon-button" onClick={onClose}>
            ×
          </button>
          <p className="eyebrow">Registration · Email confirmation</p>
          <h2 id="confirmation-title">Check your email</h2>
          <p className="panel-lead">
            Open the confirmation link from Supabase, then return here for the simulated
            Identity Verification walkthrough.
          </p>
          <div className="registration-note">
            <span aria-hidden="true">!</span>
            <p>
              Do not send identity documents, selfies, biometrics, or payment information.
            </p>
          </div>
          <a className="button button-primary" href="/login">
            Already confirmed? Sign in
          </a>
        </section>
      </div>
    );
  }

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
            disabled={!simulationAcknowledged || submitting}
            onClick={finishVerification}
          >
            {submitting ? "Saving simulation…" : "Complete simulated verification"}
          </button>
          {error === null ? null : (
            <p aria-live="polite" className="auth-error" role="alert">
              {error}
            </p>
          )}
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
        <form className="registration-fields" onSubmit={submitRegistration}>
          <label htmlFor="registration-email">Email</label>
          <input
            autoComplete="email"
            id="registration-email"
            name="email"
            placeholder="you@example.com"
            required
            type="email"
          />
          <label htmlFor="registration-password">Password</label>
          <input
            autoComplete="new-password"
            id="registration-password"
            minLength={8}
            name="password"
            required
            type="password"
          />
          <p className="form-hint">
            Used only for real account access. Identity verification remains simulated.
          </p>
          {error === null ? null : (
            <p aria-live="polite" className="auth-error" role="alert">
              {error}
            </p>
          )}
          <button className="button button-primary" disabled={submitting} type="submit">
            {submitting ? "Creating account…" : "Create account"}
          </button>
        </form>
        <a className="text-button" href="/login">
          Already have an account? Sign in
        </a>
        <button className="text-button" onClick={onClose}>
          Back to the public explanation
        </button>
      </section>
    </div>
  );
}

function App() {
  const onboardingStep = new URLSearchParams(window.location.search).get("onboarding");
  const [registrationOpen, setRegistrationOpen] = useState(onboardingStep === "verify");
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
                Register
                <span aria-hidden="true">→</span>
              </button>
              <a className="button button-quiet" href="/login">
                Log in
                <span aria-hidden="true">→</span>
              </a>
            </div>
            <p className="access-note">
              <span aria-hidden="true">●</span>
              Listings stay private until Identity Verification—or inside the clearly
              fictional demo.
            </p>
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
          initialStep={onboardingStep === "verify" ? "verification" : "registration"}
          onClose={() => setRegistrationOpen(false)}
          onVerified={() => window.location.assign("/dashboard")}
        />
      ) : null}
    </div>
  );
}

export default App;
