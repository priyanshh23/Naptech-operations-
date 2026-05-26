"use client";

import {
  Bell,
  Boxes,
  CalendarDays,
  ChevronDown,
  ClipboardList,
  Download,
  Folder,
  Home,
  LayoutDashboard,
  Menu,
  Moon,
  PackageCheck,
  Search,
  Settings,
  Shield,
  Sun,
  Users,
  Wrench,
  X,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import type { FormEvent, ReactNode } from "react";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

const operations = [
  { href: "/production", label: "Production", icon: PackageCheck },
  { href: "/production", label: "Work Orders", icon: ClipboardList },
  { href: "/inventory", label: "Inventory", icon: Boxes },
  { href: "/production", label: "Quality", icon: Shield },
  { href: "/production", label: "Maintenance", icon: Wrench },
];

const management = [
  { href: "/dashboard", label: "Reports", icon: LayoutDashboard },
  { href: "/notifications", label: "Alerts", icon: Bell, count: 5 },
  { href: "/dashboard", label: "Calendar", icon: CalendarDays },
  { href: "/dashboard", label: "Documents", icon: Folder },
];

const system = [
  { href: "/dashboard", label: "Users", icon: Users },
  { href: "/dashboard", label: "Settings", icon: Settings },
];

export function DashboardShell({ children }: Readonly<{ children: ReactNode }>) {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [date, setDate] = useState("2026-05-26");
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark-dashboard", darkMode);
  }, [darkMode]);

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const query = String(formData.get("query") ?? "").trim().toLowerCase();
    if (!query) return;
    if (query.includes("stock") || query.includes("sku") || query.includes("inventory")) {
      router.push(`/inventory?search=${encodeURIComponent(query)}`);
      return;
    }
    if (query.includes("task") || query.includes("line") || query.includes("production")) {
      router.push(`/production?search=${encodeURIComponent(query)}`);
      return;
    }
    router.push(`/dashboard?search=${encodeURIComponent(query)}`);
  }

  async function exportReport() {
    const response = await fetch("/api/reports/export");
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "naptech-factory-report.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  function logout() {
    window.localStorage.removeItem("naptech_demo_session");
    router.push("/login");
  }

  return (
    <div className="min-h-screen bg-[#F7F9FB] text-[#111827] transition-colors dark-dashboard:bg-[#07111A] dark-dashboard:text-slate-100">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-[236px] flex-col border-r border-white/10 bg-[#020B14] text-white transition-transform duration-300 lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-[76px] items-center justify-between px-4">
          <Link className="flex items-center gap-2.5" href="/dashboard">
            <Image alt="Naptech" className="h-10 w-10 rounded-xl object-contain" height={40} src="/logo.png" width={40} />
            <div>
              <p className="text-lg font-semibold tracking-normal text-[#19C93B]">NAPTECH</p>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white">Factory OS</p>
            </div>
          </Link>
          <button className="rounded-full border border-white/20 p-2 text-slate-400 lg:hidden" onClick={() => setOpen(false)} type="button">
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pb-2">
          <NavLink active={pathname === "/dashboard"} href="/dashboard" icon={Home} label="Dashboard" onClick={() => setOpen(false)} />
          <NavGroup items={operations} label="Operations" pathname={pathname} setOpen={setOpen} />
          <NavGroup items={management} label="Management" pathname={pathname} setOpen={setOpen} />
          <NavGroup items={system} label="System" pathname={pathname} setOpen={setOpen} />
        </nav>

        <div className="m-3 rounded-xl border border-white/10 bg-white/5 p-2.5">
          <div className="flex items-center gap-2.5">
            <div className="relative grid h-8 w-8 place-items-center rounded-full bg-[#19C93B] text-xs font-bold text-white">
              A
              <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full border border-[#020B14] bg-[#8BFF4D]" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-white">Admin User</p>
              <p className="text-[10px] text-slate-400">Super Admin</p>
            </div>
            <button onClick={logout} type="button">
              <ChevronDown size={16} />
            </button>
          </div>
        </div>
      </aside>

      <div className="lg:pl-[236px]">
        <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/85 px-4 py-3 backdrop-blur-xl transition-colors dark-dashboard:border-white/10 dark-dashboard:bg-[#07111A]/90 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-700 shadow-sm lg:hidden"
                onClick={() => setOpen(true)}
                type="button"
              >
                <Menu size={20} />
              </button>
              <form className="hidden h-11 w-[340px] items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 shadow-sm transition-colors dark-dashboard:border-white/10 dark-dashboard:bg-white/5 md:flex" onSubmit={handleSearch}>
                <Search size={18} className="text-slate-500" />
                <input className="w-full bg-transparent text-sm outline-none dark-dashboard:text-white" name="query" placeholder="Search anything..." />
                <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-500">⌘K</span>
              </form>
            </div>

            <div className="flex items-center gap-3">
              <button
                aria-label="Toggle dark theme"
                className="grid h-10 w-10 place-items-center rounded-xl text-slate-700 transition hover:bg-slate-100 dark-dashboard:text-slate-200 dark-dashboard:hover:bg-white/10"
                onClick={() => setDarkMode((value) => !value)}
                type="button"
              >
                {darkMode ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              <Link className="relative grid h-10 w-10 place-items-center rounded-xl text-slate-700 transition hover:bg-slate-100" href="/notifications">
                <Bell size={18} />
                <span className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-[#19C93B] text-[10px] font-bold text-white">5</span>
              </Link>
              <button className="flex items-center gap-2 text-sm font-semibold text-[#087B25] dark-dashboard:text-[#8BFF4D]" onClick={() => setProfileOpen((value) => !value)} type="button">
                Admin
                <ChevronDown size={16} />
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-normal text-[#111827] dark-dashboard:text-white">Welcome back, Admin! 👋</h1>
              <p className="mt-1 text-sm text-[#6B7280] dark-dashboard:text-slate-400">Here&apos;s what&apos;s happening in your factory today.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm dark-dashboard:border-white/10 dark-dashboard:bg-white/5 dark-dashboard:text-slate-200">
                <CalendarDays size={17} />
                <input className="bg-transparent outline-none" onChange={(event) => setDate(event.target.value)} type="date" value={date} />
              </label>
              <button className="flex h-10 items-center gap-2 rounded-xl bg-[#19C93B] px-5 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(25,201,59,0.25)] transition hover:-translate-y-0.5" onClick={exportReport} type="button">
                <Download size={17} />
                Export Report
              </button>
            </div>
          </div>

          {profileOpen ? (
            <div className="absolute right-8 top-16 z-50 w-52 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
              <button className="w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50" onClick={() => router.push("/dashboard")} type="button">
                Profile
              </button>
              <button className="w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-red-600 hover:bg-red-50" onClick={logout} type="button">
                Logout
              </button>
            </div>
          ) : null}
        </header>

        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}

function NavGroup({
  items,
  label,
  pathname,
  setOpen,
}: Readonly<{
  items: Array<{ href: string; label: string; icon: LucideIcon; count?: number }>;
  label: string;
  pathname: string;
  setOpen: (open: boolean) => void;
}>) {
  return (
    <div className="mt-4">
      <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <div className="space-y-0.5">
        {items.map((item) => (
          <NavLink
            active={pathname === item.href && item.label !== "Work Orders" && item.label !== "Quality" && item.label !== "Maintenance"}
            count={item.count}
            href={item.href}
            icon={item.icon}
            key={`${label}-${item.label}`}
            label={item.label}
            onClick={() => setOpen(false)}
          />
        ))}
      </div>
    </div>
  );
}

function NavLink({
  active,
  count,
  href,
  icon: Icon,
  label,
  onClick,
}: Readonly<{
  active: boolean;
  count?: number;
  href: string;
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}>) {
  return (
    <Link
      className={cn(
        "group flex items-center justify-between rounded-xl px-3 py-2 text-[13px] font-medium text-slate-300 transition hover:bg-white/5 hover:text-white",
        active && "bg-[#19C93B] text-white shadow-[0_0_18px_rgba(25,201,59,0.24)]",
      )}
      href={href}
      onClick={onClick}
    >
      <span className="flex items-center gap-2.5">
        <Icon size={16} />
        {label}
      </span>
      {count ? <span className="grid h-6 w-6 place-items-center rounded-full bg-[#19C93B] text-[11px] font-bold text-white">{count}</span> : <ChevronDown className="rotate-[-90deg] text-slate-500" size={13} />}
    </Link>
  );
}
