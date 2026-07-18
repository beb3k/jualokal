import { expect, test } from "@playwright/test";
import {
  createInitialSafetyState,
  fileSafetyReport,
  isPairContactBlocked,
  isSafetyHoldActive,
  projectSafetyForReportedMember,
  resolveSafetyAppeal,
  reviewSafetyReport,
  SAFETY_APPEAL_WINDOW_MS,
  submitSafetyAppeal,
  type SafetyActionResult,
  type SafetyState,
  type TransactionSafetySnapshot,
} from "../src/safety";

const reportedAtMs = Date.UTC(2026, 6, 18, 3, 0);

const activePaidEscrow: TransactionSafetySnapshot = {
  status: "active",
  paid: true,
  escrowStatus: "held",
};

function initialState() {
  return createInitialSafetyState({
    transactionId: "commitment-1",
    buyerId: "buyer-1",
    sellerId: "seller-1",
  });
}

function must(result: SafetyActionResult): SafetyState {
  if (!result.ok) throw new Error(`Expected success, received ${result.reason}`);
  return result.state;
}

test("a valid private report blocks pair contact while a pending allegation has no trust effect", () => {
  const state = must(
    fileSafetyReport(initialState(), {
      reportId: "report-1",
      actorId: "buyer-1",
      reportedMemberId: "seller-1",
      category: "threat-or-harassment",
      description: "  The seller threatened me when I left.  ",
      evidenceLabel: "  simulated-message-screenshot.png  ",
      credibleImmediateDanger: false,
      reportedAtMs,
      transaction: activePaidEscrow,
    }),
  );

  expect(state.report).toMatchObject({
    status: "pending",
    description: "The seller threatened me when I left.",
    evidenceLabel: "simulated-message-screenshot.png",
  });
  expect(state.trustEffect).toBe("none");
  expect(state.restriction).toBeNull();
  expect(isPairContactBlocked(state, "buyer-1", "seller-1")).toBe(true);
  expect(isPairContactBlocked(state, "buyer-1", "someone-else")).toBe(false);
  expect(isSafetyHoldActive(state)).toBe(false);
});

test("only the buyer or seller may report the other party with a category and description", () => {
  const validInput = {
    reportId: "report-1",
    actorId: "buyer-1",
    reportedMemberId: "seller-1",
    category: "immediate-physical-danger" as const,
    description: "The handover became unsafe.",
    credibleImmediateDanger: true,
    reportedAtMs,
    transaction: activePaidEscrow,
  };

  expect(
    fileSafetyReport(initialState(), { ...validInput, actorId: "moderator-1" }),
  ).toMatchObject({ ok: false, reason: "reporter-not-authorized" });
  expect(
    fileSafetyReport(initialState(), {
      ...validInput,
      reportedMemberId: "buyer-1",
    }),
  ).toMatchObject({ ok: false, reason: "self-report-not-allowed" });
  expect(
    fileSafetyReport(initialState(), {
      ...validInput,
      reportedMemberId: "someone-else",
    }),
  ).toMatchObject({ ok: false, reason: "reported-member-not-party" });
  expect(
    fileSafetyReport(initialState(), { ...validInput, description: "   " }),
  ).toMatchObject({ ok: false, reason: "description-required" });
  expect(
    fileSafetyReport(initialState(), {
      ...validInput,
      category: "other" as never,
    }),
  ).toMatchObject({ ok: false, reason: "category-invalid" });
});

test("Safety Hold requires credible immediate danger on an active paid Escrow-held transaction", () => {
  const qualifying = must(
    fileSafetyReport(initialState(), {
      reportId: "report-1",
      actorId: "seller-1",
      reportedMemberId: "buyer-1",
      category: "immediate-physical-danger",
      description: "The buyer is waiting outside and making threats.",
      credibleImmediateDanger: true,
      reportedAtMs,
      transaction: activePaidEscrow,
    }),
  );
  expect(isSafetyHoldActive(qualifying)).toBe(true);

  for (const transaction of [
    { ...activePaidEscrow, status: "final" as const },
    { ...activePaidEscrow, paid: false },
    { ...activePaidEscrow, escrowStatus: "released" as const },
  ]) {
    const state = must(
      fileSafetyReport(initialState(), {
        reportId: `report-${transaction.status}-${transaction.escrowStatus}`,
        actorId: "seller-1",
        reportedMemberId: "buyer-1",
        category: "immediate-physical-danger",
        description: "The handover became unsafe.",
        credibleImmediateDanger: true,
        reportedAtMs,
        transaction,
      }),
    );
    expect(isSafetyHoldActive(state)).toBe(false);
  }

  const notCredible = must(
    fileSafetyReport(initialState(), {
      reportId: "report-not-credible",
      actorId: "buyer-1",
      reportedMemberId: "seller-1",
      category: "immediate-physical-danger",
      description: "I felt uncomfortable.",
      credibleImmediateDanger: false,
      reportedAtMs,
      transaction: activePaidEscrow,
    }),
  );
  expect(isSafetyHoldActive(notCredible)).toBe(false);
});

function pendingImmediateDangerReport() {
  return must(
    fileSafetyReport(initialState(), {
      reportId: "report-1",
      actorId: "buyer-1",
      reportedMemberId: "seller-1",
      category: "immediate-physical-danger",
      description: "The handover became unsafe.",
      evidenceLabel: "private simulated evidence",
      credibleImmediateDanger: true,
      reportedAtMs,
      transaction: activePaidEscrow,
    }),
  );
}

function confirmedReport() {
  return must(
    reviewSafetyReport(pendingImmediateDangerReport(), {
      reviewerId: "simulated-reviewer-1",
      outcome: "confirmed",
      redactedOutcome: "Threatening conduct was confirmed without identifying the reporter.",
      reviewedAtMs: reportedAtMs + 1_000,
    }),
  );
}

test("only a confirmed guided review changes private trust and creates a lasting restriction", () => {
  const pending = pendingImmediateDangerReport();
  expect(pending.trustEffect).toBe("none");
  expect(pending.restriction).toBeNull();

  const confirmed = confirmedReport();
  expect(confirmed.report?.status).toBe("confirmed");
  expect(confirmed.trustEffect).toBe("confirmed-safety-finding");
  expect(confirmed.restriction).toBe("account-restriction-simulated");
  expect(isSafetyHoldActive(confirmed)).toBe(false);

  const dismissed = must(
    reviewSafetyReport(pending, {
      reviewerId: "simulated-reviewer-1",
      outcome: "dismissed",
      redactedOutcome: "The guided prototype review did not confirm the allegation.",
      reviewedAtMs: reportedAtMs + 1_000,
    }),
  );
  expect(dismissed.report?.status).toBe("dismissed");
  expect(dismissed.trustEffect).toBe("none");
  expect(dismissed.restriction).toBeNull();
  expect(isSafetyHoldActive(dismissed)).toBe(false);
  expect(isPairContactBlocked(dismissed, "buyer-1", "seller-1")).toBe(false);
});

test("the reported-member projection never exposes reporter identity, description, or evidence", () => {
  const pendingView = projectSafetyForReportedMember(pendingImmediateDangerReport());
  expect(pendingView).toMatchObject({
    contactBlocked: true,
    reportStatus: "pending",
    category: null,
    redactedOutcome: null,
    restriction: null,
  });
  expect(pendingView).not.toHaveProperty("reporterId");
  expect(pendingView).not.toHaveProperty("description");
  expect(pendingView).not.toHaveProperty("evidenceLabel");

  const confirmedView = projectSafetyForReportedMember(confirmedReport());
  expect(confirmedView).toMatchObject({
    category: "immediate-physical-danger",
    reportStatus: "confirmed",
    redactedOutcome: "Threatening conduct was confirmed without identifying the reporter.",
    restriction: "account-restriction-simulated",
  });
  expect(JSON.stringify(confirmedView)).not.toContain("buyer-1");
  expect(JSON.stringify(confirmedView)).not.toContain("private simulated evidence");
});

test("one appeal is accepted through the exact seven-day boundary and rejected one millisecond later", () => {
  const confirmed = confirmedReport();
  const reviewedAtMs = confirmed.report!.review!.reviewedAtMs;
  const exact = must(
    submitSafetyAppeal(confirmed, {
      actorId: "seller-1",
      response: "Please reconsider the simulated finding.",
      submittedAtMs: reviewedAtMs + SAFETY_APPEAL_WINDOW_MS,
    }),
  );
  expect(exact.report?.appeal).toMatchObject({
    status: "pending",
    response: "Please reconsider the simulated finding.",
  });
  expect(exact.restriction).toBe("account-restriction-simulated");

  expect(
    submitSafetyAppeal(confirmed, {
      actorId: "seller-1",
      response: "One millisecond late.",
      submittedAtMs: reviewedAtMs + SAFETY_APPEAL_WINDOW_MS + 1,
    }),
  ).toMatchObject({ ok: false, reason: "appeal-deadline-passed" });
  expect(
    submitSafetyAppeal(confirmed, {
      actorId: "buyer-1",
      response: "The reporter cannot appeal the finding.",
      submittedAtMs: reviewedAtMs,
    }),
  ).toMatchObject({ ok: false, reason: "appeal-not-authorized" });
  expect(
    submitSafetyAppeal(exact, {
      actorId: "seller-1",
      response: "A second appeal.",
      submittedAtMs: reviewedAtMs,
    }),
  ).toMatchObject({ ok: false, reason: "appeal-already-submitted" });
});

test("a different simulated reviewer resolves the appeal while restrictions remain during review", () => {
  const confirmed = confirmedReport();
  const pendingAppeal = must(
    submitSafetyAppeal(confirmed, {
      actorId: "seller-1",
      response: "Please reconsider the simulated finding.",
      submittedAtMs: confirmed.report!.review!.reviewedAtMs,
    }),
  );
  expect(pendingAppeal.restriction).toBe("account-restriction-simulated");
  expect(
    resolveSafetyAppeal(pendingAppeal, {
      reviewerId: "simulated-reviewer-1",
      outcome: "overturned",
      writtenOutcome: "The finding was overturned.",
      resolvedAtMs: reportedAtMs + 2_000,
    }),
  ).toMatchObject({ ok: false, reason: "appeal-reviewer-must-differ" });

  const upheld = must(
    resolveSafetyAppeal(pendingAppeal, {
      reviewerId: "simulated-reviewer-2",
      outcome: "upheld",
      writtenOutcome: "The different simulated reviewer upheld the finding.",
      resolvedAtMs: reportedAtMs + 2_000,
    }),
  );
  expect(upheld.report?.appeal?.status).toBe("upheld");
  expect(upheld.restriction).toBe("account-restriction-simulated");

  const overturned = must(
    resolveSafetyAppeal(pendingAppeal, {
      reviewerId: "simulated-reviewer-2",
      outcome: "overturned",
      writtenOutcome: "The different simulated reviewer overturned the finding.",
      resolvedAtMs: reportedAtMs + 2_000,
    }),
  );
  expect(overturned.report?.status).toBe("overturned");
  expect(overturned.report?.appeal?.status).toBe("overturned");
  expect(overturned.trustEffect).toBe("none");
  expect(overturned.restriction).toBeNull();
  expect(isSafetyHoldActive(overturned)).toBe(false);
  expect(isPairContactBlocked(overturned, "buyer-1", "seller-1")).toBe(false);
});
