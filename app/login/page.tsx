"use client";

import { useState, useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const { status } = useSession();
  const [formData, setFormData] = useState({
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
      const res = await signIn("credentials", {
        email: formData.email,
        password: formData.password,
        redirect: false,
      });

      if (res?.error) {
        throw new Error("Invalid email or password");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 overflow-x-hidden max-w-full">
      <div className="w-full max-w-md p-6 sm:p-8 rounded-2xl shadow-lg" style={{ backgroundColor: "var(--paper-light)" }}>
        <h1 className="text-2xl sm:text-3xl text-center mb-6" style={{ fontFamily: "var(--font-serif)", fontWeight: 300 }}>
          Welcome Back
        </h1>

        {error && (
          <div className="mb-4 p-3 rounded-lg text-center text-sm" style={{ backgroundColor: "#ffffff" }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-normal mb-1">
              Email
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border-2 focus:outline-none transition-colors"
              style={{ borderColor: "#000000", backgroundColor: "#ffffff" }}
              placeholder="your@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-normal mb-1">
              Password
            </label>
            <input
              type="password"
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border-2 focus:outline-none transition-colors"
              style={{ borderColor: "#000000", backgroundColor: "#ffffff" }}
              placeholder="Your password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg font-normal transition-colors disabled:opacity-50 text-sm"
            style={{ backgroundColor: "#000000", color: "#ffffff" }}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="text-center mt-6 text-sm">
          Don&apos;t have an account?{" "}
          <a href="/register" className="font-normal hover:underline" style={{ fontFamily: "var(--font-serif)" }}>
            Sign up
          </a>
        </p>
      </div>
    </div>
  );
}