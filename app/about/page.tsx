"use client";

import { useRouter } from "next/navigation";

export default function AboutPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl" style={{ fontFamily: "var(--font-serif)", fontWeight: 300 }}>About</h1>
          <button
            onClick={() => router.push("/dashboard")}
            className="px-6 py-2 rounded-lg transition-colors"
            style={{ backgroundColor: "#000000", color: "#ffffff", fontWeight: 300 }}
          >
            Back to Dashboard
          </button>
        </div>

        <div className="p-8 rounded-2xl shadow-lg border border-black/10 space-y-6" style={{ backgroundColor: "var(--paper-light)" }}>
          <section>
            <h2 className="text-2xl mb-3" style={{ fontFamily: "var(--font-serif)", fontWeight: 300 }}>What is recordso?</h2>
            <p className="leading-relaxed">
              recordso is a time-tracking and activity-logging tool that helps you understand how you spend your day.
              Record what you do, when you do it, and rate each activity — then visualize your time distribution
              with a clear breakdown of Good, Normal, and Bad rated hours.
            </p>
          </section>

          <section>
            <h2 className="text-2xl mb-3" style={{ fontFamily: "var(--font-serif)", fontWeight: 300 }}>How it works</h2>
            <ol className="list-decimal list-inside space-y-2 leading-relaxed">
              <li><strong>Record</strong> an activity with a timestamp, optional end time, and a rating (Good / Normal / Bad).</li>
              <li><strong>Review</strong> your records on the dashboard, edit or delete them as needed.</li>
              <li><strong>Analyze</strong> your day on the Analysis page — see how your time breaks down by rating and review individual records for a selected date.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-2xl mb-3" style={{ fontFamily: "var(--font-serif)", fontWeight: 300 }}>Features</h2>
            <ul className="list-disc list-inside space-y-2 leading-relaxed">
              <li>Quick &mdash; log activities with a timestamp and optional duration</li>
              <li>Rate each activity as Good, Normal, or Bad</li>
              <li>Edit or delete records anytime</li>
              <li>Visual pie chart of your time distribution for any given day</li>
              <li>Automatic unrecorded time is counted as Normal for a full 24h picture</li>
              <li>Your data is private and secured with your account</li>
            </ul>
          </section>

        </div>
      </div>
    </div>
  );
}