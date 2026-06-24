import { useEffect, useState } from "react";
import { signOut } from "firebase/auth";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { auth, db } from "../firebase";
import { AppUser, Tip, Worker } from "../types";

interface Props { user: AppUser; }

export default function AdminDashboard({ user }: Props) {
  const [tips, setTips] = useState<Tip[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [filter, setFilter] = useState<"all" | "success" | "pending" | "failed">("all");

  useEffect(() => {
    const unsub1 = onSnapshot(collection(db, "tips"), (snap) => {
      const all = snap.docs.map((d) => d.data() as Tip);
      setTips(all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    });
    const unsub2 = onSnapshot(collection(db, "workers"), (snap) => {
      setWorkers(snap.docs.map((d) => d.data() as Worker));
    });
    return () => { unsub1(); unsub2(); };
  }, []);

  const filtered = filter === "all" ? tips : tips.filter((t) => t.status === filter);
  const successTips = tips.filter((t) => t.status === "success");
  const totalRevenue = successTips.reduce((s, t) => s + t.feeAmount, 0);
  const totalTipped = successTips.reduce((s, t) => s + t.amount, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-800">💸 TipMe Admin</h1>
          <p className="text-xs text-gray-500">{user.name} · Administrator</p>
        </div>
        <button onClick={() => signOut(auth)} className="text-sm text-gray-500 hover:text-red-500">
          Sign out
        </button>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 p-4">
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-xs text-gray-500 mb-1">Total Tips Processed</p>
          <p className="text-2xl font-bold text-green-600">R{totalTipped.toFixed(2)}</p>
          <p className="text-xs text-gray-400">{successTips.length} successful</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-xs text-gray-500 mb-1">Platform Revenue (5%)</p>
          <p className="text-2xl font-bold text-blue-600">R{totalRevenue.toFixed(2)}</p>
          <p className="text-xs text-gray-400">{workers.length} workers registered</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 px-4 mb-4">
        {(["all", "success", "pending", "failed"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 text-xs rounded-full font-medium capitalize transition ${
              filter === f
                ? "bg-green-500 text-white"
                : "bg-white border border-gray-200 text-gray-600"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Tips list */}
      <div className="px-4 space-y-3 pb-8">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-4xl mb-2">📭</p>
            <p>No tips found.</p>
          </div>
        ) : (
          filtered.map((t) => (
            <div key={t.id} className="bg-white rounded-xl border border-gray-100 p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="font-semibold text-gray-800 text-sm">{t.workerName}</p>
                  <p className="text-xs text-gray-400">{t.customerEmail}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-green-600 text-lg">R{t.amount.toFixed(2)}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    t.status === "success" ? "bg-green-100 text-green-700" :
                    t.status === "pending" ? "bg-yellow-100 text-yellow-700" :
                    "bg-red-100 text-red-600"
                  }`}>
                    {t.status}
                  </span>
                </div>
              </div>
              <div className="flex justify-between text-xs text-gray-400 border-t border-gray-50 pt-2">
                <span>Fee: R{t.feeAmount.toFixed(2)}</span>
                <span>Worker gets: R{t.workerAmount.toFixed(2)}</span>
                <span>{new Date(t.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
