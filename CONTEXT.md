# Jualokal Marketplace

Jualokal is a hyperlocal peer-to-peer marketplace for buying and selling personal secondhand items within a tightly limited area in Indonesia.

## Language

### Access and identity

**Interface Language**:
The language used by Jualokal's own labels, instructions, and transaction flows. During the prototype, both the interface and Demo Listing content are English for hackathon clarity, while prices use rupiah, distances use metric units, times use 24-hour Western Indonesian Time, and names, products, and settings remain Indonesian. The intended product supports English and Bahasa Indonesia for Jualokal's interface, while member-written listing text remains as submitted rather than being automatically translated.
_Avoid_: English-first market, Bahasa-only prototype

**Verified Member**:
A person admitted to Jualokal after registering an account and completing Identity Verification. Only Verified Members may view listings or participate in transactions; public visitors may see only an explanation of Jualokal and the registration flow.
_Avoid_: Guest, anonymous browser, registered user

**Public Identity**:
The limited identity shown to other Verified Members: the member's verified first name and last initial when applicable, or their single name for a mononymous identity, together with the Trust Summary. Full legal names, identity numbers or images, verification selfies, and biometric information remain hidden. A profile picture is optional and need not show a face.
_Avoid_: Legal identity, anonymous username, required face photo

**Identity Verification**:
The admission check that establishes that an applicant is a real, accountable person. At launch, a specialist provider performs the check and Jualokal retains only the verification result and provider reference, not raw identity documents or biometric data. During the prototype, the result is simulated and no real identity documents are collected.
_Avoid_: KTP upload, profile verification, optional verification

**Trust Record**:
Jualokal's private objective account of a Verified Member's identity-verification status, successful handovers, number of different transaction partners, active Reliability Strikes, confirmed safety reports, payment reversals, and active disputes. It supports eligibility and enforcement but is not exposed to other members.
_Avoid_: Rating, review score, popularity

**Trust Summary**:
The limited trust information visible to other Verified Members: identity-verification status, successful-handover count, number of different transaction partners, and current Buyer Tier. Safety allegations, confirmed-report details, dispute details, strike reasons, Tier Progress, and private history remain hidden; a restricted account appears unavailable without disclosing why. The prototype uses no public star ratings or free-text reviews.
_Avoid_: Public Trust Record, review profile, moderation history

**Reliability Strike**:
A temporary account marker for a no-show, late cancellation, overdue scheduling response, or Seller Unavailability after payment. Under the provisional prototype policy, it remains active for 30 days; the first creates a warning, the second active strike creates a seven-day buying-and-selling suspension, and any active strike triggers a Buyer Tier Reset. Expired strikes remain only in private history.
_Avoid_: Safety Report, permanent violation, rating penalty

**Safety Report**:
A private structured allegation that another member created a safety risk, with a required written description and optional evidence. Filing blocks contact with the reported member. An unreviewed report does not affect the Trust Record; credible immediate danger places any active transaction into a Safety Hold until Jualokal resolves it, and only a reviewed and confirmed report affects trust status or suspension.
_Avoid_: Public complaint, review, automatic strike

**Safety Hold**:
The temporary protected state for an active paid transaction when a credible immediate-danger report makes continued handover unsafe. Neither party must continue the meeting, Escrow remains held, and Jualokal resolves the transaction before funds move.
_Avoid_: Automatic refund, forced handover, confirmed Safety Report

**Active Dispute**:
A transaction case formally opened for Jualokal review because a Material Mismatch is contested or Handover Confirmations are incomplete, inconsistent, or disputed. It remains active until Jualokal records a resolution and is visible only in private account and transaction status.
_Avoid_: Public accusation, informal disagreement, permanent finding

**Safety Appeal**:
The reported member's single request, submitted within seven days, for a different reviewer to reconsider a confirmed Safety Report using the report category, a redacted explanation, and the member's response. Physical-safety restrictions remain active during review, the reporter's identity remains hidden, and the final outcome is provided in writing.
_Avoid_: Re-report, public rebuttal, unlimited appeal

### Selling and location

**Seller Activation**:
The one-time step that allows a Verified Member to sell by confirming a private home anchor for the Seller Convenience Zone, providing a payout destination through the Payment Partner, and accepting Jualokal's listing and handover rules. It does not require manual approval.
_Avoid_: Seller verification, merchant onboarding, seller application

**Seller**:
A Verified Member who has completed Seller Activation and may create listings. During the prototype, five Demo Sellers provide the public sample inventory; protected builder accounts may also activate selling for private testing.
_Avoid_: Vendor, merchant, shop

**Home Anchor**:
The seller's precise private location used only to enforce the Seller Convenience Zone, apply the Discovery Radius, derive the buyer-visible Distance Band, and establish the Seller Discovery Marker. A consenting real account may use its real location in protected private data; Demo Sellers use fictional locations. A Home Anchor is never committed to the repository or exposed in documentation, screenshots, public demo data, or to other members.
_Avoid_: Home address, public location, demo coordinate

**Pilot Area**:
The deliberately small private seed market selected by the builders. Its exact shape and every real Home Anchor remain outside public product documentation; consenting builder accounts may use protected real anchors for private testing.
_Avoid_: Launch city, service region

**Discovery Radius**:
The maximum straight-line distance from a buyer's current Browsing Location within which listings may be visible. It is fixed at 2 km during the prototype; Jualokal may configure a different fixed radius for a future market, but a buyer cannot adjust it and it must never exceed 10 km.
_Avoid_: Delivery radius, Seller Convenience Zone, buyer-adjustable radius, 20 km radius

**Distance Band**:
The broad buyer-visible range derived privately from the straight-line distance between the buyer's Browsing Location and the Seller's protected Home Anchor. The prototype uses only **Under 1 km** and **1-2 km**; exact distance and distance from the Seller Discovery Marker are not shown.
_Avoid_: Exact distance, rounded distance, marker distance, travel distance

**Browsing Location**:
The point-in-time snapshot of the buyer's precise device location used to apply the Discovery Radius and derive Distance Bands; it is required to view listings, obtained on marketplace entry, and replaced only when the member explicitly refreshes nearby listings. It is never continuously tracked, shown to Sellers, or retained as location history; Demo accounts use a simulated Browsing Location under the same explicit-refresh model.
_Avoid_: Buyer Home Anchor, live location, continuous tracking, saved search location, location history

**Seller Convenience Zone**:
The private area within 1 km straight-line distance of the seller's Home Anchor in which the seller may choose a Handover Point. Buyers never see the Home Anchor or zone boundary. If a seller explicitly chooses their front gate for a Trusted Buyer, that exact point is disclosed temporarily for that transaction.
_Avoid_: Meetup radius, buyer travel range

**Seller Discovery Marker**:
The stable map marker that represents a Seller in a coarse shared area rather than at a property-level point; it appears to a Verified Member only while that Seller has at least one Discoverable Listing for that member, and selecting it opens a Seller Preview. Its placement is established within the hidden Seller Convenience Zone, is the same for all eligible members who can see it, may share its area with other Sellers, and is neither a Home Anchor, current position, Handover Point, nor promised meeting place; visually it uses the Seller's optional profile picture or, on a stable neutral background, one initial for a mononymous Public Identity or the first-name and verified last initials otherwise, never uses a Listing Photograph or generated likeness, and may carry a small badge counting that Seller's currently filtered Discoverable Listings rather than Sellers.
_Avoid_: Seller location, home pin, live location, pickup point

**Seller Marker Group**:
The discovery-map representation used when multiple visible Seller Discovery Markers overlap or share a coarse area. Its badge counts represented Sellers rather than their combined Listings, and its accessible label identifies that meaning without implying that they share a Home Anchor, household, business, or exact location.
_Avoid_: Seller cluster, shared location, household marker, shop marker

**Seller Preview**:
The Seller-focused discovery view opened from a Seller Discovery Marker or from the Seller's Public Identity in List View; when opened from Map View, it remains map-anchored and preserves the map context. It shows the Seller's permitted Public Identity, the buyer-specific Distance Band, and only the Seller's Discoverable Listings for that member; selecting a listing opens the full listing.
_Avoid_: Seller profile, storefront, shop, complete inventory

**Discovery View**:
The member-selected Map or List presentation of the same Discoverable Listings and Distance Bands; Map organizes discovery around Sellers through Seller Discovery Markers and Seller Previews, while List is listing-first and presents one card per Discoverable Listing with its Seller's Public Identity. Map is the default on the first marketplace entry after Identity Verification and at the start or reset of Demo Mode; after a member explicitly switches views, Jualokal remembers only that choice, while both views still require a Browsing Location and the preference retains neither map position, viewport history, nor location history.
_Avoid_: Separate marketplace, location-free List, saved map session

**Map Fallback**:
The session-only use of List View when Map View cannot render while the Browsing Location and discovery results remain valid. It preserves the current Category Filter, Discoverable Listings, and Distance Bands, shows a notice with a map-retry option, does not replace the member's saved Discovery View preference, and never bypasses the Browsing Location requirement.
_Avoid_: Location fallback, permanent List preference, location-free browsing

**List View Order**:
The default sequence of Discoverable Listings in List View: **Under 1 km** before **1-2 km**, then Original Publication Time newest first within each Distance Band. It never ranks by exact Home Anchor distance, Seller Discovery Marker geometry, Checkout Hold status, or personalized relevance.
_Avoid_: Nearest-first feed, recently updated order, personalized feed

**Category Filter**:
The prototype discovery control that shows all Discoverable Listings or limits both Discovery Views to one approved category: Clothing, Accessories, Small Electronics, Books, Toys, Hobby Equipment, or Portable Household Goods. A Seller remains represented on the map only when the filtered results contain at least one of that Seller's Discoverable Listings; clearing the filter restores all categories.
_Avoid_: Search, advanced filter, multi-category filter, saved search

**Nearby Empty State**:
The state shown when the Browsing Location is valid, discovery succeeds with the Category Filter set to **All**, and no Discoverable Listings are found. It says **No nearby listings yet**, offers **Refresh nearby listings** as the primary action and **Sell an item nearby** as a secondary action leading to Seller Activation or listing creation, is not used for category-only empty results or location, service, or map failure, and never widens the Discovery Radius.
_Avoid_: Category empty state, location error, Map Fallback, expanded-radius results

### Buyer trust

**Verified Buyer**:
A Verified Member acting as a buyer who has not currently earned Reliable Buyer or Trusted Buyer status. The tier permits one active Purchase Commitment.
_Avoid_: Guest buyer, unverified buyer, new customer

**Buyer Tier**:
The buyer's current transaction-capacity level: a Verified Buyer may have one active Purchase Commitment, a Reliable Buyer may have three, and a Trusted Buyer may have five. Every tier remains limited to one active Checkout Hold at a time, and each purchased item remains a separate transaction.
_Avoid_: Rating level, loyalty tier, bundle allowance

**Tier Progress**:
The buyer's private view of their current Buyer Tier, active-purchase limit, successful handovers with different sellers toward the next tier, current eligibility blockers, ordinary Reliability Strike expiry, and available appeal path. Other members see only the current Buyer Tier in the Trust Summary.
_Avoid_: Public progress, reputation score, leaderboard

**Reliable Buyer**:
A Verified Buyer with successful handovers involving three different sellers and no active Reliability Strikes, disputes, confirmed safety reports, or payment reversals. The tier permits up to three active Purchase Commitments but does not permit a front-gate Handover Point.
_Avoid_: Trusted Buyer, repeat customer, high spender

**Trusted Buyer**:
A Verified Buyer with successful handovers involving five different sellers and no active Reliability Strikes, disputes, confirmed safety reports, or payment reversals. The tier permits up to five active Purchase Commitments and makes a home-adjacent Handover Point available as a seller-controlled option; it never forces disclosure.
_Avoid_: Reputable buyer, high-rated buyer

**Buyer Tier Reset**:
The immediate return to Verified Buyer when a Reliability Strike, dispute, payment reversal, or confirmed safety finding becomes active. Existing purchases continue, but no new checkout is allowed until the buyer is below the one-purchase limit. Ordinary reliability progress restarts from zero after the issue clears; confirmed serious fraud, payment abuse, or safety misconduct may permanently block higher tiers, subject to an applicable appeal.
_Avoid_: Progressive downgrade, permanent penalty for any mistake

### Communication and handover

**Structured Question Request**:
A category-appropriate item question selected by a buyer from Jualokal's templates, such as a request to clarify condition, measurements, included parts, compatibility, or photographs. The seller responds by updating the listing, and Jualokal notifies the buyer. The prototype has no general buyer-seller chat.
_Avoid_: Conversation, direct message, private answer

**Off-Platform Arrangement**:
An attempt to exchange personal contact, address, or payment details, arrange physical browsing, or complete payment outside Jualokal. Off-Platform Arrangements are prohibited.
_Avoid_: Direct deal, private arrangement

**Handover Point**:
An outdoor location chosen by the seller inside the Seller Convenience Zone where the purchased item is transferred. A seller may opt per transaction to disclose their exact front-gate point to a Trusted Buyer; the disclosure is temporary, is not presented as a reusable home address, and never permits home entry or physical browsing.
_Avoid_: Neutral meetup venue, browsing location
**Handover Presence Check**:

The supporting location check performed during the Handover Schedule. Both devices must report being within 100 m of the Handover Point before handover actions activate. Jualokal records the result, timestamp, and reported accuracy rather than retaining a raw movement history; location supports the claim but does not prove a face-to-face meeting.
_Avoid_: Face-to-face proof, exact tracking, attendance guarantee


**In-Person Handover**:
The face-to-face exchange in which the seller presents the item, the buyer checks it against the Purchase Snapshot and confirms acceptance, the seller transfers it and confirms handover, and both parties complete their declarations before separating.
_Avoid_: Meetup, physical shopping

**Handover Confirmation**:
The buyer's or seller's independent declaration against the Purchase Snapshot that the item was transferred. The buyer declares that they inspected and accepted the item; the seller declares that they handed it over. Two matching confirmations normally make the sale final, release simulated Escrow immediately, and count toward Tier Progress. An unmatched confirmation is evidence, not completion, and an ordinary Material Mismatch Claim must be raised before confirming and taking the item.
_Avoid_: Check-in, meeting confirmation

**Handover Hours**:
The permitted local-time window for an In-Person Handover, from 07:00 until no later than 22:00. From 18:00 onward, the Handover Point must be public and well lit; a seller's front gate may be used only before 18:00.
_Avoid_: Daytime preference, anytime handover

**Handover Schedule**:
The time window mutually accepted for an In-Person Handover, chosen from seller-proposed options or a buyer request approved by the seller, and beginning no later than 48 hours after payment. No-show consequences apply only after this schedule exists.
_Avoid_: Seller availability, proposed time

**Scheduling Expiry**:
The end of a paid transaction when the seller does not propose handover times within two hours, the parties do not establish a Handover Schedule within six hours, or both cannot agree on a handover beginning within 48 hours of payment. Escrow is refunded and the item returns to sale. A Reliability Strike applies only to the person whose response was overdue; neither party is penalized when both responded but could not find a compatible time.
_Avoid_: Cancellation, no-show, failed payment

### Inventory and purchasing

**Eligible Item**:
A lawful, tangible, low-risk secondhand personal good in an approved category: clothing, accessories, small electronics, books, toys, hobby equipment, or portable household goods.
_Avoid_: Product, merchandise

**Portable Item**:
An Eligible Item the seller can safely carry from home to any Handover Point in the Seller Convenience Zone without a vehicle, hired help, or special equipment. Only Portable Items are admitted during the prototype.
_Avoid_: Small item, shippable item

**Prohibited Item**:
Food or beverages; medicines, supplements, cosmetics, or opened personal-care products; alcohol, tobacco, vapes, illegal drugs, weapons, explosives, hazardous materials, or animals; counterfeit, stolen, or recalled goods; and property, vehicles, services, digital accounts, or financial products.
_Avoid_: Unsupported category, restricted listing

**Condition Disclosure**:
The seller's structured statement of an item's current condition together with a written description of every known defect. Defect photographs may support the disclosure but are not required.
_Avoid_: Quality claim, condition note

**Condition Grade**:
One of five structured condition labels: Like New, Very Good, Good, Fair, or Needs Repair in the English prototype, corresponding to Seperti Baru, Sangat Baik, Baik, Cukup, and Perlu Perbaikan.
_Avoid_: Quality score, star rating, seller opinion

**Listing Photograph**:
An image of the specific listed item. Every listing requires at least three, including one complete-item view; stock replacements and deceptive edits are prohibited. Known defects require written disclosure, while a defect photograph remains optional.
_Avoid_: Stock photo, catalogue image, mandatory defect photo

**Original Publication Time**:
The fixed time when a listing was first published. Editing the listing, answering a Structured Question Request, reactivating it, or placing it under a Checkout Hold does not change this time.
_Avoid_: Last-updated time, bump time, reactivation time

**Discoverable Listing**:
A listing that may be shown to a particular Verified Member after Jualokal applies the current access, ownership, Browsing Location, Discovery Radius, and listing-state rules; a Listing published by that same member is never discoverable to them, remains available through seller management, and may have a read-only buyer-view preview with no discovery or transaction actions. Discoverability does not guarantee checkout availability: a listing under a Checkout Hold remains discoverable, while a purchased, deactivated, paused, or removed listing does not.
_Avoid_: Available Listing, nearby item, active inventory

**Checkout Hold**:
The five-minute temporary claim created when a buyer who is not the Listing's Seller starts checkout for a single-item listing. Other buyers cannot begin checkout during the hold. Successful payment converts it into a Purchase Commitment; failed, abandoned, or timed-out checkout returns the listing to sale without taking money or counting as a purchase.
_Avoid_: Reservation, pending purchase, escrow

**Transaction Price**:
The fixed listing price that is both the buyer's complete simulated total and the seller's simulated payout during the prototype. No platform or payment fee is shown; launch pricing and who pays it remain unvalidated.
_Avoid_: Service fee, commission, permanent free pricing

**Purchase Commitment**:
The buyer's binding commitment, created by paying in the app, to take the listed item if it matches its description. It is not permission to browse, try, or reconsider the item at handover.
_Avoid_: Reservation, viewing appointment

**Purchase Snapshot**:
The unchangeable copy of the purchased listing created when payment succeeds, including its title, Transaction Price, description, condition, defects, measurements, included parts, and photographs. The purchased listing leaves discovery and cannot be edited during the transaction. Handover checks and Material Mismatch Claims use this snapshot; any later corrected listing is a separate version.
_Avoid_: Current listing, editable receipt, listing history

**Material Mismatch**:
A substantial difference between the received item and its listing, such as the wrong item, undisclosed damage, false condition, incorrect measurements, or suspected counterfeit. Change of mind, subjective dislike, and poor fit despite accurate measurements are not Material Mismatches.
_Avoid_: Buyer's remorse, preference change

**Material Mismatch Claim**:
The buyer's structured declaration at handover that the item has a Material Mismatch. The buyer must describe the mismatch and may add a photo, but the seller keeps the item. An acknowledged claim produces a full refund and pauses the listing for correction; suspected counterfeit removes the listing and enters fraud review instead. A contested claim keeps Escrow held for Jualokal review after both parties leave the Handover Point. This prototype flow may change after testing.
_Avoid_: Return, buyer rejection, on-site dispute

**Buyer No-Show**:
A scheduled In-Person Handover where the seller reaches the Handover Point but the buyer does not arrive within the allowed grace period.
_Avoid_: Buyer cancellation, failed sale

**Seller No-Show**:
A scheduled In-Person Handover where the buyer reaches the Handover Point but the seller does not arrive within the allowed grace period.
_Avoid_: Seller cancellation, unavailable listing

**Seller Unavailability**:
The seller's post-payment declaration that the purchased item cannot be handed over because it was lost, damaged, sold elsewhere, or otherwise became unavailable. The buyer receives a full refund, the listing is removed, and the seller receives a Reliability Strike. A higher offer is not a valid exception. Cross-listing is permitted only while the seller deactivates Jualokal before a Checkout Hold begins.
_Avoid_: Seller No-Show, relisting, accepted cancellation

### Payment and settlement

**Payment Partner**:
A payment provider licensed to accept, hold, release, and refund real buyer funds for Jualokal transactions at launch. Jualokal directs the transaction outcome but does not take custody of the money. The prototype simulates these actions and accepts no real funds.
_Avoid_: Jualokal wallet, internal escrow provider

**Escrow**:
The transaction state in which the Payment Partner holds buyer funds until Jualokal determines that the transaction completed successfully or that the buyer must be refunded. Jualokal has final authority over incomplete, inconsistent, or disputed confirmation states; matching Handover Confirmations create ordinary finality. The detailed exceptional fraud and legal-reversal policy is deferred until launch planning. In the prototype, Escrow is simulated and contains no real money.
_Avoid_: Informal transfer, direct payment
