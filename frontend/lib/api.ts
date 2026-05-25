import {
  dashboardSummary,
  inventoryItems,
  inventoryLogs,
  notifications,
  productionTasks,
} from "@/lib/mock-data";
import type {
  DashboardSummary,
  InventoryItem,
  InventoryLog,
  Notification,
  ProductionTask,
} from "@/lib/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

async function request<T>(path: string, fallback: T): Promise<T> {
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      return fallback;
    }

    return (await response.json()) as T;
  } catch {
    return fallback;
  }
}

export function getDashboardSummary(): Promise<DashboardSummary> {
  return request("/dashboard", dashboardSummary);
}

export function getInventory(): Promise<InventoryItem[]> {
  return request("/inventory", inventoryItems);
}

export function getInventoryLogs(): Promise<InventoryLog[]> {
  return request("/inventory/logs", inventoryLogs);
}

export function getTasks(): Promise<ProductionTask[]> {
  return request("/tasks", productionTasks);
}

export function getNotifications(): Promise<Notification[]> {
  return request("/notifications", notifications);
}

