import { Link } from "@tanstack/react-router";
import {
  Handshake,
  LayoutDashboard,
  LogOut,
  Package,
  Settings,
  ShieldCheck,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { signOut } from "@/utils/auth";

const navigation = [
  { label: "Overview", icon: LayoutDashboard, active: true },
  { label: "Listings", icon: Package, active: false },
  { label: "Handovers", icon: Handshake, active: false },
  { label: "Trust & safety", icon: ShieldCheck, active: false },
];

export function AppSidebar({ className }: { className?: string }) {
  async function endSession() {
    await signOut();
    window.location.assign("/login");
  }

  return (
    <aside className={cn("flex h-svh w-64 shrink-0 flex-col border-r bg-card", className)}>
      <div className="flex h-16 items-center border-b px-5">
        <Link className="inline-flex items-center gap-2 font-bold tracking-tight text-primary" to="/">
          <span className="grid size-8 place-items-center rounded-lg bg-primary font-serif text-primary-foreground">
            J
          </span>
          jualokal
        </Link>
      </div>
      <nav aria-label="Dashboard" className="flex-1 space-y-1 p-3">
        <p className="px-3 pb-2 pt-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Marketplace
        </p>
        {navigation.map((item) => (
          <a
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              item.active
                ? "bg-secondary text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
            href={item.active ? "/dashboard" : `#${item.label.toLowerCase().replaceAll(" ", "-")}`}
            key={item.label}
          >
            <item.icon aria-hidden="true" className="size-4" />
            {item.label}
            {item.label === "Handovers" ? <Badge className="ml-auto">2</Badge> : null}
          </a>
        ))}
      </nav>
      <div className="border-t p-3">
        <Button className="w-full justify-start" variant="ghost">
          <Settings />
          Settings
        </Button>
        <Button
          className="w-full justify-start text-muted-foreground"
          onClick={endSession}
          variant="ghost"
        >
          <LogOut />
          Sign out
        </Button>
      </div>
    </aside>
  );
}
