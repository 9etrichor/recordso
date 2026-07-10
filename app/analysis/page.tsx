"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { format, startOfDay, endOfDay } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { Chart, ArcElement, Tooltip, Legend, TooltipItem } from "chart.js/auto";
import { DatePicker } from "@/components/DatePicker";

Chart.register(ArcElement, Tooltip, Legend);

type Record = {
  id: string;
  timestamp: string;
  timestampEnd: string | null;
  activity: string;
  rating: "GOOD" | "NORMAL" | "BAD";
  createdAt: string;
  updatedAt: string;
};

export default function AnalysisPage() {
  const { status } = useSession();
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = format(new Date(), "yyyy-MM-dd");
    const parts = d.split("-");
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  });
  const [viewMode, setViewMode] = useState<"date" | "week" | "month">("date");
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);
  const [chartCollapsed, setChartCollapsed] = useState(true);
  const [recordsCollapsed, setRecordsCollapsed] = useState(true);
  const [ratingFilter, setRatingFilter] = useState<"ALL" | "GOOD" | "NORMAL" | "BAD">("ALL");
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  const parseDate = (ddmmyyyy: string) => {
    const parts = ddmmyyyy.split("/");
    if (parts.length !== 3) return new Date();
    return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
  };

  const { data: records = [], isLoading } = useQuery<Record[]>({
    queryKey: ["records", { viewMode, selectedDate, weekOffset, monthOffset }],
    queryFn: async () => {
      const { start, end } = getViewRange(viewMode);
      const res = await fetch(`/api/records?startDate=${encodeURIComponent(start.toISOString())}&endDate=${encodeURIComponent(end.toISOString())}`);
      if (!res.ok) throw new Error("Failed to fetch records");
      return res.json();
    },
    enabled: status === "authenticated",
  });

  const getViewRange = (mode: "date" | "week" | "month") => {
    if (mode === "date") {
      const parsed = parseDate(selectedDate);
      return { start: startOfDay(parsed), end: endOfDay(parsed) };
    }
    if (mode === "week") {
      const today = new Date();
      const dayOfWeek = today.getDay();
      const start = new Date(today);
      start.setDate(today.getDate() - dayOfWeek + weekOffset * 7);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      if (weekOffset >= 0) {
        return { start, end: new Date(Math.min(end.getTime(), new Date().setHours(23, 59, 59, 999))) };
      }
      return { start, end };
    }
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
    start.setHours(0, 0, 0, 0);
    const end = new Date(today.getFullYear(), today.getMonth() + monthOffset + 1, 0);
    end.setHours(23, 59, 59, 999);
    if (monthOffset >= 0) {
      return { start, end: new Date(Math.min(end.getTime(), new Date().setHours(23, 59, 59, 999))) };
    }
    return { start, end };
  };

  const getFilteredRecords = () => {
    const { start: dateStart, end: dateEnd } = getViewRange(viewMode);

    return records.filter((record) => {
      if (!record.timestampEnd) return false;

      const recordStart = new Date(record.timestamp);
      const recordEnd = new Date(record.timestampEnd);

      return recordStart < dateEnd && recordEnd > dateStart;
    });
  };

  const calculateOverlapDuration = (record: Record) => {
    const { start: dateStart, end: dateEnd } = getViewRange(viewMode);
    const recordStart = new Date(record.timestamp);
    const recordEnd = new Date(record.timestampEnd!);

    const overlapStart = recordStart < dateStart ? dateStart : recordStart;
    const overlapEnd = recordEnd > dateEnd ? dateEnd : recordEnd;

    return (overlapEnd.getTime() - overlapStart.getTime()) / 60000;
  };


  const filteredRecords = getFilteredRecords();
  const displayRecords = ratingFilter === "ALL" ? filteredRecords : filteredRecords.filter((r) => r.rating === ratingFilter);
  const displayTotalMins = displayRecords.reduce((s, r) => s + calculateOverlapDuration(r), 0);

  useEffect(() => {
    if (!chartRef.current) return;

    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    const ctx = chartRef.current.getContext("2d");
    if (!ctx) return;

    const chartLabels: string[] = [];
    const chartData: number[] = [];
    const chartColors: string[] = [];
    const chartBorders: string[] = [];

    if (ratingFilter === "ALL") {
      chartLabels.push("Good");
      chartData.push(displayRecords.filter((r) => r.rating === "GOOD").reduce((sum, r) => sum + calculateOverlapDuration(r), 0));
      chartColors.push("#fefefc");
      chartBorders.push("#191816");

      chartLabels.push("Normal");
      chartData.push(displayRecords.filter((r) => r.rating === "NORMAL").reduce((sum, r) => sum + calculateOverlapDuration(r), 0));
      chartColors.push("#555555");
      chartBorders.push("#f5f0e1");

      chartLabels.push("Bad");
      chartData.push(displayRecords.filter((r) => r.rating === "BAD").reduce((sum, r) => sum + calculateOverlapDuration(r), 0));
      chartColors.push("#999999");
      chartBorders.push("#f5f0e1");

      const totalMinutes = chartData.reduce((a, b) => a + b, 0);
      const { start: rangeStart, end: rangeEnd } = getViewRange(viewMode);
      const maxMinutes = Math.round((rangeEnd.getTime() - rangeStart.getTime()) / 60000);
      chartLabels.push("Not recorded");
      chartData.push(Math.max(0, maxMinutes - totalMinutes));
      chartColors.push("#191816");
      chartBorders.push("#f5f0e1");
    } else {
      const totalMins = displayRecords.reduce((sum, r) => sum + calculateOverlapDuration(r), 0);
      displayRecords.forEach((record) => {
        const mins = calculateOverlapDuration(record);
        const activity = record.activity.length > 15 ? record.activity.slice(0, 15) + "..." : record.activity;
        chartLabels.push(activity);
        chartData.push(mins);
        const p = totalMins > 0 ? mins / totalMins : 0;
        const r = Math.round(245 - 184 * p);
        const g = Math.round(240 - 197 * p);
        const b = Math.round(225 - 194 * p);
        chartColors.push(`rgb(${r},${g},${b})`);
        chartBorders.push("#f5f0e1");
      });
    }

    chartInstanceRef.current = new Chart(ctx, {
      type: "pie",
      data: {
        labels: chartLabels,
        datasets: [
          {
            data: chartData,
            backgroundColor: chartColors,
            borderColor: chartBorders,
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              color: "#191816",
              font: {
                size: 14,
              },
            },
          },
          tooltip: {
            callbacks: {
              label: (context: TooltipItem<"pie">) => {
                const minutes = Number(context.raw);
                const hours = Math.floor(minutes / 60);
                const mins = Math.round(minutes % 60);
                return `${context.label}: ${hours}h ${mins}m`;
              },
            },
          },
        },
      },
    });

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }
    };
  }, [ratingFilter, selectedDate, records, viewMode, weekOffset, monthOffset]);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center overflow-x-hidden max-w-full">Loading...</div>;
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 overflow-x-hidden max-w-full">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h1 className="text-2xl sm:text-3xl" style={{ fontFamily: "var(--font-serif)", fontWeight: 300 }}>Analysis</h1>
          <button
            onClick={() => router.push("/dashboard")}
            className="w-full sm:w-auto px-6 py-2 rounded-lg font-normal transition-colors text-sm"
            style={{ backgroundColor: "#000000", color: "#ffffff" }}
          >
            Back to Dashboard
          </button>
        </div>

        <div className="mb-6">
          <div className="flex gap-0 mb-4 border border-black/10 rounded-lg overflow-hidden w-fit">
            <button
              type="button"
              onClick={() => setViewMode("date")}
              className={`px-4 py-1.5 text-sm transition-colors ${viewMode === "date" ? "" : "bg-transparent"}`}
              style={{
                backgroundColor: viewMode === "date" ? "#000000" : "transparent",
                color: viewMode === "date" ? "#ffffff" : "#000000",
              }}
            >
              Date
            </button>
            <button
              type="button"
              onClick={() => setViewMode("week")}
              className={`px-4 py-1.5 text-sm transition-colors ${viewMode === "week" ? "" : "bg-transparent"}`}
              style={{
                backgroundColor: viewMode === "week" ? "#000000" : "transparent",
                color: viewMode === "week" ? "#ffffff" : "#000000",
              }}
            >
              Week
            </button>
            <button
              type="button"
              onClick={() => setViewMode("month")}
              className={`px-4 py-1.5 text-sm transition-colors ${viewMode === "month" ? "" : "bg-transparent"}`}
              style={{
                backgroundColor: viewMode === "month" ? "#000000" : "transparent",
                color: viewMode === "month" ? "#ffffff" : "#000000",
              }}
            >
              Month
            </button>
          </div>
          {viewMode === "date" ? (
            <>
              <label className="block text-sm font-normal mb-2">Select Date</label>
              <DatePicker value={selectedDate} onChange={setSelectedDate} />
            </>
          ) : viewMode === "week" ? (
            (() => {
              const { start, end } = getViewRange("week");
              return (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setWeekOffset((w) => w - 1)}
                    className="px-3 py-1.5 rounded-lg text-sm border border-black/10 transition-colors hover:bg-black/10"
                  >
                    &larr; Prev
                  </button>
                  <span className="text-sm px-3 py-1.5 rounded-lg" style={{ backgroundColor: "#000000", color: "#ffffff" }}>
                    {format(start, "d MMM")} &ndash; {format(end, "d MMM yyyy")}
                  </span>
                  <button
                    type="button"
                    onClick={() => setWeekOffset((w) => w + 1)}
                    className="px-3 py-1.5 rounded-lg text-sm border border-black/10 transition-colors hover:bg-black/10"
                    disabled={weekOffset >= 0}
                    style={{ opacity: weekOffset >= 0 ? 0.4 : 1 }}
                  >
                    Next &rarr;
                  </button>
                  {weekOffset !== 0 && (
                    <button
                      type="button"
                      onClick={() => setWeekOffset(0)}
                      className="px-3 py-1.5 rounded-lg text-sm border border-black/10 transition-colors hover:bg-black/10"
                    >
                      This Week
                    </button>
                  )}
                </div>
              );
            })()
          ) : (
            (() => {
              const { start, end } = getViewRange("month");
              return (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setMonthOffset((m) => m - 1)}
                    className="px-3 py-1.5 rounded-lg text-sm border border-black/10 transition-colors hover:bg-black/10"
                  >
                    &larr; Prev
                  </button>
                  <span className="text-sm px-3 py-1.5 rounded-lg" style={{ backgroundColor: "#000000", color: "#ffffff" }}>
                    {format(start, "MMMM yyyy")}
                  </span>
                  <button
                    type="button"
                    onClick={() => setMonthOffset((m) => m + 1)}
                    className="px-3 py-1.5 rounded-lg text-sm border border-black/10 transition-colors hover:bg-black/10"
                    disabled={monthOffset >= 0}
                    style={{ opacity: monthOffset >= 0 ? 0.4 : 1 }}
                  >
                    Next &rarr;
                  </button>
                  {monthOffset !== 0 && (
                    <button
                      type="button"
                      onClick={() => setMonthOffset(0)}
                      className="px-3 py-1.5 rounded-lg text-sm border border-black/10 transition-colors hover:bg-black/10"
                    >
                      This Month
                    </button>
                  )}
                </div>
              );
            })()
          )}
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          {(["ALL", "GOOD", "NORMAL", "BAD"] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRatingFilter(r)}
              className={`px-4 py-1.5 rounded-lg text-sm font-normal transition-colors ${
                ratingFilter === r ? "" : "border-2"
              }`}
              style={{
                backgroundColor: ratingFilter === r ? "#191816" : "#fefefc",
                color: ratingFilter === r ? "#fefefc" : "#191816",
                borderColor: "#191816",
              }}
            >
              {r === "ALL" ? "All" : r.charAt(0) + r.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="p-4 sm:p-6 rounded-2xl shadow-lg border border-black/10" style={{ backgroundColor: "var(--paper-light)" }}>
            <div className="flex items-center gap-2 mb-4">
              <button
                type="button"
                onClick={() => setChartCollapsed(!chartCollapsed)}
                className="sm:hidden p-1 rounded transition-colors hover:bg-black/10"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className={`h-4 w-4 transition-transform ${chartCollapsed ? "" : "rotate-90"}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
              <h2 className="text-lg sm:text-xl" style={{ fontFamily: "var(--font-serif)", fontWeight: 300 }}>
                Time Distribution{ratingFilter !== "ALL" && displayRecords.length > 0
                  ? ` (${Math.floor(displayTotalMins / 60)}h ${Math.round(displayTotalMins % 60)}m)`
                  : ""}
              </h2>
            </div>
            <div className={`${chartCollapsed ? "hidden" : "block"} sm:block max-w-xs sm:max-w-md mx-auto`}>
              <canvas ref={chartRef}></canvas>
            </div>
          </div>

          <div className="p-4 sm:p-6 rounded-2xl shadow-lg border border-black/10" style={{ backgroundColor: "var(--paper-light)" }}>
            <div className="flex items-center gap-2 mb-4">
              <button
                type="button"
                onClick={() => setRecordsCollapsed(!recordsCollapsed)}
                className="sm:hidden p-1 rounded transition-colors hover:bg-black/10"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className={`h-4 w-4 transition-transform ${recordsCollapsed ? "" : "rotate-90"}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
              <h2 className="text-lg sm:text-xl" style={{ fontFamily: "var(--font-serif)", fontWeight: 300 }}>
                Records{viewMode === "date" ? ` for ${selectedDate}` : ""}
              </h2>
            </div>
            <div className={`${recordsCollapsed ? "hidden" : "block"} sm:block`}>
              <div id="analysis-records-scroll" className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {displayRecords.length === 0 ? (
                  <p className="text-center">No records for {viewMode === "date" ? "this date" : viewMode === "week" ? "this week" : "this month"}</p>
                ) : (
                  displayRecords.map((record) => {
                    const start = new Date(record.timestamp);
                    const end = new Date(record.timestampEnd!);
                    const overlapMinutes = calculateOverlapDuration(record);
                    const hours = Math.floor(overlapMinutes / 60);
                    const mins = Math.round(overlapMinutes % 60);

                    return (
                      <div
                        key={record.id}
                        className="p-4 rounded-lg border border-black/10"
                        style={{ backgroundColor: "#ffffff" }}
                      >
                        <div className="flex justify-between items-start gap-2 mb-2">
                          <span className="font-normal break-words flex-1 min-w-0">
                            {record.activity}
                          </span>
                          <span
                            className="px-2 py-1 rounded text-xs font-normal shrink-0"
                            style={{
                              backgroundColor: record.rating === "GOOD" ? "#fefefc" : record.rating === "NORMAL" ? "#555555" : "#999999",
                              color: record.rating === "GOOD" ? "#191816" : "#ffffff",
                              border: record.rating === "GOOD" ? "1px solid #ccc" : "none",
                            }}
                          >
                            {record.rating}
                          </span>
                        </div>
                        <div className="text-sm">
                          <p>Start: {format(start, "HH:mm")}</p>
                          <p>End: {format(end, "HH:mm")}</p>
                          <p>Duration{viewMode === "date" ? " on this date" : viewMode === "week" ? " this week" : " this month"}: {hours}h {mins}m</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              <div className="flex justify-center mt-2">
                <button
                  type="button"
                  onClick={() => document.querySelector("#analysis-records-scroll")?.scrollTo({ top: 0, behavior: "smooth" })}
                  className="p-2 rounded-full border-2 transition-colors hover:bg-black/10"
                  style={{ borderColor: "#000000", color: "#000000", backgroundColor: "#ffffff" }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}