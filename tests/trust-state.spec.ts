import { expect, test } from "@playwright/test";
import {
  STRIKE_DURATION_MS,
  SUSPENSION_DURATION_MS,
  activateTrustBlocker,
  addReliabilityStrike,
  clearReliabilityStrike,
  clearOverturnedPermanentTierBlock,
  clearTrustBlocker,
  createInitialTrustState,
  getCheckoutAllowance,
  getPrivateTierProgress,
  getPublicTrustSummary,
  getTradingAvailability,
  permanentlyBlockHigherTiers,
  recordSuccessfulHandover,
  type TrustState,
} from "../src/trust";

const startingAtMs = Date.UTC(2026, 6, 18, 3, 0);

function addSuccess(
  state: TrustState,
  sellerId: string,
  nowMs = startingAtMs,
): TrustState {
  return recordSuccessfulHandover(state, { sellerId, nowMs });
}

function stateWithDistinctSuccesses(count: number): TrustState {
  let state = createInitialTrustState({ identityVerified: true });
  for (let index = 1; index <= count; index += 1) {
    state = addSuccess(state, `seller-${index}`, startingAtMs + index);
  }
  return state;
}

test("three and five different successful sellers earn Reliable and Trusted tiers with 1-3-5 capacity", () => {
  const verified = stateWithDistinctSuccesses(2);
  const reliable = addSuccess(verified, "seller-3");
  const trusted = addSuccess(
    addSuccess(reliable, "seller-4"),
    "seller-5",
  );

  expect(getPrivateTierProgress(verified, startingAtMs + 10)).toMatchObject({
    tier: "Verified",
    activePurchaseLimit: 1,
    checkoutHoldLimit: 1,
    qualifyingProgress: { completed: 2, required: 3 },
  });
  expect(getPrivateTierProgress(reliable, startingAtMs + 10)).toMatchObject({
    tier: "Reliable",
    activePurchaseLimit: 3,
    checkoutHoldLimit: 1,
    qualifyingProgress: { completed: 3, required: 5 },
  });
  expect(getPrivateTierProgress(trusted, startingAtMs + 10)).toMatchObject({
    tier: "Trusted",
    activePurchaseLimit: 5,
    checkoutHoldLimit: 1,
    qualifyingProgress: { completed: 5, required: 5 },
  });
});

test("repeat successes increase handover history without adding different-seller progress", () => {
  let state = createInitialTrustState({ identityVerified: true });
  state = addSuccess(state, "seller-a");
  state = addSuccess(state, "seller-a", startingAtMs + 1);
  state = addSuccess(state, "seller-b", startingAtMs + 2);

  expect(getPublicTrustSummary(state, startingAtMs + 3)).toEqual({
    identityVerified: true,
    successfulHandoverCount: 3,
    differentPartnerCount: 2,
    tier: "Verified",
  });
  expect(
    getPrivateTierProgress(state, startingAtMs + 3).qualifyingProgress,
  ).toEqual({ completed: 2, required: 3 });
});

test("the public Trust Summary exposes only its four permitted facts", () => {
  let state = stateWithDistinctSuccesses(3);
  state = activateTrustBlocker(state, {
    kind: "active-dispute",
    reason: "Private simulated mismatch details",
    appealPath: "Open the private dispute review",
  });

  const summary = getPublicTrustSummary(state, startingAtMs + 20);

  expect(Object.keys(summary).sort()).toEqual([
    "differentPartnerCount",
    "identityVerified",
    "successfulHandoverCount",
    "tier",
  ]);
  expect(summary.tier).toBe("Verified");
  expect(JSON.stringify(summary)).not.toContain("dispute");
  expect(JSON.stringify(summary)).not.toContain("mismatch");
  expect(JSON.stringify(summary)).not.toContain("appeal");
});

test("ordinary blockers reset tier progress immediately and allow re-earning from zero once cleared", () => {
  const trusted = stateWithDistinctSuccesses(5);
  const reset = activateTrustBlocker(trusted, {
    kind: "payment-reversal",
    reason: "Private simulated reversal",
    appealPath: "Review the payment case",
  });

  expect(getPublicTrustSummary(reset, startingAtMs + 20)).toEqual({
    identityVerified: true,
    successfulHandoverCount: 5,
    differentPartnerCount: 5,
    tier: "Verified",
  });
  expect(getPrivateTierProgress(reset, startingAtMs + 20)).toMatchObject({
    tier: "Verified",
    qualifyingProgress: { completed: 0, required: 3 },
    blockers: [
      {
        kind: "payment-reversal",
        reason: "Private simulated reversal",
      },
    ],
    appealPath: "Review the payment case",
  });

  const ignoredDuringBlock = addSuccess(reset, "seller-6", startingAtMs + 21);
  const cleared = clearTrustBlocker(ignoredDuringBlock, "payment-reversal");
  expect(
    getPrivateTierProgress(cleared, startingAtMs + 22).qualifyingProgress,
  ).toEqual({ completed: 0, required: 3 });

  const reEarned = addSuccess(
    addSuccess(
      addSuccess(cleared, "seller-1", startingAtMs + 23),
      "seller-2",
      startingAtMs + 24,
    ),
    "seller-3",
    startingAtMs + 25,
  );
  expect(getPrivateTierProgress(reEarned, startingAtMs + 26).tier).toBe(
    "Reliable",
  );
  expect(getPublicTrustSummary(reEarned, startingAtMs + 26)).toMatchObject({
    successfulHandoverCount: 9,
    differentPartnerCount: 6,
  });
});

test("checkout allowance is derived from current capacity, existing commitments, holds, and suspension", () => {
  const trusted = stateWithDistinctSuccesses(5);
  expect(
    getCheckoutAllowance(trusted, {
      nowMs: startingAtMs + 10,
      activeCommitmentCount: 4,
      hasActiveCheckoutHold: false,
    }),
  ).toEqual({ allowed: true, activePurchaseLimit: 5, checkoutHoldLimit: 1 });

  const reset = activateTrustBlocker(trusted, {
    kind: "confirmed-safety-finding",
    reason: "Private simulated finding",
    appealPath: "Submit a Safety Appeal",
  });
  expect(
    getCheckoutAllowance(reset, {
      nowMs: startingAtMs + 11,
      activeCommitmentCount: 4,
      hasActiveCheckoutHold: false,
    }),
  ).toEqual({
    allowed: false,
    activePurchaseLimit: 1,
    checkoutHoldLimit: 1,
    reason: "purchase-capacity-reached",
  });
  expect(
    getCheckoutAllowance(trusted, {
      nowMs: startingAtMs + 11,
      activeCommitmentCount: 0,
      hasActiveCheckoutHold: true,
    }).reason,
  ).toBe("checkout-hold-active");
});

test("a first active strike warns for exactly 30 days and a second overlapping strike suspends for exactly seven days", () => {
  const firstIssuedAtMs = startingAtMs;
  const secondIssuedAtMs = startingAtMs + 24 * 60 * 60 * 1000;
  const first = addReliabilityStrike(stateWithDistinctSuccesses(3), {
    id: "strike-1",
    reason: "Private simulated no-show",
    issuedAtMs: firstIssuedAtMs,
  });

  expect(getTradingAvailability(first, firstIssuedAtMs)).toEqual({
    canBuy: true,
    canSell: true,
    reliabilityWarning: true,
    suspendedUntilMs: null,
  });
  expect(getPrivateTierProgress(first, firstIssuedAtMs)).toMatchObject({
    tier: "Verified",
    strikeExpiresAtMs: firstIssuedAtMs + 30 * 24 * 60 * 60 * 1000,
  });

  const second = addReliabilityStrike(first, {
    id: "strike-2",
    reason: "Private simulated late cancellation",
    issuedAtMs: secondIssuedAtMs,
  });
  const oneMillisecondBeforeRestore =
    secondIssuedAtMs + 7 * 24 * 60 * 60 * 1000 - 1;
  expect(
    getCheckoutAllowance(second, {
      nowMs: oneMillisecondBeforeRestore,
      activeCommitmentCount: 0,
      hasActiveCheckoutHold: false,
    }).reason,
  ).toBe("account-suspended");
  expect(getTradingAvailability(second, oneMillisecondBeforeRestore)).toEqual({
    canBuy: false,
    canSell: false,
    reliabilityWarning: true,
    suspendedUntilMs: secondIssuedAtMs + SUSPENSION_DURATION_MS,
  });
  expect(
    getTradingAvailability(
      second,
      secondIssuedAtMs + 7 * 24 * 60 * 60 * 1000,
    ),
  ).toEqual({
    canBuy: true,
    canSell: true,
    reliabilityWarning: true,
    suspendedUntilMs: null,
  });

  expect(
    getPrivateTierProgress(
      first,
      firstIssuedAtMs + 30 * 24 * 60 * 60 * 1000 - 1,
    ).tier,
  ).toBe("Verified");
  expect(
    getPrivateTierProgress(first, firstIssuedAtMs + STRIKE_DURATION_MS),
  ).toMatchObject({
    tier: "Verified",
    strikeExpiresAtMs: null,
    blockers: [],
    qualifyingProgress: { completed: 0, required: 3 },
  });
});

test("a non-overlapping second strike warns without suspending", () => {
  const first = addReliabilityStrike(createInitialTrustState(), {
    id: "strike-old",
    reason: "Private simulated old reason",
    issuedAtMs: startingAtMs,
  });
  const secondIssuedAtMs = startingAtMs + STRIKE_DURATION_MS;
  const second = addReliabilityStrike(first, {
    id: "strike-new",
    reason: "Private simulated new reason",
    issuedAtMs: secondIssuedAtMs,
  });

  expect(getTradingAvailability(second, secondIssuedAtMs)).toEqual({
    canBuy: true,
    canSell: true,
    reliabilityWarning: true,
    suspendedUntilMs: null,
  });
});

test("a cleared ordinary strike leaves progress at zero and permits re-earning", () => {
  const earned = stateWithDistinctSuccesses(3);
  const struck = addReliabilityStrike(earned, {
    id: "strike-cleared",
    reason: "Private simulated ordinary issue",
    issuedAtMs: startingAtMs + 10,
  });
  const clearedAtMs = startingAtMs + 20;
  const cleared = clearReliabilityStrike(
    struck,
    "strike-cleared",
    clearedAtMs,
  );

  expect(getPrivateTierProgress(cleared, clearedAtMs)).toMatchObject({
    tier: "Verified",
    qualifyingProgress: { completed: 0, required: 3 },
    blockers: [],
    strikeExpiresAtMs: null,
  });
  expect(getTradingAvailability(cleared, clearedAtMs)).toEqual({
    canBuy: true,
    canSell: true,
    reliabilityWarning: false,
    suspendedUntilMs: null,
  });

  const reEarned = addSuccess(
    addSuccess(
      addSuccess(cleared, "seller-1", clearedAtMs + 1),
      "seller-2",
      clearedAtMs + 2,
    ),
    "seller-3",
    clearedAtMs + 3,
  );
  expect(getPrivateTierProgress(reEarned, clearedAtMs + 4).tier).toBe(
    "Reliable",
  );
  expect(reEarned.strikes[0].clearedAtMs).toBe(clearedAtMs);
});

test("confirmed serious misconduct can permanently block higher tiers with a private appeal path", () => {
  const restricted = permanentlyBlockHigherTiers(stateWithDistinctSuccesses(5), {
    kind: "serious-payment-abuse",
    reason: "Private confirmed simulated abuse finding",
    appealPath: "Appeal the confirmed payment finding",
  });
  const afterMoreSuccess = addSuccess(
    addSuccess(restricted, "seller-6", startingAtMs + 30),
    "seller-7",
    startingAtMs + 31,
  );

  expect(getPrivateTierProgress(afterMoreSuccess, startingAtMs + 32)).toMatchObject({
    tier: "Verified",
    activePurchaseLimit: 1,
    qualifyingProgress: { completed: 0, required: 3 },
    blockers: [{ kind: "serious-payment-abuse" }],
    appealPath: "Appeal the confirmed payment finding",
  });
  expect(JSON.stringify(getPublicTrustSummary(afterMoreSuccess, startingAtMs + 32))).not.toContain(
    "payment",
  );
});

test("an overturned appeal removes a permanent tier block and permits re-earning", () => {
  const restricted = permanentlyBlockHigherTiers(stateWithDistinctSuccesses(5), {
    kind: "serious-safety-misconduct",
    reason: "Private confirmed simulated safety finding",
    appealPath: "Submit a Safety Appeal",
  });
  const cleared = clearOverturnedPermanentTierBlock(restricted);

  expect(getPrivateTierProgress(cleared, startingAtMs + 40)).toMatchObject({
    tier: "Verified",
    qualifyingProgress: { completed: 0, required: 3 },
    blockers: [],
    appealPath: null,
  });
  expect(restricted.permanentTierBlock).not.toBeNull();
  expect(cleared.permanentTierBlock).toBeNull();

  const reEarned = addSuccess(
    addSuccess(
      addSuccess(cleared, "seller-1", startingAtMs + 41),
      "seller-2",
      startingAtMs + 42,
    ),
    "seller-3",
    startingAtMs + 43,
  );
  expect(getPrivateTierProgress(reEarned, startingAtMs + 44).tier).toBe(
    "Reliable",
  );
});

test("state updates leave prior state and nested collections unchanged", () => {
  const initial = createInitialTrustState({ identityVerified: true });
  const updated = addSuccess(initial, "seller-1");

  expect(initial).not.toBe(updated);
  expect(initial.successfulHandoverCount).toBe(0);
  expect(initial.successfulSellerIds).toEqual([]);
  expect(updated.successfulSellerIds).toEqual(["seller-1"]);
  expect(Object.isFrozen(updated)).toBe(true);
  expect(Object.isFrozen(updated.successfulSellerIds)).toBe(true);
});
