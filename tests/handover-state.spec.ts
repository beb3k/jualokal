import { expect, test } from "@playwright/test";
import {
  HANDOVER_START_DEADLINE_MS,
  SCHEDULE_AGREEMENT_DEADLINE_MS,
  SELLER_PROPOSAL_DEADLINE_MS,
  buyerAcceptHandover,
  buyerConfirmHandover,
  buyerRequestScheduleAdjustment,
  createInitialHandoverState,
  recordHandoverPresence,
  sellerApproveScheduleAdjustment,
  sellerConfirmHandover,
  sellerProposeHandover,
  type BuyerTier,
  type HandoverActionResult,
  type HandoverPoint,
  type HandoverState,
  type HandoverWindow,
} from "../src/handover";

const committedAtMs = Date.UTC(2026, 6, 17, 0, 0); // 07:00 WIB

function wibTimestamp(dayOffset: number, hour: number, minute = 0) {
  return Date.UTC(2026, 6, 17 + dayOffset, hour - 7, minute);
}

function publicPoint(
  overrides: Partial<HandoverPoint> = {},
): HandoverPoint {
  return {
    id: "community-pavilion",
    label: "Community pavilion entrance",
    kind: "public",
    sellerZoneEligible: true,
    publicAndWellLit: true,
    sellerFrontGateConsent: false,
    ...overrides,
  };
}

function frontGatePoint(
  overrides: Partial<HandoverPoint> = {},
): HandoverPoint {
  return publicPoint({
    id: "temporary-front-gate",
    label: "Temporary seller-controlled front-gate point",
    kind: "front-gate",
    publicAndWellLit: false,
    sellerFrontGateConsent: true,
    ...overrides,
  });
}

function window(
  id: string,
  startsAtMs: number,
  endsAtMs: number,
): HandoverWindow {
  return { id, startsAtMs, endsAtMs };
}

function initialState(buyerTier: BuyerTier = "Trusted Buyer") {
  return createInitialHandoverState({
    commitmentId: "commitment-listing-1-1000",
    buyerId: "buyer-1",
    sellerId: "seller-1",
    listingId: "listing-1",
    committedAtMs,
    buyerTier,
  });
}

function acceptedState(point = publicPoint()) {
  const proposed = sellerProposeHandover(initialState(), {
    proposedAtMs: committedAtMs + 1,
    point,
    windows: [
      window("morning", wibTimestamp(1, 10), wibTimestamp(1, 10, 30)),
      window("afternoon", wibTimestamp(1, 17), wibTimestamp(1, 17, 30)),
    ],
  });
  const accepted = buyerAcceptHandover(must(proposed), {
    windowId: "morning",
    acceptedAtMs: committedAtMs + 2,
  });
  return must(accepted);
}

function must(result: HandoverActionResult): HandoverState {
  if (!result.ok) throw new Error(`Expected success, received ${result.reason}`);
  return result.state;
}

test("exact proposal, agreement, and 48-hour boundaries remain eligible", () => {
  const exactStart = committedAtMs + HANDOVER_START_DEADLINE_MS;
  const proposed = sellerProposeHandover(initialState(), {
    proposedAtMs: committedAtMs + SELLER_PROPOSAL_DEADLINE_MS,
    point: publicPoint(),
    windows: [
      window("next-day", wibTimestamp(1, 10), wibTimestamp(1, 10, 30)),
      window("exact-48-hours", exactStart, exactStart + 30 * 60 * 1000),
    ],
  });
  expect(proposed.ok).toBe(true);

  const accepted = buyerAcceptHandover(must(proposed), {
    windowId: "exact-48-hours",
    acceptedAtMs: committedAtMs + SCHEDULE_AGREEMENT_DEADLINE_MS,
  });
  expect(accepted.ok).toBe(true);
  expect(accepted.state.schedule?.window.startsAtMs).toBe(exactStart);
});

test("just-after proposal, agreement, and handover-start deadlines are rejected", () => {
  const afterProposal = sellerProposeHandover(initialState(), {
    proposedAtMs: committedAtMs + SELLER_PROPOSAL_DEADLINE_MS + 1,
    point: publicPoint(),
    windows: [
      window("morning", wibTimestamp(1, 10), wibTimestamp(1, 10, 30)),
      window("afternoon", wibTimestamp(1, 17), wibTimestamp(1, 17, 30)),
    ],
  });
  expect(afterProposal).toMatchObject({
    ok: false,
    reason: "seller-proposal-deadline-passed",
  });

  const proposal = sellerProposeHandover(initialState(), {
    proposedAtMs: committedAtMs,
    point: publicPoint(),
    windows: [
      window("morning", wibTimestamp(1, 10), wibTimestamp(1, 10, 30)),
      window("after-48", committedAtMs + HANDOVER_START_DEADLINE_MS + 1, committedAtMs + HANDOVER_START_DEADLINE_MS + 30 * 60 * 1000),
    ],
  });
  expect(proposal).toMatchObject({ ok: false, reason: "handover-window-invalid" });

  const validProposal = sellerProposeHandover(initialState(), {
    proposedAtMs: committedAtMs,
    point: publicPoint(),
    windows: [
      window("morning", wibTimestamp(1, 10), wibTimestamp(1, 10, 30)),
      window("afternoon", wibTimestamp(1, 17), wibTimestamp(1, 17, 30)),
    ],
  });
  const afterAgreement = buyerAcceptHandover(must(validProposal), {
    windowId: "morning",
    acceptedAtMs: committedAtMs + SCHEDULE_AGREEMENT_DEADLINE_MS + 1,
  });
  expect(afterAgreement).toMatchObject({
    ok: false,
    reason: "schedule-agreement-deadline-passed",
  });
});

test("zone, Handover Hours, evening, and front-gate restrictions are enforced", () => {
  const validWindows = [
    window("morning", wibTimestamp(1, 7), wibTimestamp(1, 8)),
    window("evening", wibTimestamp(1, 18), wibTimestamp(1, 22)),
  ];

  expect(
    sellerProposeHandover(initialState(), {
      proposedAtMs: committedAtMs,
      point: publicPoint({ sellerZoneEligible: false }),
      windows: validWindows,
    }),
  ).toMatchObject({ ok: false, reason: "handover-point-outside-zone" });

  expect(
    sellerProposeHandover(initialState(), {
      proposedAtMs: committedAtMs,
      point: publicPoint({ publicAndWellLit: false }),
      windows: validWindows,
    }),
  ).toMatchObject({
    ok: false,
    reason: "evening-point-not-public-and-well-lit",
  });

  expect(
    sellerProposeHandover(initialState(), {
      proposedAtMs: committedAtMs,
      point: publicPoint(),
      windows: [
        window("too-early", wibTimestamp(1, 6, 59), wibTimestamp(1, 8)),
        window("too-late", wibTimestamp(1, 21), wibTimestamp(1, 22, 1)),
      ],
    }),
  ).toMatchObject({ ok: false, reason: "handover-window-invalid" });

  expect(
    sellerProposeHandover(initialState(), {
      proposedAtMs: committedAtMs,
      point: publicPoint(),
      windows: [
        window("morning", wibTimestamp(1, 10), wibTimestamp(1, 10, 30)),
        window("overnight", wibTimestamp(1, 21), wibTimestamp(2, 7)),
      ],
    }),
  ).toMatchObject({ ok: false, reason: "handover-window-invalid" });

  const frontGateWindows = [
    window("morning", wibTimestamp(1, 10), wibTimestamp(1, 10, 30)),
    window("before-evening", wibTimestamp(1, 17), wibTimestamp(1, 17, 59)),
  ];
  expect(
    sellerProposeHandover(initialState(), {
      proposedAtMs: committedAtMs,
      point: frontGatePoint(),
      windows: frontGateWindows,
    }).ok,
  ).toBe(true);

  expect(
    sellerProposeHandover(initialState("Reliable Buyer"), {
      proposedAtMs: committedAtMs,
      point: frontGatePoint(),
      windows: frontGateWindows,
    }),
  ).toMatchObject({ ok: false, reason: "front-gate-not-eligible" });

  expect(
    sellerProposeHandover(initialState(), {
      proposedAtMs: committedAtMs,
      point: frontGatePoint({ sellerFrontGateConsent: false }),
      windows: frontGateWindows,
    }),
  ).toMatchObject({ ok: false, reason: "front-gate-not-eligible" });

  expect(
    sellerProposeHandover(initialState(), {
      proposedAtMs: committedAtMs,
      point: frontGatePoint(),
      windows: [
        frontGateWindows[0],
        window("at-evening", wibTimestamp(1, 17, 30), wibTimestamp(1, 18)),
      ],
    }),
  ).toMatchObject({ ok: false, reason: "front-gate-not-eligible" });
});

test("buyer adjustment remains pending until the seller accepts it", () => {
  const original = acceptedState();
  const adjustedWindow = window(
    "buyer-adjustment",
    wibTimestamp(1, 11),
    wibTimestamp(1, 11, 30),
  );
  const requested = buyerRequestScheduleAdjustment(original, {
    requestedAtMs: committedAtMs + 3,
    window: adjustedWindow,
  });
  const pending = must(requested);

  expect(pending.schedule).toEqual(original.schedule);
  expect(pending.pendingAdjustment).toEqual(adjustedWindow);

  const approved = sellerApproveScheduleAdjustment(pending, {
    approvedAtMs: committedAtMs + 4,
  });
  expect(must(approved).schedule?.window).toEqual(adjustedWindow);
  expect(must(approved).pendingAdjustment).toBeNull();
});

test("approved schedule change clears earlier presence and buyer confirmation", () => {
  let state = acceptedState();
  const originalStart = state.schedule!.window.startsAtMs;

  state = must(
    recordHandoverPresence(state, {
      party: "buyer",
      timestampMs: originalStart,
      locationAvailable: true,
      accuracyState: "usable",
      accuracyM: 10,
      distanceFromPointM: 20,
    }),
  );
  state = must(
    recordHandoverPresence(state, {
      party: "seller",
      timestampMs: originalStart,
      locationAvailable: true,
      accuracyState: "usable",
      accuracyM: 8,
      distanceFromPointM: 30,
    }),
  );
  state = must(buyerConfirmHandover(state, { confirmedAtMs: originalStart }));

  state = must(
    buyerRequestScheduleAdjustment(state, {
      requestedAtMs: originalStart,
      window: window(
        "after-confirmation",
        wibTimestamp(1, 11),
        wibTimestamp(1, 11, 30),
      ),
    }),
  );
  state = must(
    sellerApproveScheduleAdjustment(state, { approvedAtMs: originalStart }),
  );

  expect(state.buyerPresence).toBeNull();
  expect(state.sellerPresence).toBeNull();
  expect(state.buyerConfirmedAtMs).toBeNull();
  expect(state.sellerConfirmedAtMs).toBeNull();
});

test("presence at exactly 100 m is eligible and stores no raw location", () => {
  const state = acceptedState();
  const withinWindow = state.schedule!.window.startsAtMs;

  const buyerResult = recordHandoverPresence(state, {
    party: "buyer",
    timestampMs: withinWindow,
    locationAvailable: true,
    accuracyState: "usable",
    accuracyM: 12,
    distanceFromPointM: 100,
  });
  const buyerPresent = must(buyerResult);
  expect(buyerPresent.buyerPresence).toEqual({
    eligible: true,
    timestampMs: withinWindow,
    accuracyM: 12,
  });
  expect(Object.keys(buyerPresent.buyerPresence!)).toEqual([
    "eligible",
    "timestampMs",
    "accuracyM",
  ]);

  const outside = recordHandoverPresence(buyerPresent, {
    party: "seller",
    timestampMs: withinWindow,
    locationAvailable: true,
    accuracyState: "usable",
    accuracyM: 9,
    distanceFromPointM: 100.01,
  });
  expect(must(outside).sellerPresence?.eligible).toBe(false);

  const poor = recordHandoverPresence(buyerPresent, {
    party: "seller",
    timestampMs: withinWindow,
    locationAvailable: true,
    accuracyState: "poor",
    accuracyM: 250,
    distanceFromPointM: 20,
  });
  expect(must(poor).sellerPresence).toEqual({
    eligible: false,
    timestampMs: withinWindow,
    accuracyM: 250,
  });

  const unavailable = recordHandoverPresence(buyerPresent, {
    party: "seller",
    timestampMs: withinWindow,
    locationAvailable: false,
    accuracyState: "poor",
    accuracyM: null,
    distanceFromPointM: null,
  });
  expect(must(unavailable).sellerPresence?.eligible).toBe(false);

  const outsideWindow = recordHandoverPresence(buyerPresent, {
    party: "seller",
    timestampMs: withinWindow - 1,
    locationAvailable: true,
    accuracyState: "usable",
    accuracyM: 8,
    distanceFromPointM: 10,
  });
  expect(outsideWindow).toMatchObject({
    ok: false,
    reason: "presence-outside-schedule",
  });
});

test("buyer confirms first and matching confirmations complete exactly once", () => {
  let state = acceptedState();
  const withinWindow = state.schedule!.window.startsAtMs;

  const sellerFirst = sellerConfirmHandover(state, { confirmedAtMs: withinWindow });
  expect(sellerFirst).toMatchObject({
    ok: false,
    reason: "buyer-confirmation-required",
  });

  state = must(
    recordHandoverPresence(state, {
      party: "buyer",
      timestampMs: withinWindow,
      locationAvailable: true,
      accuracyState: "usable",
      accuracyM: 10,
      distanceFromPointM: 100,
    }),
  );
  state = must(
    recordHandoverPresence(state, {
      party: "seller",
      timestampMs: withinWindow,
      locationAvailable: true,
      accuracyState: "usable",
      accuracyM: 8,
      distanceFromPointM: 30,
    }),
  );
  state = must(buyerConfirmHandover(state, { confirmedAtMs: withinWindow }));
  expect(state.successRecord).toBeNull();

  const completed = sellerConfirmHandover(state, {
    confirmedAtMs: withinWindow + 1,
  });
  const finalState = must(completed);
  expect(finalState.successRecord).toEqual({
    transactionStatus: "Final",
    listingStatus: "Sold",
    escrowStatus: "Released - simulated",
    completedAtMs: withinWindow + 1,
  });

  const repeated = sellerConfirmHandover(finalState, {
    confirmedAtMs: withinWindow + 2,
  });
  expect(must(repeated)).toBe(finalState);
});
