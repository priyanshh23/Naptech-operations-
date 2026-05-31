import type {
  AuthResponse,
  DashboardSummary,
  InventoryBalancePreview,
  InventoryEntry,
  InventoryEntryListResponse,
  InventoryEntryPayload,
  InventoryLogListResponse,
  InventorySummary,
  MachineAnalyticsRow,
  Notification,
  ProductionEntry,
  ProductionEntryListResponse,
  ProductionEntryPayload,
  ProductionSummary,
  ProductionTask,
} from "@/lib/types";

const configuredApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
const proxyBaseUrl = "/api/backend";

function clearStoredSession() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem("naptech_access_token");
  window.localStorage.removeItem("naptech_user");
  window.localStorage.removeItem("naptech_demo_session");
}

function getAuthToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem("naptech_access_token");
}

function getApiBaseUrls(): string[] {
  if (typeof window !== "undefined") {
    return [proxyBaseUrl];
  }

  return [configuredApiBaseUrl || "http://127.0.0.1:8000", "http://localhost:8000"];
}

function isNetworkErrorMessage(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("failed to fetch") ||
    normalized.includes("fetch failed") ||
    normalized.includes("networkerror") ||
    normalized.includes("load failed") ||
    normalized.includes("network request failed")
  );
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getAuthToken();
  let networkFailureCount = 0;

  for (const baseUrl of getApiBaseUrls()) {
    const headers = new Headers(init?.headers);
    headers.set("Content-Type", "application/json");
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    try {
      const response = await fetch(`${baseUrl}${path}`, {
        cache: "no-store",
        ...init,
        headers,
      });

      if (!response.ok) {
        let detail = "";
        const raw = await response.text();
        if (raw) {
          try {
            const payload = JSON.parse(raw) as { detail?: string };
            detail = payload.detail ?? raw;
          } catch {
            detail = raw;
          }
        }
        const normalizedDetail = detail.toLowerCase();
        const isAccessDenied = normalizedDetail.includes("access denied") && normalizedDetail.includes("approved company account");
        if ((response.status === 401 && path !== "/auth/login") || (response.status === 403 && isAccessDenied)) {
          clearStoredSession();
          if (typeof window !== "undefined" && window.location.pathname !== "/login") {
            window.location.href = "/login";
          }
        }
        throw new Error(detail || `Request failed: ${response.status}`);
      }

      if (response.status === 204) {
        return undefined as T;
      }

      return (await response.json()) as T;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!isNetworkErrorMessage(message)) {
        throw error instanceof Error ? error : new Error(message);
      }
      networkFailureCount += 1;
    }
  }

  if (networkFailureCount > 0) {
    throw new Error("Backend server is unavailable");
  }

  throw new Error("Request failed");
}

export function login(email: string, password: string): Promise<AuthResponse> {
  return request<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function googleLogin(token: string, tokenType: "credential" | "access_token" = "credential"): Promise<AuthResponse> {
  return request<AuthResponse>("/auth/google", {
    method: "POST",
    body: JSON.stringify(tokenType === "access_token" ? { access_token: token } : { credential: token }),
  });
}

export function getDashboardSummary(params?: {
  date_from?: string;
  date_to?: string;
}): Promise<DashboardSummary> {
  const query = new URLSearchParams();
  if (params?.date_from) query.set("date_from", params.date_from);
  if (params?.date_to) query.set("date_to", params.date_to);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return request<DashboardSummary>(`/dashboard${suffix}`);
}

export function getInventorySummary(params?: {
  date_from?: string;
  date_to?: string;
}): Promise<InventorySummary> {
  const query = new URLSearchParams();
  if (params?.date_from) query.set("date_from", params.date_from);
  if (params?.date_to) query.set("date_to", params.date_to);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return request<InventorySummary>(`/inventory-summary${suffix}`);
}

export function getInventoryEntries(params?: {
  search?: string;
  part_name?: string;
  date_from?: string;
  date_to?: string;
}): Promise<InventoryEntryListResponse> {
  const query = new URLSearchParams();
  if (params?.search) query.set("search", params.search);
  if (params?.part_name) query.set("part_name", params.part_name);
  if (params?.date_from) query.set("date_from", params.date_from);
  if (params?.date_to) query.set("date_to", params.date_to);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return request<InventoryEntryListResponse>(`/inventory-entry${suffix}`);
}

export function previewInventoryBalance(params: {
  part_name: string;
  in_quantity: number;
  out_quantity: number;
  rejection_quantity: number;
}): Promise<InventoryBalancePreview> {
  const query = new URLSearchParams({
    part_name: params.part_name,
    in_quantity: String(params.in_quantity),
    out_quantity: String(params.out_quantity),
    rejection_quantity: String(params.rejection_quantity),
  });
  return request<InventoryBalancePreview>(`/inventory-entry/preview?${query.toString()}`);
}

export function createInventoryEntry(payload: InventoryEntryPayload): Promise<InventoryEntry> {
  return request<InventoryEntry>("/inventory-entry", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateInventoryEntry(entryId: number, payload: Partial<InventoryEntryPayload>): Promise<InventoryEntry> {
  return request<InventoryEntry>(`/inventory-entry/${entryId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteInventoryEntry(entryId: number): Promise<void> {
  await request<undefined>(`/inventory-entry/${entryId}`, {
    method: "DELETE",
  });
}

export function getInventoryLogs(params: {
  page: number;
  page_size: number;
  search?: string;
  part_name?: string;
  date_from?: string;
  date_to?: string;
}): Promise<InventoryLogListResponse> {
  const query = new URLSearchParams({
    page: String(params.page),
    page_size: String(params.page_size),
  });
  if (params.search) query.set("search", params.search);
  if (params.part_name) query.set("part_name", params.part_name);
  if (params.date_from) query.set("date_from", params.date_from);
  if (params.date_to) query.set("date_to", params.date_to);
  return request<InventoryLogListResponse>(`/inventory-logs?${query.toString()}`);
}

export function getTasks(): Promise<ProductionTask[]> {
  return request<ProductionTask[]>("/tasks");
}

export function getProductionEntries(params?: {
  search?: string;
  date_from?: string;
  date_to?: string;
}): Promise<ProductionEntryListResponse> {
  const query = new URLSearchParams();
  if (params?.search) query.set("search", params.search);
  if (params?.date_from) query.set("date_from", params.date_from);
  if (params?.date_to) query.set("date_to", params.date_to);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return request<ProductionEntryListResponse>(`/production-entry${suffix}`);
}

export function createProductionEntry(payload: ProductionEntryPayload): Promise<ProductionEntry> {
  return request<ProductionEntry>("/production-entry", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function createProductionEntries(payload: ProductionEntryPayload[]): Promise<ProductionEntry[]> {
  return request<ProductionEntry[]>("/production-entry/bulk", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateProductionEntry(entryId: number, payload: Partial<ProductionEntryPayload>): Promise<ProductionEntry> {
  return request<ProductionEntry>(`/production-entry/${entryId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteProductionEntry(entryId: number): Promise<void> {
  await request<undefined>(`/production-entry/${entryId}`, {
    method: "DELETE",
  });
}

export function getProductionSummary(params?: {
  date_from?: string;
  date_to?: string;
}): Promise<ProductionSummary> {
  const query = new URLSearchParams();
  if (params?.date_from) query.set("date_from", params.date_from);
  if (params?.date_to) query.set("date_to", params.date_to);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return request<ProductionSummary>(`/production-summary${suffix}`);
}

export function getMachineAnalytics(params?: {
  date_from?: string;
  date_to?: string;
}): Promise<MachineAnalyticsRow[]> {
  const query = new URLSearchParams();
  if (params?.date_from) query.set("date_from", params.date_from);
  if (params?.date_to) query.set("date_to", params.date_to);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return request<MachineAnalyticsRow[]>(`/machine-analytics${suffix}`);
}

export function getNotifications(): Promise<Notification[]> {
  return request<Notification[]>("/notifications");
}
