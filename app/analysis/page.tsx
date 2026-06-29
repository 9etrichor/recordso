"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { format, startOfDay, endOfDay, isWithinInterval } from "date-fns";
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

      // Only include records where both start and end are on the selected date
      return (
        isWithinInterval(recordStart, { start: dateStart, end: dateEnd }) &&
        isWithinInterval(recordEnd, { start: dateStart, end: dateEnd })
      );
    });
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
        const start = new Date(record.timestamp);
        const end = new Date(record.timestampEnd);
        const durationMinutes = (end.getTime() - start.getTime()) / 60000;
        timeByRating[record.rating] += durationMinutes;
        totalRecordedMinutes += durationMinutes;
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
            backgroundColor: ["#482615", "#D06C33", "#B05B2D"],
            borderColor: ["#FFE2D9", "#FFE2D9", "#FFE2D9"],
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
              color: "#482615",
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
    return <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#FFE2D9" }}>Loading...</div>;
  }

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: "#FFE2D9" }}>
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold" style={{ color: "#482615" }}>Analysis</h1>
          <button
            onClick={() => router.push("/dashboard")}
            className="px-6 py-2 rounded-lg font-semibold text-white transition-colors"
            style={{ backgroundColor: "#B05B2D" }}
          >
            Back to Dashboard
          </button>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium mb-2" style={{ color: "#482615" }}>
            Select Date
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            max={format(new Date(), "yyyy-MM-dd")}
            className="px-4 py-2 rounded-lg border-2 focus:outline-none"
            style={{ borderColor: "#D06C33", backgroundColor: "#FCB797", color: "#482615" }}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="p-6 rounded-2xl shadow-lg" style={{ backgroundColor: "#FCB797" }}>
            <h2 className="text-xl font-bold mb-4" style={{ color: "#482615" }}>Time Distribution</h2>
            <div className="max-w-md mx-auto">
              <canvas ref={chartRef}></canvas>
            </div>
          </div>

          <div className="p-6 rounded-2xl shadow-lg" style={{ backgroundColor: "#FCB797" }}>
            <h2 className="text-xl font-bold mb-4" style={{ color: "#482615" }}>
              Records for {format(new Date(selectedDate), "MMM dd, yyyy")}
            </h2>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filteredRecords.length === 0 ? (
                <p className="text-center" style={{ color: "#482615" }}>No records for this date</p>
              ) : (
                filteredRecords.map((record) => {
                  const start = new Date(record.timestamp);
                  const end = new Date(record.timestampEnd!);
                  const durationMinutes = (end.getTime() - start.getTime()) / 60000;
                  const hours = Math.floor(durationMinutes / 60);
                  const mins = Math.round(durationMinutes % 60);

                  return (
                    <div
                      key={record.id}
                      className="p-4 rounded-lg"
                      style={{ backgroundColor: "#FFE2D9" }}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-semibold" style={{ color: "#482615" }}>
                          {record.activity}
                        </span>
                        <span
                          className="px-2 py-1 rounded text-xs font-semibold"
                          style={{
                            backgroundColor:
                              record.rating === "GOOD"
                                ? "#482615"
                                : record.rating === "NORMAL"
                                ? "#D06C33"
                                : "#B05B2D",
                            color: "#FFE2D9",
                          }}
                        >
                          {record.rating}
                        </span>
                      </div>
                      <div className="text-sm" style={{ color: "#482615" }}>
                        <p>Start: {format(start, "HH:mm")}</p>
                        <p>End: {format(end, "HH:mm")}</p>
                        <p>Duration: {hours}h {mins}m</p>
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
