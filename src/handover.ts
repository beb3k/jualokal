export const SELLER_PROPOSAL_DEADLINE_MS = 2 * 60 * 60 * 1000;
export const SCHEDULE_AGREEMENT_DEADLINE_MS = 6 * 60 * 60 * 1000;
export const HANDOVER_START_DEADLINE_MS = 48 * 60 * 60 * 1000;
export const NO_SHOW_GRACE_MS = 15 * 60 * 1000;

const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;
const HANDOVER_START_MINUTE = 7 * 60;
const EVENING_START_MINUTE = 18 * 60;
const HANDOVER_END_MINUTE = 22 * 60;

export type BuyerTier = "Verified Buyer" | "Reliable Buyer" | "Trusted Buyer";

export type HandoverPoint = Readonly<{
  id: string;
  label: string;
  kind: "public" | "front-gate";
  sellerZoneEligible: boolean;
  publicAndWellLit: boolean;
  sellerFrontGateConsent: boolean;
}>;

export type HandoverWindow = Readonly<{
  id: string;
  startsAtMs: number;
  endsAtMs: number;
}>;

export type HandoverProposal = Readonly<{
  point: HandoverPoint;
  windows: readonly HandoverWindow[];
  proposedAtMs: number;
}>;

export type HandoverSchedule = Readonly<{
  point: HandoverPoint;
  window: HandoverWindow;
  acceptedAtMs: number;
}>;

export type PresenceEvidence = Readonly<{
  eligible: boolean;
  timestampMs: number;
  accuracyM: number | null;
}>;

export type HandoverConfirmationEvidence = Readonly<{
  party: "buyer" | "seller";
  confirmedAtMs: number;
  meetingNumber: number;
  buyerPresence: PresenceEvidence;
  sellerPresence: PresenceEvidence;
}>;

export type ActiveHandoverDispute = Readonly<{
  status: "Active Dispute";
  openedBy: "buyer" | "seller";
  openedAtMs: number;
}>;

export type HandoverSuccessRecord = Readonly<{
  transactionStatus: "Final";
  listingStatus: "Sold";
  escrowStatus: "Released - simulated";
  completedAtMs: number;
}>;

export type SellerUnavailabilityReason =
  | "selling elsewhere"
  | "higher offer"
  | "loss"
  | "damage"
  | "withdrawal";

export type HandoverFailureRecord = Readonly<{
  reason:
    | "Scheduling Expiry"
    | "Buyer Cancellation"
    | "Seller Cancellation"
    | "Buyer No-Show"
    | "Seller No-Show"
    | "Seller Unavailability";
  sellerUnavailabilityReason: SellerUnavailabilityReason | null;
  transactionStatus: "Ended";
  listingStatus: "For Sale" | "Paused" | "Removed";
  escrowStatus: "Full refund - simulated";
  reliabilityStrikes: readonly Readonly<{
    party: "buyer" | "seller";
    reason:
      | "overdue scheduling response"
      | "late cancellation"
      | "Buyer No-Show"
      | "Seller No-Show"
      | "Seller Unavailability";
  }>[];
  compensationStatus: "None";
  endedAtMs: number;
}>;
export type HandoverState = Readonly<{
  commitmentId: string;
  buyerId: string;
  sellerId: string;
  listingId: string;
  committedAtMs: number;
  buyerTier: BuyerTier;
  proposal: HandoverProposal | null;
  schedule: HandoverSchedule | null;
  pendingAdjustment: HandoverWindow | null;
  buyerPresence: PresenceEvidence | null;
  sellerPresence: PresenceEvidence | null;
  buyerConfirmedAtMs: number | null;
  sellerConfirmedAtMs: number | null;
  meetingNumber: number;
  meetingClosedAtMs: number | null;
  confirmationEvidence: readonly HandoverConfirmationEvidence[];
  activeDispute: ActiveHandoverDispute | null;
  successRecord: HandoverSuccessRecord | null;
  failureRecord: HandoverFailureRecord | null;
}>;

export type HandoverRejection =
  | "seller-proposal-deadline-passed"
  | "handover-point-outside-zone"
  | "handover-window-invalid"
  | "front-gate-not-eligible"
  | "evening-point-not-public-and-well-lit"
  | "schedule-agreement-deadline-passed"
  | "proposed-window-not-found"
  | "schedule-required"
  | "adjustment-required"
  | "presence-outside-schedule"
  | "both-presence-checks-required"
  | "acting-member-not-authorized"
  | "incomplete-confirmation-required"
  | "meeting-not-closed"
  | "meeting-closed"
  | "active-dispute-open"
  | "failure-not-eligible"
  | "present-party-required"
  | "absent-party-present"
  | "overdue-party-invalid"
  | "handover-terminal";

export type HandoverActionResult =
  | Readonly<{ ok: true; state: HandoverState }>
  | Readonly<{ ok: false; state: HandoverState; reason: HandoverRejection }>;

function freezePoint(point: HandoverPoint): HandoverPoint {
  return Object.freeze({ ...point });
}

function freezeWindow(window: HandoverWindow): HandoverWindow {
  return Object.freeze({ ...window });
}

function freezePresenceEvidence(evidence: PresenceEvidence): PresenceEvidence {
  return Object.freeze({
    eligible: evidence.eligible,
    timestampMs: evidence.timestampMs,
    accuracyM: evidence.accuracyM,
  });
}

function wibMinuteOfDay(timestampMs: number) {
  const shifted = new Date(timestampMs + WIB_OFFSET_MS);
  return shifted.getUTCHours() * 60 + shifted.getUTCMinutes();
}

function wibDateKey(timestampMs: number) {
  const shifted = new Date(timestampMs + WIB_OFFSET_MS);
  return `${shifted.getUTCFullYear()}-${shifted.getUTCMonth()}-${shifted.getUTCDate()}`;
}

function windowRejection(
  state: HandoverState,
  point: HandoverPoint,
  window: HandoverWindow,
): HandoverRejection | null {
  const startsAtMinute = wibMinuteOfDay(window.startsAtMs);
  const endsAtMinute = wibMinuteOfDay(window.endsAtMs);

  if (
    window.startsAtMs < state.committedAtMs ||
    window.startsAtMs > state.committedAtMs + HANDOVER_START_DEADLINE_MS ||
    window.endsAtMs <= window.startsAtMs ||
    wibDateKey(window.startsAtMs) !== wibDateKey(window.endsAtMs) ||
    startsAtMinute < HANDOVER_START_MINUTE ||
    endsAtMinute > HANDOVER_END_MINUTE
  ) {
    return "handover-window-invalid";
  }

  if (window.endsAtMs - window.startsAtMs > 24 * 60 * 60 * 1000) {
    return "handover-window-invalid";
  }

  const reachesEvening = endsAtMinute >= EVENING_START_MINUTE;
  if (reachesEvening && (!point.publicAndWellLit || point.kind !== "public")) {
    return point.kind === "front-gate"
      ? "front-gate-not-eligible"
      : "evening-point-not-public-and-well-lit";
  }

  if (
    point.kind === "front-gate" &&
    (state.buyerTier !== "Trusted Buyer" ||
      !point.sellerFrontGateConsent ||
      reachesEvening)
  ) {
    return "front-gate-not-eligible";
  }

  return null;
}

function scheduleDeadlineFor(state: HandoverState) {
  if (state.schedule) return state.schedule.window.startsAtMs;
  return state.meetingNumber > 1 && state.proposal
    ? state.proposal.proposedAtMs + SCHEDULE_AGREEMENT_DEADLINE_MS
    : state.committedAtMs + SCHEDULE_AGREEMENT_DEADLINE_MS;
}

function duringSchedule(state: HandoverState, timestampMs: number) {
  return Boolean(
    state.schedule &&
      timestampMs >= state.schedule.window.startsAtMs &&
      timestampMs <= state.schedule.window.endsAtMs,
  );
}

function actorParty(state: HandoverState, actorId: string) {
  if (actorId === state.buyerId) return "buyer" as const;
  if (actorId === state.sellerId) return "seller" as const;
  return null;
}

function hasExactlyOneConfirmation(state: HandoverState) {
  return (state.buyerConfirmedAtMs === null) !== (state.sellerConfirmedAtMs === null);
}

function appendConfirmationEvidence(
  state: HandoverState,
  party: "buyer" | "seller",
  confirmedAtMs: number,
) {
  const buyerPresence = state.buyerPresence!;
  const sellerPresence = state.sellerPresence!;
  const evidence: HandoverConfirmationEvidence = Object.freeze({
    party,
    confirmedAtMs,
    meetingNumber: state.meetingNumber,
    buyerPresence: freezePresenceEvidence(buyerPresence),
    sellerPresence: freezePresenceEvidence(sellerPresence),
  });
  return Object.freeze([...state.confirmationEvidence, evidence]);
}

function completeHandover(state: HandoverState, completedAtMs: number): HandoverState {
  return Object.freeze({
    ...state,
    successRecord: Object.freeze({
      transactionStatus: "Final",
      listingStatus: "Sold",
      escrowStatus: "Released - simulated",
      completedAtMs,
    }),
  });
}

function rejectEndedHandover(
  state: HandoverState,
): HandoverActionResult | null {
  return state.failureRecord || state.successRecord || state.activeDispute
    ? { ok: false, state, reason: "handover-terminal" }
    : null;
}

export function createInitialHandoverState(
  input: Pick<
    HandoverState,
    "commitmentId" | "buyerId" | "sellerId" | "listingId" | "committedAtMs" | "buyerTier"
  >,
): HandoverState {
  return Object.freeze({
    ...input,
    proposal: null,
    schedule: null,
    pendingAdjustment: null,
    buyerPresence: null,
    sellerPresence: null,
    buyerConfirmedAtMs: null,
    sellerConfirmedAtMs: null,
    meetingNumber: 1,
    meetingClosedAtMs: null,
    confirmationEvidence: Object.freeze([]),
    activeDispute: null,
    successRecord: null,
    failureRecord: null,
  });
}

export function sellerProposeHandover(
  state: HandoverState,
  input: Readonly<{
    proposedAtMs: number;
    point: HandoverPoint;
    windows: readonly HandoverWindow[];
  }>,
): HandoverActionResult {
  const ended = rejectEndedHandover(state);
  if (ended) return ended;
  if (input.proposedAtMs > state.committedAtMs + SELLER_PROPOSAL_DEADLINE_MS) {
    return { ok: false, state, reason: "seller-proposal-deadline-passed" };
  }

  if (!input.point.sellerZoneEligible) {
    return { ok: false, state, reason: "handover-point-outside-zone" };
  }

  if (
    input.windows.length < 2 ||
    input.windows.some((window) => windowRejection(state, input.point, window))
  ) {
    const firstRejection = input.windows
      .map((window) => windowRejection(state, input.point, window))
      .find((reason): reason is HandoverRejection => reason !== null);
    return {
      ok: false,
      state,
      reason: firstRejection ?? "handover-window-invalid",
    };
  }

  return {
    ok: true,
    state: Object.freeze({
      ...state,
      proposal: Object.freeze({
        point: freezePoint(input.point),
        windows: Object.freeze(input.windows.map(freezeWindow)),
        proposedAtMs: input.proposedAtMs,
      }),
      pendingAdjustment: null,
    }),
  };
}

export function buyerAcceptHandover(
  state: HandoverState,
  input: Readonly<{ windowId: string; acceptedAtMs: number }>,
): HandoverActionResult {
  const ended = rejectEndedHandover(state);
  if (ended) return ended;
  const window = state.proposal?.windows.find(
    (candidate) => candidate.id === input.windowId,
  );
  if (!state.proposal || !window) {
    return { ok: false, state, reason: "proposed-window-not-found" };
  }

  const agreementDeadline =
    state.meetingNumber === 1
      ? state.committedAtMs + SCHEDULE_AGREEMENT_DEADLINE_MS
      : state.proposal.proposedAtMs + SCHEDULE_AGREEMENT_DEADLINE_MS;
  if (input.acceptedAtMs > agreementDeadline) {
    return { ok: false, state, reason: "schedule-agreement-deadline-passed" };
  }

  return {
    ok: true,
    state: Object.freeze({
      ...state,
      schedule: Object.freeze({
        point: state.proposal.point,
        window,
        acceptedAtMs: input.acceptedAtMs,
      }),
      pendingAdjustment: null,
      buyerPresence: null,
      sellerPresence: null,
    }),
  };
}

export function buyerRequestScheduleAdjustment(
  state: HandoverState,
  input: Readonly<{ requestedAtMs: number; window: HandoverWindow }>,
): HandoverActionResult {
  const ended = rejectEndedHandover(state);
  if (ended) return ended;
  if (!state.proposal) {
    return { ok: false, state, reason: "schedule-required" };
  }

  if (input.requestedAtMs > scheduleDeadlineFor(state)) {
    return { ok: false, state, reason: "schedule-agreement-deadline-passed" };
  }

  const rejection = windowRejection(state, state.proposal.point, input.window);
  if (rejection) return { ok: false, state, reason: rejection };

  return {
    ok: true,
    state: Object.freeze({
      ...state,
      pendingAdjustment: freezeWindow(input.window),
    }),
  };
}

export function sellerApproveScheduleAdjustment(
  state: HandoverState,
  input: Readonly<{ approvedAtMs: number }>,
): HandoverActionResult {
  const ended = rejectEndedHandover(state);
  if (ended) return ended;
  if (!state.proposal || !state.pendingAdjustment) {
    return { ok: false, state, reason: "adjustment-required" };
  }

  if (input.approvedAtMs > scheduleDeadlineFor(state)) {
    return { ok: false, state, reason: "schedule-agreement-deadline-passed" };
  }

  return {
    ok: true,
    state: Object.freeze({
      ...state,
      schedule: Object.freeze({
        point: state.proposal.point,
        window: state.pendingAdjustment,
        acceptedAtMs: input.approvedAtMs,
      }),
      pendingAdjustment: null,
      buyerPresence: null,
      sellerPresence: null,
      buyerConfirmedAtMs: null,
      sellerConfirmedAtMs: null,
    }),
  };
}

export function recordHandoverPresence(
  state: HandoverState,
  input: Readonly<{
    party: "buyer" | "seller";
    timestampMs: number;
    locationAvailable: boolean;
    accuracyState: "usable" | "poor";
    accuracyM: number | null;
    distanceFromPointM: number | null;
  }>,
): HandoverActionResult {
  const ended = rejectEndedHandover(state);
  if (ended) return ended;
  if (state.meetingClosedAtMs !== null) {
    return { ok: false, state, reason: "meeting-closed" };
  }
  if (!state.schedule) return { ok: false, state, reason: "schedule-required" };
  if (!duringSchedule(state, input.timestampMs)) {
    return { ok: false, state, reason: "presence-outside-schedule" };
  }

  const eligible =
    input.locationAvailable &&
    input.accuracyState === "usable" &&
    input.accuracyM !== null &&
    input.distanceFromPointM !== null &&
    input.distanceFromPointM >= 0 &&
    input.distanceFromPointM <= 100;
  const evidence = Object.freeze({
    eligible,
    timestampMs: input.timestampMs,
    accuracyM: input.accuracyM,
  });

  return {
    ok: true,
    state: Object.freeze({
      ...state,
      [input.party === "buyer" ? "buyerPresence" : "sellerPresence"]: evidence,
    }),
  };
}

function confirmationRejection(
  state: HandoverState,
  confirmedAtMs: number,
): HandoverRejection | null {
  if (state.meetingClosedAtMs !== null) return "meeting-closed";
  if (!state.schedule) return "schedule-required";
  if (!duringSchedule(state, confirmedAtMs)) {
    return "presence-outside-schedule";
  }
  if (!state.buyerPresence?.eligible || !state.sellerPresence?.eligible) {
    return "both-presence-checks-required";
  }
  return null;
}

export function buyerConfirmHandover(
  state: HandoverState,
  input: Readonly<{ actorId: string; confirmedAtMs: number }>,
): HandoverActionResult {
  const ended = rejectEndedHandover(state);
  if (ended) return ended;
  if (input.actorId !== state.buyerId) {
    return { ok: false, state, reason: "acting-member-not-authorized" };
  }
  if (state.successRecord || state.buyerConfirmedAtMs !== null) {
    return { ok: true, state };
  }
  const rejection = confirmationRejection(state, input.confirmedAtMs);
  if (rejection) return { ok: false, state, reason: rejection };

  const confirmedState = Object.freeze({
    ...state,
    buyerConfirmedAtMs: input.confirmedAtMs,
    confirmationEvidence: appendConfirmationEvidence(state, "buyer", input.confirmedAtMs),
  });
  return {
    ok: true,
    state:
      confirmedState.sellerConfirmedAtMs === null
        ? confirmedState
        : completeHandover(confirmedState, input.confirmedAtMs),
  };
}

export function sellerConfirmHandover(
  state: HandoverState,
  input: Readonly<{ actorId: string; confirmedAtMs: number }>,
): HandoverActionResult {
  const ended = rejectEndedHandover(state);
  if (ended) return ended;
  if (input.actorId !== state.sellerId) {
    return { ok: false, state, reason: "acting-member-not-authorized" };
  }
  if (state.successRecord || state.sellerConfirmedAtMs !== null) {
    return { ok: true, state };
  }
  const rejection = confirmationRejection(state, input.confirmedAtMs);
  if (rejection) return { ok: false, state, reason: rejection };

  const confirmedState = Object.freeze({
    ...state,
    sellerConfirmedAtMs: input.confirmedAtMs,
    confirmationEvidence: appendConfirmationEvidence(state, "seller", input.confirmedAtMs),
  });
  return {
    ok: true,
    state:
      confirmedState.buyerConfirmedAtMs === null
        ? confirmedState
        : completeHandover(confirmedState, input.confirmedAtMs),
  };
}

export function closeIncompleteHandoverMeeting(
  state: HandoverState,
  input: Readonly<{ actorId: string; closedAtMs: number }>,
): HandoverActionResult {
  const ended = rejectEndedHandover(state);
  if (ended) return ended;
  if (!actorParty(state, input.actorId)) {
    return { ok: false, state, reason: "acting-member-not-authorized" };
  }
  if (!hasExactlyOneConfirmation(state)) {
    return { ok: false, state, reason: "incomplete-confirmation-required" };
  }
  if (state.meetingClosedAtMs !== null) {
    return { ok: false, state, reason: "meeting-closed" };
  }

  return {
    ok: true,
    state: Object.freeze({ ...state, meetingClosedAtMs: input.closedAtMs }),
  };
}

export function sellerProposeRepeatHandover(
  state: HandoverState,
  input: Readonly<{
    actorId: string;
    proposedAtMs: number;
    point: HandoverPoint;
    windows: readonly HandoverWindow[];
  }>,
): HandoverActionResult {
  const ended = rejectEndedHandover(state);
  if (ended) return ended;
  if (input.actorId !== state.sellerId) {
    return { ok: false, state, reason: "acting-member-not-authorized" };
  }
  if (!hasExactlyOneConfirmation(state)) {
    return { ok: false, state, reason: "incomplete-confirmation-required" };
  }
  if (state.meetingClosedAtMs === null) {
    return { ok: false, state, reason: "meeting-not-closed" };
  }
  if (state.activeDispute) {
    return { ok: false, state, reason: "active-dispute-open" };
  }
  if (!input.point.sellerZoneEligible) {
    return { ok: false, state, reason: "handover-point-outside-zone" };
  }

  if (
    input.windows.length < 2 ||
    input.windows.some((window) => windowRejection(state, input.point, window))
  ) {
    const firstRejection = input.windows
      .map((window) => windowRejection(state, input.point, window))
      .find((reason): reason is HandoverRejection => reason !== null);
    return {
      ok: false,
      state,
      reason: firstRejection ?? "handover-window-invalid",
    };
  }

  return {
    ok: true,
    state: Object.freeze({
      ...state,
      proposal: Object.freeze({
        point: freezePoint(input.point),
        windows: Object.freeze(input.windows.map(freezeWindow)),
        proposedAtMs: input.proposedAtMs,
      }),
      schedule: null,
      pendingAdjustment: null,
      buyerPresence: null,
      sellerPresence: null,
      buyerConfirmedAtMs: null,
      sellerConfirmedAtMs: null,
      meetingNumber: state.meetingNumber + 1,
      meetingClosedAtMs: null,
    }),
  };
}

export function openIncompleteHandoverDispute(
  state: HandoverState,
  input: Readonly<{ actorId: string; openedAtMs: number }>,
): HandoverActionResult {
  const ended = rejectEndedHandover(state);
  if (ended) return ended;
  const openedBy = actorParty(state, input.actorId);
  if (!openedBy) {
    return { ok: false, state, reason: "acting-member-not-authorized" };
  }
  if (state.activeDispute) return { ok: true, state };
  if (state.successRecord || state.confirmationEvidence.length === 0) {
    return { ok: false, state, reason: "incomplete-confirmation-required" };
  }

  return {
    ok: true,
    state: Object.freeze({
      ...state,
      meetingClosedAtMs: state.meetingClosedAtMs ?? input.openedAtMs,
      activeDispute: Object.freeze({
        status: "Active Dispute",
        openedBy,
        openedAtMs: input.openedAtMs,
      }),
    }),
  };
}

function endHandover(
  state: HandoverState,
  input: Readonly<{
    reason: HandoverFailureRecord["reason"];
    sellerUnavailabilityReason?: SellerUnavailabilityReason;
    listingStatus: HandoverFailureRecord["listingStatus"];
    strikeParty: "buyer" | "seller" | null;
    strikeReason?: HandoverFailureRecord["reliabilityStrikes"][number]["reason"];
    endedAtMs: number;
  }>,
): HandoverActionResult {
  if (state.failureRecord) {
    return { ok: false, state, reason: "handover-terminal" };
  }
  if (state.successRecord || state.activeDispute) {
    return { ok: false, state, reason: "handover-terminal" };
  }

  const reliabilityStrikes =
    input.strikeParty && input.strikeReason
      ? Object.freeze([
          Object.freeze({
            party: input.strikeParty,
            reason: input.strikeReason,
          }),
        ])
      : Object.freeze([]);

  return {
    ok: true,
    state: Object.freeze({
      ...state,
      failureRecord: Object.freeze({
        reason: input.reason,
        sellerUnavailabilityReason: input.sellerUnavailabilityReason ?? null,
        transactionStatus: "Ended",
        listingStatus: input.listingStatus,
        escrowStatus: "Full refund - simulated",
        reliabilityStrikes,
        compensationStatus: "None",
        endedAtMs: input.endedAtMs,
      }),
    }),
  };
}

export function expireScheduling(
  state: HandoverState,
  input: Readonly<{
    expiredAtMs: number;
    overdueParty: "buyer" | "seller" | null;
  }>,
): HandoverActionResult {
  if (state.failureRecord) {
    const sameExpiry =
      state.failureRecord.reason === "Scheduling Expiry" &&
      state.failureRecord.endedAtMs === input.expiredAtMs &&
      (state.failureRecord.reliabilityStrikes[0]?.party ?? null) ===
        (state.proposal ? input.overdueParty : "seller");
    return sameExpiry
      ? { ok: true, state }
      : { ok: false, state, reason: "handover-terminal" };
  }
  if (state.successRecord || state.schedule) {
    return { ok: false, state, reason: "handover-terminal" };
  }

  const expectedOverdueParty = !state.proposal
    ? "seller"
    : state.pendingAdjustment
      ? "seller"
      : "buyer";
  if (
    (input.overdueParty === null && !state.proposal) ||
    (input.overdueParty !== null &&
      input.overdueParty !== expectedOverdueParty)
  ) {
    return { ok: false, state, reason: "overdue-party-invalid" };
  }
  const deadlineMs = state.proposal
    ? scheduleDeadlineFor(state)
    : state.committedAtMs + SELLER_PROPOSAL_DEADLINE_MS;
  const incompatibleAvailability =
    state.proposal !== null && input.overdueParty === null;
  if (!incompatibleAvailability && input.expiredAtMs <= deadlineMs) {
    return { ok: false, state, reason: "failure-not-eligible" };
  }

  const overdueParty = state.proposal ? input.overdueParty : "seller";
  return endHandover(state, {
    reason: "Scheduling Expiry",
    listingStatus: "For Sale",
    strikeParty: overdueParty,
    strikeReason: overdueParty ? "overdue scheduling response" : undefined,
    endedAtMs: input.expiredAtMs,
  });
}

export function cancelHandover(
  state: HandoverState,
  input: Readonly<{
    party: "buyer" | "seller";
    cancelledAtMs: number;
  }>,
): HandoverActionResult {
  if (state.failureRecord) {
    const sameCancellation =
      state.failureRecord.reason ===
      (input.party === "buyer" ? "Buyer Cancellation" : "Seller Cancellation") &&
      state.failureRecord.endedAtMs === input.cancelledAtMs;
    return sameCancellation
      ? { ok: true, state }
      : { ok: false, state, reason: "handover-terminal" };
  }
  if (!state.schedule) return { ok: false, state, reason: "schedule-required" };

  const isLate =
    input.cancelledAtMs >=
    state.schedule.window.startsAtMs - SELLER_PROPOSAL_DEADLINE_MS;
  return endHandover(state, {
    reason: input.party === "buyer" ? "Buyer Cancellation" : "Seller Cancellation",
    listingStatus: "For Sale",
    strikeParty: isLate ? input.party : null,
    strikeReason: isLate ? "late cancellation" : undefined,
    endedAtMs: input.cancelledAtMs,
  });
}

export function reportNoShow(
  state: HandoverState,
  input: Readonly<{
    absentParty: "buyer" | "seller";
    reportedAtMs: number;
  }>,
): HandoverActionResult {
  if (state.failureRecord) {
    const sameNoShow =
      state.failureRecord.reason ===
      (input.absentParty === "buyer" ? "Buyer No-Show" : "Seller No-Show") &&
      state.failureRecord.endedAtMs === input.reportedAtMs;
    return sameNoShow
      ? { ok: true, state }
      : { ok: false, state, reason: "handover-terminal" };
  }
  if (!state.schedule) return { ok: false, state, reason: "schedule-required" };
  if (
    input.reportedAtMs <=
    state.schedule.window.startsAtMs + NO_SHOW_GRACE_MS
  ) {
    return { ok: false, state, reason: "failure-not-eligible" };
  }

  const absentPartyPresence =
    input.absentParty === "buyer" ? state.buyerPresence : state.sellerPresence;
  if (absentPartyPresence?.eligible) {
    return { ok: false, state, reason: "absent-party-present" };
  }

  const reportingPartyPresence =
    input.absentParty === "buyer" ? state.sellerPresence : state.buyerPresence;
  if (!reportingPartyPresence?.eligible) {
    return { ok: false, state, reason: "present-party-required" };
  }

  const reason =
    input.absentParty === "buyer" ? "Buyer No-Show" : "Seller No-Show";
  return endHandover(state, {
    reason,
    listingStatus: input.absentParty === "buyer" ? "For Sale" : "Paused",
    strikeParty: input.absentParty,
    strikeReason: reason,
    endedAtMs: input.reportedAtMs,
  });
}

export function reportSellerUnavailability(
  state: HandoverState,
  input: Readonly<{
    unavailabilityReason: SellerUnavailabilityReason;
    reportedAtMs: number;
  }>,
): HandoverActionResult {
  if (state.failureRecord) {
    const sameUnavailability =
      state.failureRecord.reason === "Seller Unavailability" &&
      state.failureRecord.sellerUnavailabilityReason ===
        input.unavailabilityReason &&
      state.failureRecord.endedAtMs === input.reportedAtMs;
    return sameUnavailability
      ? { ok: true, state }
      : { ok: false, state, reason: "handover-terminal" };
  }

  return endHandover(state, {
    reason: "Seller Unavailability",
    sellerUnavailabilityReason: input.unavailabilityReason,
    listingStatus: "Removed",
    strikeParty: "seller",
    strikeReason: "Seller Unavailability",
    endedAtMs: input.reportedAtMs,
  });
}
