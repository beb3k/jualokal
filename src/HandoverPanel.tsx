import { useState } from "react";
import type { PurchaseCommitment } from "./checkout";
import {
  HANDOVER_START_DEADLINE_MS,
  SCHEDULE_AGREEMENT_DEADLINE_MS,
  SELLER_PROPOSAL_DEADLINE_MS,
  type HandoverPoint,
  type HandoverState,
  type SellerUnavailabilityReason,
} from "./handover";

const handoverPoints: readonly HandoverPoint[] = [
  {
    id: "community-pavilion",
    label: "Community pavilion entrance - public and well lit",
    kind: "public",
    sellerZoneEligible: true,
    publicAndWellLit: true,
    sellerFrontGateConsent: false,
  },
  {
    id: "front-gate",
    label: "Temporary seller-controlled front-gate point",
    kind: "front-gate",
    sellerZoneEligible: true,
    publicAndWellLit: false,
    sellerFrontGateConsent: true,
  },
  {
    id: "outside-zone",
    label: "Outside the private Seller Convenience Zone - ineligible",
    kind: "public",
    sellerZoneEligible: false,
    publicAndWellLit: true,
    sellerFrontGateConsent: false,
  },
];

export type PresenceSimulation = Readonly<{
  value: "inside" | "boundary" | "outside" | "poor" | "unavailable";
  label: string;
  locationAvailable: boolean;
  accuracyState: "usable" | "poor";
  accuracyM: number | null;
  distanceFromPointM: number | null;
}>;

const presenceSimulations: readonly PresenceSimulation[] = [
  {
    value: "inside",
    label: "Inside the 100 m area - reported accuracy 10 m",
    locationAvailable: true,
    accuracyState: "usable",
    accuracyM: 10,
    distanceFromPointM: 35,
  },
  {
    value: "boundary",
    label: "Exactly 100 m from the point - reported accuracy 12 m",
    locationAvailable: true,
    accuracyState: "usable",
    accuracyM: 12,
    distanceFromPointM: 100,
  },
  {
    value: "outside",
    label: "Just outside at 100.01 m - ineligible",
    locationAvailable: true,
    accuracyState: "usable",
    accuracyM: 9,
    distanceFromPointM: 100.01,
  },
  {
    value: "poor",
    label: "Poor reported accuracy - ineligible",
    locationAvailable: true,
    accuracyState: "poor",
    accuracyM: 250,
    distanceFromPointM: 20,
  },
  {
    value: "unavailable",
    label: "Location unavailable - ineligible",
    locationAvailable: false,
    accuracyState: "poor",
    accuracyM: null,
    distanceFromPointM: null,
  },
];

function formatWibWindow(startsAtMs: number, endsAtMs: number) {
  const date = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "Asia/Jakarta",
  }).format(new Date(startsAtMs));
  const time = (timestampMs: number) =>
    new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Asia/Jakarta",
    }).format(new Date(timestampMs));

  return `${date}, ${time(startsAtMs)}-${time(endsAtMs)} WIB`;
}

function formatWibTime(timestampMs: number) {
  return `${new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Jakarta",
  }).format(new Date(timestampMs))} WIB`;
}

type HandoverPanelProps = {
  actorRole: "buyer" | "seller";
  commitment: PurchaseCommitment;
  handover: HandoverState;
  nowMs: number;
  notice: string;
  onPropose: (point: HandoverPoint) => void;
  onAccept: (windowId: string) => void;
  onRequestAdjustment: () => void;
  onApproveAdjustment: () => void;
  onAdvance: (timestampMs: number) => void;
  onRecordPresence: (
    party: "buyer" | "seller",
    simulation: PresenceSimulation,
  ) => void;
  onBuyerConfirm: () => void;
  onCloseIncomplete: () => void;
  onOpenDispute: () => void;
  onProposeRepeat: () => void;
  onSellerConfirm: () => void;
  onSetBoundaryTime: (boundary: string) => void;
  onExpireScheduling: (overdueParty: "buyer" | "seller" | null) => void;
  onCancel: () => void;
  onReportNoShow: (absentParty: "buyer" | "seller") => void;
  onReportSellerUnavailability: (reason: SellerUnavailabilityReason) => void;
};

function formatRemaining(deadlineMs: number, nowMs: number) {
  const remainingMs = deadlineMs - nowMs;
  if (remainingMs < 0) return "Passed";
  const totalMinutes = Math.ceil(remainingMs / 60_000);
  return String(Math.floor(totalMinutes / 60)) + "h " + String(totalMinutes % 60) + "m remaining";
}

export default function HandoverPanel({
  actorRole,
  commitment,
  handover,
  nowMs,
  notice,
  onPropose,
  onAccept,
  onRequestAdjustment,
  onApproveAdjustment,
  onAdvance,
  onRecordPresence,
  onBuyerConfirm,
  onCloseIncomplete,
  onOpenDispute,
  onProposeRepeat,
  onSellerConfirm,
  onSetBoundaryTime,
  onExpireScheduling,
  onCancel,
  onReportNoShow,
  onReportSellerUnavailability,
}: HandoverPanelProps) {
  const [selectedPointId, setSelectedPointId] = useState(handoverPoints[0].id);
  const [buyerPresenceValue, setBuyerPresenceValue] =
    useState<PresenceSimulation["value"]>("boundary");
  const [sellerPresenceValue, setSellerPresenceValue] =
    useState<PresenceSimulation["value"]>("inside");
  const [handoverTimeValue, setHandoverTimeValue] = useState<
    "window-start" | "window-end" | "just-after-window"
  >("window-start");
  const [boundaryTime, setBoundaryTime] = useState("proposal-exact");
  const [unavailabilityReason, setUnavailabilityReason] =
    useState<SellerUnavailabilityReason>("selling elsewhere");
  const selectedPoint =
    handoverPoints.find((point) => point.id === selectedPointId) ?? handoverPoints[0];
  const buyerPresenceSimulation =
    presenceSimulations.find((option) => option.value === buyerPresenceValue) ??
    presenceSimulations[0];
  const sellerPresenceSimulation =
    presenceSimulations.find((option) => option.value === sellerPresenceValue) ??
    presenceSimulations[0];
  const bothEligible = Boolean(
    handover.buyerPresence?.eligible && handover.sellerPresence?.eligible,
  );
  const insideAcceptedWindow = Boolean(
    handover.schedule &&
      nowMs >= handover.schedule.window.startsAtMs &&
      nowMs <= handover.schedule.window.endsAtMs,
  );
  const exactlyOneConfirmation =
    (handover.buyerConfirmedAtMs === null) !== (handover.sellerConfirmedAtMs === null);
  const buyerEvidence = handover.confirmationEvidence
    .filter((evidence) => evidence.party === "buyer")
    .at(-1);
  const sellerEvidence = handover.confirmationEvidence
    .filter((evidence) => evidence.party === "seller")
    .at(-1);
  const selectedHandoverTime = handover.schedule
    ? handoverTimeValue === "window-start"
      ? handover.schedule.window.startsAtMs
      : handoverTimeValue === "window-end"
        ? handover.schedule.window.endsAtMs
        : handover.schedule.window.endsAtMs + 1
    : nowMs;
  const agreementDeadlineBase =
    handover.meetingNumber > 1 && handover.proposal
      ? handover.proposal.proposedAtMs
      : handover.committedAtMs;

  return (
    <section
      aria-label={`Handover for ${commitment.snapshot.title}`}
      className="registration-panel handover-panel"
    >
      <p className="eyebrow">Successful handover - Simulation</p>
      <h2>{commitment.snapshot.title}</h2>
      <p>
        Seller proposes the outdoor point and windows. The buyer may accept or request a
        controlled adjustment; changes take effect only after both parties agree.
      </p>

      {!handover.successRecord && !handover.failureRecord ? (
        <section aria-label="Transaction deadlines" className="checkout-panel">
          <h3>Transaction deadlines</h3>
          <p>Seller proposal (2 hours): {formatRemaining(handover.committedAtMs + SELLER_PROPOSAL_DEADLINE_MS, nowMs)}</p>
          <p>Accepted schedule (6 hours): {formatRemaining(agreementDeadlineBase + SCHEDULE_AGREEMENT_DEADLINE_MS, nowMs)}</p>
          <p>Latest handover start (48 hours): {formatRemaining(handover.committedAtMs + HANDOVER_START_DEADLINE_MS, nowMs)}</p>
          <label>
            Demo time boundary
            <select aria-label="Demo time boundary" value={boundaryTime} onChange={(event) => setBoundaryTime(event.target.value)}>
              <option value="proposal-exact">Proposal deadline - exact</option>
              <option value="proposal-after">Proposal deadline - +1 ms</option>
              <option value="agreement-exact">Agreement deadline - exact</option>
              <option value="agreement-after">Agreement deadline - +1 ms</option>
              <option value="handover-exact">Latest handover start - exact 48 hours</option>
              <option value="handover-after">Latest handover start - +1 ms</option>
              {handover.schedule ? <option value="cancel-before">Cancellation - more than 2 hours before</option> : null}
              {handover.schedule ? <option value="cancel-exact">Cancellation - exactly 2 hours before</option> : null}
              {handover.schedule ? <option value="no-show-exact">No-show - exactly 15 minutes</option> : null}
              {handover.schedule ? <option value="no-show-after">No-show - +1 ms after 15 minutes</option> : null}
            </select>
          </label>
          <button className="button button-outline" onClick={() => onSetBoundaryTime(boundaryTime)}>Set demo boundary time</button>
        </section>
      ) : null}
      {handover.successRecord ? (
        <div className="handover-success" role="status">
          <h3>Sale final</h3>
          <p>Simulated Escrow: Released</p>
          <p>Simulated payout: Paid</p>
          <p>Successful handover recorded for private Tier Progress.</p>
          <p>
            The temporary Handover Point is no longer displayed. The immutable Purchase
            Snapshot remains with the completed simulated transaction.
          </p>
        </div>
      ) : handover.failureRecord ? (
        <section aria-label="Ended transaction outcome" className="handover-success">
          <h3>{handover.failureRecord.reason}</h3>
          {actorRole === "seller" && handover.failureRecord.sellerUnavailabilityReason ? <p>Your private seller reason: {handover.failureRecord.sellerUnavailabilityReason}</p> : null}
          <p>Transaction status: Ended</p>
          <p>Simulated refund: Full refund issued</p>
          <p>Simulated payout: Not paid</p>
          <p>Extra monetary compensation: None</p>
          <p>Listing status: {handover.failureRecord.listingStatus}</p>
          <p>Reliability Strikes are private and never shown to the other party.</p>
          {handover.failureRecord.reliabilityStrikes.map((strike) =>
            strike.party === actorRole ? <p key={`${strike.party}-${strike.reason}`}>Your private Reliability Strike: {strike.reason}</p> : null,
          )}
        </section>
      ) : (
        <>
          {actorRole === "seller" && !handover.proposal && handover.meetingNumber === 1 ? (
            <div className="handover-controls">
              <label>
                Seller-selected Handover Point
                <select
                  aria-label="Seller-selected Handover Point"
                  onChange={(event) => setSelectedPointId(event.target.value)}
                  value={selectedPointId}
                >
                  {handoverPoints.map((point) => (
                    <option key={point.id} value={point.id}>
                      {point.label}
                    </option>
                  ))}
                </select>
              </label>
              <button
                className="button button-primary"
                onClick={() => onPropose(selectedPoint)}
              >
                Propose two handover windows
              </button>
              <p>
                Zone eligibility is validated privately without exposing an address, exact
                Home Anchor, zone boundary, or Seller Discovery Marker.
              </p>
            </div>
          ) : null}

          {handover.proposal ? (
            <div className="checkout-panel">
              <h3>Seller proposal</h3>
              <p>
                Handover Point: {handover.proposal.point.label}. This is not a seller
                location, live position, or browsing point.
              </p>
              <ul>
                {handover.proposal.windows.map((window) => (
                  <li key={window.id}>
                    {formatWibWindow(window.startsAtMs, window.endsAtMs)}
                  </li>
                ))}
              </ul>
              {actorRole === "buyer" ? (
                <div className="listing-actions">
                  {!handover.schedule ? (
                    <button
                      className="button button-primary"
                      onClick={() => onAccept(handover.proposal!.windows[0].id)}
                    >
                      {handover.meetingNumber > 1
                        ? "Buyer accepts repeat meeting"
                        : "Accept first proposed window"}
                    </button>
                  ) : null}
                  <button
                    className="button button-outline"
                    onClick={onRequestAdjustment}
                  >
                    Request 11:00-11:30 WIB adjustment
                  </button>
                </div>
              ) : null}
              {handover.pendingAdjustment ? (
                <p>
                  Buyer adjustment pending seller approval:{" "}
                  {formatWibWindow(
                    handover.pendingAdjustment.startsAtMs,
                    handover.pendingAdjustment.endsAtMs,
                  )}
                </p>
              ) : null}
              {actorRole === "seller" && handover.pendingAdjustment ? (
                <button
                  className="button button-primary"
                  onClick={onApproveAdjustment}
                >
                  Seller approves requested adjustment
                </button>
              ) : null}
            </div>
          ) : actorRole === "buyer" ? (
            <p>Waiting for the Seller to propose a Handover Point and time windows.</p>
          ) : null}

          {handover.schedule ? (
            <section aria-label="Accepted Handover Schedule" className="checkout-panel">
              <h3>Accepted Handover Schedule</h3>
              <p>
                {handover.schedule.point.kind === "front-gate"
                  ? "Temporary front-gate point disclosed with seller consent for this transaction only. Home entry and physical browsing are not supported."
                  : `${handover.schedule.point.label}. The private Home Anchor and zone boundary remain hidden.`}
              </p>
              <p>
                {formatWibWindow(
                  handover.schedule.window.startsAtMs,
                  handover.schedule.window.endsAtMs,
                )}
              </p>
              <p>
                Handover Hours are 07:00-22:00 WIB. From 18:00 onward the point must be
                public and well lit.
              </p>
              <button
                className="button button-outline"
                onClick={() => onAdvance(handover.schedule!.window.startsAtMs)}
              >
                {handover.meetingNumber > 1
                  ? "Advance to repeat handover window"
                  : "Advance to accepted handover window"}
              </button>
              <div className="handover-controls">
                <label>
                  Simulated handover time
                  <select
                    aria-label="Simulated handover time"
                    onChange={(event) =>
                      setHandoverTimeValue(
                        event.target.value as
                          | "window-start"
                          | "window-end"
                          | "just-after-window",
                      )
                    }
                    value={handoverTimeValue}
                  >
                    <option value="window-start">Accepted window start</option>
                    <option value="window-end">Accepted window end — eligible</option>
                    <option value="just-after-window">Just after accepted window — blocked</option>
                  </select>
                </label>
                <button
                  className="button button-outline"
                  onClick={() => onAdvance(selectedHandoverTime)}
                >
                  Set simulated handover time
                </button>
              </div>
              {handover.meetingNumber > 1 && !bothEligible ? (
                <p>Fresh Presence Checks required for this repeat meeting.</p>
              ) : null}
            </section>
          ) : null}

          {handover.schedule && actorRole === "buyer" ? (
            <div className="handover-controls">
              <label>
                Buyer simulated handover location
                <select
                  aria-label="Buyer simulated handover location"
                  onChange={(event) =>
                    setBuyerPresenceValue(
                      event.target.value as PresenceSimulation["value"],
                    )
                  }
                  value={buyerPresenceValue}
                >
                  {presenceSimulations.map((simulation) => (
                    <option key={simulation.value} value={simulation.value}>
                      {simulation.label}
                    </option>
                  ))}
                </select>
              </label>
              <button
                className="button button-outline"
                onClick={() => onRecordPresence("buyer", buyerPresenceSimulation)}
              >
                Record buyer Presence Check
              </button>
            </div>
          ) : null}

          {handover.schedule && actorRole === "seller" ? (
            <div className="handover-controls">
              <label>
                Seller simulated handover location
                <select
                  aria-label="Seller simulated handover location"
                  onChange={(event) =>
                    setSellerPresenceValue(
                      event.target.value as PresenceSimulation["value"],
                    )
                  }
                  value={sellerPresenceValue}
                >
                  {presenceSimulations.map((simulation) => (
                    <option key={simulation.value} value={simulation.value}>
                      {simulation.label}
                    </option>
                  ))}
                </select>
              </label>
              <button
                className="button button-outline"
                onClick={() => onRecordPresence("seller", sellerPresenceSimulation)}
              >
                Record seller Presence Check
              </button>
            </div>
          ) : null}

          {handover.schedule ? (
            <div className="checkout-panel">
              <h3>Handover Presence Checks</h3>
              <p>
                Buyer:{" "}
                {handover.buyerPresence
                  ? `${handover.buyerPresence.eligible ? "eligible" : "not eligible"}; reported accuracy ${handover.buyerPresence.accuracyM ?? "unavailable"} m`
                  : "not checked"}
              </p>
              <p>
                Seller:{" "}
                {handover.sellerPresence
                  ? `${handover.sellerPresence.eligible ? "eligible" : "not eligible"}; reported accuracy ${handover.sellerPresence.accuracyM ?? "unavailable"} m`
                  : "not checked"}
              </p>
              {bothEligible ? (
                <p>Both parties are eligible during the accepted window.</p>
              ) : null}
              <p>
                Only eligibility, timestamp, and reported accuracy are retained. Location
                supports the claim; it does not prove a meeting.
              </p>
            </div>
          ) : null}

          {handover.schedule ? (
            <div className="checkout-panel">
              <h3>Independent Handover Confirmations</h3>
              <p>
                Each party records only their own declaration against the Purchase Snapshot.
                One confirmation is evidence, never completion.
              </p>
              <p>
                Simulated Escrow:{" "}
                {commitment.escrowStatus.startsWith("Held") ? "Held" : "Released"}
              </p>
              {actorRole === "buyer" ? (
                <button
                  className="button button-primary"
                  disabled={
                    !bothEligible ||
                    !insideAcceptedWindow ||
                    handover.buyerConfirmedAtMs !== null ||
                    handover.meetingClosedAtMs !== null ||
                    handover.activeDispute !== null
                  }
                  onClick={onBuyerConfirm}
                >
                  Buyer confirms inspected and accepted
                </button>
              ) : null}
              {actorRole === "seller" ? (
                <button
                  className="button button-primary"
                  disabled={
                    !bothEligible ||
                    !insideAcceptedWindow ||
                    handover.sellerConfirmedAtMs !== null ||
                    handover.meetingClosedAtMs !== null ||
                    handover.activeDispute !== null
                  }
                  onClick={onSellerConfirm}
                >
                  Seller confirms handover
                </button>
              ) : null}
            </div>
          ) : null}

          <section aria-label="Transaction ending actions" className="checkout-panel">
            <h3>End this transaction</h3>
            {!handover.schedule ? (
              <div className="listing-actions">
                {!handover.proposal || handover.pendingAdjustment ? <button className="button button-outline" onClick={() => onExpireScheduling("seller")}>Expire: seller response overdue</button> : null}
                {handover.proposal && !handover.pendingAdjustment ? <button className="button button-outline" onClick={() => onExpireScheduling("buyer")}>Expire: buyer response overdue</button> : null}
                {handover.proposal ? <button className="button button-outline" onClick={() => onExpireScheduling(null)}>Demo both responded: no compatible time within 48 hours</button> : null}
              </div>
            ) : (
              <div className="listing-actions">
                <button className="button button-outline" onClick={onCancel}>{actorRole === "buyer" ? "Buyer cancels transaction" : "Seller cancels transaction"}</button>
                <button className="button button-outline" onClick={() => onReportNoShow(actorRole === "buyer" ? "seller" : "buyer")}>Report {actorRole === "buyer" ? "seller" : "buyer"} no-show</button>
              </div>
            )}
            {actorRole === "seller" ? (
              <div className="handover-controls">
                <label>Seller unavailability reason<select aria-label="Seller unavailability reason" value={unavailabilityReason} onChange={(event) => setUnavailabilityReason(event.target.value as SellerUnavailabilityReason)}>
                  <option value="selling elsewhere">Selling elsewhere</option><option value="higher offer">Higher offer</option><option value="loss">Item lost</option><option value="damage">Item damaged</option><option value="withdrawal">Withdrawal</option>
                </select></label>
                <button className="button button-outline" onClick={() => onReportSellerUnavailability(unavailabilityReason)}>Report seller unavailability</button>
              </div>
            ) : null}
          </section>
          {handover.confirmationEvidence.length > 0 ? (
            <section aria-label="Preserved confirmation evidence" className="checkout-panel">
              <h3>Preserved confirmation evidence</h3>
              <p>Buyer confirmation {buyerEvidence ? "recorded" : "not recorded"}.</p>
              {buyerEvidence ? (
                <p>
                  Buyer presence {buyerEvidence.buyerPresence.eligible ? "eligible" : "not eligible"};
                  reported accuracy {buyerEvidence.buyerPresence.accuracyM ?? "unavailable"} m.
                  Recorded at {formatWibTime(buyerEvidence.confirmedAtMs)}.
                </p>
              ) : null}
              <p>Seller confirmation {sellerEvidence ? "recorded" : "not recorded"}.</p>
              {sellerEvidence ? (
                <p>
                  Seller presence {sellerEvidence.sellerPresence.eligible ? "eligible" : "not eligible"};
                  reported accuracy {sellerEvidence.sellerPresence.accuracyM ?? "unavailable"} m.
                  Recorded at {formatWibTime(sellerEvidence.confirmedAtMs)}.
                </p>
              ) : null}
              <p>Only eligibility, timestamp, and reported accuracy are preserved.</p>
            </section>
          ) : null}

          {handover.confirmationEvidence.length > 0 ? (
            <section aria-label="Incomplete Handover" className="checkout-panel">
              <h3>Incomplete Handover</h3>
              <p>Simulated Escrow: Held</p>
              <p>Simulated payout: Pending</p>
              <p>Simulated refund: Not issued</p>
              <p>Listing status: Purchased — not sold</p>
              {actorRole === "buyer" ? (
                <p>Tier Progress: Not advanced</p>
              ) : null}
              {handover.meetingClosedAtMs !== null ? (
                <p>Remote confirmation unavailable after separation.</p>
              ) : null}
              {handover.activeDispute ? (
                <>
                  <p>Active Dispute — guided prototype review</p>
                  <p>
                    Jualokal authority is limited to incomplete, inconsistent, or disputed
                    transaction states.
                  </p>
                  <p>Prototype policy — subject to later launch elaboration.</p>
                </>
              ) : null}
              {!handover.activeDispute ? (
                <div className="listing-actions">
                  {exactlyOneConfirmation && handover.meetingClosedAtMs === null ? (
                    <button className="button button-outline" onClick={onCloseIncomplete}>
                      End this handover attempt and separate
                    </button>
                  ) : null}
                  {exactlyOneConfirmation &&
                  actorRole === "seller" &&
                  handover.meetingClosedAtMs !== null ? (
                    <button className="button button-primary" onClick={onProposeRepeat}>
                      Seller proposes repeat meeting
                    </button>
                  ) : null}
                  <button className="button button-outline" onClick={onOpenDispute}>
                    Open Active Dispute
                  </button>
                </div>
              ) : null}
            </section>
          ) : null}
        </>
      )}

      {notice ? <p role="status">{notice}</p> : null}
    </section>
  );
}
