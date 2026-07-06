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
    <div className="flex items-center justify-center min-h-screen overflow-x-hidden max-w-full">
      <p>Loading...</p>
    </div>
  );
}