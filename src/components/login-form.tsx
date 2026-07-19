import { Link, useNavigate } from "@tanstack/react-router";
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

export function LoginForm() {
  const navigate = useNavigate();

  function openDashboardPreview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void navigate({ to: "/dashboard" });
  }

  return (
    <Card className="w-full border-primary/10 shadow-xl shadow-primary/5">
      <CardHeader>
        <CardTitle className="font-serif text-2xl tracking-tight">Welcome back</CardTitle>
        <CardDescription>
          Sign in to manage listings and nearby handovers.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action="/dashboard" className="grid gap-5" method="get" onSubmit={openDashboardPreview}>
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              autoComplete="email"
              id="email"
              placeholder="you@example.com"
              required
              type="email"
            />
          </div>
          <div className="grid gap-2">
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="password">Password</Label>
              <a className="text-xs font-medium text-primary hover:underline" href="#forgot-password">
                Forgot password?
              </a>
            </div>
            <Input
              autoComplete="current-password"
              id="password"
              minLength={8}
              required
              type="password"
            />
          </div>
          <Button className="w-full" type="submit">
            Sign in
          </Button>
          <p className="text-center text-xs leading-relaxed text-muted-foreground">
            UI preview only. Authentication is not connected yet.
          </p>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          New to Jualokal?{" "}
          <Link className="font-medium text-primary hover:underline" to="/">
            Begin registration
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
