import { createFileRoute, redirect } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { useState } from "react";

import VerifiedMemberExperience from "@/VerifiedMemberExperience";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  completeSimulatedIdentityVerification,
  getCurrentMember,
  signOut,
} from "@/utils/auth";

export const Route = createFileRoute("/dashboard")({
  beforeLoad: async () => {
    const member = await getCurrentMember();
    if (member === null) throw redirect({ to: "/login" });
    return { member };
  },
  component: DashboardPage,
});

const buyerTierLabels = {
  verified_buyer: "Verified Buyer",
  reliable_buyer: "Reliable Buyer",
  trusted_buyer: "Trusted Buyer",
} as const;

async function endAuthenticatedSession() {
  try {
    const result = await signOut();
    if (!result.ok) return false;
    window.location.assign("/login");
    return true;
  } catch {
    return false;
  }
}

function DashboardPage() {
  const { member } = Route.useRouteContext();

  if (member.restricted) return <RestrictedMemberStage />;
  if (!member.identityVerified) return <OnboardingStage />;

  const publicIdentity = [member.publicFirstName, member.publicLastInitial]
    .filter((namePart) => namePart !== null)
    .join(" ");

  return (
    <VerifiedMemberExperience
      buyerTier={buyerTierLabels[member.buyerTier]}
      differentPartnerCount={member.transactionPartnerCount}
      onExit={endAuthenticatedSession}
      profilePictureAdded={member.profilePicturePath !== null}
      publicIdentity={publicIdentity}
      successfulHandoverCount={member.successfulHandoverCount}
    />
  );
}

function RestrictedMemberStage() {
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSignOutError(null);
    setSigningOut(true);
    const completed = await endAuthenticatedSession();
    if (!completed) {
      setSignOutError("Sign out failed. Your session remains active; try again.");
      setSigningOut(false);
    }
  }

  return (
    <main aria-label="Marketplace unavailable" className="grid min-h-svh place-items-center bg-muted/40 p-4 sm:p-6">
      <Card className="w-full max-w-xl border-primary/10 shadow-xl shadow-primary/5">
        <CardHeader className="gap-4">
          <Badge className="w-fit">Marketplace access unavailable</Badge>
          <CardTitle className="font-serif text-3xl tracking-tight">
            This account cannot enter the marketplace.
          </CardTitle>
          <CardDescription className="text-sm leading-6">
            Marketplace listings, member activity, and transaction controls remain hidden while
            this account is restricted. No private enforcement details are shown here.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          {signOutError ? <p role="alert">{signOutError}</p> : null}
          <Button disabled={signingOut} onClick={handleSignOut}>
            {signingOut ? "Signing out…" : "Sign out"}
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}

function OnboardingStage() {
  const [acknowledged, setAcknowledged] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [publicFirstName, setPublicFirstName] = useState("");
  const [publicLastName, setPublicLastName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function finishVerification() {
    setError(null);
    setSubmitting(true);

    try {
      const result = await completeSimulatedIdentityVerification({
        data: { publicFirstName, publicLastName },
      });
      if (result.status === "verified") {
        window.location.assign("/dashboard");
        return;
      }

      setError(
        result.status === "authentication-required"
          ? "Sign in again before completing this walkthrough."
          : "Verification simulation could not be saved. Try again.",
      );
    } catch {
      setError("Verification simulation is temporarily unavailable. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-svh place-items-center bg-muted/40 p-4 sm:p-6">
      <Card className="w-full max-w-2xl border-primary/10 shadow-xl shadow-primary/5">
        <CardHeader className="gap-4">
          <Badge className="w-fit">Onboarding · Simulation</Badge>
          <div className="grid size-12 place-items-center rounded-xl bg-secondary text-primary">
            <ShieldCheck className="size-6" />
          </div>
          <div>
            <CardTitle className="font-serif text-3xl tracking-tight">
              Identity Verification walkthrough
            </CardTitle>
            <CardDescription className="mt-3 text-sm leading-6">
              This simulated admission check shows how Jualokal establishes accountable
              membership before marketplace access.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="grid gap-6">
          <div className="rounded-lg border border-amber-600/20 bg-amber-500/10 p-4 text-sm leading-6">
            This is not a real identity check. Do not enter or upload real ID, selfies,
            biometrics, passwords, payment methods, or other sensitive evidence.
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <label className="text-sm font-medium" htmlFor="public-first-name">
                Public first name
              </label>
              <input
                autoComplete="given-name"
                className="h-10 rounded-md border bg-background px-3 text-sm"
                id="public-first-name"
                maxLength={50}
                onChange={(event) => setPublicFirstName(event.target.value)}
                required
                value={publicFirstName}
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium" htmlFor="public-last-name">
                Last name (optional)
              </label>
              <input
                autoComplete="family-name"
                className="h-10 rounded-md border bg-background px-3 text-sm"
                id="public-last-name"
                maxLength={100}
                onChange={(event) => setPublicLastName(event.target.value)}
                value={publicLastName}
              />
            </div>
            <p className="text-xs leading-5 text-muted-foreground sm:col-span-2">
              Other Verified Members see only your first name and, when supplied, last initial.
              The full last name is discarded after this simulation.
            </p>
          </div>
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-4 text-sm leading-6">
            <input
              checked={acknowledged}
              className="mt-1 size-4 accent-primary"
              onChange={(event) => setAcknowledged(event.target.checked)}
              type="checkbox"
            />
            <span>I understand this is a simulation and will not provide real personal data.</span>
          </label>
          {error === null ? null : (
            <p aria-live="polite" className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <Button
            disabled={!acknowledged || publicFirstName.trim() === "" || submitting}
            onClick={finishVerification}
            size="lg"
          >
            {submitting ? "Saving simulation…" : "Complete simulated verification"}
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
