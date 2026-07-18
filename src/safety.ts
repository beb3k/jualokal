export const SIMULATED_SAFETY_CATEGORIES = [
  "immediate-physical-danger",
  "threat-or-harassment",
] as const;

export type SafetyCategory = (typeof SIMULATED_SAFETY_CATEGORIES)[number];

export type TransactionSafetySnapshot = Readonly<{
  status: "active" | "final";
  paid: boolean;
  escrowStatus: "held" | "released" | "refunded";
}>;

export type SafetyReport = Readonly<{
  id: string;
  reporterId: string;
  reportedMemberId: string;
  category: SafetyCategory;
  description: string;
  evidenceLabel: string | null;
  credibleImmediateDanger: boolean;
  reportedAtMs: number;
  status: "pending" | "confirmed" | "dismissed" | "overturned";
  review: SafetyReview | null;
  appeal: SafetyAppeal | null;
}>;

export type SafetyReview = Readonly<{
  reviewerId: string;
  outcome: "confirmed" | "dismissed";
  redactedOutcome: string;
  reviewedAtMs: number;
}>;

export type SafetyAppeal = Readonly<{
  response: string;
  submittedAtMs: number;
  status: "pending" | "upheld" | "overturned";
  reviewerId: string | null;
  writtenOutcome: string | null;
  resolvedAtMs: number | null;
}>;

export type SafetyState = Readonly<{
  transactionId: string;
  buyerId: string;
  sellerId: string;
  report: SafetyReport | null;
  safetyHold: "active" | null;
  trustEffect: "none" | "confirmed-safety-finding";
  restriction: "account-restriction-simulated" | null;
}>;

export type ReportedMemberSafetyView = Readonly<{
  contactBlocked: boolean;
  reportStatus: SafetyReport["status"] | null;
  category: SafetyCategory | null;
  redactedOutcome: string | null;
  restriction: SafetyState["restriction"];
  appealStatus: SafetyAppeal["status"] | null;
  appealSubmittedAtMs: number | null;
  appealWrittenOutcome: string | null;
  reviewedAtMs: number | null;
}>;

export const SAFETY_APPEAL_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export type SafetyRejection =
  | "reporter-not-authorized"
  | "self-report-not-allowed"
  | "reported-member-not-party"
  | "category-invalid"
  | "description-required"
  | "report-already-filed"
  | "report-not-pending"
  | "review-outcome-required"
  | "redacted-outcome-required"
  | "appeal-not-available"
  | "appeal-not-authorized"
  | "appeal-response-required"
  | "appeal-deadline-passed"
  | "appeal-already-submitted"
  | "appeal-not-pending"
  | "appeal-reviewer-must-differ"
  | "appeal-outcome-required"
  | "written-outcome-required";

export type SafetyActionResult =
  | Readonly<{ ok: true; state: SafetyState }>
  | Readonly<{ ok: false; state: SafetyState; reason: SafetyRejection }>;

export function createInitialSafetyState(
  input: Readonly<{
    transactionId: string;
    buyerId: string;
    sellerId: string;
  }>,
): SafetyState {
  return Object.freeze({
    ...input,
    report: null,
    safetyHold: null,
    trustEffect: "none" as const,
    restriction: null,
  });
}

function isSafetyCategory(category: string): category is SafetyCategory {
  return SIMULATED_SAFETY_CATEGORIES.some((candidate) => candidate === category);
}

export function fileSafetyReport(
  state: SafetyState,
  input: Readonly<{
    reportId: string;
    actorId: string;
    reportedMemberId: string;
    category: SafetyCategory;
    description: string;
    evidenceLabel?: string;
    credibleImmediateDanger: boolean;
    reportedAtMs: number;
    transaction: TransactionSafetySnapshot;
  }>,
): SafetyActionResult {
  if (state.report) {
    return { ok: false, state, reason: "report-already-filed" };
  }
  if (input.actorId !== state.buyerId && input.actorId !== state.sellerId) {
    return { ok: false, state, reason: "reporter-not-authorized" };
  }
  if (input.reportedMemberId === input.actorId) {
    return { ok: false, state, reason: "self-report-not-allowed" };
  }
  if (
    input.reportedMemberId !== state.buyerId &&
    input.reportedMemberId !== state.sellerId
  ) {
    return { ok: false, state, reason: "reported-member-not-party" };
  }
  if (!isSafetyCategory(input.category)) {
    return { ok: false, state, reason: "category-invalid" };
  }
  const description = input.description.trim();
  if (!description) {
    return { ok: false, state, reason: "description-required" };
  }

  const safetyHoldApplies =
    input.category === "immediate-physical-danger" &&
    input.credibleImmediateDanger &&
    input.transaction.status === "active" &&
    input.transaction.paid &&
    input.transaction.escrowStatus === "held";

  return {
    ok: true,
    state: Object.freeze({
      ...state,
      report: Object.freeze({
        id: input.reportId,
        reporterId: input.actorId,
        reportedMemberId: input.reportedMemberId,
        category: input.category,
        description,
        evidenceLabel: input.evidenceLabel?.trim() || null,
        credibleImmediateDanger: input.credibleImmediateDanger,
        reportedAtMs: input.reportedAtMs,
        status: "pending" as const,
        review: null,
        appeal: null,
      }),
      safetyHold: safetyHoldApplies ? ("active" as const) : null,
    }),
  };
}

export function isPairContactBlocked(
  state: SafetyState,
  memberAId: string,
  memberBId: string,
): boolean {
  if (
    !state.report ||
    state.report.status === "dismissed" ||
    state.report.status === "overturned"
  ) {
    return false;
  }
  return (
    (memberAId === state.report.reporterId &&
      memberBId === state.report.reportedMemberId) ||
    (memberAId === state.report.reportedMemberId &&
      memberBId === state.report.reporterId)
  );
}

export function isSafetyHoldActive(state: SafetyState): boolean {
  return state.safetyHold === "active";
}

export function reviewSafetyReport(
  state: SafetyState,
  input: Readonly<{
    reviewerId: string;
    outcome: "confirmed" | "dismissed";
    redactedOutcome: string;
    reviewedAtMs: number;
  }>,
): SafetyActionResult {
  if (!state.report || state.report.status !== "pending") {
    return { ok: false, state, reason: "report-not-pending" };
  }
  if (input.outcome !== "confirmed" && input.outcome !== "dismissed") {
    return { ok: false, state, reason: "review-outcome-required" };
  }
  const redactedOutcome = input.redactedOutcome.trim();
  if (!redactedOutcome) {
    return { ok: false, state, reason: "redacted-outcome-required" };
  }

  const confirmed = input.outcome === "confirmed";
  return {
    ok: true,
    state: Object.freeze({
      ...state,
      report: Object.freeze({
        ...state.report,
        status: input.outcome,
        review: Object.freeze({ ...input, redactedOutcome }),
      }),
      safetyHold: null,
      trustEffect: confirmed ? "confirmed-safety-finding" : "none",
      restriction: confirmed ? "account-restriction-simulated" : null,
    }),
  };
}

export function submitSafetyAppeal(
  state: SafetyState,
  input: Readonly<{
    actorId: string;
    response: string;
    submittedAtMs: number;
  }>,
): SafetyActionResult {
  const report = state.report;
  if (!report || report.status !== "confirmed" || !report.review) {
    return { ok: false, state, reason: "appeal-not-available" };
  }
  if (input.actorId !== report.reportedMemberId) {
    return { ok: false, state, reason: "appeal-not-authorized" };
  }
  if (report.appeal) {
    return { ok: false, state, reason: "appeal-already-submitted" };
  }
  const response = input.response.trim();
  if (!response) {
    return { ok: false, state, reason: "appeal-response-required" };
  }
  if (input.submittedAtMs > report.review.reviewedAtMs + SAFETY_APPEAL_WINDOW_MS) {
    return { ok: false, state, reason: "appeal-deadline-passed" };
  }

  return {
    ok: true,
    state: Object.freeze({
      ...state,
      report: Object.freeze({
        ...report,
        appeal: Object.freeze({
          response,
          submittedAtMs: input.submittedAtMs,
          status: "pending" as const,
          reviewerId: null,
          writtenOutcome: null,
          resolvedAtMs: null,
        }),
      }),
    }),
  };
}

export function resolveSafetyAppeal(
  state: SafetyState,
  input: Readonly<{
    reviewerId: string;
    outcome: "upheld" | "overturned";
    writtenOutcome: string;
    resolvedAtMs: number;
  }>,
): SafetyActionResult {
  const report = state.report;
  if (!report?.review || !report.appeal || report.appeal.status !== "pending") {
    return { ok: false, state, reason: "appeal-not-pending" };
  }
  if (input.reviewerId === report.review.reviewerId) {
    return { ok: false, state, reason: "appeal-reviewer-must-differ" };
  }
  if (input.outcome !== "upheld" && input.outcome !== "overturned") {
    return { ok: false, state, reason: "appeal-outcome-required" };
  }
  const writtenOutcome = input.writtenOutcome.trim();
  if (!writtenOutcome) {
    return { ok: false, state, reason: "written-outcome-required" };
  }

  const overturned = input.outcome === "overturned";
  return {
    ok: true,
    state: Object.freeze({
      ...state,
      report: Object.freeze({
        ...report,
        status: overturned ? ("overturned" as const) : ("confirmed" as const),
        appeal: Object.freeze({
          ...report.appeal,
          status: input.outcome,
          reviewerId: input.reviewerId,
          writtenOutcome,
          resolvedAtMs: input.resolvedAtMs,
        }),
      }),
      safetyHold: overturned ? null : state.safetyHold,
      trustEffect: overturned ? "none" : "confirmed-safety-finding",
      restriction: overturned ? null : "account-restriction-simulated",
    }),
  };
}

export function projectSafetyForReportedMember(
  state: SafetyState,
): ReportedMemberSafetyView {
  const report = state.report;
  return Object.freeze({
    contactBlocked: report
      ? isPairContactBlocked(state, report.reporterId, report.reportedMemberId)
      : false,
    reportStatus: report?.status ?? null,
    category: report?.review ? report.category : null,
    redactedOutcome: report?.review?.redactedOutcome ?? null,
    restriction: state.restriction,
    appealStatus: report?.appeal?.status ?? null,
    appealSubmittedAtMs: report?.appeal?.submittedAtMs ?? null,
    appealWrittenOutcome: report?.appeal?.writtenOutcome ?? null,
    reviewedAtMs: report?.review?.reviewedAtMs ?? null,
  });
}
