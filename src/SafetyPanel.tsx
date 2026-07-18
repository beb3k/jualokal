import { useState } from "react";
import type { PurchaseCommitment } from "./checkout";
import {
  projectSafetyForReportedMember,
  SAFETY_APPEAL_WINDOW_MS,
  type SafetyCategory,
  type SafetyState,
} from "./safety";

type SafetyPanelProps = {
  actorId: string;
  commitment: PurchaseCommitment;
  nowMs: number;
  safety: SafetyState;
  onAppeal: (response: string) => void;
  onReport: (
    category: SafetyCategory,
    description: string,
    evidenceLabel?: string,
  ) => void;
  onResolveAppeal: (outcome: "upheld" | "overturned") => void;
  onReview: (outcome: "confirmed" | "dismissed") => void;
  onSetAppealTime: (timestampMs: number) => void;
};

function formatWibTime(timestampMs: number) {
  return (
    new Intl.DateTimeFormat("en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
      hour12: false,
      timeZone: "Asia/Jakarta",
    }).format(new Date(timestampMs)) + " WIB"
  );
}

export default function SafetyPanel({
  actorId,
  commitment,
  nowMs,
  safety,
  onAppeal,
  onReport,
  onResolveAppeal,
  onReview,
  onSetAppealTime,
}: SafetyPanelProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [category, setCategory] = useState<SafetyCategory | "">("");
  const [description, setDescription] = useState("");
  const [evidenceIncluded, setEvidenceIncluded] = useState(false);
  const [appealResponse, setAppealResponse] = useState(
    "Please reconsider this simulated finding.",
  );
  const [appealBoundary, setAppealBoundary] = useState<
    "exact-deadline" | "after-deadline"
  >("exact-deadline");
  const report = safety.report;
  const actorIsReporter = report?.reporterId === actorId;
  const actorIsReported = report?.reportedMemberId === actorId;
  const reportedView = projectSafetyForReportedMember(safety);
  const appealDeadlineMs = report?.review
    ? report.review.reviewedAtMs + SAFETY_APPEAL_WINDOW_MS
    : null;
  const appealDeadlinePassed =
    appealDeadlineMs !== null && nowMs > appealDeadlineMs;

  return (
    <section aria-label="Safety incident help" className="checkout-panel">
      <p className="eyebrow">Safety support - Guided prototype</p>
      <h3>Leave an unsafe situation</h3>
      <p>
        Either party may leave without continuing the handover. This guided prototype
        simulates review and never contacts a real moderator or uploads real evidence.
      </p>

      {!report && !formOpen ? (
        <button className="button button-outline" onClick={() => setFormOpen(true)}>
          Report a safety incident
        </button>
      ) : null}

      {!report && formOpen ? (
        <section aria-label="Safety Report" className="checkout-panel">
          <h4>Safety Report</h4>
          <div className="handover-controls">
            <label>
              Safety category
              <select
                aria-label="Safety category"
                onChange={(event) =>
                  setCategory(event.target.value as SafetyCategory | "")
                }
                value={category}
              >
                <option value="">Select a structured category</option>
                <option value="immediate-physical-danger">
                  Immediate physical danger
                </option>
                <option value="threat-or-harassment">Threat or harassment</option>
              </select>
            </label>
            <label>
              Describe what happened
              <textarea
                aria-label="Describe what happened"
                onChange={(event) => setDescription(event.target.value)}
                rows={4}
                value={description}
              />
            </label>
            <label>
              <input
                aria-label="Include simulated evidence"
                checked={evidenceIncluded}
                onChange={(event) => setEvidenceIncluded(event.target.checked)}
                type="checkbox"
              />
              Include simulated evidence (optional label only)
            </label>
          </div>
          <p>
            Your report, description, evidence label, and identity remain private from the
            reported member.
          </p>
          <button
            className="button button-primary"
            disabled={!category || !description.trim()}
            onClick={() =>
              onReport(
                category as SafetyCategory,
                description,
                evidenceIncluded ? "Optional private simulated evidence" : undefined,
              )
            }
          >
            Submit Safety Report
          </button>
        </section>
      ) : null}

      {report ? (
        <>
          {reportedView.contactBlocked ? (
            <p>
              Contact blocked. Leave the unsafe situation; no further meeting obligation
              applies while this private safety process is active.
            </p>
          ) : (
            <p>
              The review removed the transaction contact block. Any completed settlement
              remains final.
            </p>
          )}
          {safety.safetyHold === "active" ? (
            <section aria-label="Safety Hold" className="checkout-panel">
              <h4>Safety Hold</h4>
              <p>Meeting obligation removed. Neither party must continue the handover.</p>
              <p>Simulated Escrow: Held</p>
              <p>Simulated payout: Pending</p>
              <p>Simulated refund: Not issued</p>
            </section>
          ) : commitment.lifecycleStatus === "Completed" &&
            commitment.escrowStatus === "Released - simulated" ? (
            <p>
              Completed payment remains final. Simulated Escrow: Released. Simulated
              payout: Paid.
            </p>
          ) : commitment.lifecycleStatus === "Completed" &&
            commitment.escrowStatus === "Refunded - simulated" ? (
            <p>
              Guided safety resolution completed. Simulated Escrow: Refunded in full.
              Simulated payout: Not paid. The listing is paused.
            </p>
          ) : null}

          {actorIsReporter ? (
            <section aria-label="Your private Safety Report" className="checkout-panel">
              <h4>Your private Safety Report</h4>
              <p>
                Safety Report{" "}
                {report.status === "pending"
                  ? "under guided prototype review"
                  : "status: " + report.status}.
              </p>
              <p>Category: {report.category.replaceAll("-", " ")}</p>
              <p>Description: {report.description}</p>
              <p>
                Optional evidence:{" "}
                {report.evidenceLabel ?? "No simulated evidence included"}.
              </p>
            </section>
          ) : null}

          {actorIsReported && report.status === "pending" ? (
            <section aria-label="Private allegation status" className="checkout-panel">
              <h4>Contact unavailable</h4>
              <p>A private allegation is under guided prototype review.</p>
              <p>No Trust Record change while this allegation is unreviewed.</p>
              <p>The reporter's identity, description, and evidence stay hidden.</p>
            </section>
          ) : null}

          {report.status === "pending" ? (
            <section
              aria-label="Guided prototype reviewer controls"
              className="checkout-panel"
            >
              <h4>Guided prototype reviewer controls</h4>
              <p>
                These buttons simulate a written outcome; they are not member moderation
                powers or a production moderation operation.
              </p>
              <div className="listing-actions">
                <button
                  className="button button-primary"
                  onClick={() => onReview("confirmed")}
                >
                  Simulate confirmed finding
                </button>
                <button
                  className="button button-outline"
                  onClick={() => onReview("dismissed")}
                >
                  Simulate dismissed report
                </button>
              </div>
            </section>
          ) : null}

          {actorIsReported && report.review ? (
            <section aria-label="Written safety outcome" className="checkout-panel">
              <h4>
                {report.status === "dismissed"
                  ? "Report dismissed"
                  : report.status === "overturned"
                    ? "Finding overturned"
                    : "Confirmed safety finding"}
              </h4>
              <p>Written outcome: {reportedView.redactedOutcome}</p>
              {reportedView.category ? (
                <p>Category: {reportedView.category.replaceAll("-", " ")}</p>
              ) : null}
              {reportedView.restriction ? (
                <p>Lasting account restriction - simulated.</p>
              ) : report.status === "overturned" ? (
                <p>Lasting restriction removed.</p>
              ) : (
                <p>No lasting account restriction.</p>
              )}
            </section>
          ) : null}

          {actorIsReported &&
          report.status === "confirmed" &&
          !report.appeal &&
          appealDeadlineMs !== null ? (
            <section aria-label="Safety Appeal" className="checkout-panel">
              <h4>One Safety Appeal</h4>
              <p>
                Appeal deadline: {formatWibTime(appealDeadlineMs)} (inclusive).
              </p>
              <label>
                Appeal time boundary
                <select
                  aria-label="Appeal time boundary"
                  onChange={(event) =>
                    setAppealBoundary(
                      event.target.value as
                        | "exact-deadline"
                        | "after-deadline",
                    )
                  }
                  value={appealBoundary}
                >
                  <option value="exact-deadline">
                    Exact seven-day deadline - accepted
                  </option>
                  <option value="after-deadline">
                    Seven days plus 1 ms - blocked
                  </option>
                </select>
              </label>
              <button
                className="button button-outline"
                onClick={() =>
                  onSetAppealTime(
                    appealDeadlineMs +
                      (appealBoundary === "after-deadline" ? 1 : 0),
                  )
                }
              >
                Set simulated appeal time
              </button>
              <label>
                Appeal response
                <textarea
                  aria-label="Appeal response"
                  onChange={(event) => setAppealResponse(event.target.value)}
                  rows={3}
                  value={appealResponse}
                />
              </label>
              {appealDeadlinePassed ? <p>Appeal deadline passed.</p> : null}
              <button
                className="button button-primary"
                disabled={appealDeadlinePassed || !appealResponse.trim()}
                onClick={() => onAppeal(appealResponse)}
              >
                Request one Safety Appeal
              </button>
            </section>
          ) : null}

          {actorIsReported && report.appeal?.status === "pending" ? (
            <section aria-label="Safety Appeal outcome" className="checkout-panel">
              <h4>Safety Appeal under review</h4>
              <p>Different simulated reviewer assigned.</p>
              <p>Restriction remains during appeal.</p>
              <div className="listing-actions">
                <button
                  className="button button-outline"
                  onClick={() => onResolveAppeal("upheld")}
                >
                  Simulate appeal upheld
                </button>
                <button
                  className="button button-primary"
                  onClick={() => onResolveAppeal("overturned")}
                >
                  Simulate appeal overturned
                </button>
              </div>
            </section>
          ) : null}

          {actorIsReported && report.appeal?.status === "upheld" ? (
            <p>
              Appeal upheld the finding. The written final outcome is private and the
              simulated restriction remains.
            </p>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
