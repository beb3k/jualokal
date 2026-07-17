export const CHECKOUT_HOLD_MS = 5 * 60 * 1000;

export type PurchaseSnapshot = Readonly<{
  sellerPublicName: string;
  title: string;
  category: string;
  description: string;
  conditionDisclosure: string;
  conditionGrade: string;
  specifications: string;
  includedParts: string;
  photos: readonly string[];
  transactionPrice: number;
}>;

export type CheckoutHold = Readonly<{
  buyerId: string;
  listingId: string;
  listingTitle: string;
  transactionPrice: number;
  startedAtMs: number;
  expiresAtMs: number;
  snapshot: PurchaseSnapshot;
}>;

export type PurchaseCommitment = Readonly<{
  id: string;
  buyerId: string;
  listingId: string;
  createdAtMs: number;
  snapshot: PurchaseSnapshot;
  escrowStatus: "Held - simulated";
}>;

export type CheckoutState = Readonly<{
  holds: readonly CheckoutHold[];
  commitments: readonly PurchaseCommitment[];
}>;

export function createInitialCheckoutState(): CheckoutState {
  return { holds: [], commitments: [] };
}

export function startCheckoutHold(
  state: CheckoutState,
  input: Omit<CheckoutHold, "startedAtMs" | "expiresAtMs"> & { nowMs: number },
): CheckoutState {
  if (
    state.holds.some(
      (hold) => hold.buyerId === input.buyerId || hold.listingId === input.listingId,
    ) ||
    state.commitments.some((commitment) => commitment.listingId === input.listingId)
  ) {
    return state;
  }

  return {
    ...state,
    holds: [
      ...state.holds,
      {
        buyerId: input.buyerId,
        listingId: input.listingId,
        listingTitle: input.listingTitle,
        transactionPrice: input.transactionPrice,
        startedAtMs: input.nowMs,
        expiresAtMs: input.nowMs + CHECKOUT_HOLD_MS,
        snapshot: Object.freeze({
          ...input.snapshot,
          photos: Object.freeze([...input.snapshot.photos]),
        }),
      },
    ],
  };
}

export function expireCheckoutHolds(
  state: CheckoutState,
  nowMs: number,
): CheckoutState {
  const activeHolds = state.holds.filter((hold) => hold.expiresAtMs > nowMs);
  return activeHolds.length === state.holds.length
    ? state
    : { ...state, holds: activeHolds };
}

export function endCheckoutHold(
  state: CheckoutState,
  buyerId: string,
  listingId: string,
): CheckoutState {
  const remainingHolds = state.holds.filter(
    (hold) => hold.buyerId !== buyerId || hold.listingId !== listingId,
  );
  return remainingHolds.length === state.holds.length
    ? state
    : { ...state, holds: remainingHolds };
}

export function completeSimulatedPayment(
  state: CheckoutState,
  input: {
    buyerId: string;
    listingId: string;
    nowMs: number;
    activePurchaseLimit: number;
  },
): CheckoutState {
  const activeState = expireCheckoutHolds(state, input.nowMs);
  const hold = activeState.holds.find(
    (candidate) =>
      candidate.buyerId === input.buyerId && candidate.listingId === input.listingId,
  );
  const activeCommitments = activeState.commitments.filter(
    (commitment) => commitment.buyerId === input.buyerId,
  ).length;
  const listingAlreadyCommitted = activeState.commitments.some(
    (commitment) => commitment.listingId === input.listingId,
  );

  if (listingAlreadyCommitted) {
    return {
      ...activeState,
      holds: activeState.holds.filter((candidate) => candidate.listingId !== input.listingId),
    };
  }

  if (!hold || activeCommitments >= input.activePurchaseLimit) return activeState;

  return {
    holds: activeState.holds.filter((candidate) => candidate !== hold),
    commitments: [
      ...activeState.commitments,
      Object.freeze({
        id: `commitment-${input.listingId}-${input.nowMs}`,
        buyerId: input.buyerId,
        listingId: input.listingId,
        createdAtMs: input.nowMs,
        snapshot: hold.snapshot,
        escrowStatus: "Held - simulated" as const,
      }),
    ],
  };
}
