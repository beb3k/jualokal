import { expect, test } from "@playwright/test";
import {
  CHECKOUT_HOLD_MS,
  completeSimulatedPayment,
  createInitialCheckoutState,
  startCheckoutHold,
  type CheckoutState,
} from "../src/checkout";

const snapshot = {
  sellerPublicName: "Demo Seller",
  title: "Demo item",
  category: "Home",
  description: "A simulated item.",
  conditionDisclosure: "No known defects.",
  conditionGrade: "Good",
  specifications: "20 x 10 cm",
  includedParts: "Item only",
  photos: ["Complete-item view"],
  transactionPrice: 100_000,
};

function startHold(state: CheckoutState, buyerId: string, nowMs: number) {
  return startCheckoutHold(state, {
    buyerId,
    listingId: "listing-1",
    listingTitle: snapshot.title,
    transactionPrice: snapshot.transactionPrice,
    snapshot,
    nowMs,
  });
}

test("payment at the exact expiry creates no commitment", () => {
  const stateWithHold = startHold(createInitialCheckoutState(), "buyer-1", 1_000);

  const result = completeSimulatedPayment(stateWithHold, {
    buyerId: "buyer-1",
    listingId: "listing-1",
    nowMs: 1_000 + CHECKOUT_HOLD_MS,
    activePurchaseLimit: 1,
  });

  expect(result.holds).toHaveLength(0);
  expect(result.commitments).toHaveLength(0);
});

test("a committed listing cannot receive another hold or commitment", () => {
  const stateWithHold = startHold(createInitialCheckoutState(), "buyer-1", 1_000);
  const committedState = completeSimulatedPayment(stateWithHold, {
    buyerId: "buyer-1",
    listingId: "listing-1",
    nowMs: 2_000,
    activePurchaseLimit: 1,
  });

  const secondHoldAttempt = startHold(committedState, "buyer-2", 3_000);
  expect(secondHoldAttempt).toBe(committedState);

  const forgedState: CheckoutState = {
    holds: [
      {
        buyerId: "buyer-2",
        listingId: "listing-1",
        listingTitle: snapshot.title,
        transactionPrice: snapshot.transactionPrice,
        startedAtMs: 3_000,
        expiresAtMs: 3_000 + CHECKOUT_HOLD_MS,
        snapshot,
      },
    ],
    commitments: committedState.commitments,
  };
  const duplicatePaymentAttempt = completeSimulatedPayment(forgedState, {
    buyerId: "buyer-2",
    listingId: "listing-1",
    nowMs: 4_000,
    activePurchaseLimit: 1,
  });

  expect(duplicatePaymentAttempt.holds).toHaveLength(0);
  expect(duplicatePaymentAttempt.commitments).toHaveLength(1);
});
