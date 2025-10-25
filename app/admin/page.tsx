"use client";

import { useEffect, useState } from "react";
import type { BookingRecord } from "@/app/types";
import Link from "next/link";

export default function AdminPage() {
  const [rows, setRows] = useState<BookingRecord[]>([]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem("sasha_bookings");
      setRows(raw ? (JSON.parse(raw) as BookingRecord[]) : []);
    } catch {
      setRows([]);
    }
  }, []);

  function cancel(id: string) {
    const next = rows.map((r) => (r.id === id ? { ...r, status: "cancelled" as const } : r));
    setRows(next);
    localStorage.setItem("sasha_bookings", JSON.stringify(next));
  }

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Admin — Local Bookings</h1>
        <Link href="/" className="text-sm text-blue-600 underline">
          Back to assistant
        </Link>
      </div>
      <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-zinc-100 dark:bg-zinc-800">
            <tr>
              <th className="px-4 py-2">Date</th>
              <th className="px-4 py-2">Time</th>
              <th className="px-4 py-2">Service</th>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Email</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-zinc-500">
                  No bookings yet.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-t border-zinc-200 dark:border-zinc-800">
                  <td className="px-4 py-2">{r.dateISO}</td>
                  <td className="px-4 py-2">{r.startTime}–{r.endTime}</td>
                  <td className="px-4 py-2">{r.serviceName}</td>
                  <td className="px-4 py-2">{r.name}</td>
                  <td className="px-4 py-2">{r.email}</td>
                  <td className="px-4 py-2">{r.status}</td>
                  <td className="px-4 py-2 text-right">
                    {r.status !== "cancelled" && (
                      <button onClick={() => cancel(r.id)} className="rounded-md bg-red-600 px-3 py-1 text-white">
                        Cancel
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-sm text-zinc-500">
        Note: This demo stores data in your browser only. Deploy with a database for shared storage.
      </p>
    </div>
  );
}
