"use client";
import { useState, useRef, useEffect, useCallback } from "react";

const formatDateInput = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  let formatted = "";
  for (let i = 0; i < digits.length; i++) {
    if (i === 2 || i === 4) formatted += "/";
    formatted += digits[i];
  }
  return formatted;
};

const DAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function parseDdMmYyyy(value: string): Date | null {
  const parts = value.split("/");
  if (parts.length !== 3) return null;
  const d = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  const y = parseInt(parts[2], 10);
  if (isNaN(d) || isNaN(m) || isNaN(y)) return null;
  return new Date(y, m, d);
}

function toDdMmYyyy(date: Date) {
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

export function DatePicker({ value, onChange }: { value: string; onChange: (val: string) => void }) {
  const [open, setOpen] = useState(false);

  const parsed = parseDdMmYyyy(value);
  const [viewYear, setViewYear] = useState(parsed?.getFullYear() ?? new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(parsed?.getMonth() ?? new Date().getMonth());

  useEffect(() => {
    if (parsed) {
      setViewYear(parsed.getFullYear());
      setViewMonth(parsed.getMonth());
    }
  }, [value]);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const today = new Date();
  const todayStr = toDdMmYyyy(today);

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

  const offset = firstDay === 0 ? 6 : firstDay - 1;

  const cells: (number | null)[] = [];
  for (let i = offset - 1; i >= 0; i--) cells.push(daysInPrevMonth - i);
  for (let i = 1; i <= daysInMonth; i++) cells.push(i);
  const remaining = 42 - cells.length;
  for (let i = 1; i <= remaining; i++) cells.push(i);

  const selectDate = useCallback((day: number) => {
    const d = new Date(viewYear, viewMonth, day);
    onChange(toDdMmYyyy(d));
    setOpen(false);
  }, [viewYear, viewMonth, onChange]);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(viewYear - 1); setViewMonth(11); }
    else setViewMonth(viewMonth - 1);
  };

  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(viewYear + 1); setViewMonth(0); }
    else setViewMonth(viewMonth + 1);
  };

  return (
    <div ref={containerRef} className="relative flex gap-2">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(formatDateInput(e.target.value))}
        placeholder="dd / mm / yyyy"
        className="min-w-0 flex-1 px-4 py-2 rounded-lg border-2 focus:outline-none"
        style={{ borderColor: "#000000", backgroundColor: "#ffffff" }}
      />
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-[68px] flex items-center justify-center py-2 rounded-lg font-normal"
        style={{ backgroundColor: "#000000", color: "#ffffff" }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </button>
      {open && (
        <div
          className="absolute top-full right-0 mt-1 z-50 p-3 rounded-xl shadow-xl border-2"
          style={{ backgroundColor: "#f5f0e1", borderColor: "#000000" }}
        >
          <div className="flex items-center justify-between mb-2">
            <button type="button" onClick={prevMonth} className="p-1 rounded hover:opacity-60">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-sm font-medium" style={{ color: "#000000" }}>
              {MONTHS[viewMonth]} {viewYear}
            </span>
            <button type="button" onClick={nextMonth} className="p-1 rounded hover:opacity-60">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          <div className="grid grid-cols-7 gap-0">
            {DAYS.map((d) => (
              <div key={d} className="w-8 h-7 flex items-center justify-center text-xs font-medium" style={{ color: "#000000" }}>
                {d}
              </div>
            ))}
            {cells.map((day, i) => {
              const isCurrentMonth = i >= offset && i < offset + daysInMonth;
              if (!day) return <div key={i} className="w-8 h-7" />;
              const dateStr = toDdMmYyyy(new Date(viewYear, isCurrentMonth ? viewMonth : (i < offset ? viewMonth - 1 : viewMonth + 1), day));
              const isToday = dateStr === todayStr;
              const isSelected = dateStr === value;
              const classNames = `w-8 h-7 flex items-center justify-center text-xs rounded cursor-pointer transition-colors ${isCurrentMonth ? "" : "opacity-30"}`;
              if (isSelected) {
                return (
                  <div
                    key={i}
                    className={classNames}
                    style={{ backgroundColor: "#000000", color: "#ffffff" }}
                    onClick={() => isCurrentMonth && selectDate(day)}
                  >
                    {day}
                  </div>
                );
              }
              return (
                <div
                  key={i}
                  className={`${classNames} hover:bg-black/10`}
                  style={{ color: "#000000", ...(isToday ? { border: "1px solid #000000" } : {}) }}
                  onClick={() => isCurrentMonth && selectDate(day)}
                >
                  {day}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
