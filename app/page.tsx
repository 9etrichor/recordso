"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function Home() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;

    if (status === "authenticated") {
      router.push("/dashboard");
    } else {
      router.push("/login");
    }
  }, [status, router]);

  return (
    <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: "#FFE2D9" }}>
      <p style={{ color: "#482615" }}>Loading...</p>
    </div>
  );
}
