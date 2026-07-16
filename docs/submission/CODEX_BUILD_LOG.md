# Codex build log

Status: active submission evidence. Update this document throughout the project.

This log records how the Jualokal team uses Codex and GPT-5.6 to define, build, test, and refine the hackathon submission. It is the source for the final README collaboration section, demonstration-video narration, and submission form.

Record facts and evidence while the work is happening. Do not reconstruct the story from memory at the end.

> **Public-document safety:** Never record passwords, API keys, access tokens, identity documents, private coordinates, exact Home Anchors, payment information, private contact details, or unredacted personal data. Sanitize screenshots and recordings before committing them.

## Submission evidence status

| Evidence | Status | Recorded value |
|---|---|---|
| Primary Core Build Session | TBD | Core implementation has not started |
| Required model | Pending verification | GPT-5.6 |
| `/feedback` Session ID | TBD | Capture before leaving the Primary Core Build Session |
| Starting commit | TBD | Capture immediately before core implementation |
| Ending commit | TBD | Capture after the primary session is complete |
| Core commit range | TBD | Starting commit through ending commit |
| README collaboration summary | Pending | Write from this log |
| Video explanation of Codex use | Pending | Write from this log |

## Primary Core Build Session

This section must identify the single Codex task in which the majority of Jualokal's core functionality was actually built. Use a fresh, sanitized implementation task running GPT-5.6. Do not designate a planning-only task or a task that merely intended to build the majority.

- **Status:** TBD - core implementation has not started
- **Task title:** TBD
- **Date:** TBD
- **Team participants:** TBD
- **Codex model:** GPT-5.6 required; verification pending
- **Model verification:** TBD - record visible task metadata or another sanitized source
- **`/feedback` Session ID:** TBD - run `/feedback` before leaving the task
- **Starting commit:** TBD
- **Ending commit:** TBD
- **Commit range:** TBD
- **Why this contains the majority of core functionality:** TBD

### Intended core journey

The primary session should build most of this connected experience:

- Verified entry and protected listing access
- Nearby listing discovery
- Fixed-price checkout and Purchase Snapshot
- Handover scheduling
- Location-supported handover
- Buyer and seller Handover Confirmations
- Simulated Escrow release and successful completion

Record what was actually completed after the session. Never mark unfinished or supporting work as complete.

### Core functionality actually completed

- TBD

### Team decisions made during the session

- TBD

### Where Codex accelerated the work

- TBD

### Tests and visual checks

| Check | Result | Evidence |
|---|---|---|
| Automated tests | TBD | Command, report, or commit |
| Phone-sized visual check | TBD | Sanitized screenshot or notes |
| Desktop visual check | TBD | Sanitized screenshot or notes |
| Successful-handover journey | TBD | Test notes or recording |
| Contested-mismatch journey | TBD | Test notes or recording |
| Fresh Demo Mode and Reset Demo | TBD | Test notes or recording |
| Privacy and sample-data check | TBD | Test notes |

### Session outcome

- **Completed:** TBD
- **Incomplete or deferred:** TBD
- **Follow-up sessions required:** TBD

## Build history

### 2026-07-14 - Product definition and prototype scope

- **Session role:** Product planning and feature freeze
- **Primary Core Build Session:** No
- **Implementation started:** No
- **Codex model:** Not recorded in repository evidence
- **Model verification:** Not available
- **`/feedback` Session ID:** Not recorded; this is not the required core-build session
- **Commit:** `fbeee50` - `docs: finalize Jualokal prototype scope`

#### Work completed

- Consolidated the feature-frozen product brief
- Established canonical Jualokal terminology
- Recorded 18 durable product decisions
- Documented hackathon requirements and demonstration journeys
- Defined privacy, safety, Demo Mode, scheduling, handover, and trust boundaries

#### Team decisions

The team answered a structured series of product questions and explicitly accepted, changed, or deferred the resulting rules. The final decisions are recorded in `docs/PRODUCT.md`, `CONTEXT.md`, and `docs/adr/`.

#### Codex acceleration

Codex helped stress-test the idea, identify contradictions and missing rules, consolidate the accepted answers, and turn the discussion into an internally consistent product definition.

#### Verification

The documents were checked for consistency, structure, sensitive coordinates, and known formatting problems before the commit was created.

### 2026-07-15 - Nearby listing publication and discovery

- **Session role:** Supporting implementation, testing, and review
- **Primary Core Build Session:** No
- **Team participants:** Project owner and Codex
- **Codex model:** Not recorded in repository evidence for this supporting task
- **Model verification:** Not available; do not use this task as the required model proof
- **Session ID:** Not captured; this is not the Primary Core Build Session
- **Starting commit:** `a6a0e65`
- **Ending implementation commit:** `f463932`
- **Related commits:** `e586591`, `ed85776`, `f463932`
- **Objective:** Implement GitHub issue #4 only: publish, manage, and discover one nearby portable-item listing in Demo Mode.

#### Work completed

- Added a pre-activated fictional seller workspace for publishing, editing, deactivating, and marking one cross-listed item unavailable.
- Added required publication checks for approved categories, the five Condition Grades, fixed rupiah pricing, written disclosures, specifications, portable-item restrictions, three published item-photo records, complete-item coverage, and photo privacy.
- Added shared buyer discovery with current simulated Browsing Location, rounded distance, the 2 km Discovery Radius, the permanent 10 km maximum, denied and unavailable states, and private location handling.
- Added the five allowed Structured Questions and required sellers to answer by changing the shared listing rather than through private chat, contact exchange, negotiation, or off-platform arrangements.
- Kept checkout, payments, identity activation, handover, and later lifecycle behavior out of this issue.

#### Codex contribution

Codex implemented the behavior test-first, used the repository impact graph before edits and commits, exercised the experience in a live browser, and coordinated separate standards and issue-specification reviews. The first review found weaknesses in photo truthfulness, defect disclosure, structured-question updates, and boundary labels; Codex added regression tests, fixed each issue, and sent the result back for closure audits. Both closure audits passed.

#### Verification

| Check | Result | Evidence |
|---|---|---|
| Type check | Passed | `npm run typecheck` |
| Automated browser tests | Passed | `npm test` - 22 tests across phone and desktop projects |
| Production build | Passed | `npm run build` |
| Desktop visual check | Passed | Live Demo Mode walkthrough of publication, discovery, photo gallery, distance boundary, and structured-question behavior |
| Phone visual check | Passed | Live 393 x 851 walkthrough; buyer and seller layouts remained readable and usable without nested scrolling or clipping |
| GitNexus pre-commit checks | Passed | Expected files only; low risk; no affected execution flows |
| Independent reviews | Passed after fixes | Separate standards and issue-specification closure audits at `f463932` |

#### Outcome and follow-up

Issue #4 is implemented and verified on `codex/issue-4-nearby-listing`. Checkout, payment, handover, real accounts, real listings, and real location collection remain intentionally deferred to their own issues.
### 2026-07-15 - Protected marketplace admission and Seller Activation

- **Session role:** Implementation and testing
- **Primary Core Build Session:** No - supporting issue slice
- **Team participants:** Jualokal maintainer and Codex
- **Codex model:** Not recorded in repository evidence
- **Model verification:** Not captured; this session is not designated as the Primary Core Build Session
- **Starting commit:** a6a0e65 - merged issue #2 foundation
- **Ending commit:** dd3fdc1 - feat: protect marketplace access and activate sellers (#3)
- **Related issue:** #3
- **Objective:** Add the admission boundary, simulated Identity Verification, privacy-safe Public Identity, buyer-only Verified Member state, and separate Seller Activation without implementing listing, discovery, Demo expansion, checkout, or transaction behavior.

#### Work completed

- Kept normal marketplace access blocked throughout incomplete verification
- Added an explicit simulated Identity Verification walkthrough that requests no real identity, credential, payment, contact, or location data
- Added buyer-only Verified Member access with a limited Public Identity and Trust Summary
- Added separate Seller Activation gated by protected Home Anchor confirmation, simulated payout confirmation, and acceptance of selling and handover rules
- Kept Demo Mode credential-free and distinguished its fictional pre-verified accounts from normal admission

#### Verification

- Type checking passed with npm run typecheck
- Production build passed with Vite output isolated outside the repository
- All 16 Playwright runs passed across Pixel 5 and desktop browser projects
- Live browser checks passed at 393 x 851 and 1440 x 900 for registration, verification, membership, Public Identity, Seller Activation, and Demo Mode
- Browser console inspection reported no errors
- Privacy checks found no real identity data, contacts, precise locations, Home Anchor values, payout details, or money

#### Deferred by scope

- Listing creation, management, questions, and discovery remain in issue #4
- Expanded Demo Mode data, switching, reset, and isolation remain in issue #5
- Checkout, payment, and transaction behavior remain deferred to later tickets

### 2026-07-16 - Isolated representative Demo Mode data

- **Session role:** Supporting implementation, testing, and review
- **Primary Core Build Session:** No
- **Team participants:** Project owner and Codex
- **Codex model:** Not recorded in repository evidence for this supporting task
- **Model verification:** Not available; do not use this task as the required model proof
- **Session ID:** Not captured; this is not the Primary Core Build Session
- **Starting commit:** `24e26ca7b9e01abff096b36cff06873dec240136`
- **Related issue:** #5
- **Objective:** Expand Demo Mode into an isolated, resettable representative marketplace without real accounts, private data, transactions, or money movement.

#### Work completed

- Added exactly three fictional buyers, five fictional sellers, and 25 simulated active listings, with five listings owned by each seller.
- Added account switching with clear fictional identity, role, status, tier, and tier-supporting history labels.
- Added a complete inventory and default nearby catalogue with 20 in-radius and five out-of-radius examples, preserving the existing discovery boundaries.
- Kept every change inside the current browser session and added a confirmation-protected reset that restores the original accounts, listings, histories, and simulated location.
- Kept all imagery visibly synthetic and all identity, status, history, location, and activity labels explicitly simulated.
- Kept checkout, payments, disputes, money movement, real credentials, and protected member information out of scope.

#### Verification

| Check | Result | Evidence |
|---|---|---|
| Type check | Passed | `npm run typecheck` |
| Automated browser tests | Passed | 50 tests across phone and desktop projects |
| Production build | Passed | `npm run build` with output isolated outside the repository |
| Phone visual check | Passed | Live 393 x 851 walkthrough with no horizontal clipping |
| Desktop visual check | Passed | Live 1440 x 900 walkthrough with no horizontal clipping |
| Browser console | Passed | No warnings or errors |
| Independent reviews | Passed after fixes | Separate standards and issue-specification closure audits |

#### Outcome and follow-up

Issue #5 is implemented and verified on `codex/issue-5-isolated-demo-data`. Existing protected admission and listing behavior remains intact, while transaction and money flows remain deferred.

## Supporting session template

Copy this section for every meaningful supporting Codex task.

### YYYY-MM-DD - Session title

- **Session role:** Planning / design / implementation / testing / debugging / submission preparation
- **Primary Core Build Session:** Yes / No
- **Team participants:** TBD
- **Codex model:** TBD
- **Model verification:** TBD
- **Session ID:** Record only when useful and safe
- **Starting commit:** TBD
- **Ending commit:** TBD
- **Related commits:** TBD
- **Objective:** TBD
- **Work completed:** TBD
- **Team decisions:** TBD
- **Where Codex accelerated the work:** TBD
- **Tests and visual checks:** TBD
- **Outcome and follow-up:** TBD

