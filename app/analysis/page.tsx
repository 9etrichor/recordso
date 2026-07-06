"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { format, startOfDay, endOfDay } from "date-fns";
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
  const [chartCollapsed, setChartCollapsed] = useState(true);
  const [recordsCollapsed, setRecordsCollapsed] = useState(true);
  const [records, setRecords] = useState<Record[]>([]);
  const [loading, setLoading] = useState(true);
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<Chart | null>(null);
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated" && !hasFetchedRef.current) {
      hasFetchedRef.current = true;
      const fetchRecords = async () => {
        try {
          const res = await fetch("/api/records");
          if (!res.ok) throw new Error("Failed to fetch records");
          const data = await res.json();
          setRecords(data);
        } catch {
          console.error("Failed to fetch records");
        } finally {
          setLoading(false);
        }
      };
      fetchRecords();
    }
  }, [status]);

  const parseDate = (ddmmyyyy: string) => {
    const parts = ddmmyyyy.split("/");
    if (parts.length !== 3) return new Date();
    return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
  };

  const getFilteredRecords = () => {
    const parsed = parseDate(selectedDate);
    const dateStart = startOfDay(parsed);
    const dateEnd = endOfDay(parsed);

    return records.filter((record) => {
      if (!record.timestampEnd) return false;

      const recordStart = new Date(record.timestamp);
      const recordEnd = new Date(record.timestampEnd);

      return recordStart < dateEnd && recordEnd > dateStart;
    });
  };

  const calculateOverlapDuration = (record: Record) => {
    const parsed = parseDate(selectedDate);
    const dateStart = startOfDay(parsed);
    const dateEnd = endOfDay(parsed);
    const recordStart = new Date(record.timestamp);
    const recordEnd = new Date(record.timestampEnd!);

    const overlapStart = recordStart < dateStart ? dateStart : recordStart;
    const overlapEnd = recordEnd > dateEnd ? dateEnd : recordEnd;

    return (overlapEnd.getTime() - overlapStart.getTime()) / 60000;
  };

  const calculateTimeByRating = () => {
    const filteredRecords = getFilteredRecords();
    const timeByRating = {
      GOOD: 0,
      NORMAL: 0,
      BAD: 0,
      UNRECORDED: 0,
    };

    let totalRecordedMinutes = 0;

    filteredRecords.forEach((record) => {
      if (record.timestampEnd) {
        const overlapMinutes = calculateOverlapDuration(record);
        timeByRating[record.rating] += overlapMinutes;
        totalRecordedMinutes += overlapMinutes;
      }
    });

    const unrecordedMinutes = Math.max(0, 1440 - totalRecordedMinutes);
    timeByRating.UNRECORDED = unrecordedMinutes;

    return timeByRating;
  };

  const timeByRating = calculateTimeByRating();

  const filteredRecords = getFilteredRecords();

  useEffect(() => {
    if (!chartRef.current) return;

    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    const ctx = chartRef.current.getContext("2d");
    if (!ctx) return;

    chartInstanceRef.current = new Chart(ctx, {
      type: "pie",
      data: {
        labels: ["Good", "Normal", "Bad", "Not recorded"],
        datasets: [
          {
            data: [timeByRating.GOOD, timeByRating.NORMAL, timeByRating.BAD, timeByRating.UNRECORDED],
            backgroundColor: ["#000000", "#555555", "#999999", "#ffffff"],
            borderColor: ["#f5f0e1", "#f5f0e1", "#f5f0e1", "#000000"],
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
              color: "#000000",
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
  }, [timeByRating]);

  if (loading) {
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
          <label className="block text-sm font-normal mb-2">
            Select Date
          </label>
          <DatePicker value={selectedDate} onChange={setSelectedDate} />
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
              <h2 className="text-lg sm:text-xl" style={{ fontFamily: "var(--font-serif)", fontWeight: 300 }}>Time Distribution</h2>
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
                Records for {selectedDate}
              </h2>
            </div>
            <div className={`${recordsCollapsed ? "hidden" : "block"} sm:block`}>
              <div id="analysis-records-scroll" className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {filteredRecords.length === 0 ? (
                  <p className="text-center">No records for this date</p>
                ) : (
                  filteredRecords.map((record) => {
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
                              backgroundColor: "#000000",
                              color: "#ffffff",
                            }}
                          >
                            {record.rating}
                          </span>
                        </div>
                        <div className="text-sm">
                          <p>Start: {format(start, "HH:mm")}</p>
                          <p>End: {format(end, "HH:mm")}</p>
                          <p>Duration on this date: {hours}h {mins}m</p>
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