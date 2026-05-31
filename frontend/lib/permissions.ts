import type { AuthUser, Role } from "@/lib/types";
import { useEffect, useState } from "react";

const deleteRoles: Role[] = ["manager"];

export function getStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null;

  try {
    return JSON.parse(window.localStorage.getItem("naptech_user") || "null") as AuthUser | null;
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
  return Boolean(user && deleteRoles.includes(user.role));
}

export function canUseDepartment(user: AuthUser | null, department: "inventory" | "production" | "quality" | "maintenance"): boolean {
  if (!user) return false;
  if (["admin", "manager", "supervisor"].includes(user.role)) return true;
  if (department === "maintenance") return false;
  return user.role === department;
}

export function roleLabel(role: Role): string {
  return role.replace("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
