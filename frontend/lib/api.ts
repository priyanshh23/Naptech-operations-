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
  MaintenanceJob,
  MaintenanceJobListResponse,
  MaintenanceJobPayload,
  Notification,
  ProductionEntry,
  ProductionEntryListResponse,
  ProductionEntryPayload,
  ProductionSummary,
  ProductionTask,
  QualityRejection,
  QualityRejectionListResponse,
  QualityRejectionPayload,
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

function formatApiErrorDetail(detail: unknown): string {
  if (typeof detail === "string") {
    return detail;
  }

  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (typeof item === "string") {
          return item;
        }
        if (item && typeof item === "object" && "msg" in item && typeof item.msg === "string") {
          const location =
            "loc" in item && Array.isArray(item.loc)
              ? item.loc.filter((part: unknown) => part !== "body").join(".")
              : "";
          return location ? `${location}: ${item.msg}` : item.msg;
        }
        return JSON.stringify(item);
      })
      .filter(Boolean)
      .join("; ");
  }

  if (detail && typeof detail === "object") {
    if ("message" in detail && typeof detail.message === "string") {
      return detail.message;
    }
    if ("error" in detail && typeof detail.error === "string") {
      return detail.error;
    }
    return JSON.stringify(detail);
  }

  return "";
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
            const payload = JSON.parse(raw) as { detail?: unknown };
            detail = formatApiErrorDetail(payload.detail) || raw;
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

export function forgotPassword(payload: {
  email: string;
  reset_code: string;
  new_password: string;
}): Promise<{ message: string }> {
  return request<{ message: string }>("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function changePassword(payload: {
  current_password: string;
  new_password: string;
}): Promise<{ message: string }> {
  return request<{ message: string }>("/auth/change-password", {
    method: "POST",
    body: JSON.stringify(payload),
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

type ApiQualityRejection = {
  id: number;
  date: string;
  shift: "A" | "B" | "C";
  serial_number: string;
  machine_number: string;
  part_name: string;
  rejection_quantity: number;
  reason: string;
  cause: string;
  cr_mr: "CR" | "MR";
  remarks: string | null;
  updated_at: string;
};

function fromApiQuality(row: ApiQualityRejection): QualityRejection {
  return {
    id: row.id,
    date: row.date,
    shift: row.shift,
    serialNumber: row.serial_number,
    machineNumber: row.machine_number,
    partName: row.part_name,
    rejectionQuantity: row.rejection_quantity,
    reason: row.reason,
    cause: row.cause,
    crMr: row.cr_mr,
    remarks: row.remarks ?? "",
    timestamp: row.updated_at,
  };
}

function toApiQuality(payload: QualityRejectionPayload) {
  return {
    date: payload.date,
    shift: payload.shift,
    serial_number: payload.serialNumber,
    machine_number: payload.machineNumber,
    part_name: payload.partName,
    rejection_quantity: payload.rejectionQuantity,
    reason: payload.reason,
    cause: payload.cause,
    cr_mr: payload.crMr,
    remarks: payload.remarks || null,
  };
}

function toApiQualityUpdate(payload: Partial<QualityRejectionPayload>) {
  return {
    ...(payload.date !== undefined ? { date: payload.date } : {}),
    ...(payload.shift !== undefined ? { shift: payload.shift } : {}),
    ...(payload.serialNumber !== undefined ? { serial_number: payload.serialNumber } : {}),
    ...(payload.machineNumber !== undefined ? { machine_number: payload.machineNumber } : {}),
    ...(payload.partName !== undefined ? { part_name: payload.partName } : {}),
    ...(payload.rejectionQuantity !== undefined ? { rejection_quantity: payload.rejectionQuantity } : {}),
    ...(payload.reason !== undefined ? { reason: payload.reason } : {}),
    ...(payload.cause !== undefined ? { cause: payload.cause } : {}),
    ...(payload.crMr !== undefined ? { cr_mr: payload.crMr } : {}),
    ...(payload.remarks !== undefined ? { remarks: payload.remarks || null } : {}),
  };
}

export async function getQualityRejections(params?: { search?: string }): Promise<QualityRejectionListResponse> {
  const query = new URLSearchParams();
  if (params?.search) query.set("search", params.search);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  const response = await request<{ items: ApiQualityRejection[]; total: number }>(`/quality-rejections${suffix}`);
  return { items: response.items.map(fromApiQuality), total: response.total };
}

export async function createQualityRejection(payload: QualityRejectionPayload): Promise<QualityRejection> {
  const response = await request<ApiQualityRejection>("/quality-rejections", {
    method: "POST",
    body: JSON.stringify(toApiQuality(payload)),
  });
  return fromApiQuality(response);
}

export async function updateQualityRejection(entryId: number, payload: Partial<QualityRejectionPayload>): Promise<QualityRejection> {
  const response = await request<ApiQualityRejection>(`/quality-rejections/${entryId}`, {
    method: "PUT",
    body: JSON.stringify(toApiQualityUpdate(payload)),
  });
  return fromApiQuality(response);
}

export async function deleteQualityRejection(entryId: number): Promise<void> {
  await request<undefined>(`/quality-rejections/${entryId}`, {
    method: "DELETE",
  });
}

type ApiMaintenanceJob = {
  id: number;
  job_code: string;
  machine: string;
  team: string;
  priority: "High" | "Medium" | "Low";
  status: "Pending" | "In Progress" | "Completed";
  breakdown_from: string;
  breakdown_to: string;
  reason: string;
  due_by: string;
};

function fromApiMaintenance(row: ApiMaintenanceJob): MaintenanceJob {
  return {
    id: row.id,
    jobCode: row.job_code,
    machine: row.machine,
    team: row.team,
    priority: row.priority,
    status: row.status,
    breakdownFrom: row.breakdown_from,
    breakdownTo: row.breakdown_to,
    reason: row.reason,
    dueBy: row.due_by,
  };
}

function toApiMaintenance(payload: Partial<MaintenanceJobPayload>) {
  return {
    machine: payload.machine,
    team: payload.team,
    priority: payload.priority,
    status: payload.status,
    breakdown_from: payload.breakdownFrom,
    breakdown_to: payload.breakdownTo,
    reason: payload.reason,
    due_by: payload.dueBy,
  };
}

export async function getMaintenanceJobs(params?: { search?: string }): Promise<MaintenanceJobListResponse> {
  const query = new URLSearchParams();
  if (params?.search) query.set("search", params.search);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  const response = await request<{ items: ApiMaintenanceJob[]; total: number }>(`/maintenance-jobs${suffix}`);
  return { items: response.items.map(fromApiMaintenance), total: response.total };
}

export async function createMaintenanceJob(payload: MaintenanceJobPayload): Promise<MaintenanceJob> {
  const response = await request<ApiMaintenanceJob>("/maintenance-jobs", {
    method: "POST",
    body: JSON.stringify(toApiMaintenance(payload)),
  });
  return fromApiMaintenance(response);
}

export async function updateMaintenanceJob(jobId: number, payload: Partial<MaintenanceJobPayload>): Promise<MaintenanceJob> {
  const response = await request<ApiMaintenanceJob>(`/maintenance-jobs/${jobId}`, {
    method: "PUT",
    body: JSON.stringify(toApiMaintenance(payload)),
  });
  return fromApiMaintenance(response);
}

export async function deleteMaintenanceJob(jobId: number): Promise<void> {
  await request<undefined>(`/maintenance-jobs/${jobId}`, {
    method: "DELETE",
  });
}
