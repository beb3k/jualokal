# Jualokal

Jualokal is a privacy-first marketplace concept for nearby secondhand handovers. It is designed for portable goods that can be inspected and exchanged close to home, without turning a neighborhood into a public catalogue or asking people to reveal where they live.

The project combines a persisted account foundation with a fictional, resettable Demo Mode. Judges can explore the complete marketplace story without sharing an identity, payment method, or real location. The richer marketplace transactions are a prototype; they are not real sales.

## Why we built it

Buying used goods nearby often means choosing between shipping, long-distance coordination, or an unstructured conversation with a stranger. Jualokal explores a smaller and more accountable model: verified members, fixed-price portable goods, privacy-safe nearby discovery, and seller-controlled handover arrangements.

Jualokal is not a delivery marketplace, public neighborhood inventory, physical browsing service, or general chat platform.

## What the Demo Mode shows

- Map and List discovery within a small local radius, using broad Distance Bands and coarse Seller markers instead of addresses or exact distance.
- Fixed-price listings with condition, defect, measurement, and fictional image disclosures.
- Structured Questions in place of free-form chat.
- A five-minute Checkout Hold, simulated payment, an unchangeable Purchase Snapshot, and simulated Escrow.
- Seller-led scheduling, simulated Presence Checks, ordered Buyer and Seller confirmations, and a simulated payout.
- Recovery paths for incomplete handovers, Material Mismatch, cancellations, no-shows, scheduling expiry, and Seller unavailability.
- Private trust progress, Safety Reports, Safety Hold, guided review, appeal, and account restriction.
- Reset Demo, which returns the current browser session to its original fictional state.

Two stories are best for a first walkthrough: a successful purchase and handover, followed by a contested Material Mismatch that ends in a simulated Buyer refund.

## Try it locally

```powershell
npm ci
npm run dev
```

Open [http://localhost:5173/?demo=1](http://localhost:5173/?demo=1). Demo Mode does not require an account, Firebase project or emulator, payment method, or device location.

Useful checks:

```powershell
npm run typecheck
npm test
npm run build
```

`npm test` starts the Firebase emulators and runs the browser suite against them, on phone and desktop projects. Set `PLAYWRIGHT_PORT` if port 5173 is already in use. See [`docs/submission/VIDEO_SCRIPT.md`](docs/submission/VIDEO_SCRIPT.md) for the guided demonstration.

## Real account foundation

The current persisted portion covers registration, login (email and password, or Google), protected member pages, sign-out, and member profiles. It runs on Firebase: Firebase Auth for accounts and Firestore for `member_profiles`. Identity Verification remains simulated.

Local development needs no Firebase project, account, or secrets. It runs on the [Firebase Emulator Suite](https://firebase.google.com/docs/emulator-suite), which needs Java 11 or newer. In one terminal:

```bash
npm run emulators
```

In a second terminal:

```bash
npm run dev
```

Open [http://localhost:5173/register](http://localhost:5173/register). In development the app connects to the Auth (port 9099) and Firestore (port 8080) emulators automatically, using the demo project `demo-jualokal`. The Emulator UI at [http://127.0.0.1:4000](http://127.0.0.1:4000) shows the created accounts and profiles; emulator data is cleared when the emulators stop. "Continue with Google" opens the emulator's fake Google account picker.

The browser signs in with the Firebase client SDK, then the server exchanges the ID token for an httpOnly session cookie and does every privileged read and write with the Firebase Admin SDK. [`firestore.rules`](firestore.rules) let a signed-in member read only their own profile, give anonymous visitors nothing, and block all client writes. See [`.env.example`](.env.example) for the optional settings, including those for a real Firebase project, and [ADR 0021](docs/adr/0021-use-firebase-with-the-emulator-suite.md) for why Jualokal moved from Supabase to Firebase.

The full marketplace is not yet persisted. Real Seller Activation, private listing photos, protected location services, transactions, handovers, and trust/safety records remain future work beyond this hackathon prototype.

## Privacy boundaries

Everything in Demo Mode is fictional: accounts, listings, locations, histories, payments, refunds, reviews, and moderation outcomes. It collects no real identity document, biometric, payment method, money, or private household location.

The product model deliberately limits what other members can see. Public Identity is a first name and last initial, or a mononymous name, plus a small Trust Summary. Home Anchors and the exact Pilot Area are never public. Browsing Location is a point-in-time snapshot rather than movement history. Buyers receive broad Distance Bands and coarse markers, not an address or exact distance.

Location is supporting evidence for a handover, never proof that two people met. Payment, Escrow, payout, refund, identity checks, and moderation are visibly simulated in this prototype.

## Built with Codex and GPT-5.6

The team used Codex to challenge the initial idea, turn ambiguous marketplace rules into a frozen product brief and nineteen decision records, break the work into bounded issues, implement product journeys, test exact timing and privacy boundaries, and review changes against both the product rules and repository standards.

The recorded core-build task connected discovery and checkout to seller-led scheduling, location-supported handover, ordered confirmations, final sale, simulated payout, and Reset Demo. Codex was especially useful for mapping dependencies before edits, writing boundary and privacy tests, joining several account and transaction states into one resettable story, and finding problems during independent review.

The team remained responsible for product decisions, review, visual acceptance, and what ultimately shipped. The detailed evidence trail is in [`docs/submission/CODEX_BUILD_LOG.md`](docs/submission/CODEX_BUILD_LOG.md).

## Main tools

Jualokal is a mobile-first web application built with React, TanStack Start and Router, TypeScript, Vite, Tailwind CSS, Firebase, and Playwright.

## License

Released under the [MIT License](LICENSE).
