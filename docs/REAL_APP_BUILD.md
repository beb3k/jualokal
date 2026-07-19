# Real app build tracker

Status: active.

This document tracks the authenticated, persisted Jualokal build derived from the frozen
product contract and GitHub issue #1. `DemoExperience.tsx` is behavioral reference only.
GitHub Issues remain the canonical ticket tracker.

## Scope

Build the real member marketplace on hosted Supabase. Accounts, member data, listings,
photos, and transaction state are persisted. Identity Verification, payment, Escrow,
payout, refund, safety review, and appeals remain clearly simulated unless the product
contract changes.

## Settled decisions

- Hosted Supabase provides authentication, Postgres, and private photo storage.
- Real listing photographs will be supplied by the project owner.
- Photographs must have permission, stripped metadata, and no identifying private detail.
- Exact Home Anchors are application-encrypted protected data.
- Home Anchors are never returned to ordinary clients or exposed through direct PostgREST.
- Precise Browsing Locations are transient inputs and are not retained as history.
- Buyers receive only discovery eligibility, Distance Bands, and coarse Seller markers.
- `DemoExperience.tsx` supplies behavior and acceptance references, not production state.
- The server owns timestamps, authorization, and transaction state transitions.

## Progress

| Phase | State | Evidence |
|---|---|---|
| Authentication foundation | Complete | Commit `78ba652`; typecheck, 18 focused phone/desktop checks, production build passed |
| Member profile persistence | Active next task | Not started |
| Seller Activation and encrypted Home Anchor | Pending | Blocked by member profile persistence |
| Listing publication and private photos | Pending | Blocked by Seller Activation |
| Privacy-safe discovery | Pending | Blocked by listings and protected location service |
| Structured Questions | Pending | Blocked by listings |
| Atomic Checkout Hold and Purchase Snapshot | Pending | Blocked by discovery |
| Scheduling and handover completion | Pending | Blocked by purchase commitment |
| Exceptional transaction outcomes | Pending | Blocked by successful handover journey |
| Trust and safety | Pending | Blocked by persisted transaction outcomes |
| Final acceptance and deployment | Pending | Blocked by all required slices |

## Active task: persisted member foundation

Objective: persist one authenticated member profile and enforce the admission boundary for
the real marketplace.

### Deliverables

- Add versioned Supabase migration structure.
- Add `member_profiles` with private member data and permitted Public Identity fields.
- Create a profile for authenticated members without trusting client-supplied ownership.
- Persist simulated Identity Verification outside mutable public UI state.
- Gate the real marketplace on authentication and simulated verification.
- Add server functions for current private profile and permitted public projection.
- Add Row Level Security before exposing profile reads or writes.
- Replace hardcoded dashboard identity with authenticated profile data.

### Finishing criteria

- Anonymous visitors cannot open member marketplace routes.
- Authenticated unverified members see only the verification walkthrough.
- Verified members reach the real marketplace shell.
- A member may read and update only permitted fields on their private profile.
- Other members receive only Public Identity and Trust Summary projections.
- Cross-member private reads and writes fail under Row Level Security.
- No identity document, biometric, payment, Home Anchor, or private coordinate is collected.
- Migration verification, typecheck, focused tests, and production build pass.
- Project-owner phone and desktop acceptance remains pending until explicitly confirmed.

## Planned data order

1. `member_profiles`
2. `seller_profiles` and private encrypted Home Anchors
3. `listings`, `listing_photos`, and Structured Questions
4. atomic `checkout_holds`, Purchase Commitments, and Purchase Snapshots
5. Handover Schedules, Presence Checks, and Handover Confirmations
6. transaction exceptions, Trust Records, and Safety Reports

## Verification log

### 2026-07-19 — authentication baseline

- Branch: `codex/issue-1-real-auth`
- Commit: `78ba652`
- Typecheck: passed
- Focused browser tests: 18/18 across phone and desktop
- Production build: passed
- GitNexus: 11 files, 20 symbols, two expected flows, MEDIUM risk
- Live phone and desktop acceptance: pending project owner

## Open inputs

- Hosted Supabase project connection values are required before migration verification.
- Project owner will supply approved listing photographs before photo-flow acceptance.
