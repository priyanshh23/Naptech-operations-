import type { AuthUser, Role } from "@/lib/types";
import { useEffect, useState } from "react";

const fullAccessEmails = new Set(["priyanshgupta9877@gmail.com", "naptechprecision@gmail.com"]);

export function hasFullAccessEmail(user: AuthUser | null): boolean {
  return Boolean(user && fullAccessEmails.has(user.email.trim().toLowerCase()));
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null;

  try {
    const user = JSON.parse(window.localStorage.getItem("naptech_user") || "null") as AuthUser | null;
    if (user && hasFullAccessEmail(user) && user.role !== "manager") {
      const upgradedUser = { ...user, role: "manager" as Role };
      window.localStorage.setItem("naptech_user", JSON.stringify(upgradedUser));
      return upgradedUser;
    }
    return user;
  } catch {
    return null;
  }
}

export function useStoredUser() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setUser(getStoredUser());
    setIsReady(true);
  }, []);

  return { isReady, user };
}

export function canDeleteEntries(user: AuthUser | null): boolean {
  return hasFullAccessEmail(user);
}

export function canUseDepartment(user: AuthUser | null, _department: "inventory" | "production" | "quality" | "maintenance"): boolean {
  return hasFullAccessEmail(user);
}

export function roleLabel(role: Role): string {
  return role.replace("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
