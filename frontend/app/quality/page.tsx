"use client";

import { ChevronLeft, ChevronRight, Download, FileText, Pencil, Plus, Save, Search, Trash2, X } from "lucide-react";
import type { FormEvent, ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

import { AccessDenied } from "@/components/dashboard/access-denied";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { DatePickerField } from "@/components/ui/date-picker-field";
import { Badge, Button, Card, PageHeader } from "@/components/ui";
import {
  createCalibrationSheet,
  createGaugeHistoryCard,
  createGaugeInventory,
  createGaugeStock,
  createQualityRejection,
  deleteCalibrationSheet,
  deleteGaugeHistoryCard,
  deleteGaugeInventory,
  deleteGaugeStock,
  deleteQualityRejection,
  getCalibrationSheets,
  getGaugeHistoryCards,
  getGaugeInventory,
  getGaugeStock,
  getQualityRejections,
  updateCalibrationSheet,
  updateGaugeHistoryCard,
  updateGaugeInventory,
  updateGaugeStock,
  updateQualityRejection,
} from "@/lib/api";
import { downloadExcel, printPdf } from "@/lib/export-utils";
import { formatDate, formatDateTime } from "@/lib/format";
import { canDeleteEntries, canUseDepartment, useStoredUser } from "@/lib/permissions";
import type {
  CalibrationSheet,
  CalibrationSheetPayload,
  GaugeHistoryCard,
  GaugeHistoryCardPayload,
  GaugeInventory,
  GaugeInventoryPayload,
  GaugeStock,
  GaugeStockPayload,
  QualityRejection,
  QualityRejectionPayload,
} from "@/lib/types";

const PAGE_SIZE = 10;

type QualityTab = "rejections" | "gaugeInventory" | "gaugeStock" | "calibrationSheet" | "gaugeHistory";

const initialRejectionForm = {
  date: new Date().toISOString().slice(0, 10),
  shift: "A" as QualityRejection["shift"],
  serialNumber: "",
  machineNumber: "",
  partName: "",
  rejectionQuantity: 0,
  reason: "",
  cause: "-",
  crMr: "MR" as QualityRejection["crMr"],
  jobWork: "No" as QualityRejection["jobWork"],
  remarks: "",
};

const initialGaugeInventoryForm: GaugeInventoryPayload = {
  gaugeName: "",
  gaugeSpecification: "",
  gaugeType: "",
  gaugeQty: 0,
  gaugeNo: "",
  wearAndTear: "No",
  gaugeCompany: "",
};

const initialGaugeStockForm: GaugeStockPayload = {
  gaugeStockQty: 0,
  gaugeType: "",
  gaugePartName: "",
};

const initialCalibrationSheetForm: CalibrationSheetPayload = {
  serialNumber: "",
  equipmentName: "",
  make: "",
  equipmentNo: "",
  quantity: 0,
  rangeSize: "",
  leastCount: "",
  frequencyCalibration: "",
  calibratedOn: "",
  calibrationDueOn: "",
  location: "",
  remark: "",
};

const initialGaugeHistoryForm: GaugeHistoryCardPayload = {
  description: "",
  controlNo: "",
  validationStandard: "",
  location: "",
  frequencyOfValidation: "",
  serialNumber: "",
  inspectionItem: "",
  specification: "",
  inspectionInstruments: "",
  remarks: "",
  validationDate: "",
  observationA: "",
  observationB: "",
  observationC: "",
  observationD: "",
  observationE: "",
  judgment: "",
  dueDate: "",
  rectificationDone: "",
  inspectionBy: "",
  hod: "",
};

export default function QualityPage() {
  const [activeTab, setActiveTab] = useState<QualityTab>("rejections");
  const [qualityRows, setQualityRows] = useState<QualityRejection[]>([]);
  const [gaugeInventoryRows, setGaugeInventoryRows] = useState<GaugeInventory[]>([]);
  const [gaugeStockRows, setGaugeStockRows] = useState<GaugeStock[]>([]);
  const [calibrationRows, setCalibrationRows] = useState<CalibrationSheet[]>([]);
  const [gaugeHistoryRows, setGaugeHistoryRows] = useState<GaugeHistoryCard[]>([]);
  const [rejectionForm, setRejectionForm] = useState(initialRejectionForm);
  const [gaugeInventoryForm, setGaugeInventoryForm] = useState<GaugeInventoryPayload>(initialGaugeInventoryForm);
  const [gaugeStockForm, setGaugeStockForm] = useState<GaugeStockPayload>(initialGaugeStockForm);
  const [calibrationForm, setCalibrationForm] = useState<CalibrationSheetPayload>(initialCalibrationSheetForm);
  const [gaugeHistoryForm, setGaugeHistoryForm] = useState<GaugeHistoryCardPayload>(initialGaugeHistoryForm);
  const [editingRejectionId, setEditingRejectionId] = useState<number | null>(null);
  const [editingGaugeInventoryId, setEditingGaugeInventoryId] = useState<number | null>(null);
  const [editingGaugeStockId, setEditingGaugeStockId] = useState<number | null>(null);
  const [editingCalibrationId, setEditingCalibrationId] = useState<number | null>(null);
  const [editingGaugeHistoryId, setEditingGaugeHistoryId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [savedQualityForms, setSavedQualityForms] = useState<Set<QualityTab>>(new Set());
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const deletedIdsRef = useRef<Set<string>>(new Set());
  const { isReady: isUserReady, user: currentUser } = useStoredUser();
  const canDelete = canDeleteEntries(currentUser);
  const canAccess = canUseDepartment(currentUser, "quality");

  const filteredRejections = qualityRows;
  const filteredGaugeInventory = gaugeInventoryRows;
  const filteredGaugeStock = gaugeStockRows;
  const filteredCalibrationRows = calibrationRows;
  const filteredGaugeHistoryRows = gaugeHistoryRows;
  const totals = useMemo(
    () => ({
      rejection: qualityRows.reduce((sum, row) => sum + row.rejectionQuantity, 0),
      mr: qualityRows.filter((row) => row.crMr === "MR").reduce((sum, row) => sum + row.rejectionQuantity, 0),
      cr: qualityRows.filter((row) => row.crMr === "CR").reduce((sum, row) => sum + row.rejectionQuantity, 0),
    }),
    [qualityRows],
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const initialSearch = params.get("search")?.trim();
    const initialTab = params.get("tab") as QualityTab | null;
    if (initialTab && ["rejections", "gaugeInventory", "gaugeStock", "calibrationSheet", "gaugeHistory"].includes(initialTab)) {
      setActiveTab(initialTab);
    }
    if (initialSearch) setSearch(initialSearch);
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadAllQualityData(search);
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [activeTab, search]);

  useEffect(() => {
    if (!message || message.startsWith("Editing ")) return;

    const timeoutId = window.setTimeout(() => {
      setMessage("");
    }, 3000);

    return () => window.clearTimeout(timeoutId);
  }, [message]);

  if (!isUserReady) {
    return (
      <DashboardShell>
        <Card className="rounded-2xl p-8 text-sm text-slate-500">Loading quality access...</Card>
      </DashboardShell>
    );
  }

  if (!canAccess) {
    return (
      <DashboardShell>
        <AccessDenied department="Quality" />
      </DashboardShell>
    );
  }

  async function loadAllQualityData(searchTerm = search) {
    setError("");
    try {
      const params = { search: searchTerm.trim() || undefined };
      const [rejections, gauges, stock, calibration, history] = await Promise.all([
        getQualityRejections(params),
        getGaugeInventory(params),
        getGaugeStock(params),
        getCalibrationSheets(params),
        getGaugeHistoryCards(params),
      ]);
      setQualityRows(withoutDeletedIds(rejections.items, "rejection"));
      setGaugeInventoryRows(withoutDeletedIds(gauges.items, "gaugeInventory"));
      setGaugeStockRows(withoutDeletedIds(stock.items, "gaugeStock"));
      setCalibrationRows(withoutDeletedIds(calibration.items, "calibrationSheet"));
      setGaugeHistoryRows(withoutDeletedIds(history.items, "gaugeHistory"));
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to load quality data.");
    }
  }

  function withoutDeletedIds<T extends { id: number }>(items: T[], scope: string): T[] {
    return items.filter((item) => !deletedIdsRef.current.has(`${scope}:${item.id}`));
  }

  function setQualityFormSaved(tab: QualityTab, isSaved: boolean) {
    setSavedQualityForms((current) => {
      const next = new Set(current);
      if (isSaved) {
        next.add(tab);
      } else {
        next.delete(tab);
      }
      return next;
    });
  }

  async function handleRejectionSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSavingRef.current) return;

    setMessage("");
    setError("");
    isSavingRef.current = true;
    setIsSaving(true);

    try {
      if (editingRejectionId) {
        await updateQualityRejection(editingRejectionId, normalizeRejectionForm());
        setEditingRejectionId(null);
        setMessage("Daily rejection row updated.");
      } else {
        await createQualityRejection(normalizeRejectionForm());
        setMessage("Daily rejection row saved.");
      }
      setRejectionForm({ ...initialRejectionForm, date: rejectionForm.date, shift: rejectionForm.shift });
      setQualityFormSaved("rejections", true);
      await loadAllQualityData();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Daily rejection row could not be saved.");
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  }

  async function handleGaugeInventorySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");

    try {
      const payload = normalizeGaugeInventoryForm();
      if (editingGaugeInventoryId) {
        await updateGaugeInventory(editingGaugeInventoryId, payload);
        setEditingGaugeInventoryId(null);
        setMessage("Gauge inventory row updated.");
      } else {
        await createGaugeInventory(payload);
        setMessage("Gauge inventory row saved.");
      }
      setGaugeInventoryForm(initialGaugeInventoryForm);
      setQualityFormSaved("gaugeInventory", true);
      await loadAllQualityData();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Gauge inventory row could not be saved.");
    }
  }

  async function handleGaugeStockSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");

    try {
      const payload = normalizeGaugeStockForm();
      if (editingGaugeStockId) {
        await updateGaugeStock(editingGaugeStockId, payload);
        setEditingGaugeStockId(null);
        setMessage("Gauge stock row updated.");
      } else {
        await createGaugeStock(payload);
        setMessage("Gauge stock row saved.");
      }
      setGaugeStockForm(initialGaugeStockForm);
      setQualityFormSaved("gaugeStock", true);
      await loadAllQualityData();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Gauge stock row could not be saved.");
    }
  }

  async function handleCalibrationSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");

    try {
      const payload = normalizeCalibrationForm();
      if (editingCalibrationId) {
        await updateCalibrationSheet(editingCalibrationId, payload);
        setEditingCalibrationId(null);
        setMessage("Calibration sheet row updated.");
      } else {
        await createCalibrationSheet(payload);
        setMessage("Calibration sheet row saved.");
      }
      setCalibrationForm(initialCalibrationSheetForm);
      setQualityFormSaved("calibrationSheet", true);
      await loadAllQualityData();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Calibration sheet row could not be saved.");
    }
  }

  async function handleGaugeHistorySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");

    try {
      const payload = normalizeGaugeHistoryForm();
      if (editingGaugeHistoryId) {
        await updateGaugeHistoryCard(editingGaugeHistoryId, payload);
        setEditingGaugeHistoryId(null);
        setMessage("Gauge history card row updated.");
      } else {
        await createGaugeHistoryCard(payload);
        setMessage("Gauge history card row saved.");
      }
      setGaugeHistoryForm(initialGaugeHistoryForm);
      setQualityFormSaved("gaugeHistory", true);
      await loadAllQualityData();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Gauge history card row could not be saved.");
    }
  }

  function normalizeRejectionForm(): QualityRejectionPayload {
    return {
      date: rejectionForm.date,
      shift: rejectionForm.shift,
      serialNumber: rejectionForm.serialNumber.trim(),
      machineNumber: rejectionForm.machineNumber.trim(),
      partName: rejectionForm.partName.trim(),
      rejectionQuantity: Number(rejectionForm.rejectionQuantity || 0),
      reason: rejectionForm.reason.trim(),
      cause: "-",
      crMr: rejectionForm.crMr,
      jobWork: rejectionForm.jobWork,
      remarks: rejectionForm.remarks.trim(),
    };
  }

  function normalizeGaugeInventoryForm(): GaugeInventoryPayload {
    return {
      gaugeName: gaugeInventoryForm.gaugeName.trim(),
      gaugeSpecification: gaugeInventoryForm.gaugeSpecification.trim(),
      gaugeType: gaugeInventoryForm.gaugeType.trim(),
      gaugeQty: Number(gaugeInventoryForm.gaugeQty || 0),
      gaugeNo: gaugeInventoryForm.gaugeNo.trim(),
      wearAndTear: gaugeInventoryForm.wearAndTear,
      gaugeCompany: gaugeInventoryForm.gaugeCompany.trim(),
    };
  }

  function normalizeGaugeStockForm(): GaugeStockPayload {
    return {
      gaugeStockQty: Number(gaugeStockForm.gaugeStockQty || 0),
      gaugeType: gaugeStockForm.gaugeType.trim(),
      gaugePartName: gaugeStockForm.gaugePartName.trim(),
    };
  }

  function normalizeCalibrationForm(): CalibrationSheetPayload {
    return {
      serialNumber: calibrationForm.serialNumber.trim(),
      equipmentName: calibrationForm.equipmentName.trim(),
      make: calibrationForm.make.trim(),
      equipmentNo: calibrationForm.equipmentNo.trim(),
      quantity: Number(calibrationForm.quantity || 0),
      rangeSize: calibrationForm.rangeSize.trim(),
      leastCount: calibrationForm.leastCount.trim(),
      frequencyCalibration: calibrationForm.frequencyCalibration.trim(),
      calibratedOn: calibrationForm.calibratedOn.trim(),
      calibrationDueOn: calibrationForm.calibrationDueOn.trim(),
      location: calibrationForm.location.trim(),
      remark: calibrationForm.remark.trim(),
    };
  }

  function normalizeGaugeHistoryForm(): GaugeHistoryCardPayload {
    return {
      description: gaugeHistoryForm.description.trim(),
      controlNo: gaugeHistoryForm.controlNo.trim(),
      validationStandard: gaugeHistoryForm.validationStandard.trim(),
      location: gaugeHistoryForm.location.trim(),
      frequencyOfValidation: gaugeHistoryForm.frequencyOfValidation.trim(),
      serialNumber: gaugeHistoryForm.serialNumber.trim(),
      inspectionItem: gaugeHistoryForm.inspectionItem.trim(),
      specification: gaugeHistoryForm.specification.trim(),
      inspectionInstruments: gaugeHistoryForm.inspectionInstruments.trim(),
      remarks: gaugeHistoryForm.remarks.trim(),
      validationDate: gaugeHistoryForm.validationDate.trim(),
      observationA: gaugeHistoryForm.observationA.trim(),
      observationB: gaugeHistoryForm.observationB.trim(),
      observationC: gaugeHistoryForm.observationC.trim(),
      observationD: gaugeHistoryForm.observationD.trim(),
      observationE: gaugeHistoryForm.observationE.trim(),
      judgment: gaugeHistoryForm.judgment.trim(),
      dueDate: gaugeHistoryForm.dueDate.trim(),
      rectificationDone: gaugeHistoryForm.rectificationDone.trim(),
      inspectionBy: gaugeHistoryForm.inspectionBy.trim(),
      hod: gaugeHistoryForm.hod.trim(),
    };
  }

  function startRejectionEdit(row: QualityRejection) {
    setEditingRejectionId(row.id);
    setActiveTab("rejections");
    setQualityFormSaved("rejections", false);
    setRejectionForm({
      date: row.date.slice(0, 10),
      shift: row.shift,
      serialNumber: row.serialNumber,
      machineNumber: row.machineNumber,
      partName: row.partName,
      rejectionQuantity: row.rejectionQuantity,
      reason: row.reason,
      cause: "-",
      crMr: row.crMr,
      jobWork: row.jobWork ?? "No",
      remarks: row.remarks,
    });
    setMessage(`Editing rejection row ${row.serialNumber || row.id}.`);
  }

  function startGaugeInventoryEdit(row: GaugeInventory) {
    setEditingGaugeInventoryId(row.id);
    setActiveTab("gaugeInventory");
    setQualityFormSaved("gaugeInventory", false);
    setGaugeInventoryForm({
      gaugeName: row.gaugeName,
      gaugeSpecification: row.gaugeSpecification,
      gaugeType: row.gaugeType,
      gaugeQty: row.gaugeQty,
      gaugeNo: row.gaugeNo,
      wearAndTear: row.wearAndTear,
      gaugeCompany: row.gaugeCompany,
    });
    setMessage(`Editing gauge ${row.gaugeNo}.`);
  }

  function startGaugeStockEdit(row: GaugeStock) {
    setEditingGaugeStockId(row.id);
    setActiveTab("gaugeStock");
    setQualityFormSaved("gaugeStock", false);
    setGaugeStockForm({
      gaugeStockQty: row.gaugeStockQty,
      gaugeType: row.gaugeType,
      gaugePartName: row.gaugePartName,
    });
    setMessage(`Editing gauge stock for ${row.gaugePartName}.`);
  }

  function startCalibrationEdit(row: CalibrationSheet) {
    setEditingCalibrationId(row.id);
    setActiveTab("calibrationSheet");
    setQualityFormSaved("calibrationSheet", false);
    setCalibrationForm({
      serialNumber: row.serialNumber,
      equipmentName: row.equipmentName,
      make: row.make,
      equipmentNo: row.equipmentNo,
      quantity: row.quantity,
      rangeSize: row.rangeSize,
      leastCount: row.leastCount,
      frequencyCalibration: row.frequencyCalibration,
      calibratedOn: row.calibratedOn,
      calibrationDueOn: row.calibrationDueOn,
      location: row.location,
      remark: row.remark,
    });
    setMessage(`Editing calibration row ${row.serialNumber}.`);
  }

  function startGaugeHistoryEdit(row: GaugeHistoryCard) {
    setEditingGaugeHistoryId(row.id);
    setActiveTab("gaugeHistory");
    setQualityFormSaved("gaugeHistory", false);
    setGaugeHistoryForm({
      description: row.description,
      controlNo: row.controlNo,
      validationStandard: row.validationStandard,
      location: row.location,
      frequencyOfValidation: row.frequencyOfValidation,
      serialNumber: row.serialNumber,
      inspectionItem: row.inspectionItem,
      specification: row.specification,
      inspectionInstruments: row.inspectionInstruments,
      remarks: row.remarks,
      validationDate: row.validationDate,
      observationA: row.observationA,
      observationB: row.observationB,
      observationC: row.observationC,
      observationD: row.observationD,
      observationE: row.observationE,
      judgment: row.judgment,
      dueDate: row.dueDate,
      rectificationDone: row.rectificationDone,
      inspectionBy: row.inspectionBy,
      hod: row.hod,
    });
    setMessage(`Editing gauge history ${row.controlNo}.`);
  }

  async function handleDelete(scope: "rejection" | "gaugeInventory" | "gaugeStock" | "calibrationSheet" | "gaugeHistory", id: number, label: string) {
    const key = `${scope}:${id}`;
    if (deletedIdsRef.current.has(key)) return;
    if (!window.confirm(`Delete ${label}?`)) return;

    deletedIdsRef.current.add(key);
    setError("");
    try {
      if (scope === "rejection") await deleteQualityRejection(id);
      if (scope === "gaugeInventory") await deleteGaugeInventory(id);
      if (scope === "gaugeStock") await deleteGaugeStock(id);
      if (scope === "calibrationSheet") await deleteCalibrationSheet(id);
      if (scope === "gaugeHistory") await deleteGaugeHistoryCard(id);
      setMessage(`${label} deleted.`);
      await loadAllQualityData();
    } catch (error) {
      deletedIdsRef.current.delete(key);
      setError(error instanceof Error ? error.message : `${label} could not be deleted.`);
    }
  }

  function exportExcel() {
    if (activeTab === "rejections") downloadExcel("daily-rejection-report.xls", "Daily Rejection Report", qualityExportColumns, filteredRejections);
    if (activeTab === "gaugeInventory") downloadExcel("gauge-inventory.xls", "Gauge Inventory", gaugeInventoryExportColumns, filteredGaugeInventory);
    if (activeTab === "gaugeStock") downloadExcel("gauge-stock.xls", "Gauge Stock", gaugeStockExportColumns, filteredGaugeStock);
    if (activeTab === "calibrationSheet") downloadExcel("calibration-sheet.xls", "Calibration Sheet", calibrationSheetExportColumns, filteredCalibrationRows);
    if (activeTab === "gaugeHistory") downloadExcel("gauge-history-card.xls", "Gauge History Card", gaugeHistoryExportColumns, filteredGaugeHistoryRows);
  }

  function exportPdf() {
    if (activeTab === "rejections") printPdf("Daily Rejection Report", qualityExportColumns, filteredRejections);
    if (activeTab === "gaugeInventory") printPdf("Gauge Inventory", gaugeInventoryExportColumns, filteredGaugeInventory);
    if (activeTab === "gaugeStock") printPdf("Gauge Stock", gaugeStockExportColumns, filteredGaugeStock);
    if (activeTab === "calibrationSheet") printPdf("Calibration Sheet", calibrationSheetExportColumns, filteredCalibrationRows);
    if (activeTab === "gaugeHistory") printPdf("Gauge History Card", gaugeHistoryExportColumns, filteredGaugeHistoryRows);
  }

  return (
    <DashboardShell>
      <PageHeader
        action={
          <div className="flex flex-wrap gap-2">
            <button className="inline-flex h-10 items-center gap-2 rounded-md border border-border px-4 text-sm font-semibold text-slate-700" onClick={exportExcel} type="button">
              <Download size={16} />
              Excel
            </button>
            <button className="inline-flex h-10 items-center gap-2 rounded-md border border-border px-4 text-sm font-semibold text-slate-700" onClick={exportPdf} type="button">
              <FileText size={16} />
              PDF
            </button>
          </div>
        }
        description="Manage rejection reports, gauge inventory, gauge stock, calibration sheets, and gauge history in one quality workspace."
        title="Quality"
      />

      <div className="mb-5 flex flex-wrap gap-2">
        <TabButton active={activeTab === "rejections"} onClick={() => setActiveTab("rejections")}>Daily Rejection Report</TabButton>
        <TabButton active={activeTab === "gaugeInventory"} onClick={() => setActiveTab("gaugeInventory")}>Gauge Inventory</TabButton>
        <TabButton active={activeTab === "gaugeStock"} onClick={() => setActiveTab("gaugeStock")}>Gauge Stock</TabButton>
        <TabButton active={activeTab === "calibrationSheet"} onClick={() => setActiveTab("calibrationSheet")}>Calibration Sheet</TabButton>
        <TabButton active={activeTab === "gaugeHistory"} onClick={() => setActiveTab("gaugeHistory")}>Gauge History Card</TabButton>
      </div>

      {activeTab === "rejections" ? (
        <RejectionSection
          canDelete={canDelete}
          form={rejectionForm}
          isSaved={savedQualityForms.has("rejections")}
          onDelete={(row) => void handleDelete("rejection", row.id, `rejection row ${row.serialNumber || row.id}`)}
          onEdit={startRejectionEdit}
          onFormChange={(update) => {
            setQualityFormSaved("rejections", false);
            setRejectionForm((current) => ({ ...current, ...update }));
          }}
          onSubmit={handleRejectionSubmit}
          page={page}
          rows={filteredRejections}
          search={search}
          setPage={setPage}
          setSearch={setSearch}
          totals={totals}
          isEditing={Boolean(editingRejectionId)}
          onClear={() => {
            setEditingRejectionId(null);
            setRejectionForm(initialRejectionForm);
            setQualityFormSaved("rejections", false);
            setMessage("");
          }}
        />
      ) : null}

      {activeTab === "gaugeInventory" ? (
        <GaugeInventorySection
          canDelete={canDelete}
          form={gaugeInventoryForm}
          isEditing={Boolean(editingGaugeInventoryId)}
          isSaved={savedQualityForms.has("gaugeInventory")}
          onClear={() => {
            setEditingGaugeInventoryId(null);
            setGaugeInventoryForm(initialGaugeInventoryForm);
            setQualityFormSaved("gaugeInventory", false);
            setMessage("");
          }}
          onDelete={(row) => void handleDelete("gaugeInventory", row.id, `gauge ${row.gaugeNo}`)}
          onEdit={startGaugeInventoryEdit}
          onFormChange={(update) => {
            setQualityFormSaved("gaugeInventory", false);
            setGaugeInventoryForm((current) => ({ ...current, ...update }));
          }}
          onSubmit={handleGaugeInventorySubmit}
          page={page}
          rows={filteredGaugeInventory}
          search={search}
          setPage={setPage}
          setSearch={setSearch}
        />
      ) : null}

      {activeTab === "gaugeStock" ? (
        <GaugeStockSection
          canDelete={canDelete}
          form={gaugeStockForm}
          isEditing={Boolean(editingGaugeStockId)}
          isSaved={savedQualityForms.has("gaugeStock")}
          onClear={() => {
            setEditingGaugeStockId(null);
            setGaugeStockForm(initialGaugeStockForm);
            setQualityFormSaved("gaugeStock", false);
            setMessage("");
          }}
          onDelete={(row) => void handleDelete("gaugeStock", row.id, `gauge stock ${row.gaugePartName}`)}
          onEdit={startGaugeStockEdit}
          onFormChange={(update) => {
            setQualityFormSaved("gaugeStock", false);
            setGaugeStockForm((current) => ({ ...current, ...update }));
          }}
          onSubmit={handleGaugeStockSubmit}
          page={page}
          rows={filteredGaugeStock}
          search={search}
          setPage={setPage}
          setSearch={setSearch}
        />
      ) : null}

      {activeTab === "calibrationSheet" ? (
        <CalibrationSheetSection
          canDelete={canDelete}
          form={calibrationForm}
          isEditing={Boolean(editingCalibrationId)}
          isSaved={savedQualityForms.has("calibrationSheet")}
          onClear={() => {
            setEditingCalibrationId(null);
            setCalibrationForm(initialCalibrationSheetForm);
            setQualityFormSaved("calibrationSheet", false);
            setMessage("");
          }}
          onDelete={(row) => void handleDelete("calibrationSheet", row.id, `calibration row ${row.serialNumber}`)}
          onEdit={startCalibrationEdit}
          onFormChange={(update) => {
            setQualityFormSaved("calibrationSheet", false);
            setCalibrationForm((current) => ({ ...current, ...update }));
          }}
          onSubmit={handleCalibrationSubmit}
          page={page}
          rows={filteredCalibrationRows}
          search={search}
          setPage={setPage}
          setSearch={setSearch}
        />
      ) : null}

      {activeTab === "gaugeHistory" ? (
        <GaugeHistorySection
          canDelete={canDelete}
          form={gaugeHistoryForm}
          isEditing={Boolean(editingGaugeHistoryId)}
          isSaved={savedQualityForms.has("gaugeHistory")}
          onClear={() => {
            setEditingGaugeHistoryId(null);
            setGaugeHistoryForm(initialGaugeHistoryForm);
            setQualityFormSaved("gaugeHistory", false);
            setMessage("");
          }}
          onDelete={(row) => void handleDelete("gaugeHistory", row.id, `gauge history ${row.controlNo}`)}
          onEdit={startGaugeHistoryEdit}
          onFormChange={(update) => {
            setQualityFormSaved("gaugeHistory", false);
            setGaugeHistoryForm((current) => ({ ...current, ...update }));
          }}
          onSubmit={handleGaugeHistorySubmit}
          page={page}
          rows={filteredGaugeHistoryRows}
          search={search}
          setPage={setPage}
          setSearch={setSearch}
        />
      ) : null}

      {message ? <p className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{message}</p> : null}
      {error ? <p className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p> : null}
    </DashboardShell>
  );
}

function RejectionSection({
  canDelete,
  form,
  isEditing,
  isSaved,
  onClear,
  onDelete,
  onEdit,
  onFormChange,
  onSubmit,
  page,
  rows,
  search,
  setPage,
  setSearch,
  totals,
}: Readonly<{
  canDelete: boolean;
  form: typeof initialRejectionForm;
  isEditing: boolean;
  isSaved: boolean;
  onClear: () => void;
  onDelete: (row: QualityRejection) => void;
  onEdit: (row: QualityRejection) => void;
  onFormChange: (update: Partial<typeof initialRejectionForm>) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  page: number;
  rows: QualityRejection[];
  search: string;
  setPage: (updater: (current: number) => number) => void;
  setSearch: (value: string) => void;
  totals: { rejection: number; mr: number; cr: number };
}>) {
  const paginatedRows = paginate(rows, page);
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));

  return (
    <>
      <Card className="mb-5 rounded-2xl border-slate-200">
        <SectionHeading title="Daily rejection report entry" description="Enter S.No, machine, part, rejection quantity, reason, CR/MR, job work, and remarks." />
        <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-6" onSubmit={onSubmit}>
          <DatePickerField label="Date" onChange={(value) => onFormChange({ date: value })} required value={form.date} />
          <SelectField label="Shift" onChange={(value) => onFormChange({ shift: value as QualityRejection["shift"] })} value={form.shift} options={["A", "B", "C"]} />
          <Field label="S. No." onChange={(value) => onFormChange({ serialNumber: value })} placeholder="1" value={form.serialNumber} />
          <Field label="Machine Number" onChange={(value) => onFormChange({ machineNumber: value })} placeholder="CNC-08" value={form.machineNumber} />
          <Field label="Part Name" onChange={(value) => onFormChange({ partName: value })} placeholder="Ring Cap" value={form.partName} />
          <Field label="Rejection Qty." onChange={(value) => onFormChange({ rejectionQuantity: Number(value || 0) })} placeholder="1" type="number" value={String(form.rejectionQuantity)} />
          <Field label="Reason" onChange={(value) => onFormChange({ reason: value })} placeholder="Thread not OK" value={form.reason} />
          <SelectField label="CR / MR" onChange={(value) => onFormChange({ crMr: value as QualityRejection["crMr"] })} value={form.crMr} options={["MR", "CR"]} />
          <SelectField label="Job Work" onChange={(value) => onFormChange({ jobWork: value as QualityRejection["jobWork"] })} value={form.jobWork} options={["No", "Yes"]} />
          <Field label="Remarks" onChange={(value) => onFormChange({ remarks: value })} placeholder="Optional" value={form.remarks} />
          <Button className={`h-11 self-end rounded-xl ${isSaved ? "bg-emerald-500 hover:bg-emerald-500" : "bg-red-500 hover:bg-red-600"}`} disabled={isSaved || !form.serialNumber || !form.machineNumber || !form.partName || !form.reason} type="submit">
            <Save size={16} />
            {isSaved ? "Saved" : isEditing ? "Save Changes" : "Save Row"}
          </Button>
          {isEditing ? <ClearButton onClick={onClear} /> : null}
        </form>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <Summary label="Total Rejection" value={totals.rejection} />
          <Summary label="Total M/R" value={totals.mr} />
          <Summary label="Total C/R" value={totals.cr} />
        </div>
      </Card>

      <TableCard
        description="Naptech Precision Engineering rejection rows saved by shift."
        onSearchChange={setSearch}
        search={search}
        searchPlaceholder="Search machine, part, reason, CR/MR"
        title="Daily Rejection Report"
      >
        <table className="data-table w-full min-w-[1160px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase text-muted-foreground">
              {["Date", "Shift", "S. No.", "Machine Number", "Part Name", "Rejection Qty.", "Reason", "CR / MR", "Job Work", "Remarks", "Updated", "Action"].map((label) => (
                <th className="py-3 pr-4" key={label}>{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedRows.map((row) => (
              <tr className="border-b border-border last:border-0" key={row.id}>
                <td className="py-4 pr-4 text-slate-700">{formatDate(row.date)}</td>
                <td className="py-4 pr-4 text-slate-700">{row.shift}</td>
                <td className="py-4 pr-4 font-semibold text-slate-950">{row.serialNumber}</td>
                <td className="py-4 pr-4 text-slate-700">{row.machineNumber}</td>
                <td className="wrap-cell py-4 pr-4 text-slate-700">{row.partName}</td>
                <td className="py-4 pr-4 font-semibold text-slate-950">{row.rejectionQuantity}</td>
                <td className="wrap-cell py-4 pr-4 text-slate-700">{row.reason}</td>
                <td className="table-actions py-4 pr-4"><Badge tone={row.crMr === "MR" ? "warning" : "danger"}>{row.crMr}</Badge></td>
                <td className="table-actions py-4 pr-4"><Badge tone={row.jobWork === "Yes" ? "info" : "neutral"}>{row.jobWork}</Badge></td>
                <td className="wrap-cell py-4 pr-4 text-slate-700">{row.remarks || "-"}</td>
                <td className="py-4 pr-4 text-slate-700">{formatDateTime(row.timestamp)}</td>
                <ActionCell canDelete={canDelete} onDelete={() => onDelete(row)} onEdit={() => onEdit(row)} />
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination count={paginatedRows.length} page={page} setPage={setPage} total={rows.length} totalPages={totalPages} />
      </TableCard>
    </>
  );
}

function GaugeInventorySection(props: Readonly<{
  canDelete: boolean;
  form: GaugeInventoryPayload;
  isEditing: boolean;
  isSaved: boolean;
  onClear: () => void;
  onDelete: (row: GaugeInventory) => void;
  onEdit: (row: GaugeInventory) => void;
  onFormChange: (update: Partial<GaugeInventoryPayload>) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  page: number;
  rows: GaugeInventory[];
  search: string;
  setPage: (updater: (current: number) => number) => void;
  setSearch: (value: string) => void;
}>) {
  const paginatedRows = paginate(props.rows, props.page);
  const totalPages = Math.max(1, Math.ceil(props.rows.length / PAGE_SIZE));

  return (
    <>
      <Card className="mb-5 rounded-2xl border-slate-200">
        <SectionHeading title="Gauge inventory" description="Add gauge name, specification, type, quantity, number, condition, and company." />
        <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-4" onSubmit={props.onSubmit}>
          <Field label="Gauge Name" onChange={(value) => props.onFormChange({ gaugeName: value })} placeholder="Ring Gauge" value={props.form.gaugeName} />
          <Field label="Gauge Specifications" onChange={(value) => props.onFormChange({ gaugeSpecification: value })} placeholder="M10 x 1.5" value={props.form.gaugeSpecification} />
          <Field label="Gauge Type" onChange={(value) => props.onFormChange({ gaugeType: value })} placeholder="Thread Plug" value={props.form.gaugeType} />
          <Field label="Gauge Qty" onChange={(value) => props.onFormChange({ gaugeQty: Number(value || 0) })} placeholder="1" type="number" value={String(props.form.gaugeQty)} />
          <Field label="Gauge No." onChange={(value) => props.onFormChange({ gaugeNo: value })} placeholder="G-001" value={props.form.gaugeNo} />
          <SelectField label="Wear and Tear" onChange={(value) => props.onFormChange({ wearAndTear: value as GaugeInventory["wearAndTear"] })} value={props.form.wearAndTear} options={["No", "Yes"]} />
          <Field label="Gauge Company" onChange={(value) => props.onFormChange({ gaugeCompany: value })} placeholder="Mitutoyo" value={props.form.gaugeCompany} />
          <Button className={`h-11 self-end rounded-xl ${props.isSaved ? "bg-emerald-500 hover:bg-emerald-500" : "bg-red-500 hover:bg-red-600"}`} disabled={props.isSaved || !props.form.gaugeName || !props.form.gaugeSpecification || !props.form.gaugeType || !props.form.gaugeNo || !props.form.gaugeCompany} type="submit">
            <Save size={16} />
            {props.isSaved ? "Saved" : props.isEditing ? "Save Changes" : "Save Gauge"}
          </Button>
          {props.isEditing ? <ClearButton onClick={props.onClear} /> : null}
        </form>
      </Card>
      <TableCard
        description="Gauge inventory rows saved by quality."
        onSearchChange={props.setSearch}
        search={props.search}
        searchPlaceholder="Search gauge name, specification, type, number, company"
        title="Gauge Inventory"
      >
        <table className="data-table w-full min-w-[1120px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase text-muted-foreground">
              {["Gauge Name", "Gauge Specifications", "Gauge Type", "Gauge Qty", "Gauge No.", "Wear and Tear", "Gauge Company", "Updated", "Action"].map((label) => (
                <th className="py-3 pr-4" key={label}>{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedRows.map((row) => (
              <tr className="border-b border-border last:border-0" key={row.id}>
                <td className="py-4 pr-4 font-semibold text-slate-950">{row.gaugeName}</td>
                <td className="wrap-cell py-4 pr-4 text-slate-700">{row.gaugeSpecification}</td>
                <td className="py-4 pr-4 text-slate-700">{row.gaugeType}</td>
                <td className="py-4 pr-4 font-semibold text-slate-950">{row.gaugeQty}</td>
                <td className="py-4 pr-4 text-slate-700">{row.gaugeNo}</td>
                <td className="table-actions py-4 pr-4"><Badge tone={row.wearAndTear === "Yes" ? "warning" : "success"}>{row.wearAndTear}</Badge></td>
                <td className="wrap-cell py-4 pr-4 text-slate-700">{row.gaugeCompany}</td>
                <td className="py-4 pr-4 text-slate-700">{formatDateTime(row.updatedAt)}</td>
                <ActionCell canDelete={props.canDelete} onDelete={() => props.onDelete(row)} onEdit={() => props.onEdit(row)} />
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination count={paginatedRows.length} page={props.page} setPage={props.setPage} total={props.rows.length} totalPages={totalPages} />
      </TableCard>
    </>
  );
}

function GaugeStockSection(props: Readonly<{
  canDelete: boolean;
  form: GaugeStockPayload;
  isEditing: boolean;
  isSaved: boolean;
  onClear: () => void;
  onDelete: (row: GaugeStock) => void;
  onEdit: (row: GaugeStock) => void;
  onFormChange: (update: Partial<GaugeStockPayload>) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  page: number;
  rows: GaugeStock[];
  search: string;
  setPage: (updater: (current: number) => number) => void;
  setSearch: (value: string) => void;
}>) {
  const paginatedRows = paginate(props.rows, props.page);
  const totalPages = Math.max(1, Math.ceil(props.rows.length / PAGE_SIZE));

  return (
    <>
      <Card className="mb-5 rounded-2xl border-slate-200">
        <SectionHeading title="Gauge stock" description="Track gauge stock quantity, gauge type, and gauge part name." />
        <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-4" onSubmit={props.onSubmit}>
          <Field label="Gauge Stock Qty" onChange={(value) => props.onFormChange({ gaugeStockQty: Number(value || 0) })} placeholder="1" type="number" value={String(props.form.gaugeStockQty)} />
          <Field label="Gauge Type" onChange={(value) => props.onFormChange({ gaugeType: value })} placeholder="Ring Gauge" value={props.form.gaugeType} />
          <Field label="Gauge Part Name" onChange={(value) => props.onFormChange({ gaugePartName: value })} placeholder="Ring Cap" value={props.form.gaugePartName} />
          <Button className={`h-11 self-end rounded-xl ${props.isSaved ? "bg-emerald-500 hover:bg-emerald-500" : "bg-red-500 hover:bg-red-600"}`} disabled={props.isSaved || !props.form.gaugeType || !props.form.gaugePartName} type="submit">
            <Save size={16} />
            {props.isSaved ? "Saved" : props.isEditing ? "Save Changes" : "Save Stock"}
          </Button>
          {props.isEditing ? <ClearButton onClick={props.onClear} /> : null}
        </form>
      </Card>
      <TableCard
        description="Gauge stock rows saved by quality."
        onSearchChange={props.setSearch}
        search={props.search}
        searchPlaceholder="Search stock qty, gauge type, part name"
        title="Gauge Stock"
      >
        <table className="data-table w-full min-w-[760px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase text-muted-foreground">
              {["Gauge Stock Qty", "Gauge Type", "Gauge Part Name", "Updated", "Action"].map((label) => (
                <th className="py-3 pr-4" key={label}>{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedRows.map((row) => (
              <tr className="border-b border-border last:border-0" key={row.id}>
                <td className="py-4 pr-4 font-semibold text-slate-950">{row.gaugeStockQty}</td>
                <td className="py-4 pr-4 text-slate-700">{row.gaugeType}</td>
                <td className="wrap-cell py-4 pr-4 text-slate-700">{row.gaugePartName}</td>
                <td className="py-4 pr-4 text-slate-700">{formatDateTime(row.updatedAt)}</td>
                <ActionCell canDelete={props.canDelete} onDelete={() => props.onDelete(row)} onEdit={() => props.onEdit(row)} />
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination count={paginatedRows.length} page={props.page} setPage={props.setPage} total={props.rows.length} totalPages={totalPages} />
      </TableCard>
    </>
  );
}

function CalibrationSheetSection(props: Readonly<{
  canDelete: boolean;
  form: CalibrationSheetPayload;
  isEditing: boolean;
  isSaved: boolean;
  onClear: () => void;
  onDelete: (row: CalibrationSheet) => void;
  onEdit: (row: CalibrationSheet) => void;
  onFormChange: (update: Partial<CalibrationSheetPayload>) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  page: number;
  rows: CalibrationSheet[];
  search: string;
  setPage: (updater: (current: number) => number) => void;
  setSearch: (value: string) => void;
}>) {
  const paginatedRows = paginate(props.rows, props.page);
  const totalPages = Math.max(1, Math.ceil(props.rows.length / PAGE_SIZE));

  return (
    <>
      <Card className="mb-5 rounded-2xl border-slate-200">
        <SectionHeading title="Calibration sheet entry" description="Add instruments list cum calibration plan rows." />
        <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-4" onSubmit={props.onSubmit}>
          <Field label="S. No." onChange={(value) => props.onFormChange({ serialNumber: value })} placeholder="1" value={props.form.serialNumber} />
          <Field label="Equipment Name" onChange={(value) => props.onFormChange({ equipmentName: value })} placeholder="Air Gauge Unit" value={props.form.equipmentName} />
          <Field label="Make" onChange={(value) => props.onFormChange({ make: value })} placeholder="Swaroop" value={props.form.make} />
          <Field label="Equipment No." onChange={(value) => props.onFormChange({ equipmentNo: value })} placeholder="AGU-01" value={props.form.equipmentNo} />
          <Field label="Qty" onChange={(value) => props.onFormChange({ quantity: Number(value || 0) })} placeholder="1" type="number" value={String(props.form.quantity)} />
          <Field label="Range / Size" onChange={(value) => props.onFormChange({ rangeSize: value })} placeholder="+/-0.040 mm" value={props.form.rangeSize} />
          <Field label="Least Count" onChange={(value) => props.onFormChange({ leastCount: value })} placeholder="0.001" value={props.form.leastCount} />
          <Field label="Frequency Calibration" onChange={(value) => props.onFormChange({ frequencyCalibration: value })} placeholder="One year" value={props.form.frequencyCalibration} />
          <DatePickerField label="Calibrated On" onChange={(value) => props.onFormChange({ calibratedOn: value })} outputFormat="sheet" placeholder="31.01.2026" required value={props.form.calibratedOn} />
          <DatePickerField label="Calibration Due On" onChange={(value) => props.onFormChange({ calibrationDueOn: value })} outputFormat="sheet" placeholder="30.01.2027" required value={props.form.calibrationDueOn} />
          <Field label="Location" onChange={(value) => props.onFormChange({ location: value })} placeholder="Shop Floor" value={props.form.location} />
          <Field label="Remark" onChange={(value) => props.onFormChange({ remark: value })} placeholder="Optional" value={props.form.remark} />
          <Button className={`h-11 self-end rounded-xl ${props.isSaved ? "bg-emerald-500 hover:bg-emerald-500" : "bg-red-500 hover:bg-red-600"}`} disabled={props.isSaved || !props.form.serialNumber || !props.form.equipmentName || !props.form.make || !props.form.equipmentNo || !props.form.rangeSize || !props.form.leastCount || !props.form.frequencyCalibration || !props.form.calibratedOn || !props.form.calibrationDueOn || !props.form.location} type="submit">
            <Save size={16} />
            {props.isSaved ? "Saved" : props.isEditing ? "Save Changes" : "Save Calibration"}
          </Button>
          {props.isEditing ? <ClearButton onClick={props.onClear} /> : null}
        </form>
      </Card>
      <TableCard
        description="Instruments list cum calibration plan rows."
        onSearchChange={props.setSearch}
        search={props.search}
        searchPlaceholder="Search equipment, make, number, range, date, location"
        title="Calibration Sheet"
      >
        <table className="data-table w-full min-w-[1380px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase text-muted-foreground">
              {["S. No.", "Equipment Name", "Make", "Equipment No.", "Qty", "Range / Size", "Least Count", "Frequency Calibration", "Calibrated On", "Calibration Due On", "Status", "Location", "Remark", "Updated", "Action"].map((label) => (
                <th className="py-3 pr-4" key={label}>{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedRows.map((row) => (
              <tr className="border-b border-border last:border-0" key={row.id}>
                <td className="py-4 pr-4 font-semibold text-slate-950">{row.serialNumber}</td>
                <td className="wrap-cell py-4 pr-4 text-slate-700">{row.equipmentName}</td>
                <td className="py-4 pr-4 text-slate-700">{row.make}</td>
                <td className="py-4 pr-4 text-slate-700">{row.equipmentNo}</td>
                <td className="py-4 pr-4 font-semibold text-slate-950">{row.quantity}</td>
                <td className="py-4 pr-4 text-slate-700">{row.rangeSize}</td>
                <td className="py-4 pr-4 text-slate-700">{row.leastCount}</td>
                <td className="py-4 pr-4 text-slate-700">{row.frequencyCalibration}</td>
                <td className="py-4 pr-4 text-slate-700">{row.calibratedOn}</td>
                <td className="py-4 pr-4 text-slate-700">{row.calibrationDueOn}</td>
                <td className="py-4 pr-4 font-semibold text-red-600">{calibrationDueStatus(row.calibrationDueOn)}</td>
                <td className="py-4 pr-4 text-slate-700">{row.location}</td>
                <td className="wrap-cell py-4 pr-4 text-slate-700">{row.remark || "-"}</td>
                <td className="py-4 pr-4 text-slate-700">{formatDateTime(row.updatedAt)}</td>
                <ActionCell canDelete={props.canDelete} onDelete={() => props.onDelete(row)} onEdit={() => props.onEdit(row)} />
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination count={paginatedRows.length} page={props.page} setPage={props.setPage} total={props.rows.length} totalPages={totalPages} />
      </TableCard>
    </>
  );
}

function GaugeHistorySection(props: Readonly<{
  canDelete: boolean;
  form: GaugeHistoryCardPayload;
  isEditing: boolean;
  isSaved: boolean;
  onClear: () => void;
  onDelete: (row: GaugeHistoryCard) => void;
  onEdit: (row: GaugeHistoryCard) => void;
  onFormChange: (update: Partial<GaugeHistoryCardPayload>) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  page: number;
  rows: GaugeHistoryCard[];
  search: string;
  setPage: (updater: (current: number) => number) => void;
  setSearch: (value: string) => void;
}>) {
  const paginatedRows = paginate(props.rows, props.page);
  const totalPages = Math.max(1, Math.ceil(props.rows.length / PAGE_SIZE));

  return (
    <>
      <Card className="mb-5 rounded-2xl border-slate-200">
        <SectionHeading title="Gauge history card entry" description="Add gauge validation, inspection, observation, judgment, and signature rows." />
        <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-4" onSubmit={props.onSubmit}>
          <Field label="Description" onChange={(value) => props.onFormChange({ description: value })} placeholder="Gauge description" value={props.form.description} />
          <Field label="Control No." onChange={(value) => props.onFormChange({ controlNo: value })} placeholder="Control number" value={props.form.controlNo} />
          <Field label="Validation Standard" onChange={(value) => props.onFormChange({ validationStandard: value })} placeholder="WCP" value={props.form.validationStandard} />
          <Field label="Location" onChange={(value) => props.onFormChange({ location: value })} placeholder="Shop Floor" value={props.form.location} />
          <Field label="Frequency of Validation" onChange={(value) => props.onFormChange({ frequencyOfValidation: value })} placeholder="1 Year" value={props.form.frequencyOfValidation} />
          <Field label="Sr. No." onChange={(value) => props.onFormChange({ serialNumber: value })} placeholder="A" value={props.form.serialNumber} />
          <Field label="Inspection Item" onChange={(value) => props.onFormChange({ inspectionItem: value })} placeholder="Inspection item" value={props.form.inspectionItem} />
          <Field label="Specification" onChange={(value) => props.onFormChange({ specification: value })} placeholder="Specification" value={props.form.specification} />
          <Field label="Inspection Instruments" onChange={(value) => props.onFormChange({ inspectionInstruments: value })} placeholder="Instrument" value={props.form.inspectionInstruments} />
          <Field label="Remarks" onChange={(value) => props.onFormChange({ remarks: value })} placeholder="Optional" value={props.form.remarks} />
          <DatePickerField label="Validation Date" onChange={(value) => props.onFormChange({ validationDate: value })} outputFormat="sheet" placeholder="25/01/2026" required value={props.form.validationDate} />
          <Field label="Observation A" onChange={(value) => props.onFormChange({ observationA: value })} placeholder="Optional" value={props.form.observationA} />
          <Field label="Observation B" onChange={(value) => props.onFormChange({ observationB: value })} placeholder="Optional" value={props.form.observationB} />
          <Field label="Observation C" onChange={(value) => props.onFormChange({ observationC: value })} placeholder="Optional" value={props.form.observationC} />
          <Field label="Observation D" onChange={(value) => props.onFormChange({ observationD: value })} placeholder="Optional" value={props.form.observationD} />
          <Field label="Observation E" onChange={(value) => props.onFormChange({ observationE: value })} placeholder="Optional" value={props.form.observationE} />
          <Field label="Judgment" onChange={(value) => props.onFormChange({ judgment: value })} placeholder="OK / Not OK" value={props.form.judgment} />
          <DatePickerField label="Due Date" onChange={(value) => props.onFormChange({ dueDate: value })} outputFormat="sheet" placeholder="04/10/2027" required value={props.form.dueDate} />
          <Field label="Rectification Done" onChange={(value) => props.onFormChange({ rectificationDone: value })} placeholder="Optional" value={props.form.rectificationDone} />
          <Field label="Insp. By" onChange={(value) => props.onFormChange({ inspectionBy: value })} placeholder="Inspector" value={props.form.inspectionBy} />
          <Field label="HOD" onChange={(value) => props.onFormChange({ hod: value })} placeholder="HOD" value={props.form.hod} />
          <Button className={`h-11 self-end rounded-xl ${props.isSaved ? "bg-emerald-500 hover:bg-emerald-500" : "bg-red-500 hover:bg-red-600"}`} disabled={props.isSaved || !props.form.description || !props.form.controlNo || !props.form.validationStandard || !props.form.location || !props.form.frequencyOfValidation || !props.form.serialNumber || !props.form.inspectionItem || !props.form.specification || !props.form.inspectionInstruments || !props.form.validationDate || !props.form.judgment || !props.form.dueDate || !props.form.inspectionBy || !props.form.hod} type="submit">
            <Save size={16} />
            {props.isSaved ? "Saved" : props.isEditing ? "Save Changes" : "Save History"}
          </Button>
          {props.isEditing ? <ClearButton onClick={props.onClear} /> : null}
        </form>
      </Card>
      <TableCard
        description="Gauge history card validation and observation rows."
        onSearchChange={props.setSearch}
        search={props.search}
        searchPlaceholder="Search description, control no, inspection, observation, judgment"
        title="Gauge History Card"
      >
        <table className="data-table w-full min-w-[1680px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase text-muted-foreground">
              {["Description", "Control No.", "Validation Standard", "Location", "Frequency of Validation", "Sr. No.", "Inspection Item", "Specification", "Inspection Instruments", "Remarks", "Validation Date", "A", "B", "C", "D", "E", "Judgment", "Due Date", "Rectification Done", "Insp. By", "HOD", "Updated", "Action"].map((label) => (
                <th className="py-3 pr-4" key={label}>{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedRows.map((row) => (
              <tr className="border-b border-border last:border-0" key={row.id}>
                <td className="wrap-cell py-4 pr-4 font-semibold text-slate-950">{row.description}</td>
                <td className="py-4 pr-4 text-slate-700">{row.controlNo}</td>
                <td className="py-4 pr-4 text-slate-700">{row.validationStandard}</td>
                <td className="py-4 pr-4 text-slate-700">{row.location}</td>
                <td className="py-4 pr-4 text-slate-700">{row.frequencyOfValidation}</td>
                <td className="py-4 pr-4 text-slate-700">{row.serialNumber}</td>
                <td className="wrap-cell py-4 pr-4 text-slate-700">{row.inspectionItem}</td>
                <td className="py-4 pr-4 text-slate-700">{row.specification}</td>
                <td className="py-4 pr-4 text-slate-700">{row.inspectionInstruments}</td>
                <td className="wrap-cell py-4 pr-4 text-slate-700">{row.remarks || "-"}</td>
                <td className="py-4 pr-4 text-slate-700">{row.validationDate}</td>
                <td className="py-4 pr-4 text-slate-700">{row.observationA || "-"}</td>
                <td className="py-4 pr-4 text-slate-700">{row.observationB || "-"}</td>
                <td className="py-4 pr-4 text-slate-700">{row.observationC || "-"}</td>
                <td className="py-4 pr-4 text-slate-700">{row.observationD || "-"}</td>
                <td className="py-4 pr-4 text-slate-700">{row.observationE || "-"}</td>
                <td className="py-4 pr-4 font-semibold text-slate-950">{row.judgment}</td>
                <td className="py-4 pr-4 text-slate-700">{row.dueDate}</td>
                <td className="wrap-cell py-4 pr-4 text-slate-700">{row.rectificationDone || "-"}</td>
                <td className="py-4 pr-4 text-slate-700">{row.inspectionBy}</td>
                <td className="py-4 pr-4 text-slate-700">{row.hod}</td>
                <td className="py-4 pr-4 text-slate-700">{formatDateTime(row.updatedAt)}</td>
                <ActionCell canDelete={props.canDelete} onDelete={() => props.onDelete(row)} onEdit={() => props.onEdit(row)} />
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination count={paginatedRows.length} page={props.page} setPage={props.setPage} total={props.rows.length} totalPages={totalPages} />
      </TableCard>
    </>
  );
}

function TabButton({ active, children, onClick }: Readonly<{ active: boolean; children: ReactNode; onClick: () => void }>) {
  return (
    <button
      className={`h-10 rounded-xl border px-4 text-sm font-semibold transition ${
        active ? "border-[#19C93B] bg-[#19C93B]/10 text-[#087B25]" : "border-border bg-white text-slate-700 hover:bg-slate-50"
      }`}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function SectionHeading({ description, title }: Readonly<{ description: string; title: string }>) {
  return (
    <div className="mb-4 flex items-center gap-2">
      <div className="rounded-xl bg-[#19C93B]/10 p-2 text-[#19C93B]"><Plus size={18} /></div>
      <div>
        <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function TableCard({
  children,
  description,
  onSearchChange,
  search,
  searchPlaceholder,
  title,
}: Readonly<{
  children: ReactNode;
  description: string;
  onSearchChange: (value: string) => void;
  search: string;
  searchPlaceholder: string;
  title: string;
}>) {
  return (
    <Card>
      <div className="mb-4 flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <label className="relative mb-5 block w-full">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
        <input
          className="h-11 w-full rounded-xl border border-border bg-white pl-10 pr-10 text-sm outline-none focus:border-[#19C93B]/50 focus:ring-4 focus:ring-[#19C93B]/10"
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={searchPlaceholder}
          value={search}
        />
        {search ? (
          <button className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => onSearchChange("")} type="button">
            <X size={16} />
          </button>
        ) : null}
      </label>
      <div className="overflow-x-auto">{children}</div>
    </Card>
  );
}

function ActionCell({ canDelete, onDelete, onEdit }: Readonly<{ canDelete: boolean; onDelete: () => void; onEdit: () => void }>) {
  return (
    <td className="table-actions py-4 pr-4">
      <button className="mr-2 inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50" onClick={onEdit} type="button">
        <Pencil size={14} />
        Edit
      </button>
      {canDelete ? (
        <button className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-red-100 px-3 text-xs font-semibold text-red-600 transition hover:bg-red-50" onClick={onDelete} type="button">
          <Trash2 size={14} />
          Delete
        </button>
      ) : null}
    </td>
  );
}

function ClearButton({ onClick }: Readonly<{ onClick: () => void }>) {
  return (
    <button className="h-11 self-end rounded-xl border border-border px-4 text-sm font-semibold text-slate-700" onClick={onClick} type="button">
      Cancel Edit
    </button>
  );
}

function Field({
  label,
  onChange,
  placeholder,
  type = "text",
  value,
}: Readonly<{
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
  value: string;
}>) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-800">{label}</span>
      <input
        className="h-11 w-full rounded-xl border border-border px-3 outline-none focus:border-[#19C93B]/50 focus:ring-4 focus:ring-[#19C93B]/10"
        min={type === "number" ? 0 : undefined}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={!["Remarks", "Remark", "Observation A", "Observation B", "Observation C", "Observation D", "Observation E", "Rectification Done"].includes(label)}
        type={type}
        value={value}
      />
    </label>
  );
}

function SelectField({ label, onChange, options, value }: Readonly<{ label: string; onChange: (value: string) => void; options: string[]; value: string }>) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-800">{label}</span>
      <select className="h-11 w-full rounded-xl border border-border bg-white px-3 outline-none focus:border-[#19C93B]/50 focus:ring-4 focus:ring-[#19C93B]/10" onChange={(event) => onChange(event.target.value)} value={value}>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}

function Summary({ label, value }: Readonly<{ label: string; value: number }>) {
  return (
    <div className="rounded-xl border border-border bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function Pagination({
  count,
  page,
  setPage,
  total,
  totalPages,
}: Readonly<{
  count: number;
  page: number;
  setPage: (updater: (current: number) => number) => void;
  total: number;
  totalPages: number;
}>) {
  return (
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
      <p className="text-sm text-slate-500">Page {page} of {totalPages} · Showing {count} of {total}</p>
      <div className="flex gap-2">
        <button className="inline-flex h-10 items-center rounded-xl border border-border px-3 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50" disabled={page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))} type="button">
          <ChevronLeft className="mr-1" size={16} />
          Previous
        </button>
        <button className="inline-flex h-10 items-center rounded-xl border border-border px-3 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50" disabled={page >= totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))} type="button">
          Next
          <ChevronRight className="ml-1" size={16} />
        </button>
      </div>
    </div>
  );
}

function paginate<T>(rows: T[], page: number): T[] {
  return rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
}

function calibrationDueStatus(value: string): string {
  const dueDate = parseSheetDate(value);
  if (!dueDate) return "";

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return dueDate < today ? "Due" : "";
}

function parseSheetDate(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const normalized = trimmed.replaceAll("-", ".").replaceAll("/", ".");
  const parts = normalized.split(".");
  if (parts.length === 3) {
    const [first, second, third] = parts.map((part) => Number(part));
    if (Number.isFinite(first) && Number.isFinite(second) && Number.isFinite(third)) {
      const isYearFirst = parts[0].length === 4;
      const year = isYearFirst ? first : third;
      const month = isYearFirst ? second : second;
      const day = isYearFirst ? third : first;
      const parsed = new Date(year, month - 1, day);
      if (parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === day) {
        parsed.setHours(0, 0, 0, 0);
        return parsed;
      }
    }
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  parsed.setHours(0, 0, 0, 0);
  return parsed;
}

const qualityExportColumns = [
  { label: "Date", value: (row: QualityRejection) => formatDate(row.date) },
  { label: "Shift", value: (row: QualityRejection) => row.shift },
  { label: "S. No.", value: (row: QualityRejection) => row.serialNumber },
  { label: "Machine Number", value: (row: QualityRejection) => row.machineNumber },
  { label: "Part Name", value: (row: QualityRejection) => row.partName },
  { label: "Rejection Qty.", value: (row: QualityRejection) => row.rejectionQuantity },
  { label: "Reason", value: (row: QualityRejection) => row.reason },
  { label: "CR / MR", value: (row: QualityRejection) => row.crMr },
  { label: "Job Work", value: (row: QualityRejection) => row.jobWork },
  { label: "Remarks", value: (row: QualityRejection) => row.remarks || "-" },
  { label: "Updated", value: (row: QualityRejection) => formatDateTime(row.timestamp) },
];

const gaugeInventoryExportColumns = [
  { label: "Gauge Name", value: (row: GaugeInventory) => row.gaugeName },
  { label: "Gauge Specifications", value: (row: GaugeInventory) => row.gaugeSpecification },
  { label: "Gauge Type", value: (row: GaugeInventory) => row.gaugeType },
  { label: "Gauge Qty", value: (row: GaugeInventory) => row.gaugeQty },
  { label: "Gauge No.", value: (row: GaugeInventory) => row.gaugeNo },
  { label: "Wear and Tear", value: (row: GaugeInventory) => row.wearAndTear },
  { label: "Gauge Company", value: (row: GaugeInventory) => row.gaugeCompany },
  { label: "Updated", value: (row: GaugeInventory) => formatDateTime(row.updatedAt) },
];

const gaugeStockExportColumns = [
  { label: "Gauge Stock Qty", value: (row: GaugeStock) => row.gaugeStockQty },
  { label: "Gauge Type", value: (row: GaugeStock) => row.gaugeType },
  { label: "Gauge Part Name", value: (row: GaugeStock) => row.gaugePartName },
  { label: "Updated", value: (row: GaugeStock) => formatDateTime(row.updatedAt) },
];

const calibrationSheetExportColumns = [
  { label: "S. No.", value: (row: CalibrationSheet) => row.serialNumber },
  { label: "Equipment Name", value: (row: CalibrationSheet) => row.equipmentName },
  { label: "Make", value: (row: CalibrationSheet) => row.make },
  { label: "Equipment No.", value: (row: CalibrationSheet) => row.equipmentNo },
  { label: "Qty", value: (row: CalibrationSheet) => row.quantity },
  { label: "Range / Size", value: (row: CalibrationSheet) => row.rangeSize },
  { label: "Least Count", value: (row: CalibrationSheet) => row.leastCount },
  { label: "Frequency Calibration", value: (row: CalibrationSheet) => row.frequencyCalibration },
  { label: "Calibrated On", value: (row: CalibrationSheet) => row.calibratedOn },
  { label: "Calibration Due On", value: (row: CalibrationSheet) => row.calibrationDueOn },
  { label: "Status", value: (row: CalibrationSheet) => calibrationDueStatus(row.calibrationDueOn) },
  { label: "Location", value: (row: CalibrationSheet) => row.location },
  { label: "Remark", value: (row: CalibrationSheet) => row.remark || "-" },
  { label: "Updated", value: (row: CalibrationSheet) => formatDateTime(row.updatedAt) },
];

const gaugeHistoryExportColumns = [
  { label: "Description", value: (row: GaugeHistoryCard) => row.description },
  { label: "Control No.", value: (row: GaugeHistoryCard) => row.controlNo },
  { label: "Validation Standard", value: (row: GaugeHistoryCard) => row.validationStandard },
  { label: "Location", value: (row: GaugeHistoryCard) => row.location },
  { label: "Frequency of Validation", value: (row: GaugeHistoryCard) => row.frequencyOfValidation },
  { label: "Sr. No.", value: (row: GaugeHistoryCard) => row.serialNumber },
  { label: "Inspection Item", value: (row: GaugeHistoryCard) => row.inspectionItem },
  { label: "Specification", value: (row: GaugeHistoryCard) => row.specification },
  { label: "Inspection Instruments", value: (row: GaugeHistoryCard) => row.inspectionInstruments },
  { label: "Remarks", value: (row: GaugeHistoryCard) => row.remarks || "-" },
  { label: "Validation Date", value: (row: GaugeHistoryCard) => row.validationDate },
  { label: "A", value: (row: GaugeHistoryCard) => row.observationA || "-" },
  { label: "B", value: (row: GaugeHistoryCard) => row.observationB || "-" },
  { label: "C", value: (row: GaugeHistoryCard) => row.observationC || "-" },
  { label: "D", value: (row: GaugeHistoryCard) => row.observationD || "-" },
  { label: "E", value: (row: GaugeHistoryCard) => row.observationE || "-" },
  { label: "Judgment", value: (row: GaugeHistoryCard) => row.judgment },
  { label: "Due Date", value: (row: GaugeHistoryCard) => row.dueDate },
  { label: "Rectification Done", value: (row: GaugeHistoryCard) => row.rectificationDone || "-" },
  { label: "Insp. By", value: (row: GaugeHistoryCard) => row.inspectionBy },
  { label: "HOD", value: (row: GaugeHistoryCard) => row.hod },
  { label: "Updated", value: (row: GaugeHistoryCard) => formatDateTime(row.updatedAt) },
];
