"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import Image from "next/image";
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

  const getLocalDateTimeString = () => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    const localISOTime = new Date(now.getTime() - offset).toISOString().slice(0, 16);
    return localISOTime;
  };

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RecordFormData>({
    resolver: zodResolver(recordSchema),
    defaultValues: {
      timestamp: getLocalDateTimeString(),
      activity: "",
      rating: "GOOD",
    },
  });

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

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error("Failed to save record");

      reset({
        timestamp: getLocalDateTimeString(),
        activity: "",
        rating: "GOOD" as const,
      });
      setIsEditing(false);
      setEditingId(null);
      fetchRecords();
    } catch {
      setError("Failed to save record");
    }
  };

  const handleEdit = (record: Record) => {
    setIsEditing(true);
    setEditingId(record.id);
    reset({
      timestamp: record.timestamp.slice(0, 16),
      timestampEnd: record.timestampEnd ? record.timestampEnd.slice(0, 16) : "",
      activity: record.activity,
      rating: record.rating,
    });
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
    reset();
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#FFE2D9" }}>
        <div style={{ color: "#482615" }}>Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FFE2D9" }}>
      <div className="max-w-6xl mx-auto p-6">
        {/* User Info Header */}
        <div className="p-6 rounded-2xl shadow-lg mb-6" style={{ backgroundColor: "#FCB797" }}>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Image src="/logo.png" alt="recordso logo" width={144} height={144} className="rounded-lg" />
              <div>
                <h1 className="text-2xl font-bold" style={{ color: "#482615" }}>
                  recordso
                </h1>
                <p className="text-sm" style={{ color: "#482615" }}>
                  Welcome, {session?.user?.name || session?.user?.email}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => router.push("/analysis")}
                className="px-6 py-2 rounded-lg font-semibold text-white transition-colors"
                style={{ backgroundColor: "#D06C33" }}
              >
                Analysis
              </button>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="px-6 py-2 rounded-lg font-semibold text-white transition-colors"
                style={{ backgroundColor: "#B05B2D" }}
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form Section */}
          <div className="lg:col-span-1">
            <div className="p-6 rounded-2xl shadow-lg" style={{ backgroundColor: "#FCB797" }}>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold" style={{ color: "#482615" }}>
                  {isEditing ? "Edit Record" : "New Record"}
                </h2>
                {!isEditing && (
                  <button
                    type="button"
                    onClick={() => reset({
                      timestamp: "",
                      timestampEnd: "",
                      activity: "",
                      rating: "GOOD" as const,
                    })}
                    className="px-4 py-2 rounded-lg text-white font-medium"
                    style={{ backgroundColor: "#D06C33" }}
                  >
                    Clear
                  </button>
                )}
              </div>

              {error && (
                <div className="mb-4 p-3 rounded-lg text-center" style={{ backgroundColor: "#FFE2D9", color: "#482615" }}>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: "#482615" }}>
                    Timestamp
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="datetime-local"
                      {...register("timestamp")}
                      className="flex-1 px-4 py-2 rounded-lg border-2 focus:outline-none"
                      style={{ borderColor: "#D06C33", backgroundColor: "#FFE2D9" }}
                    />
                    <NowButton onClick={() => setValue("timestamp", getLocalDateTimeString())} />
                  </div>
                  {errors.timestamp && (
                    <p className="text-sm mt-1" style={{ color: "#482615" }}>
                      {errors.timestamp.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: "#482615" }}>
                    End Time
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="datetime-local"
                      {...register("timestampEnd")}
                      className="flex-1 px-4 py-2 rounded-lg border-2 focus:outline-none"
                      style={{ borderColor: "#D06C33", backgroundColor: "#FFE2D9" }}
                    />
                    <NowButton onClick={() => setValue("timestampEnd", getLocalDateTimeString())} />
                  </div>
                  {errors.timestampEnd && (
                    <p className="text-sm mt-1" style={{ color: "#482615" }}>
                      {errors.timestampEnd.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: "#482615" }}>
                    Activity
                  </label>
                  <textarea
                    {...register("activity")}
                    placeholder="What did you do?"
                    rows={4}
                    className="w-full px-4 py-2 rounded-lg border-2 focus:outline-none resize-y"
                    style={{ borderColor: "#D06C33", backgroundColor: "#FFE2D9" }}
                  />
                  {errors.activity && (
                    <p className="text-sm mt-1" style={{ color: "#482615" }}>
                      {errors.activity.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: "#482615" }}>
                    Rating
                  </label>
                  <select
                    {...register("rating")}
                    className="w-full px-4 py-2 rounded-lg border-2 focus:outline-none"
                    style={{ borderColor: "#D06C33", backgroundColor: "#FFE2D9" }}
                  >
                    <option value="GOOD">Good</option>
                    <option value="NORMAL">Normal</option>
                    <option value="BAD">Bad</option>
                  </select>
                  {errors.rating && (
                    <p className="text-sm mt-1" style={{ color: "#482615" }}>
                      {errors.rating.message}
                    </p>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-2 rounded-lg font-semibold text-white transition-colors disabled:opacity-50"
                    style={{ backgroundColor: "#B05B2D" }}
                  >
                    {isSubmitting ? "Saving..." : isEditing ? "Update" : "Create"}
                  </button>
                  {isEditing && (
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="px-4 py-2 rounded-lg font-semibold transition-colors"
                      style={{ backgroundColor: "#D06C33", color: "#482615" }}
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
            <div className="p-6 rounded-2xl shadow-lg" style={{ backgroundColor: "#FCB797" }}>
              <h2 className="text-2xl font-bold mb-4" style={{ color: "#482615" }}>
                Your Records
              </h2>

              {records.length === 0 ? (
                <p className="text-center py-8" style={{ color: "#482615" }}>
                  No records yet. Create your first one!
                </p>
              ) : (
                <div className="space-y-3">
                  {records.map((record) => (
                    <div
                      key={record.id}
                      className="p-4 rounded-lg"
                      style={{ backgroundColor: "#FFE2D9" }}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
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
                            <span className="text-sm" style={{ color: "#482615" }}>
                              {format(new Date(record.timestamp), "MMM dd, yyyy HH:mm")}
                            </span>
                          </div>
                          <p className="font-medium" style={{ color: "#482615" }}>
                            {record.activity}
                          </p>
                          <p className="text-sm mt-1" style={{ color: "#482615" }}>
                            End Time:{" "}
                            {record.timestampEnd
                              ? format(new Date(record.timestampEnd), "MMM dd, yyyy HH:mm")
                              : "not specific"}
                          </p>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={() => handleEdit(record)}
                            className="px-3 py-1 rounded text-sm font-semibold transition-colors"
                            style={{ backgroundColor: "#D06C33", color: "#482615" }}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(record.id)}
                            className="px-3 py-1 rounded text-sm font-semibold transition-colors"
                            style={{ backgroundColor: "#B05B2D", color: "#FFE2D9" }}
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
