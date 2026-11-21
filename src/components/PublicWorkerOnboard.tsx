import { useState } from "react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import BankSelect from "./BankSelect";
import WorkerQrPage from "./WorkerQrPage";
import { Worker } from "../types";

// employerId "self" marks a worker who registered on their own (no employer).
interface Props { employerId: string; independent?: boolean; onBack?: () => void; }

export default function PublicWorkerOnboard({ employerId, independent, onBack }: Props) {
  const [created, setCreated] = useState<Worker | null>(null);
  const [name, setName] = useState("");
  const [position, setPosition] = useState("");
  const [phone, setPhone] = useState("");
  const [bank, setBank] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    if (!name || !position || !phone || !bank) {
      setError("Please complete all fields, including your bank.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const workerId = `worker_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const newWorker: Worker = {
        id: workerId,
        employerId,
        name,
        position,
        phone,
        bank,
        createdAt: new Date().toISOString(),
      };
      await setDoc(doc(db, "workers", workerId), newWorker);
      setCreated(newWorker);
      setDone(true);
    } catch (e: any) {
      setError(e.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done && independent && created) {
    return <WorkerQrPage worker={created} />;
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-green-50 p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full text-center">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-xl font-bold text-gray-800">You're registered!</h2>
          <p className="text-gray-500 mt-2 text-sm">
            Your profile has been created. Your employer will give you a QR code so customers can tip you.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">👋</div>
          <h1 className="text-xl font-bold text-gray-800">Worker Registration</h1>
          <p className="text-sm text-gray-500">Fill in your details to start receiving tips</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg p-3 mb-4">{error}</div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-400"
              placeholder="Jane Smith" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Job Position</label>
            <input type="text" value={position} onChange={(e) => setPosition(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-400"
              placeholder="Waitress, Valet, Housekeeper…" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-400"
              placeholder="082 123 4567" />
            <p className="text-xs text-gray-400 mt-1">
              Tippers pay you directly on this number via PayShap. Make sure it's registered as your ShapID with your bank.
            </p>
          </div>
          <BankSelect value={bank} onChange={setBank} phone={phone} audience="worker" />
          <button onClick={handleSubmit} disabled={submitting}
            className="w-full bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition">
            {submitting ? "Registering…" : "Complete Registration"}
          </button>
          {onBack && (
            <p className="text-center text-sm">
              <button onClick={onBack} className="text-gray-500 hover:underline">← Back</button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
