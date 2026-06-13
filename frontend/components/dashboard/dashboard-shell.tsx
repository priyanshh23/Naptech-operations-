"use client";

import {
  Bell,
  Boxes,
  ChevronDown,
  Home,
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
import { changePassword, getNotifications } from "@/lib/api";
import type { Role } from "@/lib/types";
import { hasFullAccessEmail, canUseDepartment, roleLabel } from "@/lib/permissions";

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
  const [userName, setUserName] = useState("Admin");
  const [userEmail, setUserEmail] = useState("priyanshgupta9877@gmail.com");
  const [userRole, setUserRole] = useState("Manager");
  const [role, setRole] = useState<Role>("manager");
  const [alertCount, setAlertCount] = useState(0);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

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
        const parsedUser = JSON.parse(savedUser) as { email?: string; name?: string; role?: string };
        const parsedEmail = parsedUser.email || "priyanshgupta9877@gmail.com";
        const parsedRole = (parsedUser.role || "manager") as Role;
        const normalizedUser = {
          id: 0,
          name: parsedUser.name || "Admin",
          email: parsedEmail,
          role: parsedRole,
        };
        const displayRole = hasFullAccessEmail(normalizedUser) && parsedRole !== "admin" ? "manager" : parsedRole;
        setUserName(parsedUser.name || "Admin");
        setUserEmail(parsedEmail);
        setRole(displayRole);
        setUserRole(roleLabel(displayRole));
      } catch {
        setUserName("Admin");
        setUserEmail("priyanshgupta9877@gmail.com");
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

  const handlePasswordChange = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPasswordError("");
    setPasswordMessage("");
    setIsChangingPassword(true);

    const formData = new FormData(event.currentTarget);
    const currentPassword = String(formData.get("currentPassword"));
    const newPassword = String(formData.get("newPassword"));
    const confirmPassword = String(formData.get("confirmPassword"));

    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirm password do not match.");
      setIsChangingPassword(false);
      return;
    }

    try {
      const response = await changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });
      setPasswordMessage(response.message);
      event.currentTarget.reset();
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : "Password could not be changed.");
    } finally {
      setIsChangingPassword(false);
    }
  }, []);

  const isDashboard = useMemo(() => pathname === "/dashboard", [pathname]);
  const visibleOperations = useMemo(
    () => operations.filter((item) => canUseDepartment({ id: 0, name: userName, email: userEmail, role }, item.department)),
    [role, userEmail, userName],
  );

  if (!isSessionChecked) {
    return null;
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#F7F9FB] text-[#111827] transition-colors dark:bg-[#07111A] dark:text-slate-100">
      {open ? (
        <button
          aria-label="Close navigation"
          className="fixed inset-0 z-[35] bg-[#020B14]/70 backdrop-blur-sm lg:hidden"
          onClick={closeSidebar}
          type="button"
        />
      ) : null}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-[212px] flex-col border-r border-white/10 bg-[#020B14] text-white transition-transform duration-300 lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-[70px] items-center justify-between px-3">
          <Link className="flex items-center gap-2.5" href="/dashboard">
            <Image alt="Naptech" className="h-12 w-12 object-contain" height={48} src="/logo.png" width={48} />
            <div>
              <p className="text-base font-semibold tracking-normal text-[#19C93B]">NAPTECH</p>
              <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white">Factory OS</p>
            </div>
          </Link>
          <button className="rounded-full border border-white/20 p-2 text-slate-400 lg:hidden" onClick={closeSidebar} type="button">
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-2.5 pb-2">
          <NavLink active={isDashboard} href="/dashboard" icon={Home} label="Overview" onClick={closeSidebar} />
          <NavGroup items={visibleOperations} label="Operations" pathname={pathname} setOpen={closeSidebar} />
          <NavGroup items={management} label="Management" pathname={pathname} setOpen={closeSidebar} />
        </nav>

        <div className="m-2.5 rounded-xl border border-white/10 bg-white/5 p-2.5">
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

      <div className="min-w-0 overflow-x-hidden lg:pl-[212px]">
        <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/85 px-3 py-3 backdrop-blur-xl transition-colors dark:border-white/10 dark:bg-[#07111A]/90 sm:px-4 lg:px-8 relative">
          <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4">
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
              <div className="relative">
                <button className="flex items-center gap-2 text-sm font-semibold text-[#087B25] dark:text-[#8BFF4D]" onClick={toggleProfile} type="button">
                  {userName.split(" ")[0]}
                  <ChevronDown size={16} />
                </button>
                {profileOpen ? (
                  <div className="absolute right-0 top-full z-[90] mt-1.5 w-24 rounded-lg border border-slate-200 bg-white p-1 shadow-xl dark:border-white/10 dark:bg-[#151F2A]">
                    <button className="flex min-h-8 w-full items-center rounded-md px-2.5 py-1.5 text-left text-xs font-semibold leading-none text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10" onClick={logout} type="button">
                      Logout
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className={cn("mt-3 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between", profileOpen && "pt-10 sm:pt-0")}>
            <div className={cn("min-w-0", headerActions && "xl:max-w-[420px] 2xl:max-w-[560px]")}>
              <h1 className="text-xl font-semibold tracking-normal text-[#111827] dark:text-white sm:text-2xl">Factory Overview</h1>
              <p className="mt-1 text-sm text-[#6B7280] dark:text-slate-400">Inventory, production, quality, and maintenance in one operational view.</p>
            </div>
            {headerActions ? <div className="w-full min-w-0 xl:w-auto">{headerActions}</div> : null}
          </div>

        </header>

        <main className="min-w-0 overflow-x-hidden p-3 sm:p-4 lg:p-6">{children}</main>
      </div>

      {passwordOpen ? (
        <div className="modal-overlay">
          <form className="modal-card max-w-md space-y-4" onSubmit={handlePasswordChange}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#19C93B]">Account security</p>
                <h2 className="mt-2 text-xl font-semibold text-slate-950 dark:text-white">Change password</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">Use your current password, then set a new one.</p>
              </div>
              <button className="rounded-full border border-slate-200 p-2 text-slate-500 dark:border-white/15" onClick={() => setPasswordOpen(false)} type="button">
                <X size={18} />
              </button>
            </div>

            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
              Current password
              <input className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none dark:border-white/15 dark:bg-[#1F2933] dark:text-white" name="currentPassword" required type="password" />
            </label>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
              New password
              <input className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none dark:border-white/15 dark:bg-[#1F2933] dark:text-white" minLength={6} name="newPassword" required type="password" />
            </label>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
              Confirm new password
              <input className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none dark:border-white/15 dark:bg-[#1F2933] dark:text-white" minLength={6} name="confirmPassword" required type="password" />
            </label>

            {passwordError ? <p className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{passwordError}</p> : null}
            {passwordMessage ? <p className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{passwordMessage}</p> : null}

            <div className="flex justify-end gap-3">
              <button className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 dark:border-white/15 dark:text-slate-200" onClick={() => setPasswordOpen(false)} type="button">
                Cancel
              </button>
              <button className="rounded-xl bg-[#19C93B] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" disabled={isChangingPassword} type="submit">
                {isChangingPassword ? "Changing..." : "Change password"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
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
    <div className="mt-3">
      <p className="mb-1.5 px-2.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
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
        "group flex items-center justify-between rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-slate-300 transition hover:bg-white/5 hover:text-white",
        active && "bg-[#19C93B] text-white shadow-[0_0_18px_rgba(25,201,59,0.24)]",
      )}
      href={href}
      onClick={onClick}
    >
      <span className="flex items-center gap-2">
        <Icon size={15} />
        {label}
      </span>
      {count ? <span className="grid h-5 w-5 place-items-center rounded-full bg-[#19C93B] text-[10px] font-bold text-white">{count}</span> : <ChevronDown className="rotate-[-90deg] text-slate-500" size={12} />}
    </Link>
  );
}
