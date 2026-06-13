import type {
  AuthResponse,
  CalibrationSheet,
  CalibrationSheetListResponse,
  CalibrationSheetPayload,
  DashboardSummary,
  GaugeHistoryCard,
  GaugeHistoryCardListResponse,
  GaugeHistoryCardPayload,
  GaugeInventory,
  GaugeInventoryListResponse,
  GaugeInventoryPayload,
  GaugeStock,
  GaugeStockListResponse,
  GaugeStockPayload,
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
const dataChangedEventName = "naptech:data-changed";
const dataChangedStorageKey = "naptech_data_changed_at";

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

function notifyDataChanged(path: string, method: string): void {
  if (typeof window === "undefined" || method === "GET" || path.startsWith("/auth/")) {
    return;
  }

  const timestamp = String(Date.now());
  window.localStorage.setItem(dataChangedStorageKey, timestamp);
  window.dispatchEvent(new CustomEvent(dataChangedEventName, { detail: { path, timestamp } }));
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
        if (response.status === 404 && init?.method === "DELETE") {
          notifyDataChanged(path, init.method);
          return undefined as T;
        }

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
        notifyDataChanged(path, init?.method || "GET");
        return undefined as T;
      }

      const payload = (await response.json()) as T;
      notifyDataChanged(path, init?.method || "GET");
      return payload;
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
  job_work: "Yes" | "No";
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
    jobWork: row.job_work ?? "No",
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
    job_work: payload.jobWork,
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
    ...(payload.jobWork !== undefined ? { job_work: payload.jobWork } : {}),
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

type ApiGaugeInventory = {
  id: number;
  gauge_name: string;
  gauge_specification: string;
  gauge_type: string;
  gauge_qty: number;
  gauge_no: string;
  wear_and_tear: "Yes" | "No";
  gauge_company: string;
  created_by: string;
  updated_at: string;
};

function fromApiGaugeInventory(row: ApiGaugeInventory): GaugeInventory {
  return {
    id: row.id,
    gaugeName: row.gauge_name,
    gaugeSpecification: row.gauge_specification,
    gaugeType: row.gauge_type,
    gaugeQty: row.gauge_qty,
    gaugeNo: row.gauge_no,
    wearAndTear: row.wear_and_tear,
    gaugeCompany: row.gauge_company,
    createdBy: row.created_by,
    updatedAt: row.updated_at,
  };
}

function toApiGaugeInventory(payload: Partial<GaugeInventoryPayload>) {
  return {
    ...(payload.gaugeName !== undefined ? { gauge_name: payload.gaugeName } : {}),
    ...(payload.gaugeSpecification !== undefined ? { gauge_specification: payload.gaugeSpecification } : {}),
    ...(payload.gaugeType !== undefined ? { gauge_type: payload.gaugeType } : {}),
    ...(payload.gaugeQty !== undefined ? { gauge_qty: payload.gaugeQty } : {}),
    ...(payload.gaugeNo !== undefined ? { gauge_no: payload.gaugeNo } : {}),
    ...(payload.wearAndTear !== undefined ? { wear_and_tear: payload.wearAndTear } : {}),
    ...(payload.gaugeCompany !== undefined ? { gauge_company: payload.gaugeCompany } : {}),
  };
}

export async function getGaugeInventory(params?: { search?: string }): Promise<GaugeInventoryListResponse> {
  const query = new URLSearchParams();
  if (params?.search) query.set("search", params.search);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  const response = await request<{ items: ApiGaugeInventory[]; total: number }>(`/gauge-inventory${suffix}`);
  return { items: response.items.map(fromApiGaugeInventory), total: response.total };
}

export async function createGaugeInventory(payload: GaugeInventoryPayload): Promise<GaugeInventory> {
  const response = await request<ApiGaugeInventory>("/gauge-inventory", {
    method: "POST",
    body: JSON.stringify(toApiGaugeInventory(payload)),
  });
  return fromApiGaugeInventory(response);
}

export async function updateGaugeInventory(entryId: number, payload: Partial<GaugeInventoryPayload>): Promise<GaugeInventory> {
  const response = await request<ApiGaugeInventory>(`/gauge-inventory/${entryId}`, {
    method: "PUT",
    body: JSON.stringify(toApiGaugeInventory(payload)),
  });
  return fromApiGaugeInventory(response);
}

export async function deleteGaugeInventory(entryId: number): Promise<void> {
  await request<undefined>(`/gauge-inventory/${entryId}`, {
    method: "DELETE",
  });
}

type ApiGaugeStock = {
  id: number;
  gauge_stock_qty: number;
  gauge_type: string;
  gauge_part_name: string;
  created_by: string;
  updated_at: string;
};

function fromApiGaugeStock(row: ApiGaugeStock): GaugeStock {
  return {
    id: row.id,
    gaugeStockQty: row.gauge_stock_qty,
    gaugeType: row.gauge_type,
    gaugePartName: row.gauge_part_name,
    createdBy: row.created_by,
    updatedAt: row.updated_at,
  };
}

function toApiGaugeStock(payload: Partial<GaugeStockPayload>) {
  return {
    ...(payload.gaugeStockQty !== undefined ? { gauge_stock_qty: payload.gaugeStockQty } : {}),
    ...(payload.gaugeType !== undefined ? { gauge_type: payload.gaugeType } : {}),
    ...(payload.gaugePartName !== undefined ? { gauge_part_name: payload.gaugePartName } : {}),
  };
}

export async function getGaugeStock(params?: { search?: string }): Promise<GaugeStockListResponse> {
  const query = new URLSearchParams();
  if (params?.search) query.set("search", params.search);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  const response = await request<{ items: ApiGaugeStock[]; total: number }>(`/gauge-stock${suffix}`);
  return { items: response.items.map(fromApiGaugeStock), total: response.total };
}

export async function createGaugeStock(payload: GaugeStockPayload): Promise<GaugeStock> {
  const response = await request<ApiGaugeStock>("/gauge-stock", {
    method: "POST",
    body: JSON.stringify(toApiGaugeStock(payload)),
  });
  return fromApiGaugeStock(response);
}

export async function updateGaugeStock(entryId: number, payload: Partial<GaugeStockPayload>): Promise<GaugeStock> {
  const response = await request<ApiGaugeStock>(`/gauge-stock/${entryId}`, {
    method: "PUT",
    body: JSON.stringify(toApiGaugeStock(payload)),
  });
  return fromApiGaugeStock(response);
}

export async function deleteGaugeStock(entryId: number): Promise<void> {
  await request<undefined>(`/gauge-stock/${entryId}`, {
    method: "DELETE",
  });
}

type ApiCalibrationSheet = {
  id: number;
  serial_number: string;
  equipment_name: string;
  make: string;
  equipment_no: string;
  quantity: number;
  range_size: string;
  least_count: string;
  frequency_calibration: string;
  calibrated_on: string;
  calibration_due_on: string;
  location: string;
  remark: string;
  created_by: string;
  updated_at: string;
};

function fromApiCalibrationSheet(row: ApiCalibrationSheet): CalibrationSheet {
  return {
    id: row.id,
    serialNumber: row.serial_number,
    equipmentName: row.equipment_name,
    make: row.make,
    equipmentNo: row.equipment_no,
    quantity: row.quantity,
    rangeSize: row.range_size,
    leastCount: row.least_count,
    frequencyCalibration: row.frequency_calibration,
    calibratedOn: row.calibrated_on,
    calibrationDueOn: row.calibration_due_on,
    location: row.location,
    remark: row.remark ?? "",
    createdBy: row.created_by,
    updatedAt: row.updated_at,
  };
}

function toApiCalibrationSheet(payload: Partial<CalibrationSheetPayload>) {
  return {
    ...(payload.serialNumber !== undefined ? { serial_number: payload.serialNumber } : {}),
    ...(payload.equipmentName !== undefined ? { equipment_name: payload.equipmentName } : {}),
    ...(payload.make !== undefined ? { make: payload.make } : {}),
    ...(payload.equipmentNo !== undefined ? { equipment_no: payload.equipmentNo } : {}),
    ...(payload.quantity !== undefined ? { quantity: payload.quantity } : {}),
    ...(payload.rangeSize !== undefined ? { range_size: payload.rangeSize } : {}),
    ...(payload.leastCount !== undefined ? { least_count: payload.leastCount } : {}),
    ...(payload.frequencyCalibration !== undefined ? { frequency_calibration: payload.frequencyCalibration } : {}),
    ...(payload.calibratedOn !== undefined ? { calibrated_on: payload.calibratedOn } : {}),
    ...(payload.calibrationDueOn !== undefined ? { calibration_due_on: payload.calibrationDueOn } : {}),
    ...(payload.location !== undefined ? { location: payload.location } : {}),
    ...(payload.remark !== undefined ? { remark: payload.remark } : {}),
  };
}

export async function getCalibrationSheets(params?: { search?: string }): Promise<CalibrationSheetListResponse> {
  const query = new URLSearchParams();
  if (params?.search) query.set("search", params.search);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  const response = await request<{ items: ApiCalibrationSheet[]; total: number }>(`/calibration-sheets${suffix}`);
  return { items: response.items.map(fromApiCalibrationSheet), total: response.total };
}

export async function createCalibrationSheet(payload: CalibrationSheetPayload): Promise<CalibrationSheet> {
  const response = await request<ApiCalibrationSheet>("/calibration-sheets", {
    method: "POST",
    body: JSON.stringify(toApiCalibrationSheet(payload)),
  });
  return fromApiCalibrationSheet(response);
}

export async function updateCalibrationSheet(entryId: number, payload: Partial<CalibrationSheetPayload>): Promise<CalibrationSheet> {
  const response = await request<ApiCalibrationSheet>(`/calibration-sheets/${entryId}`, {
    method: "PUT",
    body: JSON.stringify(toApiCalibrationSheet(payload)),
  });
  return fromApiCalibrationSheet(response);
}

export async function deleteCalibrationSheet(entryId: number): Promise<void> {
  await request<undefined>(`/calibration-sheets/${entryId}`, {
    method: "DELETE",
  });
}

type ApiGaugeHistoryCard = {
  id: number;
  description: string;
  control_no: string;
  validation_standard: string;
  location: string;
  frequency_of_validation: string;
  serial_number: string;
  inspection_item: string;
  specification: string;
  inspection_instruments: string;
  remarks: string;
  validation_date: string;
  observation_a: string;
  observation_b: string;
  observation_c: string;
  observation_d: string;
  observation_e: string;
  judgment: string;
  due_date: string;
  rectification_done: string;
  inspection_by: string;
  hod: string;
  created_by: string;
  updated_at: string;
};

function fromApiGaugeHistoryCard(row: ApiGaugeHistoryCard): GaugeHistoryCard {
  return {
    id: row.id,
    description: row.description,
    controlNo: row.control_no,
    validationStandard: row.validation_standard,
    location: row.location,
    frequencyOfValidation: row.frequency_of_validation,
    serialNumber: row.serial_number,
    inspectionItem: row.inspection_item,
    specification: row.specification,
    inspectionInstruments: row.inspection_instruments,
    remarks: row.remarks ?? "",
    validationDate: row.validation_date,
    observationA: row.observation_a ?? "",
    observationB: row.observation_b ?? "",
    observationC: row.observation_c ?? "",
    observationD: row.observation_d ?? "",
    observationE: row.observation_e ?? "",
    judgment: row.judgment,
    dueDate: row.due_date,
    rectificationDone: row.rectification_done ?? "",
    inspectionBy: row.inspection_by,
    hod: row.hod,
    createdBy: row.created_by,
    updatedAt: row.updated_at,
  };
}

function toApiGaugeHistoryCard(payload: Partial<GaugeHistoryCardPayload>) {
  return {
    ...(payload.description !== undefined ? { description: payload.description } : {}),
    ...(payload.controlNo !== undefined ? { control_no: payload.controlNo } : {}),
    ...(payload.validationStandard !== undefined ? { validation_standard: payload.validationStandard } : {}),
    ...(payload.location !== undefined ? { location: payload.location } : {}),
    ...(payload.frequencyOfValidation !== undefined ? { frequency_of_validation: payload.frequencyOfValidation } : {}),
    ...(payload.serialNumber !== undefined ? { serial_number: payload.serialNumber } : {}),
    ...(payload.inspectionItem !== undefined ? { inspection_item: payload.inspectionItem } : {}),
    ...(payload.specification !== undefined ? { specification: payload.specification } : {}),
    ...(payload.inspectionInstruments !== undefined ? { inspection_instruments: payload.inspectionInstruments } : {}),
    ...(payload.remarks !== undefined ? { remarks: payload.remarks } : {}),
    ...(payload.validationDate !== undefined ? { validation_date: payload.validationDate } : {}),
    ...(payload.observationA !== undefined ? { observation_a: payload.observationA } : {}),
    ...(payload.observationB !== undefined ? { observation_b: payload.observationB } : {}),
    ...(payload.observationC !== undefined ? { observation_c: payload.observationC } : {}),
    ...(payload.observationD !== undefined ? { observation_d: payload.observationD } : {}),
    ...(payload.observationE !== undefined ? { observation_e: payload.observationE } : {}),
    ...(payload.judgment !== undefined ? { judgment: payload.judgment } : {}),
    ...(payload.dueDate !== undefined ? { due_date: payload.dueDate } : {}),
    ...(payload.rectificationDone !== undefined ? { rectification_done: payload.rectificationDone } : {}),
    ...(payload.inspectionBy !== undefined ? { inspection_by: payload.inspectionBy } : {}),
    ...(payload.hod !== undefined ? { hod: payload.hod } : {}),
  };
}

export async function getGaugeHistoryCards(params?: { search?: string }): Promise<GaugeHistoryCardListResponse> {
  const query = new URLSearchParams();
  if (params?.search) query.set("search", params.search);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  const response = await request<{ items: ApiGaugeHistoryCard[]; total: number }>(`/gauge-history-cards${suffix}`);
  return { items: response.items.map(fromApiGaugeHistoryCard), total: response.total };
}

export async function createGaugeHistoryCard(payload: GaugeHistoryCardPayload): Promise<GaugeHistoryCard> {
  const response = await request<ApiGaugeHistoryCard>("/gauge-history-cards", {
    method: "POST",
    body: JSON.stringify(toApiGaugeHistoryCard(payload)),
  });
  return fromApiGaugeHistoryCard(response);
}

export async function updateGaugeHistoryCard(entryId: number, payload: Partial<GaugeHistoryCardPayload>): Promise<GaugeHistoryCard> {
  const response = await request<ApiGaugeHistoryCard>(`/gauge-history-cards/${entryId}`, {
    method: "PUT",
    body: JSON.stringify(toApiGaugeHistoryCard(payload)),
  });
  return fromApiGaugeHistoryCard(response);
}

export async function deleteGaugeHistoryCard(entryId: number): Promise<void> {
  await request<undefined>(`/gauge-history-cards/${entryId}`, {
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
