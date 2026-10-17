import { useEffect, useState } from "react";
import { signOut } from "firebase/auth";
import { collection, onSnapshot } from "firebase/firestore";
import { auth, db } from "../firebase";
import { AppUser, Tip, Worker } from "../types";

interface Props { user: AppUser; }

export default function AdminDashboard({ user }: Props) {
  const [tips, setTips] = useState<Tip[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);

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

  // Every tip here is self-reported by the tipper (TipMe never processes the
  // payment, so it has no way to confirm one happened). This is an activity
  // indicator across the whole platform, not a reconciled revenue figure —
  // TipMe no longer earns anything from the tip itself.
  const totalReported = tips.reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <img src="/tipme-icon.png" alt="TipMe" className="w-6 h-6 object-contain" />
            TipMe Admin
          </h1>
          <p className="text-xs text-gray-500">{user.name} · Administrator</p>
        </div>
        <button onClick={() => signOut(auth)} className="text-sm text-gray-500 hover:text-red-500">
          Sign out
        </button>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 p-4">
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-xs text-gray-500 mb-1">Tips Reported (all time)</p>
          <p className="text-2xl font-bold text-green-600">R{totalReported.toFixed(2)}</p>
          <p className="text-xs text-gray-400">{tips.length} self-reported tips</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-xs text-gray-500 mb-1">Registered Workers</p>
          <p className="text-2xl font-bold text-blue-600">{workers.length}</p>
          <p className="text-xs text-gray-400">across all employers</p>
        </div>
      </div>

      <div className="mx-4 mb-4 bg-amber-50 border border-amber-200 rounded-xl p-3">
        <p className="text-xs text-amber-800">
          Tips are paid directly between tipper and worker via PayShap — TipMe never sees the money. These
          figures are self-reported by tippers tapping "I've sent the tip" and are not a confirmed payment record.
        </p>
      </div>

      {/* Tips list */}
      <div className="px-4 space-y-3 pb-8">
        {tips.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-4xl mb-2">📭</p>
            <p>No tips reported yet.</p>
          </div>
        ) : (
          tips.map((t) => (
            <div key={t.id} className="bg-white rounded-xl border border-gray-100 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-800 text-sm">{t.workerName}</p>
                  <p className="text-xs text-gray-400">{new Date(t.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-green-600 text-lg">R{t.amount.toFixed(2)}</p>
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700">
                    self-reported
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
