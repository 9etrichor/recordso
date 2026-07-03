"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { format, startOfDay, endOfDay } from "date-fns";
import { Chart, ArcElement, Tooltip, Legend, TooltipItem } from "chart.js/auto";

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
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
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

  const getFilteredRecords = () => {
    const dateStart = startOfDay(new Date(selectedDate));
    const dateEnd = endOfDay(new Date(selectedDate));

    return records.filter((record) => {
      if (!record.timestampEnd) return false;

      const recordStart = new Date(record.timestamp);
      const recordEnd = new Date(record.timestampEnd);

      // Include records that overlap with the selected date
      return recordStart < dateEnd && recordEnd > dateStart;
    });
  };

  const calculateOverlapDuration = (record: Record) => {
    const dateStart = startOfDay(new Date(selectedDate));
    const dateEnd = endOfDay(new Date(selectedDate));
    const recordStart = new Date(record.timestamp);
    const recordEnd = new Date(record.timestampEnd!);

    // Calculate the overlap between record interval and selected date interval
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
    };

    let totalRecordedMinutes = 0;

    filteredRecords.forEach((record) => {
      if (record.timestampEnd) {
        const overlapMinutes = calculateOverlapDuration(record);
        timeByRating[record.rating] += overlapMinutes;
        totalRecordedMinutes += overlapMinutes;
      }
    });

    // Add unrecorded time to NORMAL (1440 minutes = 24 hours)
    const unrecordedMinutes = Math.max(0, 1440 - totalRecordedMinutes);
    timeByRating.NORMAL += unrecordedMinutes;

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
        labels: ["Good", "Normal", "Bad"],
        datasets: [
          {
            data: [timeByRating.GOOD, timeByRating.NORMAL, timeByRating.BAD],
            backgroundColor: ["#000000", "#555555", "#999999"],
            borderColor: ["#f5f0e1", "#f5f0e1", "#f5f0e1"],
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
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl" style={{ fontFamily: "var(--font-serif)", fontWeight: 300 }}>Analysis</h1>
          <button
            onClick={() => router.push("/dashboard")}
            className="px-6 py-2 rounded-lg font-normal transition-colors"
            style={{ backgroundColor: "#000000", color: "#ffffff" }}
          >
            Back to Dashboard
          </button>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-normal mb-2">
            Select Date
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            max={format(new Date(), "yyyy-MM-dd")}
            className="px-4 py-2 rounded-lg border-2 focus:outline-none"
            style={{ borderColor: "#000000", backgroundColor: "#ffffff" }}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="p-6 rounded-2xl shadow-lg border border-black/10" style={{ backgroundColor: "var(--paper-light)" }}>
            <h2 className="text-xl mb-4" style={{ fontFamily: "var(--font-serif)", fontWeight: 300 }}>Time Distribution</h2>
            <div className="max-w-md mx-auto">
              <canvas ref={chartRef}></canvas>
            </div>
          </div>

          <div className="p-6 rounded-2xl shadow-lg border border-black/10" style={{ backgroundColor: "var(--paper-light)" }}>
            <h2 className="text-xl mb-4" style={{ fontFamily: "var(--font-serif)", fontWeight: 300 }}>
              Records for {format(new Date(selectedDate), "MMM dd, yyyy")}
            </h2>
            <div className="space-y-3 max-h-96 overflow-y-auto">
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
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-normal">
                          {record.activity}
                        </span>
                        <span
                          className="px-2 py-1 rounded text-xs font-normal"
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
          </div>
        </div>
      </div>
    </div>
  );
}