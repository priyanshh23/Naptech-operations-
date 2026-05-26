"use client";

import {
  Bell,
  Boxes,
  CalendarDays,
  ChevronDown,
  ClipboardList,
  Download,
  Factory,
  LayoutDashboard,
  Menu,
  Search,
  Settings,
  ShieldCheck,
  Users,
  Wrench,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useState } from "react";

import { cn } from "@/lib/utils";

const navigation = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/inventory", label: "Inventory", icon: Boxes },
  { href: "/production", label: "Production", icon: ClipboardList },
  { href: "/notifications", label: "Alerts", icon: Bell },
  { href: "/dashboard", label: "Workers", icon: Users },
  { href: "/dashboard", label: "Maintenance", icon: Wrench },
  { href: "/dashboard", label: "Settings", icon: Settings },
];

export function DashboardShell({ children }: Readonly<{ children: ReactNode }>) {
  const pathname = usePathname() ?? "";
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F7F9FB] text-[#111827]">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-white/10 bg-[#020B14] text-white transition-transform duration-300 lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-20 items-center justify-between px-5">
          <Link className="flex items-center gap-3" href="/dashboard">
            <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-[#19C93B] text-[#07111A] shadow-[0_0_32px_rgba(25,201,59,0.35)]">
              <Factory size={25} />
              <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-[#8BFF4D]" />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#8BFF4D]">NAPTECH</p>
              <p className="text-sm text-slate-400">Factory OS</p>
            </div>
          </Link>
          <button className="rounded-xl p-2 text-slate-400 lg:hidden" onClick={() => setOpen(false)} type="button">
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                className={cn(
                  "group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-slate-400 transition hover:bg-white/5 hover:text-white",
                  active && "bg-[#19C93B]/15 text-white shadow-[inset_0_0_0_1px_rgba(25,201,59,0.18)]",
                )}
                href={item.href}
                key={`${item.label}-${item.href}`}
                onClick={() => setOpen(false)}
              >
                <span
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-slate-400 transition group-hover:text-[#8BFF4D]",
                    active && "bg-[#19C93B] text-[#07111A]",
                  )}
                >
                  <Icon size={18} />
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="m-4 rounded-3xl border border-[#19C93B]/20 bg-[#07111A] p-4 shadow-[0_0_40px_rgba(25,201,59,0.08)]">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-[#19C93B]/15 text-[#8BFF4D]">
            <ShieldCheck size={20} />
          </div>
          <p className="text-sm font-semibold">Plant health: Stable</p>
          <p className="mt-1 text-xs leading-5 text-slate-400">All critical lines are monitored in real time.</p>
        </div>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-[#F7F9FB]/85 px-4 py-4 backdrop-blur-xl lg:px-8">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center gap-3">
              <button
                className="rounded-2xl border border-slate-200 bg-white p-3 text-slate-700 shadow-sm lg:hidden"
                onClick={() => setOpen(true)}
                type="button"
              >
                <Menu size={20} />
              </button>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#19C93B]">
                  Automobile Manufacturing
                </p>
                <h1 className="mt-1 text-2xl font-semibold tracking-normal text-[#111827] md:text-3xl">
                  Factory Operations Command
                </h1>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <label className="flex h-11 min-w-[240px] flex-1 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 shadow-sm xl:w-80 xl:flex-none">
                <Search size={18} className="text-slate-400" />
                <input className="w-full bg-transparent text-sm outline-none" placeholder="Search SKU, task, worker" />
              </label>
              <button className="flex h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <CalendarDays size={17} />
                Today
              </button>
              <button className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <Bell size={18} />
                <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-[#19C93B]" />
              </button>
              <button className="flex h-11 items-center gap-2 rounded-2xl bg-[#07111A] px-4 text-sm font-semibold text-white shadow-[0_12px_32px_rgba(7,17,26,0.18)] transition hover:-translate-y-0.5">
                <Download size={17} />
                Export
              </button>
              <button className="flex h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 shadow-sm">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-[#19C93B] text-xs font-bold text-[#07111A]">
                  PG
                </span>
                <span className="hidden sm:block">Priyansh</span>
                <ChevronDown size={16} className="text-slate-400" />
              </button>
            </div>
          </div>
        </header>

        <main className="p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
