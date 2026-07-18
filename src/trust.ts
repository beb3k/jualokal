export const STRIKE_DURATION_MS = 30 * 24 * 60 * 60 * 1000;
export const SUSPENSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

export type BuyerTier = "Verified" | "Reliable" | "Trusted";

export type TrustBlockerKind =
  | "active-dispute"
  | "payment-reversal"
  | "confirmed-safety-finding";

export type PermanentTierBlockKind =
  | "serious-fraud"
  | "serious-payment-abuse"
  | "serious-safety-misconduct";

export type TrustBlocker = Readonly<{
  kind: TrustBlockerKind;
  reason: string;
  appealPath: string | null;
}>;

export type ReliabilityStrike = Readonly<{
  id: string;
  reason: string;
  issuedAtMs: number;
  expiresAtMs: number;
  clearedAtMs: number | null;
}>;

export type PermanentTierBlock = Readonly<{
  kind: PermanentTierBlockKind;
  reason: string;
  appealPath: string;
}>;

export type TrustState = Readonly<{
  identityVerified: boolean;
  successfulHandoverCount: number;
  successfulSellerIds: readonly string[];
  qualifyingSellerIds: readonly string[];
  blockers: readonly TrustBlocker[];
  strikes: readonly ReliabilityStrike[];
  suspendedUntilMs: number | null;
  permanentTierBlock: PermanentTierBlock | null;
}>;

export type PublicTrustSummary = Readonly<{
  identityVerified: boolean;
  successfulHandoverCount: number;
  differentPartnerCount: number;
  tier: BuyerTier;
}>;

export type PrivateTierBlocker = Readonly<{
  kind: TrustBlockerKind | PermanentTierBlockKind | "active-strike";
  reason: string;
  expiresAtMs?: number;
}>;

export type PrivateTierProgress = Readonly<{
  tier: BuyerTier;
  activePurchaseLimit: 1 | 3 | 5;
  checkoutHoldLimit: 1;
  qualifyingProgress: Readonly<{
    completed: number;
    required: 3 | 5;
  }>;
  blockers: readonly PrivateTierBlocker[];
  strikeExpiresAtMs: number | null;
  appealPath: string | null;
}>;

export type TradingAvailability = Readonly<{
  canBuy: boolean;
  canSell: boolean;
  reliabilityWarning: boolean;
  suspendedUntilMs: number | null;
}>;

export type CheckoutAllowance = Readonly<{
  allowed: boolean;
  activePurchaseLimit: 1 | 3 | 5;
  checkoutHoldLimit: 1;
  reason?:
    | "account-suspended"
    | "purchase-capacity-reached"
    | "checkout-hold-active";
}>;

function freezeState(state: TrustState): TrustState {
  return Object.freeze({
    ...state,
    successfulSellerIds: Object.freeze([...state.successfulSellerIds]),
    qualifyingSellerIds: Object.freeze([...state.qualifyingSellerIds]),
    blockers: Object.freeze([...state.blockers]),
    strikes: Object.freeze([...state.strikes]),
  });
}

export function createInitialTrustState(
  input: Readonly<{
    identityVerified?: boolean;
    successfulSellerIds?: readonly string[];
  }> = {},
): TrustState {
  const successfulSellerIds = input.successfulSellerIds ?? [];
  const differentSellerIds = [...new Set(successfulSellerIds)];
  return freezeState({
    identityVerified: input.identityVerified ?? true,
    successfulHandoverCount: successfulSellerIds.length,
    successfulSellerIds: differentSellerIds,
    qualifyingSellerIds: differentSellerIds,
    blockers: [],
    strikes: [],
    suspendedUntilMs: null,
    permanentTierBlock: null,
  });
}

function activeStrikes(
  state: TrustState,
  nowMs: number,
): readonly ReliabilityStrike[] {
  return state.strikes.filter((strike) => strike.expiresAtMs > nowMs);
}

function hasTierBlocker(state: TrustState, nowMs: number): boolean {
  return (
    state.blockers.length > 0 ||
    state.permanentTierBlock !== null ||
    activeStrikes(state, nowMs).length > 0
  );
}

function tierAt(state: TrustState, nowMs: number): BuyerTier {
  if (hasTierBlocker(state, nowMs)) return "Verified";
  if (state.qualifyingSellerIds.length >= 5) return "Trusted";
  if (state.qualifyingSellerIds.length >= 3) return "Reliable";
  return "Verified";
}

function activePurchaseLimit(tier: BuyerTier): 1 | 3 | 5 {
  if (tier === "Trusted") return 5;
  if (tier === "Reliable") return 3;
  return 1;
}

export function recordSuccessfulHandover(
  state: TrustState,
  input: Readonly<{ sellerId: string; nowMs: number }>,
): TrustState {
  const isDifferentPartner = !state.successfulSellerIds.includes(input.sellerId);
  const qualifies =
    !hasTierBlocker(state, input.nowMs) &&
    !state.qualifyingSellerIds.includes(input.sellerId);

  return freezeState({
    ...state,
    successfulHandoverCount: state.successfulHandoverCount + 1,
    successfulSellerIds: isDifferentPartner
      ? [...state.successfulSellerIds, input.sellerId]
      : state.successfulSellerIds,
    qualifyingSellerIds: qualifies
      ? [...state.qualifyingSellerIds, input.sellerId]
      : state.qualifyingSellerIds,
  });
}

export function activateTrustBlocker(
  state: TrustState,
  input: Readonly<{
    kind: TrustBlockerKind;
    reason: string;
    appealPath?: string;
  }>,
): TrustState {
  const blocker = Object.freeze({
    kind: input.kind,
    reason: input.reason,
    appealPath: input.appealPath ?? null,
  });
  return freezeState({
    ...state,
    qualifyingSellerIds: [],
    blockers: [
      ...state.blockers.filter((candidate) => candidate.kind !== input.kind),
      blocker,
    ],
  });
}

export function clearTrustBlocker(
  state: TrustState,
  kind: TrustBlockerKind,
): TrustState {
  const blockers = state.blockers.filter((blocker) => blocker.kind !== kind);
  return blockers.length === state.blockers.length
    ? state
    : freezeState({ ...state, blockers });
}

export function addReliabilityStrike(
  state: TrustState,
  input: Readonly<{ id: string; reason: string; issuedAtMs: number }>,
): TrustState {
  if (state.strikes.some((strike) => strike.id === input.id)) return state;

  const overlapsAnotherStrike = activeStrikes(state, input.issuedAtMs).length > 0;
  const newSuspensionEnd = overlapsAnotherStrike
    ? input.issuedAtMs + SUSPENSION_DURATION_MS
    : null;
  const suspendedUntilMs = newSuspensionEnd
    ? Math.max(state.suspendedUntilMs ?? 0, newSuspensionEnd)
    : state.suspendedUntilMs;

  return freezeState({
    ...state,
    qualifyingSellerIds: [],
    strikes: [
      ...state.strikes,
      Object.freeze({
        ...input,
        expiresAtMs: input.issuedAtMs + STRIKE_DURATION_MS,
        clearedAtMs: null,
      }),
    ],
    suspendedUntilMs,
  });
}


export function clearReliabilityStrike(
  state: TrustState,
  strikeId: string,
  clearedAtMs: number,
): TrustState {
  const strike = state.strikes.find(
    (candidate) => candidate.id === strikeId && candidate.clearedAtMs === null,
  );
  if (!strike) return state;
  return freezeState({
    ...state,
    strikes: state.strikes.map((candidate) =>
      candidate === strike
        ? Object.freeze({
            ...candidate,
            clearedAtMs,
            expiresAtMs: Math.min(candidate.expiresAtMs, clearedAtMs),
          })
        : candidate,
    ),
  });
}

export function permanentlyBlockHigherTiers(
  state: TrustState,
  input: Readonly<{
    kind: PermanentTierBlockKind;
    reason: string;
    appealPath: string;
  }>,
): TrustState {
  return freezeState({
    ...state,
    qualifyingSellerIds: [],
    permanentTierBlock: Object.freeze({ ...input }),
  });
}


export function clearOverturnedPermanentTierBlock(
  state: TrustState,
): TrustState {
  if (!state.permanentTierBlock) return state;
  return freezeState({ ...state, permanentTierBlock: null });
}

export function getPublicTrustSummary(
  state: TrustState,
  nowMs: number,
): PublicTrustSummary {
  return Object.freeze({
    identityVerified: state.identityVerified,
    successfulHandoverCount: state.successfulHandoverCount,
    differentPartnerCount: state.successfulSellerIds.length,
    tier: tierAt(state, nowMs),
  });
}

export function getPrivateTierProgress(
  state: TrustState,
  nowMs: number,
): PrivateTierProgress {
  const strikes = activeStrikes(state, nowMs);
  const tier = tierAt(state, nowMs);
  const completed = Math.min(state.qualifyingSellerIds.length, 5);
  const required: 3 | 5 = tier === "Verified" ? 3 : 5;
  const blockers: PrivateTierBlocker[] = [
    ...state.blockers.map((blocker) =>
      Object.freeze({ kind: blocker.kind, reason: blocker.reason }),
    ),
    ...strikes.map((strike) =>
      Object.freeze({
        kind: "active-strike" as const,
        reason: strike.reason,
        expiresAtMs: strike.expiresAtMs,
      }),
    ),
    ...(state.permanentTierBlock
      ? [
          Object.freeze({
            kind: state.permanentTierBlock.kind,
            reason: state.permanentTierBlock.reason,
          }),
        ]
      : []),
  ];
  const strikeExpiresAtMs = strikes.reduce<number | null>(
    (latest, strike) => Math.max(latest ?? 0, strike.expiresAtMs),
    null,
  );
  const appealPath =
    state.permanentTierBlock?.appealPath ??
    state.blockers.find((blocker) => blocker.appealPath)?.appealPath ??
    null;

  return Object.freeze({
    tier,
    activePurchaseLimit: activePurchaseLimit(tier),
    checkoutHoldLimit: 1 as const,
    qualifyingProgress: Object.freeze({ completed, required }),
    blockers: Object.freeze(blockers),
    strikeExpiresAtMs,
    appealPath,
  });
}

export function getTradingAvailability(
  state: TrustState,
  nowMs: number,
): TradingAvailability {
  const suspended =
    state.suspendedUntilMs !== null && state.suspendedUntilMs > nowMs;
  return Object.freeze({
    canBuy: !suspended,
    canSell: !suspended,
    reliabilityWarning: activeStrikes(state, nowMs).length > 0,
    suspendedUntilMs: suspended ? state.suspendedUntilMs : null,
  });
}

export function getCheckoutAllowance(
  state: TrustState,
  input: Readonly<{
    nowMs: number;
    activeCommitmentCount: number;
    hasActiveCheckoutHold: boolean;
  }>,
): CheckoutAllowance {
  const tier = tierAt(state, input.nowMs);
  const limit = activePurchaseLimit(tier);
  const base = {
    activePurchaseLimit: limit,
    checkoutHoldLimit: 1 as const,
  };

  if (!getTradingAvailability(state, input.nowMs).canBuy) {
    return Object.freeze({
      allowed: false,
      ...base,
      reason: "account-suspended" as const,
    });
  }
  if (input.activeCommitmentCount >= limit) {
    return Object.freeze({
      allowed: false,
      ...base,
      reason: "purchase-capacity-reached" as const,
    });
  }
  if (input.hasActiveCheckoutHold) {
    return Object.freeze({
      allowed: false,
      ...base,
      reason: "checkout-hold-active" as const,
    });
  }
  return Object.freeze({ allowed: true, ...base });
}
