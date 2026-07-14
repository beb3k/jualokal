# Jualokal demo video script

Status: pre-production template. Do not present the application as working until the recorded build has been tested.

## Video record

- **Final title:** TBD
- **Public YouTube URL:** TBD
- **Final duration:** TBD - must be under 03:00
- **Target duration:** 02:52
- **Narrator:** TBD
- **Recording date:** TBD
- **Demonstrated version or commit:** TBD
- **Working project URL:** TBD
- **Primary Core Build task:** TBD
- **`/feedback` Session ID:** TBD
- **Music:** None, or record the title and licence

## Recording rules

- Record only tested behavior from the final submitted project.
- Use English narration and English interface content.
- Clearly label all sample accounts, listings, locations, payments, refunds, and histories as simulated Demo Mode data.
- Never imply that Jualokal has real customers, transactions, identity checks, payments, Escrow, or market adoption.
- Replace every TBD and bracketed placeholder before recording.
- Keep the final cut safely below three minutes. Do not exceed the 02:52 target without shortening another segment.

## Storyboard

| Time | On-screen actions | Narration |
|---|---|---|
| `00:00-00:12` | Show the Jualokal name and concise product promise. Briefly show that listings are locked behind registration. | "Buying secondhand goods nearby should not require delivery, long-distance coordination, or exposing someone's home. Jualokal is a private, hyperlocal marketplace designed for accountable handovers near home." |
| `00:12-00:27` | Enter the clearly labelled Demo Mode. Show simulated Identity Verification and select a Demo Buyer. | "Listings are available only to verified members. For this prototype, verification and all personal data are simulated, so judges never need to provide a real identity, payment method, or location." |
| `00:27-00:45` | Browse nearby Demo Listings. Show the 2 km discovery boundary, rounded distance, fixed price, condition, defects, and item photographs. Open the successful-story item. | "The buyer sees fixed-price portable goods within a small local radius. Each listing describes its condition, known defects, measurements, and the exact item shown in its photographs." |
| `00:45-01:02` | Start checkout. Show the temporary hold, simulated payment, unchangeable Purchase Snapshot, and simulated Escrow state. | "Checkout briefly reserves the item and creates an unchangeable snapshot of what was promised. Payment and escrow are simulated in this prototype; no real money is collected or held by Jualokal." |
| `01:02-01:21` | Switch to the Demo Seller. Propose a nearby Handover Point and time. Return to the buyer and accept them. Advance simulated time if needed. | "The seller proposes a handover point close to home without revealing their Home Anchor. Both parties agree on the place and time through controlled choices instead of exchanging private contact details." |
| `01:21-01:34` | Use Demo Mode location controls for both parties. Show the eligibility result and accuracy, with handover actions becoming available. | "At the scheduled time, both devices must be within one hundred metres of the agreed point. Location is supporting evidence only; it does not prove that the people are face-to-face." |
| `01:34-01:47` | Buyer inspects and confirms acceptance. Seller transfers the item and confirms. Show the item sold and simulated payout released. | "The buyer confirms that the inspected item matches the purchase snapshot. The seller then hands it over and confirms. Matching confirmations finish the sale and release the simulated payout." |
| `01:47-02:14` | Reset or change to the prepared contested Material Mismatch story. Show the buyer describing the mismatch, the seller contesting it and retaining the item, followed by guided review and simulated refund. | "The second story handles a material mismatch. The buyer identifies how the item differs from the snapshot, while the seller disputes the claim and keeps the item. Both leave without completing the handover, and this guided prototype review ends with a simulated refund to the buyer." |
| `02:14-02:43` | Show selected evidence: the product brief, decision records, build log, representative Codex work, tests, and completed application. Do not expose private prompts, coordinates, credentials, or Session IDs. | "We built Jualokal with Codex and GPT-5.6. Codex first grilled the idea and helped us turn uncertain marketplace rules into a frozen product brief and eighteen recorded decisions. It then helped us [retain only verified activities: specify, build, test, or refine] the core journeys. Our team directed the product decisions, reviewed the results, and verified the final experience across [tested devices and browsers]." |
| `02:43-02:52` | Return to a clean final view of the completed transaction or nearby marketplace. Display the closing statement. | "Jualokal shows how trusted local exchange can stay convenient without becoming another delivery marketplace. Everything shown here runs in an isolated, clearly labelled demonstration." |

## Codex and GPT-5.6 evidence

Complete this section from `CODEX_BUILD_LOG.md` before finalizing the narration:

- **Primary Core Build task:** TBD
- **`/feedback` Session ID:** TBD
- **Starting commit:** TBD
- **Ending commit:** TBD
- **Core functionality produced in that task:** TBD
- **Important decisions made by the team:** TBD
- **Where Codex accelerated the work:** TBD
- **Tests and visual checks performed:** TBD
- **Problems found and corrected during verification:** TBD

Mention only contributions supported by the build log, commits, tests, or recorded Codex task. Never describe planning work as completed implementation.

## Pre-recording checklist

### Project readiness

- [ ] Both accepted demo stories pass from a fresh, isolated Demo Mode session.
- [ ] Reset Demo restores the original state.
- [ ] The demonstrated deployment matches the submitted repository and description.
- [ ] The project works from a fresh browser without paid access.
- [ ] The successful story ends with matching confirmations and simulated payout.
- [ ] The contested mismatch story ends with the seller retaining the item and the buyer receiving a simulated refund.
- [ ] Every simulated identity, location, payment, Escrow, refund, account, and transaction is visibly labelled.
- [ ] No unfinished screen, accidental error, or unsupported feature appears.

### Recording preparation

- [ ] Use a clean browser profile or distraction-free window.
- [ ] Close notifications, private tabs, email, messaging, password managers, and unrelated applications.
- [ ] Hide bookmarks, account names, browser history, local paths, and developer tools.
- [ ] Prepare both stories and rehearse all account switches.
- [ ] Record at a legible resolution with a clearly visible pointer.
- [ ] Confirm that interface text remains readable after YouTube processing.
- [ ] Record clear English audio in a quiet environment.
- [ ] Time the complete rehearsal at or below 02:52.

## Privacy and security safeguards

- [ ] No real Home Anchor, household coordinate, address, or private Handover Point is visible.
- [ ] No real identity document, legal name, telephone number, email address, payment information, or personal account is visible.
- [ ] No API key, environment variable, credential, private repository content, or secret appears.
- [ ] Photographs contain no faces, home details, addresses, identifying reflections, or embedded location metadata.
- [ ] Protected builder accounts are not shown unless every visible field is safe and intentionally approved.
- [ ] Private Codex conversations are not displayed in the video.
- [ ] The recording reveals no location or movement history.

## Intellectual-property safeguards

- [ ] Every image, icon, font, sound, and other asset is original, properly licensed, or used with permission.
- [ ] Demo item photographs are owned by a builder or used with the owner's permission.
- [ ] No third-party logo or trademark appears unless the team has permission and records that permission.
- [ ] No copyrighted background video, television, artwork, or music is captured accidentally.
- [ ] Use no background music unless its licence and attribution requirements have been recorded.
- [ ] Any required attribution is included in the repository and YouTube description.
- [ ] The video does not suggest endorsement by Gojek, Grab, another marketplace, or an identity or payment provider.

## Final video review

Watch the exported video from beginning to end before upload:

- [ ] Duration is under 03:00, preferably no longer than 02:52.
- [ ] Narration is clear and synchronized with the correct actions.
- [ ] Both accepted demo stories are understandable without additional explanation.
- [ ] Codex and GPT-5.6 contributions are specific, accurate, and evidence-based.
- [ ] No statement contradicts the submitted project or documentation.
- [ ] No real adoption, real payment, real verification, or production-readiness claim is implied.
- [ ] All private information, credentials, coordinates, and unapproved third-party material are absent.
- [ ] Demo Mode and simulated-money labels remain readable.
- [ ] Captions have been reviewed and corrected.
- [ ] No placeholder remains in the narration, titles, or description.

## Publication checklist

- [ ] Upload the final video to YouTube.
- [ ] Set visibility to **Public**.
- [ ] Confirm that audio and high-resolution processing have completed.
- [ ] Open the video in a signed-out or private browser window.
- [ ] Confirm that it plays without login, payment, or permission.
- [ ] Check the title, description, captions, thumbnail, and any required attribution.
- [ ] Record the final URL and duration at the top of this document.
- [ ] Add the public URL to the hackathon submission.
- [ ] Rewatch the public YouTube version once after publication.
