import { expect, test } from "@playwright/test";
import {
  CHECKOUT_HOLD_MS,
  completeSimulatedPayment,
  createInitialCheckoutState,
  finalizePurchaseCommitment,
  refundPurchaseCommitment,
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

function startHold(
  state: CheckoutState,
  buyerId: string,
  nowMs: number,
  listingId = "listing-1",
) {
  return startCheckoutHold(state, {
    buyerId,
    listingId,
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
    sellerId: "seller-1",
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
    sellerId: "seller-1",
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
    sellerId: "seller-1",
    listingId: "listing-1",
    nowMs: 4_000,
    activePurchaseLimit: 1,
  });

  expect(duplicatePaymentAttempt.holds).toHaveLength(0);
  expect(duplicatePaymentAttempt.commitments).toHaveLength(1);
});

test("matching handover confirmations finalize a purchase exactly once", () => {
  const stateWithHold = startHold(createInitialCheckoutState(), "buyer-1", 1_000);
  const committedState = completeSimulatedPayment(stateWithHold, {
    buyerId: "buyer-1",
    sellerId: "seller-1",
    listingId: "listing-1",
    nowMs: 2_000,
    activePurchaseLimit: 1,
  });
  const commitment = committedState.commitments[0];

  expect(commitment).toMatchObject({
    sellerId: "seller-1",
    lifecycleStatus: "Active",
    escrowStatus: "Held - simulated",
    payoutStatus: "Pending - simulated",
    trustOutcome: "Pending",
    completedAtMs: null,
  });

  const finalizedState = finalizePurchaseCommitment(
    committedState,
    commitment.id,
    3_000,
  );

  expect(finalizedState.commitments).toHaveLength(1);
  expect(finalizedState.commitments[0]).toMatchObject({
    lifecycleStatus: "Completed",
    escrowStatus: "Released - simulated",
    payoutStatus: "Paid - simulated",
    trustOutcome: "Successful handover",
    completedAtMs: 3_000,
  });
  expect(finalizedState.commitments[0].snapshot).toBe(commitment.snapshot);

  const repeatedFinalization = finalizePurchaseCommitment(
    finalizedState,
    commitment.id,
    4_000,
  );

  expect(repeatedFinalization).toBe(finalizedState);
  expect(repeatedFinalization.commitments[0].completedAtMs).toBe(3_000);
});

test("a completed purchase no longer consumes the buyer's active capacity", () => {
  const firstHold = startHold(createInitialCheckoutState(), "buyer-1", 1_000);
  const firstPurchase = completeSimulatedPayment(firstHold, {
    buyerId: "buyer-1",
    sellerId: "seller-1",
    listingId: "listing-1",
    nowMs: 2_000,
    activePurchaseLimit: 1,
  });
  const completedPurchase = finalizePurchaseCommitment(
    firstPurchase,
    firstPurchase.commitments[0].id,
    3_000,
  );
  const soldListingHoldAttempt = startHold(
    completedPurchase,
    "buyer-2",
    3_500,
    "listing-1",
  );
  expect(soldListingHoldAttempt).toBe(completedPurchase);

  const secondHold = startHold(completedPurchase, "buyer-1", 4_000, "listing-2");

  const secondPurchase = completeSimulatedPayment(secondHold, {
    buyerId: "buyer-1",
    sellerId: "seller-2",
    listingId: "listing-2",
    nowMs: 5_000,
    activePurchaseLimit: 1,
  });

  expect(secondPurchase.commitments).toHaveLength(2);
  expect(
    secondPurchase.commitments.filter(
      (commitment) => commitment.lifecycleStatus === "Active",
    ),
  ).toHaveLength(1);
  expect(secondPurchase.commitments[0].snapshot).toBe(
    completedPurchase.commitments[0].snapshot,
  );
});

test("a Material Mismatch refund completes the commitment once without a payout", () => {
  const heldState = completeSimulatedPayment(
    startHold(createInitialCheckoutState(), "buyer-1", 1_000),
    {
      buyerId: "buyer-1",
      sellerId: "seller-1",
      listingId: "listing-1",
      nowMs: 2_000,
      activePurchaseLimit: 1,
    },
  );
  const commitment = heldState.commitments[0];

  const refundedState = refundPurchaseCommitment(heldState, commitment.id, 3_000);

  expect(refundedState.commitments[0]).toMatchObject({
    lifecycleStatus: "Completed",
    escrowStatus: "Refunded - simulated",
    payoutStatus: "Not paid - simulated",
    trustOutcome: "Material mismatch refund",
    completedAtMs: 3_000,
  });
  expect(refundedState.commitments[0].snapshot).toBe(commitment.snapshot);

  const repeatedRefund = refundPurchaseCommitment(refundedState, commitment.id, 4_000);
  expect(repeatedRefund).toBe(refundedState);
  expect(repeatedRefund.commitments[0].completedAtMs).toBe(3_000);
});
