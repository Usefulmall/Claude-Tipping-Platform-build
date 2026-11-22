import { useEffect, useState } from "react";
import { signOut } from "firebase/auth";
import { collection, query, where, onSnapshot, doc, setDoc, deleteDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import { AppUser, Worker } from "../types";
import QrCodeCard from "./QrCodeCard";
import BankSelect from "./BankSelect";

interface Props { user: AppUser; }

export default function EmployerDashboard({ user }: Props) {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [tab, setTab] = useState<"workers" | "add">("workers");

  const [wName, setWName] = useState("");
  const [wPosition, setWPosition] = useState("");
  const [wPhone, setWPhone] = useState("");
  const [wBank, setWBank] = useState("");
  const [adding, setAdding] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  const baseUrl = window.location.origin;

  useEffect(() => {
    const q = query(collection(db, "workers"), where("employerId", "==", user.uid));
    return onSnapshot(q, (snap) => {
      setWorkers(snap.docs.map((d) => d.data() as Worker));
    });
  }, [user.uid]);

  async function handleAddWorker() {
    if (!wName || !wPosition || !wPhone || !wBank) {
      setFormError("Please complete all fields, including the worker's bank.");
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
        bank: wBank,
        createdAt: new Date().toISOString(),
      });
      setFormSuccess(`${wName} has been added!`);
      setWName(""); setWPosition(""); setWPhone(""); setWBank("");
      setTab("workers");
    } catch (e: any) {
      setFormError(e.message || "Something went wrong.");
    } finally {
      setAdding(false);
    }
  }

  // TipMe does not process or track tips (they go straight from tipper to
  // worker via PayShap), so this page only manages workers and their QR codes.

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

      <div className="flex border-b border-gray-200 mx-4">
        {(["workers", "add"] as const).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setFormError(""); setFormSuccess(""); }}
            className={`flex-1 py-2 text-sm font-medium capitalize transition border-b-2 ${
              tab === t ? "border-green-500 text-green-600" : "border-transparent text-gray-500"
            }`}
          >
            {t === "add" ? "+ Add Worker" : `Workers (${workers.length})`}
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
            <BankSelect value={wBank} onChange={setWBank} phone={wPhone} audience="employer" />

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
