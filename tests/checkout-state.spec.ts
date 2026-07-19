import { expect, test } from "@playwright/test";
import {
  CHECKOUT_HOLD_MS,
  completeSimulatedPayment,
  createInitialCheckoutState,
  finalizePurchaseCommitment,
  getListingClaimability,
  refundPurchaseCommitment,
  startCheckoutHold,
  type CheckoutState,
} from "../src/checkout";
import {
  createSellerDiscoveryMarker,
  createSellerMapMarkers,
  discoverListings,
  projectSellerDiscoveryMarker,
  type DiscoveryListing,
} from "../src/discovery";

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
  sellerId = "seller-1",
) {
  return startCheckoutHold(state, {
    buyerId,
    sellerId,
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
        sellerId: "seller-1",
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

  const secondHold = startHold(
    completedPurchase,
    "buyer-1",
    4_000,
    "listing-2",
    "seller-2",
  );

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

  const refundedState = refundPurchaseCommitment(
    heldState,
    commitment.id,
    3_000,
    "Material mismatch refund",
  );

  expect(refundedState.commitments[0]).toMatchObject({
    lifecycleStatus: "Completed",
    escrowStatus: "Refunded - simulated",
    payoutStatus: "Not paid - simulated",
    trustOutcome: "Material mismatch refund",
    completedAtMs: 3_000,
  });
  expect(refundedState.commitments[0].snapshot).toBe(commitment.snapshot);

  const repeatedRefund = refundPurchaseCommitment(
    refundedState,
    commitment.id,
    4_000,
    "Material mismatch refund",
  );
  expect(repeatedRefund).toBe(refundedState);
  expect(repeatedRefund.commitments[0].completedAtMs).toBe(3_000);
});

test("a failed handover refund completes the commitment once without a payout", () => {
  const committedState = completeSimulatedPayment(
    startHold(createInitialCheckoutState(), "buyer-1", 1_000),
    {
      buyerId: "buyer-1",
      sellerId: "seller-1",
      listingId: "listing-1",
      nowMs: 2_000,
      activePurchaseLimit: 1,
    },
  );
  const commitment = committedState.commitments[0];

  const refundedState = refundPurchaseCommitment(
    committedState,
    commitment.id,
    3_000,
    "No successful handover",
  );

  expect(refundedState.commitments[0]).toMatchObject({
    lifecycleStatus: "Completed",
    escrowStatus: "Refunded - simulated",
    payoutStatus: "Not paid - simulated",
    trustOutcome: "No successful handover",
    completedAtMs: 3_000,
  });
  expect(refundedState.commitments[0].snapshot).toBe(commitment.snapshot);

  const repeatedRefund = refundPurchaseCommitment(
    refundedState,
    commitment.id,
    4_000,
    "No successful handover",
  );
  expect(repeatedRefund).toBe(refundedState);
  expect(repeatedRefund.commitments[0].completedAtMs).toBe(3_000);
});

test("ownership authorization rejects self-holds and forged self-payment", () => {
  const initialState = createInitialCheckoutState();
  const selfHoldAttempt = startHold(
    initialState,
    "seller-1",
    1_000,
    "listing-1",
    "seller-1",
  );
  expect(selfHoldAttempt).toBe(initialState);

  const forgedSelfHold: CheckoutState = {
    holds: [{
      buyerId: "seller-1",
      sellerId: "seller-1",
      listingId: "listing-1",
      listingTitle: snapshot.title,
      transactionPrice: snapshot.transactionPrice,
      startedAtMs: 1_000,
      expiresAtMs: 1_000 + CHECKOUT_HOLD_MS,
      snapshot,
    }],
    commitments: [],
  };
  const selfPaymentAttempt = completeSimulatedPayment(forgedSelfHold, {
    buyerId: "seller-1",
    sellerId: "seller-1",
    listingId: "listing-1",
    nowMs: 2_000,
    activePurchaseLimit: 1,
  });

  expect(selfPaymentAttempt).toBe(forgedSelfHold);
  expect(selfPaymentAttempt.commitments).toHaveLength(0);
});

test("claimability is viewer-specific while hold and purchase update discovery atomically", () => {
  const listings: DiscoveryListing[] = [
    {
      id: "listing-1",
      sellerId: "seller-1",
      category: "Books",
      distanceKm: 0.5,
      originalPublicationTimeMs: 2_000,
      status: "active",
      sellerAvailable: true,
    },
    {
      id: "listing-2",
      sellerId: "seller-2",
      category: "Books",
      distanceKm: 0.6,
      originalPublicationTimeMs: 1_000,
      status: "active",
      sellerAvailable: true,
    },
  ];
  const heldState = startHold(createInitialCheckoutState(), "buyer-1", 3_000);

  expect(getListingClaimability(heldState, {
    listingId: "listing-1",
    viewerId: "buyer-1",
    nowMs: 4_000,
  })).toEqual({ kind: "held-by-viewer", expiresAtMs: 3_000 + CHECKOUT_HOLD_MS });
  expect(getListingClaimability(heldState, {
    listingId: "listing-1",
    viewerId: "buyer-2",
    nowMs: 4_000,
  })).toEqual({ kind: "held-by-other" });

  const projectDiscovery = (state: CheckoutState) => {
    const results = discoverListings({
      viewer: { id: "buyer-2", verified: true, locationAvailable: true },
      listings: listings.map((listing) => ({
        ...listing,
        sellerAvailable: getListingClaimability(state, {
          listingId: listing.id,
          viewerId: "buyer-2",
          nowMs: 4_000,
        }).kind !== "purchased",
      })),
    });
    const projectedMarkers = ["seller-1", "seller-2"].flatMap((sellerId) => {
      const marker = createSellerDiscoveryMarker({
        sellerId,
        homeAnchorVersion: "fictional-anchor-v1",
        sellerListingIds: listings
          .filter((listing) => listing.sellerId === sellerId)
          .map((listing) => listing.id),
        discoveryResults: results,
      });
      if (!marker) return [];
      return [{ marker, projection: projectSellerDiscoveryMarker(marker, 0.5) }];
    });
    return {
      results,
      markers: createSellerMapMarkers({
        markers: projectedMarkers,
        groups: [{
          id: "group-1",
          separation: "separable",
          sellerIds: ["seller-1", "seller-2"],
        }],
        expandedGroupId: null,
      }),
    };
  };

  const heldDiscovery = projectDiscovery(heldState);
  expect(heldDiscovery.results.map((result) => result.listingId)).toEqual([
    "listing-1",
    "listing-2",
  ]);
  expect(heldDiscovery.markers).toMatchObject([{
    kind: "group",
    sellerCount: 2,
  }]);
  expect(listings[0].originalPublicationTimeMs).toBe(2_000);

  const purchasedState = completeSimulatedPayment(heldState, {
    buyerId: "buyer-1",
    sellerId: "seller-1",
    listingId: "listing-1",
    nowMs: 4_000,
    activePurchaseLimit: 1,
  });
  const purchasedDiscovery = projectDiscovery(purchasedState);

  expect(getListingClaimability(purchasedState, {
    listingId: "listing-1",
    viewerId: "buyer-2",
    nowMs: 4_000,
  })).toEqual({ kind: "purchased" });
  expect(purchasedDiscovery.results.map((result) => result.listingId)).toEqual([
    "listing-2",
  ]);
  expect(purchasedDiscovery.markers).toMatchObject([{
    kind: "individual",
    marker: { sellerId: "seller-2", listingCount: 1 },
  }]);
  expect(listings[0].originalPublicationTimeMs).toBe(2_000);
});
