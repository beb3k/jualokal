# Jualokal demo video script

Status: ready to rehearse. Final recording, model confirmation, upload, and signed-out playback check remain pending.

## Video record

- **Final title:** Jualokal - Private nearby secondhand handovers
- **Public YouTube URL:** Pending upload
- **Final duration:** Pending export - must be under 03:00
- **Target duration:** 02:55
- **Narrator:** Satrio Faiz
- **Recording date:** 2026-07-21/22 Bangkok time
- **Demonstrated commit:** `41773d604ff7a9ebd19148e18983ea0d5f2c312c`
- **Working project URL:** Not included; record the local Demo Mode described in `README.md`
- **Primary Core Build task:** Implement issue #7 - Schedule and complete a successful handover
- **`/feedback` Session ID:** Captured for the private Devpost field; never show it in the video
- **GPT-5.6 confirmation:** Before recording, confirm the original task visibly identifies GPT-5.6
- **Music:** None

## Recording rules

- Record only behavior verified in the submitted commit.
- Use English narration and keep the interface readable.
- Say clearly that all Demo Mode identities, listings, locations, payments, refunds, reviews, and histories are fictional.
- Never imply that Jualokal has real customers, real transactions, real identity checks, real payments, or market adoption.
- Do not show private Codex conversations, credentials, coordinates, account details, or the `/feedback` value.
- Keep the final export under three minutes. Remove pauses and decorative footage before shortening the two product stories.

## Live recording method

1. Run `npm run dev` and open `http://localhost:5173/?demo=1` in a clean browser window.
2. Turn off notifications and close email, chat, password managers, developer tools, and unrelated tabs.
3. Keep this script on a second screen, phone, or printed page so it never appears in the recording.
4. Rehearse the complete pointer and click path twice before recording. Prepare the successful Order and Material Mismatch Order in separate browser sessions.
5. Open Windows Snipping Tool, choose **Record**, and select only the browser area. Pause speaking before each click, click once, wait for the screen to settle, and then continue.
6. Speak conversationally. The words below are a guide, so restart the current section rather than the whole video if a sentence feels unnatural.
7. In Clipchamp, join the clean sections with simple hard cuts, remove long pauses, and add corrected captions. Do not add background music.
8. Export at 1080p and keep the finished video below three minutes. YouTube may be **Public** or **Unlisted**, but it must play while signed out.

## Live presenter script

Only read the quoted paragraphs aloud. The bracketed directions are silent screen and cursor cues.

### `00:00-00:18` - Why Jualokal

[Start on the public page. Point briefly to the portable-goods, nearby-handover, and protected-location promises.]

> "Jualokal is a seller-centered, privacy-first marketplace for accountable nearby handovers. In dense Indonesian neighborhoods, Sellers advertise portable secondhand items once, avoiding door-to-door selling, shipping, and cross-city traffic. This demo is entirely fictional."

[Click **Explore Demo Mode** and pause until the dashboard settles.]

### `00:18-00:48` - Nearby discovery

[Point to the fictional Buyer in Bandung. Select the available simulated Browsing Location and click **Refresh nearby listings**.]

> "I am a fictional Buyer in Bandung. The prototype shows listings within two kilometers of a simulated Browsing Location; ten kilometers is only a future maximum. Map markers are coarse Seller areas, not homes. Shared areas let me choose a Seller. List View shows the same broad Distance Bands."

[Open one Seller marker, demonstrate the shared-area Seller choice, then switch to **List**.]

### `00:48-01:13` - Listing, payment, and simulated Escrow

[Open **Handwoven rattan market basket**. Point to its condition, defects, measurements, fictional photos, and fixed price. Start the Checkout Hold and select the successful-payment simulation.]

> "This listing shows condition, defects, measurements, photographs, and price. Checkout starts a five-minute hold; if it expires, the item returns to sale. Successful simulated payment creates the Order and frozen Snapshot, holds the amount in simulated Escrow, and leaves the payout pending."

[Pause briefly on the Order and **Simulated Escrow: Held** state.]

### `01:13-01:42` - Seller-controlled scheduling

[Open **Orders**, switch to Dimas, select the basket Order, choose the **Seller-selected Handover Point**, and click **Propose two handover windows**.]

> "The Seller chooses the outdoor Handover Point and proposes two windows without exposing a Home Anchor. The Buyer accepts the first or requests an adjustment. The schedule must begin within forty-eight hours after payment."

[Switch to Ayu and click **Accept first proposed window**.]

### `01:42-02:12` - Presence and successful completion

[Click **Advance to accepted handover window**. Record the eligible Buyer and Seller Presence Checks.]

> "Both devices record a simulated Presence Check within one hundred meters. Jualokal keeps eligibility, time, and accuracy, not movement or proof. The Buyer confirms after inspection; Escrow stays held until the Seller confirms. Matching confirmations complete the sale, release Escrow, and mark the payout paid."

[Confirm first as Ayu, pause on held Escrow, then switch to Dimas and confirm the handover.]

### `02:12-02:32` - When something goes wrong

[Switch to the prepared Material Mismatch session. Raise the mismatch, switch to the Seller, contest it, then show the guided-review refund.]

> "For a Material Mismatch, the Buyer raises a claim against the frozen Snapshot. If contested, the item stays with the Seller and Escrow remains held for guided review, here ending in a refund. A no-show may create a private Strike only after the grace period and evidence."

### `02:32-02:47` - Build evidence

[Show only sanitized stills of the product brief, nineteen ADR files, build log, repository history, and final verification. Never show a private Codex task or Session ID.]

> "We built Jualokal with Codex and GPT-5.6. Codex turned the rules into a product brief, nineteen decision records, connected implementation, and boundary tests. Our team made the final decisions."

### `02:47-02:55` - Close

[Return to the completed Order or clean Map View and stop clicking.]

> "Jualokal keeps discovery local, protects the Seller's home, and makes neighborhood exchange accountable, without real identities, money, or transactions."

## Timing fallback

If a full rehearsal runs longer than 02:55, omit the future ten-kilometer clause and the final no-show sentence. Keep the successful handover, Material Mismatch, and Codex evidence; shorten pauses instead of speaking unnaturally fast.


## Preparing the two product stories

Record the successful and mismatch stories in separate browser sessions so a mistake in one does not force a complete restart.

### Successful handover session

- Start as Ayu in Demo Mode.
- Switch discovery to List and open **Handwoven rattan market basket**.
- Start the Checkout Hold and simulate successful payment.
- In Orders, switch to Dimas, choose **Community pavilion entrance - public and well lit**, and propose the two windows.
- Switch to Ayu, accept the first window, and advance to it.
- For the Buyer, select **Exactly 100 m from the point - reported accuracy 12 m**; for the Seller, select **Inside the 100 m area - reported accuracy 10 m**.
- Record both eligible simulated Presence Checks. The 12 m and 10 m values are reported accuracy, not distance from the Handover Point.
- Confirm as Ayu first, then as Dimas.
- Stop on the sold state and released simulated payout.

### Contested Material Mismatch session

- Prepare a fresh basket purchase through accepted scheduling and eligible Presence Checks.
- As Ayu, raise a qualifying Material Mismatch before accepting the item.
- Use a short fictional description that contains no personal information.
- Switch to Dimas and select **Contest Material Mismatch**.
- Show that the item stays with the Seller and simulated Escrow stays held.
- Select **Simulate guided-review refund** and stop on the completed refund state.

## Codex and GPT-5.6 evidence

- **Primary Core Build task:** Implement issue #7 - Schedule and complete a successful handover
- **Session value:** Captured privately for Devpost
- **Starting commit:** `65033becc8c930935a8443cfd956061d20767b5a`
- **Ending implementation commit:** `39c28de26b220cdc2d797f0d1f1f1c000e4452d5`
- **Core functionality:** Connected discovery, checkout, Purchase Snapshot, and simulated Escrow to seller-led scheduling, Presence Checks, ordered confirmations, final sale, simulated payout, and Reset Demo.
- **Team decisions:** Exact deadline boundaries count as valid; poor accuracy is an explicit simulator state; evening handovers require a public, well-lit point; private Seller-zone eligibility never exposes a Home Anchor or geometry.
- **Where Codex accelerated work:** Dependency mapping, exact boundary and privacy tests, connected state implementation, regression diagnosis, and independent standards/specification review.
- **Recorded primary-session checks:** 102 automated checks across phone and desktop projects, focused handover and adjustment checks, type checking, and production build.
- **Problems corrected during review:** Overnight-window handling, post-acceptance schedule adjustment, stale confirmations after rescheduling, and test formatting.

Do not show the session value or a private Codex conversation. A sanitized title card saying **Primary build task: issue #7 successful handover** is enough.

## Pre-recording checklist

- [ ] Confirm the original issue #7 task visibly identifies GPT-5.6.
- [ ] Run the final type check, browser suite, and production build against the demonstrated commit.
- [ ] Rehearse the successful story from a fresh Demo Mode session.
- [ ] Rehearse the contested Material Mismatch story in a separate fresh session.
- [ ] Confirm Reset Demo restores the fictional marketplace.
- [ ] Confirm the repository, README, narration, and demonstrated commit describe the same version.
- [ ] Use only simulated accounts, locations, payments, refunds, and histories.
- [ ] Prepare sanitized evidence stills with no prompts, credentials, paths, coordinates, or session values.
- [ ] Time one full narration rehearsal below 02:55.

## Privacy and rights check

- [ ] No real Home Anchor, address, coordinate, identity document, legal name, telephone number, email address, payment information, or protected account is visible.
- [ ] No API key, environment value, credential, private browser tab, notification, or repository secret appears.
- [ ] No face, home detail, address, identifying reflection, or embedded location metadata appears in an image.
- [ ] Every image, icon, font, and sound is original, licensed, or used with permission.
- [ ] No third-party logo or copyrighted background material appears accidentally.
- [ ] No real adoption, payment, verification, moderator review, or production-readiness claim is made.

## Final export and upload check

- [ ] Export is under 03:00 and preferably between 02:45 and 02:55.
- [ ] Narration is clear, natural, and synchronized with the correct actions.
- [ ] Both product stories remain understandable without extra explanation.
- [ ] Codex and GPT-5.6 contributions are specific and supported by recorded evidence.
- [ ] Demo Mode and simulated-money labels remain readable at 1080p.
- [ ] Captions are reviewed and corrected.
- [ ] No placeholder or private value appears.
- [ ] Upload to YouTube as Public or Unlisted.
- [ ] Wait for high-resolution processing, then play the video in a signed-out browser.
- [ ] Record the final URL and duration at the top of this document and add the URL to Devpost.
