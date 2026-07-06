"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";

import { NowButton } from "@/components/NowButton";

const recordSchema = z.object({
  timestamp: z.string(),
  timestampEnd: z.string().optional(),
  activity: z.string().min(1).max(200),
  rating: z.enum(["GOOD", "NORMAL", "BAD"]),
});

type RecordFormData = z.infer<typeof recordSchema>;

type Record = {
  id: string;
  timestamp: string;
  timestampEnd: string | null;
  activity: string;
  rating: "GOOD" | "NORMAL" | "BAD";
  createdAt: string;
  updatedAt: string;
};

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [records, setRecords] = useState<Record[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [tsDate, setTsDate] = useState("");
  const [tsTime, setTsTime] = useState("");
  const [teDate, setTeDate] = useState("");
  const [teTime, setTeTime] = useState("");

  const toLocalInput = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    const h = String(date.getHours()).padStart(2, "0");
    const min = String(date.getMinutes()).padStart(2, "0");
    return `${y}-${m}-${d}T${h}:${min}`;
  };

  const toISO = (localInput: string) => new Date(localInput).toISOString();

  const getLocalDateTimeString = () => toLocalInput(new Date());

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RecordFormData>({
    resolver: zodResolver(recordSchema),
    defaultValues: {
      activity: "",
      rating: "GOOD",
    },
  });

  useEffect(() => {
    if (tsDate && tsTime) setValue("timestamp", `${tsDate}T${tsTime}`);
  }, [tsDate, tsTime, setValue]);

  useEffect(() => {
    if (teDate && teTime) setValue("timestampEnd", `${teDate}T${teTime}`);
  }, [teDate, teTime, setValue]);

  useEffect(() => {
    const [d, t] = getLocalDateTimeString().split("T");
    setTsDate(d);
    setTsTime(t);
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  const fetchRecords = useCallback(async () => {
    try {
      const res = await fetch("/api/records");
      if (!res.ok) throw new Error("Failed to fetch records");
      const data = await res.json();
      setRecords(data);
    } catch {
      setError("Failed to load records");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session?.user) {
      const loadData = async () => {
        await fetchRecords();
      };
      loadData();
    }
  }, [session, fetchRecords]);

  const onSubmit = async (data: RecordFormData) => {
    setError("");
    try {
      const url = isEditing ? `/api/records/${editingId}` : "/api/records";
      const method = isEditing ? "PUT" : "POST";

      const body = {
        ...data,
        timestamp: toISO(data.timestamp),
        timestampEnd: data.timestampEnd ? toISO(data.timestampEnd) : undefined,
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error("Failed to save record");

      const n = getLocalDateTimeString();
      const [d, t] = n.split("T");
      setTsDate(d);
      setTsTime(t);
      setTeDate("");
      setTeTime("");
      setIsEditing(false);
      setEditingId(null);
      reset({ activity: "", rating: "GOOD" as const });
      fetchRecords();
    } catch {
      setError("Failed to save record");
    }
  };

  const handleEdit = (record: Record) => {
    setIsEditing(true);
    setEditingId(record.id);
    const [td, tt] = toLocalInput(new Date(record.timestamp)).split("T");
    setTsDate(td);
    setTsTime(tt);
    if (record.timestampEnd) {
      const [ed, et] = toLocalInput(new Date(record.timestampEnd)).split("T");
      setTeDate(ed);
      setTeTime(et);
    } else {
      setTeDate("");
      setTeTime("");
    }
    reset({ activity: record.activity, rating: record.rating });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this record?")) return;

    try {
      const res = await fetch(`/api/records/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete record");
      fetchRecords();
    } catch {
      setError("Failed to delete record");
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditingId(null);
    const [d, t] = getLocalDateTimeString().split("T");
    setTsDate(d);
    setTsTime(t);
    setTeDate("");
    setTeTime("");
    reset();
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto p-6">
        {/* User Info Header */}
        <div className="p-6 rounded-2xl shadow-lg mb-6 border border-black/10" style={{ backgroundColor: "var(--paper-light)" }}>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <span className="text-4xl leading-none" style={{ fontFamily: "var(--font-serif)", fontWeight: 300 }}>RS</span>
              <div>
                <p className="text-sm">
                  Welcome, {session?.user?.name || session?.user?.email}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => router.push("/about")}
                className="px-6 py-2 rounded-lg border-2 transition-colors"
                style={{ borderColor: "#000000", color: "#000000", fontWeight: 300 }}
              >
                About
              </button>
              <button
                onClick={() => router.push("/analysis")}
                className="px-6 py-2 rounded-lg transition-colors"
                style={{ backgroundColor: "#000000", color: "#ffffff", fontWeight: 300 }}
              >
                Analysis
              </button>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="px-6 py-2 rounded-lg border-2 transition-colors"
                style={{ borderColor: "#000000", color: "#000000", fontWeight: 300 }}
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form Section */}
          <div className="lg:col-span-1">
            <div className="p-6 rounded-2xl shadow-lg border border-black/10" style={{ backgroundColor: "var(--paper-light)" }}>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl" style={{ fontFamily: "var(--font-serif)", fontWeight: 300 }}>
                  {isEditing ? "Edit Record" : "New Record"}
                </h2>
                {!isEditing && (
                  <button
                    type="button"
                    onClick={() => {
                      setTsDate("");
                      setTsTime("");
                      setTeDate("");
                      setTeTime("");
                      reset({ activity: "", rating: "GOOD" as const });
                    }}
                    className="px-4 py-2 rounded-lg font-normal border-2"
                    style={{ borderColor: "#000000", color: "#000000" }}
                  >
                    Clear
                  </button>
                )}
              </div>

              {error && (
                <div className="mb-4 p-3 rounded-lg text-center" style={{ backgroundColor: "#ffffff" }}>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="block text-sm font-normal mb-1">
                    Timestamp
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={tsDate}
                      onChange={(e) => setTsDate(e.target.value)}
                      className="min-w-0 flex-1 px-4 py-2 rounded-lg border-2 focus:outline-none"
                      style={{ borderColor: "#000000", backgroundColor: "#ffffff" }}
                    />
                    <input
                      type="text"
                      value={tsTime}
                      onChange={(e) => {
                        const v = e.target.value.replace(/\D/g, "").slice(0, 4);
                        if (v.length <= 2) setTsTime(v);
                        else setTsTime(`${v.slice(0, 2)}:${v.slice(2)}`);
                      }}
                      placeholder="HH:mm"
                      className="min-w-0 w-28 px-3 py-2 rounded-lg border-2 focus:outline-none text-center"
                      style={{ borderColor: "#000000", backgroundColor: "#ffffff" }}
                    />
                    <NowButton onClick={() => {
                      const n = getLocalDateTimeString();
                      const [d, t] = n.split("T");
                      setTsDate(d);
                      setTsTime(t);
                    }} />
                  </div>
                  {errors.timestamp && (
                    <p className="text-sm mt-1">
                      {errors.timestamp.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-normal mb-1">
                    End Time
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={teDate}
                      onChange={(e) => setTeDate(e.target.value)}
                      className="min-w-0 flex-1 px-4 py-2 rounded-lg border-2 focus:outline-none"
                      style={{ borderColor: "#000000", backgroundColor: "#ffffff" }}
                    />
                    <input
                      type="text"
                      value={teTime}
                      onChange={(e) => {
                        const v = e.target.value.replace(/\D/g, "").slice(0, 4);
                        if (v.length <= 2) setTeTime(v);
                        else setTeTime(`${v.slice(0, 2)}:${v.slice(2)}`);
                      }}
                      placeholder="HH:mm"
                      className="min-w-0 w-28 px-3 py-2 rounded-lg border-2 focus:outline-none text-center"
                      style={{ borderColor: "#000000", backgroundColor: "#ffffff" }}
                    />
                    <NowButton onClick={() => {
                      const n = getLocalDateTimeString();
                      const [d, t] = n.split("T");
                      setTeDate(d);
                      setTeTime(t);
                    }} />
                  </div>
                  {errors.timestampEnd && (
                    <p className="text-sm mt-1">
                      {errors.timestampEnd.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-normal mb-1">
                    Activity
                  </label>
                  <textarea
                    {...register("activity")}
                    placeholder="What did you do?"
                    rows={4}
                    className="w-full px-4 py-2 rounded-lg border-2 focus:outline-none resize-y"
                    style={{ borderColor: "#000000", backgroundColor: "#ffffff" }}
                  />
                  {errors.activity && (
                    <p className="text-sm mt-1">
                      {errors.activity.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-normal mb-1">
                    Rating
                  </label>
                  <select
                    {...register("rating")}
                    className="w-full px-4 py-2 rounded-lg border-2 focus:outline-none"
                    style={{ borderColor: "#000000", backgroundColor: "#ffffff" }}
                  >
                    <option value="GOOD">Good</option>
                    <option value="NORMAL">Normal</option>
                    <option value="BAD">Bad</option>
                  </select>
                  {errors.rating && (
                    <p className="text-sm mt-1">
                      {errors.rating.message}
                    </p>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-2 rounded-lg font-normal transition-colors disabled:opacity-50"
                    style={{ backgroundColor: "#000000", color: "#ffffff" }}
                  >
                    {isSubmitting ? "Saving..." : isEditing ? "Update" : "Create"}
                  </button>
                  {isEditing && (
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="px-4 py-2 rounded-lg font-normal border-2 transition-colors"
                      style={{ borderColor: "#000000", color: "#000000" }}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>

          {/* Records List */}
          <div className="lg:col-span-2">
            <div className="p-6 rounded-2xl shadow-lg border border-black/10" style={{ backgroundColor: "var(--paper-light)" }}>
              <h2 className="text-2xl mb-4" style={{ fontFamily: "var(--font-serif)", fontWeight: 300 }}>
                Your Records
              </h2>

              {records.length === 0 ? (
                <p className="text-center py-8">
                  No records yet. Create your first one!
                </p>
              ) : (
                <div className="space-y-3">
                  {records.map((record) => (
                    <div
                      key={record.id}
                      className="p-4 rounded-lg border border-black/10"
                      style={{ backgroundColor: "#ffffff" }}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span
                              className="px-2 py-1 rounded text-xs font-normal"
                              style={{
                                backgroundColor: "#000000",
                                color: "#ffffff",
                              }}
                            >
                              {record.rating}
                            </span>
                            <span className="text-sm">
                              {format(new Date(record.timestamp), "MMM dd, yyyy HH:mm")}
                            </span>
                          </div>
                          <p className="font-normal">
                            {record.activity}
                          </p>
                          <p className="text-sm mt-1">
                            End Time:{" "}
                            {record.timestampEnd
                              ? format(new Date(record.timestampEnd), "MMM dd, yyyy HH:mm")
                              : "not specific"}
                          </p>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={() => handleEdit(record)}
                            className="px-3 py-1 rounded text-sm font-normal border-2 transition-colors"
                            style={{ borderColor: "#000000", color: "#000000" }}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(record.id)}
                            className="px-3 py-1 rounded text-sm font-normal transition-colors"
                            style={{ backgroundColor: "#000000", color: "#ffffff" }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}