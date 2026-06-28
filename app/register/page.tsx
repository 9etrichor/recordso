"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const { status } = useSession();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status === "authenticated") {
      router.push("/dashboard");
    }
  }, [status, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Registration failed");
      }

      router.push("/login");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#FFE2D9" }}>
      <div className="w-full max-w-md p-8 rounded-2xl shadow-xl" style={{ backgroundColor: "#FCB797" }}>
        <h1 className="text-3xl font-bold text-center mb-6" style={{ color: "#482615" }}>
          Create Account
        </h1>

        {error && (
          <div className="mb-4 p-3 rounded-lg text-center" style={{ backgroundColor: "#FFE2D9", color: "#482615" }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: "#482615" }}>
              Name
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border-2 focus:outline-none transition-colors"
              style={{ borderColor: "#D06C33", backgroundColor: "#FFE2D9" }}
              placeholder="Your name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: "#482615" }}>
              Email
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border-2 focus:outline-none transition-colors"
              style={{ borderColor: "#D06C33", backgroundColor: "#FFE2D9" }}
              placeholder="your@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: "#482615" }}>
              Password
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border-2 focus:outline-none transition-colors"
              style={{ borderColor: "#D06C33", backgroundColor: "#FFE2D9" }}
              placeholder="Min. 6 characters"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg font-semibold text-white transition-colors disabled:opacity-50"
            style={{ backgroundColor: "#B05B2D" }}
          >
            {loading ? "Creating account..." : "Sign Up"}
          </button>
        </form>

        <p className="text-center mt-6" style={{ color: "#482615" }}>
          Already have an account?{" "}
          <a href="/login" className="font-semibold hover:underline" style={{ color: "#D06C33" }}>
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
}
