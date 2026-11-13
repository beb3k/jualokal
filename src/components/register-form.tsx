import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registerWithEmail } from "@/utils/firebase-browser";

export function RegisterForm() {
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => setHydrated(true), []);

  async function submitRegistration(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const form = new FormData(event.currentTarget);
    const email = form.get("email");
    const password = form.get("password");
    const passwordConfirmation = form.get("password-confirmation");

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      typeof passwordConfirmation !== "string"
    ) {
      setError("Email and password are required.");
      return;
    }

    if (password !== passwordConfirmation) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);

    try {
      const result = await registerWithEmail(email, password);
      if (result.status === "error") {
        setError(result.message);
        return;
      }

      window.location.assign("/dashboard");
    } catch {
      setError("Registration is temporarily unavailable. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="w-full border-primary/10 shadow-xl shadow-primary/5">
      <CardHeader>
        <CardTitle className="font-serif text-2xl tracking-tight">Create your account</CardTitle>
        <CardDescription>
          Register before completing the simulated identity verification walkthrough.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6">
          <form className="grid gap-5" onSubmit={submitRegistration}>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                autoComplete="email"
                id="email"
                name="email"
                placeholder="you@example.com"
                required
                type="email"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                autoComplete="new-password"
                id="password"
                minLength={8}
                name="password"
                required
                type="password"
              />
              <p className="text-xs text-muted-foreground">
                Use at least 8 characters.
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password-confirmation">Confirm password</Label>
              <Input
                autoComplete="new-password"
                id="password-confirmation"
                minLength={8}
                name="password-confirmation"
                required
                type="password"
              />
            </div>
            <p className="text-xs leading-5 text-muted-foreground">
              Identity verification remains simulated. Never upload identity
              documents, selfies, or biometrics.
            </p>
            {error === null ? null : (
              <p
                aria-live="polite"
                className="text-sm text-destructive"
                role="alert"
              >
                {error}
              </p>
            )}
            <Button
              className="w-full"
              disabled={!hydrated || submitting}
              type="submit"
            >
              {submitting ? "Creating account…" : "Create account"}
            </Button>
          </form>
          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              className="font-medium text-primary hover:underline"
              to="/login"
            >
              Sign in
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
