import { createFileRoute } from "@tanstack/react-router";
import { Bell, Handshake, Menu, Package, Plus, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";

import { AppSidebar } from "@/components/app-sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
});

const activity = [
  { title: "Handover confirmed", detail: "Rina confirmed the Dago meeting point", time: "12 min" },
  { title: "Listing saved", detail: "A nearby member saved your desk lamp", time: "1 hr" },
  { title: "Trust check complete", detail: "Your account remains in good standing", time: "Yesterday" },
];

function DashboardPage() {
  return (
    <div className="flex min-h-svh bg-background text-foreground">
      <AppSidebar className="sticky top-0 hidden md:flex" />
      <main className="min-w-0 flex-1">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background/90 px-4 backdrop-blur sm:px-6">
          <div className="flex items-center gap-3">
            <details className="relative md:hidden">
              <summary className="grid size-10 cursor-pointer list-none place-items-center rounded-md border bg-card">
                <Menu className="size-4" />
                <span className="sr-only">Open navigation</span>
              </summary>
              <div className="absolute -left-4 top-12 z-20 shadow-xl">
                <AppSidebar className="h-[calc(100svh-4rem)]" />
              </div>
            </details>
            <div>
              <p className="text-xs text-muted-foreground">Member workspace</p>
              <h1 className="font-sans text-lg font-semibold tracking-tight">Dashboard</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button aria-label="Notifications" size="icon" variant="outline">
              <Bell />
            </Button>
            <Button className="hidden sm:inline-flex">
              <Plus />
              New listing
            </Button>
          </div>
        </header>

        <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
          <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <Badge>Verified member</Badge>
              <h2 className="mt-3 font-serif text-3xl tracking-tight sm:text-4xl">Welcome back, Dimas.</h2>
              <p className="mt-2 text-sm text-muted-foreground">Here’s what is happening nearby today.</p>
            </div>
            <Button className="sm:hidden">
              <Plus />
              New listing
            </Button>
          </section>

          <section aria-label="Marketplace summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <SummaryCard icon={<Package />} label="Active listings" note="1 saved this week" value="4" />
            <SummaryCard icon={<Handshake />} label="Upcoming handovers" note="Next: today, 16:30" value="2" />
            <SummaryCard icon={<ShieldCheck />} label="Trust standing" note="No action needed" value="Good" />
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
            <Card>
              <CardHeader>
                <CardTitle>Recent activity</CardTitle>
                <CardDescription>Private updates from your marketplace account.</CardDescription>
              </CardHeader>
              <CardContent className="divide-y">
                {activity.map((item) => (
                  <article className="flex gap-4 py-4 first:pt-0 last:pb-0" key={item.title}>
                    <span className="mt-1 size-2 shrink-0 rounded-full bg-primary" />
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-medium">{item.title}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{item.detail}</p>
                    </div>
                    <time className="shrink-0 text-xs text-muted-foreground">{item.time}</time>
                  </article>
                ))}
              </CardContent>
            </Card>

            <Card className="bg-primary text-primary-foreground">
              <CardHeader>
                <CardTitle className="font-serif text-2xl">Ready for your next handover?</CardTitle>
                <CardDescription className="text-primary-foreground/65">
                  Keep item details accurate and choose a safe nearby meeting point.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="bg-white text-primary hover:bg-white/90" variant="outline">
                  <Plus />
                  Create a listing
                </Button>
              </CardContent>
            </Card>
          </section>
        </div>
      </main>
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  note,
  value,
}: {
  icon: ReactNode;
  label: string;
  note: string;
  value: string;
}) {
  return (
    <Card className="gap-4">
      <CardHeader className="flex-row items-center justify-between gap-4">
        <CardDescription>{label}</CardDescription>
        <span className="grid size-9 place-items-center rounded-lg bg-secondary text-primary [&_svg]:size-4">
          {icon}
        </span>
      </CardHeader>
      <CardContent>
        <CardTitle className="text-3xl">{value}</CardTitle>
        <p className="mt-2 text-xs text-muted-foreground">{note}</p>
      </CardContent>
    </Card>
  );
}
