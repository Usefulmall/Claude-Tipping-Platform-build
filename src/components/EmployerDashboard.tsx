import { useEffect, useState } from "react";
import { signOut } from "firebase/auth";
import { collection, query, where, onSnapshot, doc, setDoc, deleteDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import { AppUser, Worker, Tip } from "../types";
import QrCodeCard from "./QrCodeCard";

interface Props { user: AppUser; }

export default function EmployerDashboard({ user }: Props) {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [tips, setTips] = useState<Tip[]>([]);
  const [tab, setTab] = useState<"workers" | "tips" | "add">("workers");

  const [wName, setWName] = useState("");
  const [wPosition, setWPosition] = useState("");
  const [wPhone, setWPhone] = useState("");
  const [adding, setAdding] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  const baseUrl = window.location.origin;
  const onboardLink = `${baseUrl}?onboard=${user.uid}`;

  useEffect(() => {
    const q = query(collection(db, "workers"), where("employerId", "==", user.uid));
    return onSnapshot(q, (snap) => {
      setWorkers(snap.docs.map((d) => d.data() as Worker));
    });
  }, [user.uid]);

  useEffect(() => {
    const q = query(collection(db, "tips"), where("employerId", "==", user.uid));
    return onSnapshot(q, (snap) => {
      const all = snap.docs.map((d) => d.data() as Tip);
      setTips(all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    });
  }, [user.uid]);

  async function handleAddWorker() {
    if (!wName || !wPosition || !wPhone) {
      setFormError("Please complete all fields.");
      return;
    }
    setAdding(true);
    setFormError("");
    try {
      const workerId = `worker_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      await setDoc(doc(db, "workers", workerId), {
        id: workerId,
        employerId: user.uid,
        name: wName,
        position: wPosition,
        phone: wPhone,
        createdAt: new Date().toISOString(),
      });
      setFormSuccess(`${wName} has been added!`);
      setWName(""); setWPosition(""); setWPhone("");
      setTab("workers");
    } catch (e: any) {
      setFormError(e.message || "Something went wrong.");
    } finally {
      setAdding(false);
    }
  }

  // Every tip here is self-reported by the tipper (TipMe never processes the
  // payment, so it has no independent way to confirm one happened). These
  // totals are an indicator, not a reconciled ledger — labelled as such below.
  const totalReported = tips.reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <img src="/tipme-icon.png" alt="TipMe" className="w-6 h-6 object-contain" />
            TipMe
          </h1>
          <p className="text-xs text-gray-500">{user.name} · Employer</p>
        </div>
        <button onClick={() => signOut(auth)} className="text-sm text-gray-500 hover:text-red-500 transition">
          Sign out
        </button>
      </header>

      <div className="grid grid-cols-3 gap-3 p-4">
        <div className="bg-white rounded-xl p-3 text-center border border-gray-100">
          <p className="text-2xl font-bold text-green-600">{workers.length}</p>
          <p className="text-xs text-gray-500">Workers</p>
        </div>
        <div className="bg-white rounded-xl p-3 text-center border border-gray-100">
          <p className="text-2xl font-bold text-green-600">{tips.length}</p>
          <p className="text-xs text-gray-500">Tips Reported</p>
        </div>
        <div className="bg-white rounded-xl p-3 text-center border border-gray-100">
          <p className="text-2xl font-bold text-green-600">R{totalReported.toFixed(0)}</p>
          <p className="text-xs text-gray-500">Total Reported</p>
        </div>
      </div>

      <div className="mx-4 mb-4 bg-amber-50 border border-amber-200 rounded-xl p-3">
        <p className="text-xs text-amber-800">
          Tips are paid directly between tipper and worker via PayShap — TipMe never sees the money. These
          numbers are self-reported by tippers tapping "I've sent the tip" and are not a confirmed record of payment.
        </p>
      </div>

      <div className="mx-4 mb-4 bg-green-50 border border-green-200 rounded-xl p-3">
        <p className="text-xs font-medium text-green-800 mb-1">Worker self-registration link</p>
        <div className="flex gap-2 items-center">
          <p className="text-xs text-green-700 truncate flex-1">{onboardLink}</p>
          <button
            onClick={() => navigator.clipboard.writeText(onboardLink)}
            className="text-xs bg-green-500 text-white px-2 py-1 rounded shrink-0"
          >
            Copy
          </button>
        </div>
      </div>

      <div className="flex border-b border-gray-200 mx-4">
        {(["workers", "tips", "add"] as const).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setFormError(""); setFormSuccess(""); }}
            className={`flex-1 py-2 text-sm font-medium capitalize transition border-b-2 ${
              tab === t ? "border-green-500 text-green-600" : "border-transparent text-gray-500"
            }`}
          >
            {t === "add" ? "+ Add Worker" : t === "tips" ? "Tips (reported)" : t}
          </button>
        ))}
      </div>

      <div className="p-4">
        {tab === "workers" && (
          <div>
            {workers.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <p className="text-4xl mb-2">👷</p>
                <p>No workers yet. Add one to get started.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {workers.map((w) => (
                  <div key={w.id} className="relative">
                    <QrCodeCard worker={w} baseUrl={baseUrl} />
                    <button
                      onClick={async () => {
                        if (confirm(`Remove ${w.name}?`)) await deleteDoc(doc(db, "workers", w.id));
                      }}
                      className="absolute top-2 right-2 text-xs text-red-400 hover:text-red-600"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "tips" && (
          <div className="space-y-3">
            {tips.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <p className="text-4xl mb-2">💸</p>
                <p>No tips reported yet.</p>
              </div>
            ) : (
              tips.map((t) => (
                <div key={t.id} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">{t.workerName}</p>
                    <p className="text-xs text-gray-400">{new Date(t.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600">R{t.amount.toFixed(2)}</p>
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700">
                      self-reported
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {tab === "add" && (
          <div className="space-y-4 max-w-md">
            {formError && <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg p-3">{formError}</div>}
            {formSuccess && <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg p-3">{formSuccess}</div>}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Worker Name</label>
              <input type="text" value={wName} onChange={(e) => setWName(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-400"
                placeholder="Jane Smith" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
              <input type="text" value={wPosition} onChange={(e) => setWPosition(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-400"
                placeholder="Waitress, Valet, Housekeeper…" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
              <input type="tel" value={wPhone} onChange={(e) => setWPhone(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-400"
                placeholder="082 123 4567" />
              <p className="text-xs text-gray-400 mt-1">
                Tippers pay the worker directly on this number via PayShap. Must be registered as their ShapID.
              </p>
            </div>

            <button onClick={handleAddWorker} disabled={adding}
              className="w-full bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition">
              {adding ? "Adding…" : "Add Worker"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
