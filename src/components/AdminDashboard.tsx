import { useEffect, useState } from "react";
import { signOut } from "firebase/auth";
import { collection, doc, onSnapshot, updateDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import { AppUser, Tip, Worker } from "../types";
import { fullShapId } from "../banks";
import { activeUntil, extendedUntil, formatDate, inFreeMonth, isActive } from "../subscription";

interface Props { user: AppUser; }

export default function AdminDashboard({ user }: Props) {
  const [tips, setTips] = useState<Tip[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [tab, setTab] = useState<"workers" | "tips">("workers");
  const [reminderMsg, setReminderMsg] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const unsub1 = onSnapshot(collection(db, "tips"), (snap) => {
      const all = snap.docs.map((d) => d.data() as Tip);
      setTips(all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    });
    const unsub2 = onSnapshot(collection(db, "workers"), (snap) => {
      const all = snap.docs.map((d) => d.data() as Worker);
      // Newest registrations first, so a brand-new sign-up is easy to spot.
      setWorkers(all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    });
    return () => { unsub1(); unsub2(); };
  }, []);

  // Every tip here is self-reported by the tipper (TipMe never processes the
  // payment, so it has no way to confirm one happened). This is an activity
  // indicator across the whole platform, not a reconciled revenue figure —
  // TipMe no longer earns anything from the tip itself.
  const totalReported = tips.reduce((sum, t) => sum + t.amount, 0);
  const activeCount = workers.filter((w) => isActive(w)).length;

  // Records one more paid month for a worker (used until payments are matched automatically).
  async function extendOneMonth(w: Worker) {
    if (!confirm(`Record one more paid month for ${w.name}?`)) return;
    await updateDoc(doc(db, "workers", w.id), { paidUntil: extendedUntil(w) });
  }

  // Asks the server to send the reminder SMS messages that are due today.
  async function sendRemindersNow() {
    if (!confirm("Send the reminder SMS messages that are due today?")) return;
    setSending(true);
    setReminderMsg("");
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch("/api/run-reminders", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) setReminderMsg(data.message || "Could not send reminders.");
      else if (data.noSms > 0) setReminderMsg("The SMS service is not switched on yet (BulkSMS login missing on the server), so nothing was sent.");
      else setReminderMsg(`Done: ${data.sent} SMS sent, ${data.skipped} not due, ${data.failed} failed.`);
    } catch {
      setReminderMsg("Could not reach the server.");
    } finally {
      setSending(false);
    }
  }

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
          <p className="text-xs text-gray-500 mb-1">Registered Workers</p>
          <p className="text-2xl font-bold text-blue-600">{workers.length}</p>
          <p className="text-xs text-gray-400">{activeCount} active · {workers.length - activeCount} inactive</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-xs text-gray-500 mb-1">Tips Reported (all time)</p>
          <p className="text-2xl font-bold text-green-600">R{totalReported.toFixed(2)}</p>
          <p className="text-xs text-gray-400">{tips.length} self-reported tips</p>
        </div>
      </div>

      <div className="flex border-b border-gray-200 mx-4">
        {(["workers", "tips"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 text-sm font-medium transition border-b-2 ${
              tab === t ? "border-green-500 text-green-600" : "border-transparent text-gray-500"
            }`}
          >
            {t === "workers" ? `Workers (${workers.length})` : `Tips (${tips.length})`}
          </button>
        ))}
      </div>

      {tab === "workers" && (
        <div className="p-4 space-y-3 pb-8">
          <div className="bg-white rounded-xl border border-gray-100 p-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-gray-500">
              Reminder SMS messages go out automatically every day. You can also send today's now.
            </p>
            <button
              onClick={sendRemindersNow}
              disabled={sending}
              className="text-xs font-semibold bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg"
            >
              {sending ? "Sending…" : "Send reminders now"}
            </button>
            {reminderMsg && <p className="w-full text-xs text-gray-700">{reminderMsg}</p>}
          </div>

          {workers.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="text-4xl mb-2">👷</p>
              <p>No workers registered yet.</p>
            </div>
          ) : (
            workers.map((w) => {
              const active = isActive(w);
              return (
                <div key={w.id} className="bg-white rounded-xl border border-gray-100 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-800 text-sm">{w.name}</p>
                      <p className="text-xs text-gray-500">{w.position} · {w.employerId === "self" ? "Individual" : "Employer-registered"}</p>
                      <p className="text-xs text-gray-500 font-mono break-all mt-1">{fullShapId(w.phone, w.bank)}</p>
                      <p className="text-xs text-gray-400 mt-1">Registered {formatDate(new Date(w.createdAt))}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                      }`}>
                        {active ? (inFreeMonth(w) ? "free month" : "active") : "inactive"}
                      </span>
                      <p className="text-xs text-gray-500 mt-1">
                        {active ? "until" : "since"} {formatDate(activeUntil(w))}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => extendOneMonth(w)}
                    className="mt-3 text-xs font-semibold border border-green-300 text-green-700 px-3 py-1.5 rounded-lg hover:bg-green-50"
                  >
                    + Record one paid month
                  </button>
                </div>
              );
            })
          )}
        </div>
      )}

      {tab === "tips" && (
        <>
          <div className="mx-4 my-4 bg-amber-50 border border-amber-200 rounded-xl p-3">
            <p className="text-xs text-amber-800">
              Tips are paid directly between tipper and worker via PayShap — TipMe never sees the money. These
              figures are self-reported by tippers tapping "I've sent the tip" and are not a confirmed payment record.
            </p>
          </div>

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
        </>
      )}
    </div>
  );
}
