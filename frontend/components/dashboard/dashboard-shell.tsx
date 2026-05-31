"use client";

import {
  Bell,
  Boxes,
  ChevronDown,
  Home,
  LayoutDashboard,
  Menu,
  Moon,
  PackageCheck,
  Search,
  Shield,
  Sun,
  Wrench,
  X,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";

import { cn } from "@/lib/utils";
import { getNotifications } from "@/lib/api";
import type { Role } from "@/lib/types";
import { canUseDepartment, roleLabel } from "@/lib/permissions";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  department: "inventory" | "production" | "quality" | "maintenance";
  count?: number;
  match?: (pathname: string) => boolean;
};

const operations: NavItem[] = [
  { href: "/production", label: "Production", icon: PackageCheck, department: "production", match: (pathname) => pathname === "/production" },
  { href: "/inventory-entry", label: "Inventory", icon: Boxes, department: "inventory", match: (pathname) => pathname === "/inventory-entry" || pathname === "/inventory-logs" || pathname === "/inventory" },
  { href: "/quality", label: "Quality", icon: Shield, department: "quality", match: (pathname) => pathname === "/quality" },
  { href: "/maintenance", label: "Maintenance", icon: Wrench, department: "maintenance", match: (pathname) => pathname === "/maintenance" },
];

type ManagementItem = Omit<NavItem, "department">;

const management: ManagementItem[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/notifications", label: "Alerts", icon: Bell },
];

export function DashboardShell({
  children,
  headerActions,
}: Readonly<{
  children: ReactNode;
  headerActions?: ReactNode;
}>) {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isSessionChecked, setIsSessionChecked] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [userName, setUserName] = useState("Supervisor Demo");
  const [userRole, setUserRole] = useState("Supervisor");
  const [role, setRole] = useState<Role>("manager");
  const [alertCount, setAlertCount] = useState(0);

  useEffect(() => {
    const token = window.localStorage.getItem("naptech_access_token");
    if (!token) {
      router.replace("/login");
      return;
    }

    const saved = window.localStorage.getItem("naptech_dark_mode");
    const initialDarkMode = saved === null ? window.matchMedia("(prefers-color-scheme: dark)").matches : saved === "true";
    const savedUser = window.localStorage.getItem("naptech_user");
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser) as { name?: string; role?: string };
        setUserName(parsedUser.name || "Supervisor Demo");
        setRole((parsedUser.role as Role) || "manager");
        setUserRole(parsedUser.role ? roleLabel(parsedUser.role as Role) : "Manager");
      } catch {
        setUserName("Supervisor Demo");
        setRole("manager");
        setUserRole("Manager");
      }
    }
    setDarkMode(initialDarkMode);
    setIsMounted(true);
    setIsSessionChecked(true);
    void getNotifications()
      .then((items) => setAlertCount(items.filter((item) => !item.is_read).length))
      .catch(() => setAlertCount(0));
  }, [router]);

  useEffect(() => {
    if (!isMounted) return;
    document.documentElement.classList.toggle("dark", darkMode);
    window.localStorage.setItem("naptech_dark_mode", String(darkMode));
  }, [darkMode, isMounted]);

  const closeSidebar = useCallback(() => setOpen(false), []);
  const openSidebar = useCallback(() => setOpen(true), []);
  const toggleTheme = useCallback(() => setDarkMode((value) => !value), []);
  const toggleProfile = useCallback(() => setProfileOpen((value) => !value), []);

  const handleSearch = useCallback((event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const query = String(formData.get("query") ?? "").trim();
    if (!query) return;
    router.push(`/search?query=${encodeURIComponent(query)}`);
  }, [router]);

  const logout = useCallback(() => {
    window.localStorage.removeItem("naptech_demo_session");
    window.localStorage.removeItem("naptech_access_token");
    window.localStorage.removeItem("naptech_user");
    window.localStorage.removeItem("naptech_dark_mode");
    document.documentElement.classList.remove("dark");
    router.replace("/login");
  }, [router]);

  const isDashboard = useMemo(() => pathname === "/dashboard", [pathname]);
  const visibleOperations = useMemo(
    () => operations.filter((item) => canUseDepartment({ id: 0, name: userName, email: "", role }, item.department)),
    [role, userName],
  );

  if (!isSessionChecked) {
    return null;
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#F7F9FB] text-[#111827] transition-colors dark:bg-[#07111A] dark:text-slate-100">
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
          <button className="rounded-full border border-white/20 p-2 text-slate-400 lg:hidden" onClick={closeSidebar} type="button">
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pb-2">
          <NavLink active={isDashboard} href="/dashboard" icon={Home} label="Overview" onClick={closeSidebar} />
          <NavGroup items={visibleOperations} label="Operations" pathname={pathname} setOpen={closeSidebar} />
          <NavGroup items={management} label="Management" pathname={pathname} setOpen={closeSidebar} />
        </nav>

        <div className="m-3 rounded-xl border border-white/10 bg-white/5 p-2.5">
          <div className="flex items-center gap-2.5">
            <div className="relative grid h-8 w-8 place-items-center rounded-full bg-[#19C93B] text-xs font-bold text-white">
              A
              <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full border border-[#020B14] bg-[#8BFF4D]" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-white">{userName}</p>
              <p className="text-[10px] uppercase text-slate-400">{userRole}</p>
            </div>
            <button aria-label="Admin menu" type="button">
              <ChevronDown size={16} />
            </button>
          </div>
        </div>
      </aside>

      <div className="min-w-0 overflow-x-hidden lg:pl-[236px]">
        <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/85 px-4 py-3 backdrop-blur-xl transition-colors dark:border-white/10 dark:bg-[#07111A]/90 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-700 shadow-sm lg:hidden"
                onClick={openSidebar}
                type="button"
              >
                <Menu size={20} />
              </button>
              <form className="hidden h-11 w-[340px] items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 shadow-sm transition-colors dark:border-white/10 dark:bg-white/5 md:flex" onSubmit={handleSearch}>
                <Search size={18} className="text-slate-500" />
                <input className="w-full bg-transparent text-sm outline-none dark:text-white" name="query" placeholder="Search inventory, machine, quality..." />
                <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-500">⌘K</span>
              </form>
            </div>

            <div className="flex items-center gap-3">
              <button
                aria-label="Toggle dark theme"
                className="grid h-10 w-10 place-items-center rounded-xl text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10"
                onClick={toggleTheme}
                type="button"
              >
                {!isMounted ? <Moon size={18} /> : darkMode ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              <Link className="relative grid h-10 w-10 place-items-center rounded-xl text-slate-700 transition hover:bg-slate-100" href="/notifications">
                <Bell size={18} />
                {alertCount ? (
                  <span className="absolute right-1 top-1 grid h-5 min-w-5 place-items-center rounded-full bg-[#19C93B] px-1 text-[10px] font-bold text-white">
                    {alertCount > 9 ? "9+" : alertCount}
                  </span>
                ) : null}
              </Link>
              <button className="flex items-center gap-2 text-sm font-semibold text-[#087B25] dark:text-[#8BFF4D]" onClick={toggleProfile} type="button">
                {userName.split(" ")[0]}
                <ChevronDown size={16} />
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-normal text-[#111827] dark:text-white">Factory Overview</h1>
              <p className="mt-1 text-sm text-[#6B7280] dark:text-slate-400">Inventory, production, quality, and maintenance in one operational view.</p>
            </div>
            {headerActions ? <div className="flex flex-wrap items-end gap-3">{headerActions}</div> : null}
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

        <main className="min-w-0 overflow-x-hidden p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}

const NavGroup = memo(function NavGroup({
  items,
  label,
  pathname,
  setOpen,
}: Readonly<{
  items: Array<NavItem | ManagementItem>;
  label: string;
  pathname: string;
  setOpen: () => void;
}>) {
  return (
    <div className="mt-4">
      <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <div className="space-y-0.5">
        {items.map((item) => (
          <NavLink
            active={item.match ? item.match(pathname) : pathname === item.href}
            count={item.count}
            href={item.href}
            icon={item.icon}
            key={`${label}-${item.label}`}
            label={item.label}
            onClick={setOpen}
          />
        ))}
      </div>
    </div>
  );
});

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
