"use client";

import {
  Bell,
  Boxes,
  ClipboardList,
  Factory,
  LayoutDashboard,
  LogOut,
  Menu,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useState } from "react";

import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/inventory", label: "Inventory", icon: Boxes },
  { href: "/production", label: "Production", icon: ClipboardList },
  { href: "/notifications", label: "Notifications", icon: Bell },
];

export function AppShell({ children }: Readonly<{ children: ReactNode }>) {
  const pathname = usePathname() ?? "";
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 flex w-72 flex-col bg-slate-950 text-white transition-transform md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-20 items-center gap-3 border-b border-white/10 px-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-cyan-500/15 text-cyan-300">
            <Factory size={24} />
          </div>
          <div>
            <p className="text-sm font-semibold">Naptech</p>
            <p className="text-xs text-slate-400">Factory OS</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname.startsWith(item.href);
            return (
              <Link
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-3 text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white",
                  active && "bg-cyan-500/15 text-cyan-100",
                )}
                href={item.href}
                key={item.href}
                onClick={() => setOpen(false)}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-4">
          <Link
            className="flex items-center gap-3 rounded-md px-3 py-3 text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
            href="/login"
          >
            <LogOut size={18} />
            Logout
          </Link>
        </div>
      </aside>

      <div className="md:pl-72">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-white px-4 md:px-8">
          <button
            aria-label="Open navigation"
            className="rounded-md border border-border p-2 text-slate-700 md:hidden"
            onClick={() => setOpen(true)}
            type="button"
          >
            <Menu size={20} />
          </button>
          <div className="hidden text-sm text-muted-foreground md:block">
            Factory operating dashboard
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-semibold text-slate-900">Supervisor</p>
              <p className="text-xs text-muted-foreground">Line operations</p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-slate-900 text-center text-sm font-semibold leading-10 text-white">
              SO
            </div>
          </div>
        </header>
        <main className="p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
