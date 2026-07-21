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
| Member profile persistence | Complete | Commit `3834b31`; hosted migration, remote lint and anonymous boundary; local RLS, typecheck, 18 focused checks, build passed |
| Seller Activation and encrypted Home Anchor | Active next task | Unblocked by member profile persistence |
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

Implementation status: complete, verified locally and against hosted Supabase, and accepted by
the project owner on phone and desktop.

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
- Project-owner phone and desktop acceptance confirmed on 2026-07-19.

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
- Live phone and desktop acceptance: passed on 2026-07-19

### 2026-07-19 — persisted member foundation

- Branch: `codex/issue-1-real-auth`
- Commit: `3834b31`
- Migration: `202607190001_member_profiles.sql`
- Isolated PostgreSQL 17 migration and RLS checks: passed
- Typecheck: passed
- Focused auth checks: 18/18 across phone and desktop
- Production build: passed
- Hosted migration history: local and remote version `202607190001` match
- Hosted database lint: passed, no public-schema errors
- Hosted anonymous boundary: table and all member RPCs deny access
- Live phone and desktop acceptance: passed on 2026-07-19

### 2026-07-19 — real-auth integration stabilization

- Branch: `codex/issue-1-real-auth`
- Pull request: [#34](https://github.com/beb3k/jualokal/pull/34)
- Integration commit: `1a46daf`
- Restored the visible judge-facing Demo Mode entry while preserving `/register`, `/login`,
  the authentication callback, protected `/dashboard`, and persisted member profiles.
- Reconciled the current auth journeys with merged discovery and Checkout Hold behavior.
- Playwright: 342/342 checks passed across phone and desktop projects.
- Typecheck and production build: passed.
- GitNexus staged impact: LOW, with no affected execution flows.
- Desktop and iPhone checks: passed with no horizontal overflow.
- Project-owner acceptance, commit authorization, and push: complete.
- GitHub state: draft, mergeable, and awaiting final review/merge.

## Active coordination

- Presentation-overhaul PRD [#36](https://github.com/beb3k/jualokal/issues/36) and ticket
  [#37](https://github.com/beb3k/jualokal/issues/37) currently assume the earlier simulated
  admission UI. If PR #34 merges first, its real auth routes and admission flow become the
  protected baseline for that presentation-only work.
- No #36 implementation PR exists. Current risk is specification drift and likely future overlap
  in `App.tsx`, `DemoExperience.tsx`, `styles.css`, and public/auth browser tests, not an existing
  code conflict.

## Open inputs

- Project owner will supply approved listing photographs before photo-flow acceptance.
