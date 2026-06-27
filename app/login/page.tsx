"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#FFE2D9" }}>
      <div className="w-full max-w-md p-8 rounded-2xl shadow-xl" style={{ backgroundColor: "#FCB797" }}>
        <h1 className="text-3xl font-bold text-center mb-6" style={{ color: "#482615" }}>
          Welcome Back
        </h1>

        {error && (
          <div className="mb-4 p-3 rounded-lg text-center" style={{ backgroundColor: "#FFE2D9", color: "#482615" }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
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
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border-2 focus:outline-none transition-colors"
              style={{ borderColor: "#D06C33", backgroundColor: "#FFE2D9" }}
              placeholder="Your password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg font-semibold text-white transition-colors disabled:opacity-50"
            style={{ backgroundColor: "#B05B2D" }}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="text-center mt-6" style={{ color: "#482615" }}>
          Don&apos;t have an account?{" "}
          <a href="/register" className="font-semibold hover:underline" style={{ color: "#D06C33" }}>
            Sign up
          </a>
        </p>
      </div>
    </div>
  );
}
