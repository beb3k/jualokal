import { expect, test } from "@playwright/test";
import {
  HANDOVER_START_DEADLINE_MS,
  SCHEDULE_AGREEMENT_DEADLINE_MS,
  SELLER_PROPOSAL_DEADLINE_MS,
  buyerAcceptHandover,
  buyerConfirmHandover,
  buyerRequestScheduleAdjustment,
  closeIncompleteHandoverMeeting,
  createInitialHandoverState,
  openIncompleteHandoverDispute,
  raiseMaterialMismatchClaim,
  recordHandoverPresence,
  resolveMaterialMismatchDispute,
  respondToMaterialMismatchClaim,
  sellerApproveScheduleAdjustment,
  sellerConfirmHandover,
  sellerProposeHandover,
  sellerProposeRepeatHandover,
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

function withBothPresence(state = acceptedState()) {
  const timestampMs = state.schedule!.window.startsAtMs;
  state = must(
    recordHandoverPresence(state, {
      party: "buyer",
      timestampMs,
      locationAvailable: true,
      accuracyState: "usable",
      accuracyM: 10,
      distanceFromPointM: 20,
    }),
  );
  return must(
    recordHandoverPresence(state, {
      party: "seller",
      timestampMs,
      locationAvailable: true,
      accuracyState: "usable",
      accuracyM: 8,
      distanceFromPointM: 30,
    }),
  );
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
  state = must(
    buyerConfirmHandover(state, { actorId: "buyer-1", confirmedAtMs: originalStart }),
  );

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

for (const firstParty of ["buyer", "seller"] as const) {
  test(`${firstParty}-only confirmation remains evidence without completing`, () => {
    const present = withBothPresence();
    const confirmedAtMs = present.schedule!.window.startsAtMs;
    const state = must(
      firstParty === "buyer"
        ? buyerConfirmHandover(present, { actorId: "buyer-1", confirmedAtMs })
        : sellerConfirmHandover(present, { actorId: "seller-1", confirmedAtMs }),
    );

    expect(state.successRecord).toBeNull();
    expect(state.confirmationEvidence).toEqual([
      {
        party: firstParty,
        confirmedAtMs,
        meetingNumber: 1,
        buyerPresence: { eligible: true, timestampMs: confirmedAtMs, accuracyM: 10 },
        sellerPresence: { eligible: true, timestampMs: confirmedAtMs, accuracyM: 8 },
      },
    ]);
    expect(Object.keys(state.confirmationEvidence[0])).toEqual([
      "party",
      "confirmedAtMs",
      "meetingNumber",
      "buyerPresence",
      "sellerPresence",
    ]);
    expect(JSON.stringify(state.confirmationEvidence)).not.toMatch(/distance|location/i);
  });
}

test("only the acting participant can perform incomplete-handover actions", () => {
  const present = withBothPresence();
  const confirmedAtMs = present.schedule!.window.startsAtMs;

  expect(
    buyerConfirmHandover(present, { actorId: "seller-1", confirmedAtMs }),
  ).toMatchObject({
    ok: false,
    state: present,
    reason: "acting-member-not-authorized",
  });
  expect(
    sellerConfirmHandover(present, { actorId: "buyer-1", confirmedAtMs }),
  ).toMatchObject({
    ok: false,
    state: present,
    reason: "acting-member-not-authorized",
  });

  const incomplete = must(
    buyerConfirmHandover(present, { actorId: "buyer-1", confirmedAtMs }),
  );
  expect(
    closeIncompleteHandoverMeeting(incomplete, {
      actorId: "other-member",
      closedAtMs: confirmedAtMs + 1,
    }),
  ).toMatchObject({
    ok: false,
    state: incomplete,
    reason: "acting-member-not-authorized",
  });
});

test("closing an incomplete meeting blocks the missing remote confirmation", () => {
  const present = withBothPresence();
  const confirmedAtMs = present.schedule!.window.startsAtMs;
  const incomplete = must(
    buyerConfirmHandover(present, { actorId: "buyer-1", confirmedAtMs }),
  );
  const closed = must(
    closeIncompleteHandoverMeeting(incomplete, {
      actorId: "seller-1",
      closedAtMs: confirmedAtMs + 1,
    }),
  );

  expect(closed.meetingClosedAtMs).toBe(confirmedAtMs + 1);
  expect(
    sellerConfirmHandover(closed, {
      actorId: "seller-1",
      confirmedAtMs: confirmedAtMs + 2,
    }),
  ).toMatchObject({ ok: false, state: closed, reason: "meeting-closed" });
});

test("a repeat meeting needs a fresh mutual schedule, presence, and confirmations", () => {
  const present = withBothPresence();
  const firstConfirmedAtMs = present.schedule!.window.startsAtMs;
  const incomplete = must(
    buyerConfirmHandover(present, {
      actorId: "buyer-1",
      confirmedAtMs: firstConfirmedAtMs,
    }),
  );
  const oldEvidence = incomplete.confirmationEvidence[0];
  const closed = must(
    closeIncompleteHandoverMeeting(incomplete, {
      actorId: "buyer-1",
      closedAtMs: firstConfirmedAtMs + 1,
    }),
  );
  const repeat = must(
    sellerProposeRepeatHandover(closed, {
      actorId: "seller-1",
      proposedAtMs: firstConfirmedAtMs + 2,
      point: publicPoint(),
      windows: [
        window("repeat-morning", wibTimestamp(1, 11), wibTimestamp(1, 11, 30)),
        window("repeat-afternoon", wibTimestamp(1, 16), wibTimestamp(1, 16, 30)),
      ],
    }),
  );

  expect(repeat).toMatchObject({
    meetingNumber: 2,
    schedule: null,
    buyerPresence: null,
    sellerPresence: null,
    buyerConfirmedAtMs: null,
    sellerConfirmedAtMs: null,
    meetingClosedAtMs: null,
  });
  expect(repeat.confirmationEvidence).toEqual([oldEvidence]);

  const accepted = must(
    buyerAcceptHandover(repeat, {
      windowId: "repeat-morning",
      acceptedAtMs: firstConfirmedAtMs + 3,
    }),
  );
  expect(
    sellerConfirmHandover(accepted, {
      actorId: "seller-1",
      confirmedAtMs: accepted.schedule!.window.startsAtMs,
    }),
  ).toMatchObject({ ok: false, reason: "both-presence-checks-required" });

  let repeatMeeting = withBothPresence(accepted);
  const repeatConfirmedAtMs = repeatMeeting.schedule!.window.startsAtMs;
  repeatMeeting = must(
    buyerConfirmHandover(repeatMeeting, {
      actorId: "buyer-1",
      confirmedAtMs: repeatConfirmedAtMs,
    }),
  );
  const completed = must(
    sellerConfirmHandover(repeatMeeting, {
      actorId: "seller-1",
      confirmedAtMs: repeatConfirmedAtMs + 1,
    }),
  );

  expect(completed.successRecord).not.toBeNull();
  expect(completed.confirmationEvidence[0]).toBe(oldEvidence);
  expect(completed.confirmationEvidence.map((evidence) => evidence.meetingNumber)).toEqual([
    1, 2, 2,
  ]);
});

test("repeat meeting adjustments use the repeat proposal deadline", () => {
  const present = withBothPresence();
  const firstConfirmedAtMs = present.schedule!.window.startsAtMs;
  const incomplete = must(
    buyerConfirmHandover(present, {
      actorId: "buyer-1",
      confirmedAtMs: firstConfirmedAtMs,
    }),
  );
  const closed = must(
    closeIncompleteHandoverMeeting(incomplete, {
      actorId: "buyer-1",
      closedAtMs: firstConfirmedAtMs + 1,
    }),
  );
  const proposedAtMs = firstConfirmedAtMs + 2;
  const repeat = must(
    sellerProposeRepeatHandover(closed, {
      actorId: "seller-1",
      proposedAtMs,
      point: publicPoint(),
      windows: [
        window("repeat-morning", wibTimestamp(1, 11), wibTimestamp(1, 11, 30)),
        window("repeat-afternoon", wibTimestamp(1, 16), wibTimestamp(1, 16, 30)),
      ],
    }),
  );

  expect(proposedAtMs).toBeGreaterThan(committedAtMs + SCHEDULE_AGREEMENT_DEADLINE_MS);
  const adjustedWindow = window(
    "repeat-adjustment",
    wibTimestamp(1, 15),
    wibTimestamp(1, 15, 30),
  );
  const requested = must(
    buyerRequestScheduleAdjustment(repeat, {
      requestedAtMs: proposedAtMs + 1,
      window: adjustedWindow,
    }),
  );
  const approved = must(
    sellerApproveScheduleAdjustment(requested, {
      approvedAtMs: proposedAtMs + 2,
    }),
  );

  expect(approved.schedule?.window).toEqual(adjustedWindow);
});

test("preserved evidence can enter dispute after a repeat proposal clears confirmations", () => {
  const present = withBothPresence();
  const firstConfirmedAtMs = present.schedule!.window.startsAtMs;
  const incomplete = must(
    buyerConfirmHandover(present, {
      actorId: "buyer-1",
      confirmedAtMs: firstConfirmedAtMs,
    }),
  );
  const oldEvidence = incomplete.confirmationEvidence[0];
  const closed = must(
    closeIncompleteHandoverMeeting(incomplete, {
      actorId: "seller-1",
      closedAtMs: firstConfirmedAtMs + 1,
    }),
  );
  const repeat = must(
    sellerProposeRepeatHandover(closed, {
      actorId: "seller-1",
      proposedAtMs: firstConfirmedAtMs + 2,
      point: publicPoint(),
      windows: [
        window("repeat-morning", wibTimestamp(1, 11), wibTimestamp(1, 11, 30)),
        window("repeat-afternoon", wibTimestamp(1, 16), wibTimestamp(1, 16, 30)),
      ],
    }),
  );

  expect(repeat).toMatchObject({
    buyerConfirmedAtMs: null,
    sellerConfirmedAtMs: null,
    meetingClosedAtMs: null,
  });
  const openedAtMs = firstConfirmedAtMs + 3;
  const disputed = must(
    openIncompleteHandoverDispute(repeat, {
      actorId: "buyer-1",
      openedAtMs,
    }),
  );

  expect(disputed.activeDispute).toEqual({
    status: "Active Dispute",
    openedBy: "buyer",
    openedAtMs,
  });
  expect(disputed.meetingClosedAtMs).toBe(openedAtMs);
  expect(disputed.confirmationEvidence).toEqual([oldEvidence]);
  expect(disputed.successRecord).toBeNull();
});

for (const actor of [
  { actorId: "buyer-1", openedBy: "buyer" },
  { actorId: "seller-1", openedBy: "seller" },
] as const) {
  test(`${actor.openedBy} can open an Active Dispute after an incomplete meeting`, () => {
    const present = withBothPresence();
    const confirmedAtMs = present.schedule!.window.startsAtMs;
    const incomplete = must(
      buyerConfirmHandover(present, { actorId: "buyer-1", confirmedAtMs }),
    );
    const closed = must(
      closeIncompleteHandoverMeeting(incomplete, {
        actorId: actor.actorId,
        closedAtMs: confirmedAtMs + 1,
      }),
    );
    const disputed = must(
      openIncompleteHandoverDispute(closed, {
        actorId: actor.actorId,
        openedAtMs: confirmedAtMs + 2,
      }),
    );

    expect(disputed.activeDispute).toEqual({
      status: "Active Dispute",
      openedBy: actor.openedBy,
      openedAtMs: confirmedAtMs + 2,
    });
    expect(disputed.successRecord).toBeNull();
  });
}

for (const firstParty of ["buyer", "seller"] as const) {
  test(`later matching ${firstParty}-first confirmations complete exactly once`, () => {
    const present = withBothPresence();
    const confirmedAtMs = present.schedule!.window.startsAtMs;
    const first = must(
      firstParty === "buyer"
        ? buyerConfirmHandover(present, { actorId: "buyer-1", confirmedAtMs })
        : sellerConfirmHandover(present, { actorId: "seller-1", confirmedAtMs }),
    );
    const completed = must(
      firstParty === "buyer"
        ? sellerConfirmHandover(first, {
            actorId: "seller-1",
            confirmedAtMs: confirmedAtMs + 1,
          })
        : buyerConfirmHandover(first, {
            actorId: "buyer-1",
            confirmedAtMs: confirmedAtMs + 1,
          }),
    );

    expect(completed.successRecord).toEqual({
      transactionStatus: "Final",
      listingStatus: "Sold",
      escrowStatus: "Released - simulated",
      completedAtMs: confirmedAtMs + 1,
    });
    const repeated =
      firstParty === "buyer"
        ? sellerConfirmHandover(completed, {
            actorId: "seller-1",
            confirmedAtMs: confirmedAtMs + 2,
          })
        : buyerConfirmHandover(completed, {
            actorId: "buyer-1",
            confirmedAtMs: confirmedAtMs + 2,
          });
    expect(must(repeated)).toBe(completed);
  });
}

test("presence is eligible at exact schedule and distance boundaries only", () => {
  const state = acceptedState();
  const start = state.schedule!.window.startsAtMs;
  const end = state.schedule!.window.endsAtMs;

  for (const timestampMs of [start, end]) {
    expect(
      recordHandoverPresence(state, {
        party: "buyer",
        timestampMs,
        locationAvailable: true,
        accuracyState: "usable",
        accuracyM: 5,
        distanceFromPointM: 100,
      }),
    ).toMatchObject({ ok: true, state: { buyerPresence: { eligible: true } } });
  }
  for (const timestampMs of [start - 1, end + 1]) {
    expect(
      recordHandoverPresence(state, {
        party: "buyer",
        timestampMs,
        locationAvailable: true,
        accuracyState: "usable",
        accuracyM: 5,
        distanceFromPointM: 100,
      }),
    ).toMatchObject({ ok: false, reason: "presence-outside-schedule" });
  }
});

const qualifyingMismatchReasons = [
  "wrong-item",
  "undisclosed-defect",
  "false-description-or-grade",
  "measurement-or-included-part-mismatch",
  "suspected-counterfeit",
] as const;

const excludedMismatchReasons = [
  "changed-mind",
  "subjective-dislike",
  "personal-preference",
  "fit-without-misdescription",
] as const;

function raiseMismatch(
  state = withBothPresence(),
  reason: (typeof qualifyingMismatchReasons)[number] = "wrong-item",
) {
  return raiseMaterialMismatchClaim(state, {
    actorId: state.buyerId,
    raisedAtMs: state.schedule!.window.startsAtMs,
    reason,
    description: "The item at handover differs from the Purchase Snapshot.",
    photoLabel: reason === "wrong-item" ? "Optional simulated mismatch photo" : undefined,
  });
}

test("each qualifying Material Mismatch reason creates a structured pre-transfer claim", () => {
  for (const reason of qualifyingMismatchReasons) {
    const result = raiseMismatch(withBothPresence(), reason);
    expect(result.ok, reason).toBe(true);
    if (!result.ok) continue;

    expect(result.state.materialMismatchClaim).toMatchObject({
      reason,
      description: "The item at handover differs from the Purchase Snapshot.",
      raisedAtMs: result.state.schedule!.window.startsAtMs,
      status: "raised",
      listingDisposition:
        reason === "suspected-counterfeit" ? "removed-for-fraud-review" : "unchanged",
      fraudReviewFlagged: reason === "suspected-counterfeit",
    });
    expect(result.state.materialMismatchClaim?.photoLabel).toBe(
      reason === "wrong-item" ? "Optional simulated mismatch photo" : null,
    );
  }
});

test("excluded reasons and a blank description cannot create a Material Mismatch claim", () => {
  for (const reason of excludedMismatchReasons) {
    const state = withBothPresence();
    const result = raiseMaterialMismatchClaim(state, {
      actorId: state.buyerId,
      raisedAtMs: state.schedule!.window.startsAtMs,
      reason,
      description: "This is a personal preference, not a listing mismatch.",
    });
    expect(result.ok, reason).toBe(false);
    if (result.ok) continue;
    expect(result.reason).toBe("material-mismatch-reason-not-qualifying");
    expect(result.state).toBe(state);
  }

  const state = withBothPresence();
  const blankDescription = raiseMaterialMismatchClaim(state, {
    actorId: state.buyerId,
    raisedAtMs: state.schedule!.window.startsAtMs,
    reason: "wrong-item",
    description: "   ",
  });
  expect(blankDescription.ok).toBe(false);
  if (!blankDescription.ok) {
    expect(blankDescription.reason).toBe("material-mismatch-description-required");
    expect(blankDescription.state).toBe(state);
  }
});

test("only the buyer can raise before transfer without schedule or presence gates", () => {
  const unscheduled = initialState();
  const raised = raiseMaterialMismatchClaim(unscheduled, {
    actorId: unscheduled.buyerId,
    raisedAtMs: unscheduled.committedAtMs,
    reason: "undisclosed-defect",
    description: "A split seam is not disclosed in the Purchase Snapshot.",
  });
  expect(raised.ok).toBe(true);

  const scheduledWithoutPresence = acceptedState();
  const scheduledClaim = raiseMaterialMismatchClaim(scheduledWithoutPresence, {
    actorId: scheduledWithoutPresence.buyerId,
    raisedAtMs: scheduledWithoutPresence.schedule!.window.startsAtMs - 1,
    reason: "wrong-item",
    description: "The presented item is not the purchased item.",
  });
  expect(scheduledClaim.ok).toBe(true);

  const sellerAttempt = raiseMaterialMismatchClaim(unscheduled, {
    actorId: unscheduled.sellerId,
    raisedAtMs: unscheduled.committedAtMs,
    reason: "wrong-item",
    description: "The item differs.",
  });
  expect(sellerAttempt.ok).toBe(false);
  if (!sellerAttempt.ok) expect(sellerAttempt.reason).toBe("acting-member-not-authorized");
});

test("accepting the item closes the ordinary Material Mismatch boundary", () => {
  const state = withBothPresence();
  const accepted = must(
    buyerConfirmHandover(state, {
      actorId: state.buyerId,
      confirmedAtMs: state.schedule!.window.startsAtMs,
    }),
  );

  const result = raiseMaterialMismatchClaim(accepted, {
    actorId: accepted.buyerId,
    raisedAtMs: accepted.schedule!.window.startsAtMs,
    reason: "wrong-item",
    description: "Too late after acceptance.",
  });

  expect(result.ok).toBe(false);
  if (!result.ok) expect(result.reason).toBe("material-mismatch-too-late");

  const transferred = must(sellerConfirmHandover(state, {
    actorId: state.sellerId,
    confirmedAtMs: state.schedule!.window.startsAtMs,
  }));
  const afterTransfer = raiseMaterialMismatchClaim(transferred, {
    actorId: transferred.buyerId,
    raisedAtMs: transferred.schedule!.window.startsAtMs,
    reason: "wrong-item",
    description: "Too late after transfer.",
  });
  expect(afterTransfer.ok).toBe(false);
  if (!afterTransfer.ok) {
    expect(afterTransfer.reason).toBe("material-mismatch-too-late");
  }
});

test("an open Material Mismatch blocks both confirmations and the incomplete-handover dispute path", () => {
  const raised = must(raiseMismatch());
  const confirmedAtMs = raised.schedule!.window.startsAtMs;

  for (const result of [
    buyerConfirmHandover(raised, { actorId: raised.buyerId, confirmedAtMs }),
    sellerConfirmHandover(raised, { actorId: raised.sellerId, confirmedAtMs }),
    openIncompleteHandoverDispute(raised, { actorId: raised.buyerId, openedAtMs: confirmedAtMs }),
  ]) {
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("material-mismatch-claim-open");
    expect(result.state).toBe(raised);
  }
});

test("seller acknowledgement pauses the ordinary listing and records a full simulated refund", () => {
  const raised = must(raiseMismatch());
  const buyerResponse = respondToMaterialMismatchClaim(raised, {
    actorId: raised.buyerId,
    respondedAtMs: raised.schedule!.window.startsAtMs + 1,
    response: "acknowledged",
  });
  expect(buyerResponse.ok).toBe(false);
  if (!buyerResponse.ok) {
    expect(buyerResponse.reason).toBe("acting-member-not-authorized");
  }
  const responded = respondToMaterialMismatchClaim(raised, {
    actorId: raised.sellerId,
    respondedAtMs: raised.schedule!.window.startsAtMs + 1,
    response: "acknowledged",
  });

  expect(responded.ok).toBe(true);
  if (!responded.ok) return;
  expect(responded.state.materialMismatchClaim).toMatchObject({
    status: "acknowledged",
    listingDisposition: "paused-for-correction",
    fraudReviewFlagged: false,
  });
  expect(responded.state.activeDispute).toBeNull();
  expect(responded.state.successRecord).toBeNull();
});

test("a contested claim holds an Active Dispute until guided prototype review refunds it", () => {
  const raised = must(raiseMismatch());
  const contested = must(respondToMaterialMismatchClaim(raised, {
    actorId: raised.sellerId,
    respondedAtMs: raised.schedule!.window.startsAtMs + 1,
    response: "contested",
  }));

  expect(contested.materialMismatchClaim).toMatchObject({ status: "contested", listingDisposition: "unchanged" });
  expect(contested.activeDispute).toMatchObject({ status: "Active Dispute" });
  expect(contested.successRecord).toBeNull();

  const refunded = resolveMaterialMismatchDispute(contested);
  expect(refunded.ok).toBe(true);
  if (!refunded.ok) return;
  expect(refunded.state.materialMismatchClaim).toMatchObject({
    status: "refunded",
    listingDisposition: "unchanged",
  });
  expect(refunded.state.activeDispute).toBeNull();
  expect(refunded.state.successRecord).toBeNull();
});

test("suspected counterfeit immediately removes the listing and keeps the fraud flag through acknowledgement", () => {
  const raised = must(raiseMismatch(withBothPresence(), "suspected-counterfeit"));
  expect(raised.materialMismatchClaim).toMatchObject({
    status: "raised",
    listingDisposition: "removed-for-fraud-review",
    fraudReviewFlagged: true,
  });

  const acknowledged = must(respondToMaterialMismatchClaim(raised, {
    actorId: raised.sellerId,
    respondedAtMs: raised.schedule!.window.startsAtMs + 1,
    response: "acknowledged",
  }));
  expect(acknowledged.materialMismatchClaim).toMatchObject({
    status: "acknowledged",
    listingDisposition: "removed-for-fraud-review",
    fraudReviewFlagged: true,
  });
});
