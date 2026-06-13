"use client";

import { Calendar, ChevronDown, ChevronUp } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

type DatePickerFieldProps = Readonly<{
  calendarSize?: "default" | "compact";
  className?: string;
  inputClassName?: string;
  label?: string;
  labelClassName?: string;
  displayFormat?: "iso" | "sheet";
  min?: string;
  onChange: (value: string) => void;
  outputFormat?: "iso" | "sheet";
  placeholder?: string;
  required?: boolean;
  value: string;
}>;

export function DatePickerField({
  calendarSize = "default",
  className = "block",
  inputClassName = "h-11 w-full rounded-xl border border-border bg-white px-3 pr-12 text-sm outline-none focus:border-[#19C93B]/50 focus:ring-4 focus:ring-[#19C93B]/10",
  label,
  labelClassName = "mb-2 block text-sm font-medium text-slate-800",
  min,
  onChange,
  outputFormat = "iso",
  displayFormat = "sheet",
  placeholder,
  required = false,
  value,
}: DatePickerFieldProps) {
  const wrapperRef = useRef<HTMLLabelElement>(null);
  const parsedValue = parseDateValue(value);
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [draftValue, setDraftValue] = useState(() => formatDisplayValue(value, displayFormat));
  const [floatingPosition, setFloatingPosition] = useState({ left: 0, top: 0 });
  const [visibleMonth, setVisibleMonth] = useState(() => monthStart(parsedValue ?? new Date()));

  useEffect(() => {
    if (parsedValue) setVisibleMonth(monthStart(parsedValue));
  }, [value]);

  useEffect(() => {
    if (!isEditing) setDraftValue(formatDisplayValue(value, displayFormat));
  }, [displayFormat, isEditing, value]);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) setIsOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  const days = useMemo(() => buildCalendarDays(visibleMonth), [visibleMonth]);
  const compactCalendar = calendarSize === "compact";
  const calendarMetrics = {
    width: compactCalendar ? 220 : 300,
    padding: compactCalendar ? 14 : 14,
    titleSize: compactCalendar ? 16 : 18,
    titleMargin: compactCalendar ? 20 : 16,
    titleChevronSize: compactCalendar ? 13 : 15,
    navGap: compactCalendar ? 20 : 20,
    navSize: compactCalendar ? 26 : 28,
    weekSize: compactCalendar ? 16 : 18,
    columnGap: compactCalendar ? 6 : 5,
    dayGap: compactCalendar ? 4 : 4,
    dayTop: compactCalendar ? 14 : 16,
    daySize: compactCalendar ? 16 : 18,
    dayHeight: compactCalendar ? 32 : 32,
    dayWidth: compactCalendar ? 32 : 34,
    footerTop: compactCalendar ? 14 : 16,
    footerSize: compactCalendar ? 16 : 18,
  };

  useEffect(() => {
    if (!isOpen || !compactCalendar) return;

    function updateFloatingPosition() {
      const rect = wrapperRef.current?.getBoundingClientRect();
      if (!rect) return;
      setFloatingPosition({
        left: Math.max(8, Math.min(rect.left, window.innerWidth - calendarMetrics.width - 8)),
        top: rect.bottom,
      });
    }

    updateFloatingPosition();
    window.addEventListener("resize", updateFloatingPosition);
    window.addEventListener("scroll", updateFloatingPosition, true);
    return () => {
      window.removeEventListener("resize", updateFloatingPosition);
      window.removeEventListener("scroll", updateFloatingPosition, true);
    };
  }, [calendarMetrics.width, compactCalendar, isOpen]);

  function selectDate(date: Date) {
    const outputValue = formatDateValue(date, outputFormat);
    setDraftValue(formatDateValue(date, displayFormat));
    onChange(outputValue);
    setIsOpen(false);
  }

  function commitTypedDate() {
    const trimmed = draftValue.trim();
    if (!trimmed) {
      setDraftValue("");
      onChange("");
      return;
    }

    const parsed = parseDateValue(trimmed);
    if (!parsed) {
      setDraftValue(value);
      return;
    }

    const formatted = formatDateValue(parsed, outputFormat);
    setDraftValue(formatDateValue(parsed, displayFormat));
    setVisibleMonth(monthStart(parsed));
    onChange(formatted);
  }

  return (
    <label className={`${className} relative`} ref={wrapperRef}>
      {label ? <span className={labelClassName}>{label}</span> : null}
      <span className="relative block">
        <input
          className={inputClassName}
          min={min}
          onBlur={() => {
            setIsEditing(false);
            commitTypedDate();
          }}
          onChange={(event) => setDraftValue(event.target.value)}
          onFocus={() => setIsEditing(true)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.currentTarget.blur();
            }
          }}
          placeholder={placeholder}
          required={required}
          type="text"
          value={draftValue}
        />
        <button
          aria-label={label ? `Open calendar for ${label}` : "Open calendar"}
          className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-slate-100 dark:hover:bg-white/10"
          onClick={() => setIsOpen((current) => !current)}
          type="button"
        >
          <Calendar size={16} />
        </button>
      </span>

      {isOpen ? (
        <div
          className="z-[300] border border-slate-200 shadow-2xl"
          style={{
            backgroundColor: "#ffffff",
            color: "#000000",
            left: compactCalendar ? floatingPosition.left : 0,
            marginTop: 0,
            opacity: 1,
            padding: calendarMetrics.padding,
            position: compactCalendar ? "fixed" : "absolute",
            top: compactCalendar ? floatingPosition.top : "100%",
            width: calendarMetrics.width,
          }}
        >
          <div className="flex items-center justify-between" style={{ marginBottom: calendarMetrics.titleMargin }}>
            <button className="inline-flex items-center gap-1 font-semibold text-black" onClick={() => setVisibleMonth(addMonths(visibleMonth, -1))} style={{ fontSize: calendarMetrics.titleSize }} type="button">
              {visibleMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              <ChevronDown size={calendarMetrics.titleChevronSize} strokeWidth={3} />
            </button>
            <div className="flex items-center" style={{ gap: calendarMetrics.navGap }}>
              <button className="text-black" onClick={() => setVisibleMonth(addMonths(visibleMonth, -1))} type="button">
                <ChevronUp size={calendarMetrics.navSize} strokeWidth={2} />
              </button>
              <button className="text-black" onClick={() => setVisibleMonth(addMonths(visibleMonth, 1))} type="button">
                <ChevronDown size={calendarMetrics.navSize} strokeWidth={2} />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-7 text-center font-medium text-black" style={{ columnGap: calendarMetrics.columnGap, fontSize: calendarMetrics.weekSize }}>
            {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}
          </div>
          <div className="grid grid-cols-7" style={{ columnGap: calendarMetrics.columnGap, marginTop: calendarMetrics.dayTop, rowGap: calendarMetrics.dayGap }}>
            {days.map((day) => {
              const isSelected = parsedValue ? isSameDay(day.date, parsedValue) : false;
              const isToday = isSameDay(day.date, new Date());
              return (
                <button
                  className="transition"
                  key={day.date.toISOString()}
                  onClick={() => selectDate(day.date)}
                  style={{
                    alignItems: "center",
                    backgroundColor: isSelected ? "#1a73e8" : "#ffffff",
                    border: isSelected ? "2px solid #0b57d0" : isToday ? "1px solid #555555" : "1px solid transparent",
                    borderRadius: 3,
                    color: isSelected ? "#ffffff" : day.isCurrentMonth ? "#000000" : "#777777",
                    display: "inline-flex",
                    fontSize: calendarMetrics.daySize,
                    fontWeight: isSelected ? 700 : 400,
                    height: calendarMetrics.dayHeight,
                    justifyContent: "center",
                    width: calendarMetrics.dayWidth,
                  }}
                  onMouseEnter={(event) => {
                    if (!isSelected) event.currentTarget.style.backgroundColor = "#e8f0fe";
                  }}
                  onMouseLeave={(event) => {
                    if (!isSelected) event.currentTarget.style.backgroundColor = "#ffffff";
                  }}
                  onFocus={(event) => {
                    if (!isSelected) event.currentTarget.style.backgroundColor = "#e8f0fe";
                  }}
                  onBlur={(event) => {
                    if (!isSelected) event.currentTarget.style.backgroundColor = "#ffffff";
                  }}
                  type="button"
                >
                  {day.date.getDate()}
                </button>
              );
            })}
          </div>
          <div className="flex justify-between font-medium" style={{ fontSize: calendarMetrics.footerSize, marginTop: calendarMetrics.footerTop }}>
            <button className="px-2 py-1" onClick={() => { onChange(""); setIsOpen(false); }} style={{ color: "#006fd6" }} type="button">
              Clear
            </button>
            <button className="px-2 py-1" onClick={() => selectDate(new Date())} style={{ color: "#006fd6" }} type="button">
              Today
            </button>
          </div>
        </div>
      ) : null}
    </label>
  );
}

function buildCalendarDays(month: Date) {
  const first = monthStart(month);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return { date, isCurrentMonth: date.getMonth() === first.getMonth() };
  });
}

function monthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, count: number) {
  return new Date(date.getFullYear(), date.getMonth() + count, 1);
}

function isSameDay(left: Date, right: Date) {
  return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth() && left.getDate() === right.getDate();
}

function formatDateValue(date: Date, outputFormat: "iso" | "sheet") {
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return outputFormat === "sheet" ? `${day}.${month}.${year}` : `${year}-${month}-${day}`;
}

function formatDisplayValue(value: string, displayFormat: "iso" | "sheet") {
  const parsed = parseDateValue(value);
  return parsed ? formatDateValue(parsed, displayFormat) : value;
}

function parseDateValue(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const normalized = trimmed.replaceAll("-", ".").replaceAll("/", ".");
  const parts = normalized.split(".");
  if (parts.length === 3) {
    const [first, second, third] = parts.map((part) => Number(part));
    if (Number.isFinite(first) && Number.isFinite(second) && Number.isFinite(third)) {
      const isYearFirst = parts[0].length === 4;
      const year = isYearFirst ? first : third;
      const month = second;
      const day = isYearFirst ? third : first;
      const parsed = new Date(year, month - 1, day);
      if (parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === day) return parsed;
    }
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
