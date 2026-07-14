# Jualokal prototype brief

Status: feature-frozen for the OpenAI Build Week prototype on 2026-07-14.

This document consolidates the accepted product rules. CONTEXT.md defines canonical terms. The records in docs/adr explain durable decisions. docs/HACKATHON.md tracks current submission requirements.

## Product promise

Jualokal is a private, hyperlocal marketplace for accountable people to buy and sell portable secondhand goods near home. It removes shipping and long-distance coordination while protecting seller privacy through app-only purchase, simulated Escrow, seller-controlled nearby handover, and structured confirmation.

Jualokal is not a public catalogue, physical browsing service, delivery marketplace, or general chat platform.

## Prototype objective

The prototype must let a first-time judge understand why Jualokal is different and complete two guided stories:

1. A successful fixed-price purchase, schedule, location-supported handover, dual confirmation, and simulated payout.
2. A contested Material Mismatch where the seller keeps the item, Jualokal reviews the claim, and the buyer receives a simulated refund.

The experience is a mobile-first website that works on phones and judges' computers.

## Pilot and people

- The Pilot Area is a deliberately small private seed market selected by the builders.
- Exact household coordinates never appear in source files, documentation, screenshots, or public demo data.
- Consenting builder accounts may use protected real Home Anchors for private testing.
- The three project builders are the only intended real people during the hackathon.
- Demo Mode contains five fictional Demo Sellers, three fictional Demo Buyers, and 25 active Demo Listings.
- Demo data must always be identified as sample data and never presented as real adoption or transaction history.

## Access and identity

- Public visitors may see only Jualokal's explanation and the registration flow.
- Viewing listings requires registration and Identity Verification.
- The prototype simulates verification and collects no real KTP, identity image, selfie, biometric, or payment data.
- At launch, a specialist provider performs Identity Verification and Jualokal retains only the result and provider reference.
- A member's Public Identity shows the verified first name and last initial where applicable, or a single name for a mononymous identity.
- Full legal identity data remains hidden from other members.
- Profile pictures are optional and need not show a face.
- Every Verified Member may browse and buy.
- Selling requires Seller Activation: a protected Home Anchor, a payout destination through the future Payment Partner, and acceptance of listing and handover rules.

## Location and discovery

- Browsing requires precise device location while the app is in use.
- Browsing Location is used only for current discovery, is never shown to sellers, and is not retained as browsing history.
- The prototype Discovery Radius is 2 km straight-line from the buyer's current location.
- A future market may use a different radius, but Jualokal never exceeds 10 km.
- Buyers see rounded distance, not Home Anchors or Pilot Area boundaries.
- Demo Buyers use simulated Browsing Locations.
- A seller chooses a Handover Point within 1 km straight-line of their protected Home Anchor.
- Buyers see the selected Handover Point only after payment and never see the Seller Convenience Zone.

## Eligible inventory

The prototype accepts one lawful, tangible, low-risk, Portable Item per listing and transaction.

Included categories:

- Clothing
- Accessories
- Small electronics
- Books
- Toys
- Hobby equipment
- Portable household goods

Permanently prohibited:

- Food and beverages
- Medicines, supplements, cosmetics, and opened personal-care products
- Alcohol, tobacco, vapes, and illegal drugs
- Weapons, explosives, and hazardous materials
- Animals
- Counterfeit, stolen, or recalled goods
- Property, vehicles, services, digital accounts, and financial products

Larger household goods, delivery, and special handling are future product areas and are not part of the prototype.

## Listing rules

- The seller sets one fixed Transaction Price. Negotiation is not supported.
- Every listing requires a title, category, fixed price, condition grade, description, written defect disclosure, at least three photographs, and any measurements or specifications relevant to deciding whether the item matches the buyer's needs.
- A listing represents one specific item. Bundles and meeting-time additions are not supported.
- The seller chooses one of five condition grades: Like New, Very Good, Good, Fair, or Needs Repair.
- Every known defect must be described in writing.
- Defect photographs are optional.
- Every listing requires at least three photographs of the represented item, including one complete-item view.
- Stock replacement images and deceptive editing are prohibited.
- A buyer may send only a Structured Question Request for condition, measurements, included parts, compatibility, or another photograph.
- The seller answers by updating the listing so all eligible buyers receive the same information.
- The prototype has no free-form buyer-seller chat.
- Cross-listing elsewhere is allowed until a Checkout Hold begins.
- The seller may deactivate a listing before a Checkout Hold.
- A Checkout Hold temporarily prevents editing or deactivation.

## Demo listing media

- Prefer original photographs of physical items owned by a builder or used with permission.
- Demo Listings remain clearly labelled and do not offer those items for real sale.
- Use plain backgrounds without faces, home details, addresses, reflections, or identifying information.
- Remove location and device metadata before committing photographs.
- Prefer unbranded items or conceal visible third-party logos.
- Original synthetic images are permitted only as a clearly labelled fallback.

## Checkout and payment

1. Starting checkout creates one five-minute Checkout Hold.
2. Other buyers see that checkout is in progress and cannot claim the item.
3. Failed, abandoned, or expired checkout returns the item to sale without taking money.
4. Successful simulated payment creates a Purchase Commitment and unchangeable Purchase Snapshot.
5. The Purchase Snapshot includes price, title, description, condition, defects, measurements, included parts, and photographs.
6. The purchased listing leaves discovery and cannot be edited during the transaction.
7. All handover and mismatch decisions use the Purchase Snapshot.
8. The prototype accepts no real money and shows no fee. The listing price is both the buyer's simulated total and seller's simulated payout.
9. At launch, a licensed Payment Partner holds and moves funds. Jualokal determines release or refund but never takes custody.

## Buyer purchase capacity

- Every buyer may have only one active Checkout Hold at a time.
- Verified Buyer: up to one active Purchase Commitment.
- Reliable Buyer: up to three active Purchase Commitments after successful handovers with three different sellers and a clean current record.
- Trusted Buyer: up to five active Purchase Commitments after successful handovers with five different sellers and a clean current record.
- Each item keeps a separate payment, schedule, handover, and confirmation.
- Concurrent purchases never create an informal bundle.

## Scheduling

- The seller proposes a Handover Point and handover windows within two hours after payment.
- The buyer accepts a proposed window or requests an adjustment.
- The buyer may request a small point adjustment inside the Seller Convenience Zone, and the seller must approve any time or point adjustment.
- Accepting the schedule locks both the time window and Handover Point. A later change requires mutual acceptance.
- The parties must establish a Handover Schedule within six hours after payment.
- The scheduled handover must begin within 48 hours after payment.
- A seller who is not ready to complete within that period should deactivate the listing before checkout.
- Handover Hours are 07:00 through 22:00 Western Indonesian Time, and the handover must finish no later than 22:00.
- From 18:00 onward, the Handover Point must be public and well lit. Demo Mode enforces this with curated points; private builder testing uses seller attestation.
- A seller's front gate may be used only before 18:00 and only when the buyer is Trusted. Choosing it temporarily reveals that exact point for the transaction.
- Even for a Trusted Buyer, front-gate use is optional per transaction and never permits home entry or physical browsing.

## Scheduling expiry and cancellation

Scheduling Expiry produces a full refund and returns the item to sale when:

- The seller does not propose windows within two hours.
- The parties do not establish a schedule within six hours.
- Both parties respond but cannot agree on a handover within 48 hours.

A Reliability Strike applies only to the person whose response is still overdue when the six-hour deadline expires. Neither party is penalized when both responded but could not find a compatible time.

After a schedule exists:

- Cancellation more than two hours before the handover produces a full refund and no strike.
- Cancellation within two hours produces a full refund and a Reliability Strike.
- The prototype provides no monetary compensation to the other party.

## Handover and location evidence

- The buyer and seller meet outdoors at the accepted Handover Point.
- The buyer never enters the seller's home and never physically browses other items.
- During the accepted schedule, both devices must report a location within 100 m of the Handover Point before handover actions activate.
- The interface displays location accuracy and treats location only as supporting evidence, never proof that the parties are face-to-face.
- If either device cannot establish an eligible location, handover actions remain disabled and the parties must try the check again.
- Jualokal records only the eligibility result, timestamp, and reported accuracy; it does not retain raw coordinates or movement history from the check.
- The buyer inspects the item against the Purchase Snapshot while the seller retains it.
- The buyer either raises a Material Mismatch Claim or confirms inspection and acceptance.
- The seller hands over the accepted item and confirms the handover.
- Both parties confirm before separating.
- An unmatched confirmation is evidence, not completion and does not automatically release or refund Escrow. If one person forgets, the parties must meet again. If another meeting is impossible, the state remains unresolved and enters Jualokal's guided review rather than being treated as a completed handover.
- Matching confirmations create ordinary finality. Jualokal retains final authority only when confirmations are absent, inconsistent, or disputed.

## Successful completion

When both Handover Confirmations match:

- The sale becomes final.
- Simulated Escrow releases immediately to the seller.
- The item is marked sold.
- The successful handover contributes to Tier Progress.
- An ordinary Material Mismatch Claim can no longer be opened.
- A later serious fraud or safety report remains possible but does not automatically reverse payment.

## Material Mismatch

A buyer may reject the item only before acceptance and only for:

- The wrong item
- Undisclosed damage
- False condition
- Incorrect measurements
- Suspected counterfeit

Change of mind, subjective dislike, and poor fit despite accurate measurements do not qualify.

For a Material Mismatch Claim:

- The buyer selects a structured reason and must describe the mismatch.
- A supporting photograph is optional.
- A suspected counterfeit listing is removed and enters fraud review rather than being corrected and relisted through the ordinary mismatch flow.
- The seller keeps the item.
- If the seller acknowledges the claim, the buyer receives a full refund and the listing pauses for correction.
- If the seller contests it, both parties leave without transferring the item, Escrow remains held, and Jualokal reviews the case.
- The prototype's guided contested case ends with a simulated buyer refund.
- The exact launch evidence and resolution policy remain deferred.

## No-shows and seller unavailability

- A no-show requires an accepted Handover Schedule and a 15-minute grace period.
- Buyer No-Show: the item returns to sale, the buyer receives a full refund, and the buyer receives a Reliability Strike.
- Seller No-Show: the buyer receives a full refund, the listing pauses, and the seller receives a Reliability Strike.
- The prototype provides no monetary compensation for either no-show.
- Seller Unavailability after payment also produces a full refund, removes the listing, and gives the seller a Reliability Strike.
- Selling elsewhere, accepting a higher offer, losing the item, or damaging the item does not remove that responsibility.

## Trust and safety

- Jualokal keeps a private Trust Record containing objective transaction and enforcement facts.
- Other members see only the Trust Summary: identity verified, successful handovers, number of different counterparties, and current Buyer Tier.
- The prototype has no stars, public reviews, free-text reviews, or public enforcement history.
- Buyers privately see Tier Progress and current eligibility blockers.
- Any active Reliability Strike, dispute, payment reversal, or confirmed safety finding immediately resets a buyer to Verified Buyer.
- Existing purchases continue after reset, but the buyer cannot begin another checkout until below the one-purchase limit.
- Ordinary reliability progress restarts from zero after the issue clears.
- Confirmed serious fraud, payment abuse, or safety misconduct may permanently block higher tiers, subject to appeal.
- A Reliability Strike remains active for 30 days in the provisional prototype policy.
- The first active strike produces a warning; the second triggers a seven-day buying-and-selling suspension.
- Safety Reports are private allegations until reviewed and confirmed.
- Credible immediate physical danger places an active paid transaction into a Safety Hold. Neither party must continue the handover, and Escrow remains held until Jualokal resolves the transaction.
- A confirmed finding may be appealed once within seven days to a different reviewer.
- Report, appeal, strike, suspension, and evidence details are provisional and require qualified safety and legal review before launch.
- The prototype has no companion feature or companion-specific policy. Either party may leave and report a situation that feels unsafe.

## Communication boundaries

- Personal contact details, home addresses, bank details, external-payment links, external payment, physical browsing, and off-platform arrangements are prohibited.
- Listing questions use Structured Question Requests.
- Scheduling and handover use controlled choices and system messages.
- Material Mismatch and Safety Report descriptions use separate controlled forms.
- There is no general buyer-seller chat in the prototype.

## Demo Mode

Demo Mode is clearly labelled and never mistaken for production behavior.

It provides:

- Three pre-verified Demo Buyers representing Verified, Reliable, and Trusted tiers
- Five Demo Sellers
- Clearly disclosed seeded fictional transaction histories that establish the Reliable and Trusted tiers without implying real traction
- 25 Demo Listings
- An isolated data copy for each browser session
- A confirmation-protected Reset Demo action
- Time controls for checkout, proposal, agreement, cancellation, handover, and no-show deadlines
- Location controls for each party, including simulated accuracy
- A separate simulated Identity Verification walkthrough

Demo actions never affect another judge or protected builder accounts.

No new prototype feature may expand this frozen scope; it must replace an existing commitment of comparable effort.

## Language and presentation

- The prototype interface and Demo Listing content are English.
- Prices use Indonesian rupiah.
- Distances use metres and kilometres.
- Times use 24-hour Western Indonesian Time.
- Names, products, and settings remain locally appropriate for Indonesia.
- The intended product eventually supports English and Bahasa Indonesia.
- Member-written listing text remains as submitted rather than being automatically translated.

## Explicit prototype exclusions

- Real identity-document collection
- Real payment, fund custody, payout, or refund
- Guest listing access
- Free-form chat
- Price negotiation
- Bundles
- Delivery by Gojek, Grab, seller, or another courier
- Food and every other Prohibited Item
- Non-portable and large household goods
- Companion coordination
- Public ratings or reviews
- Native Android or iPhone applications
- Email, SMS, browser push, or background notifications
- A full moderator dashboard
- Automatic translation of member listing text

## Deferred launch decisions

The following require later validation rather than assumptions in the prototype:

- Identity provider selection and lawful retention
- Payment Partner selection and payment fees
- Monetization and who pays platform costs
- Detailed dispute evidence, deadlines, and authority
- Safety categories, moderation staffing, appeals, suspension thresholds, and permanent sanctions
- Whether structured-only communication remains sufficient
- Negotiation
- Delivery and larger-goods arrangements
- Exact market-by-market Discovery Radius up to the permanent 10 km maximum
- Native mobile applications and external notifications
- Final bilingual content and localization operations

## Acceptance criteria

The prototype is ready only when:

- A fresh visitor cannot see listings before simulated verification.
- A judge can enter Demo Mode without real identity, password, payment, or location data.
- The 25 listings appear only inside the simulated 2 km Discovery Radius.
- Checkout prevents double purchase and creates the correct Purchase Snapshot.
- Scheduling deadlines, location eligibility, and dual confirmation behave as documented.
- Both guided stories complete from a fresh isolated session.
- Reset Demo restores the original session state.
- No exact Home Anchor, identity document, real payment data, or private coordinate appears in the repository or public demo.
- The mobile-first experience works on both a phone-sized viewport and a judge's desktop browser.
- The project matches the current requirements in docs/HACKATHON.md.
