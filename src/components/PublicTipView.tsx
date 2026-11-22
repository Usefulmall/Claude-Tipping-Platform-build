import { useEffect, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { Worker, Tip } from "../types";
import { fullShapId, bankLabel, correctedBank } from "../banks";
import { isActive } from "../subscription";

interface Props { workerId: string; }

const TIP_AMOUNTS = [10, 20, 50, 100, 200];

export default function PublicTipView({ workerId }: Props) {
  const [worker, setWorker] = useState<Worker | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [copied, setCopied] = useState(false);
  const [sent, setSent] = useState(false);
  const [reporting, setReporting] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const snap = await getDoc(doc(db, "workers", workerId));
        if (snap.exists()) {
          setWorker(snap.data() as Worker);
        } else {
          setNotFound(true);
        }
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [workerId]);

  const finalAmount = selectedAmount ?? (customAmount ? parseFloat(customAmount) : 0);

  function handleCopy() {
    if (!worker) return;
    navigator.clipboard.writeText(fullShapId(worker.phone, worker.bank));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // The tipper is the one telling us a tip happened — TipMe has no way to
  // confirm it independently, since the payment never passes through us.
  // We log it as a self-report and let the worker's own phone notify them.
  async function handleMarkSent() {
    if (!worker) return;
    setReporting(true);
    const tipId = `tip_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const reportedAmount = finalAmount >= 1 ? finalAmount : 0;

    try {
      const tip: Tip = {
        id: tipId,
        workerId: worker.id,
        workerName: worker.name,
        employerId: worker.employerId,
        amount: reportedAmount || 1, // Firestore rule requires amount > 0; a blank tip still counts as "a tip happened"
        status: "reported",
        createdAt: new Date().toISOString(),
      };
      await setDoc(doc(db, "tips", tipId), tip);
    } catch {
      // Logging is a nice-to-have for the employer dashboard, not something
      // that should block the tipper from finishing. Fail silently.
    }

    try {
      await fetch("/api/notify-tip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: worker.phone, workerName: worker.name, amount: reportedAmount }),
      });
    } catch {
      // Same — SMS is a courtesy notification, not something to block on.
    }

    setReporting(false);
    setSent(true);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound || !worker) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center">
          <div className="text-5xl mb-4">🔍</div>
          <h2 className="text-xl font-bold text-gray-800">Worker not found</h2>
          <p className="text-gray-500 mt-2">This QR code may be invalid or expired.</p>
        </div>
      </div>
    );
  }

  // The worker's subscription has lapsed, so their QR code is switched off.
  if (!isActive(worker)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full text-center">
          <div className="text-5xl mb-4">⏸️</div>
          <h2 className="text-xl font-bold text-gray-800">This QR code is inactive</h2>
          <p className="text-gray-500 mt-2 text-sm">
            {worker.name}'s TipMe QR code is not switched on at the moment, so tips cannot be sent from this page.
            You can still thank them in person.
          </p>
        </div>
      </div>
    );
  }

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-gray-800">Thank you!</h2>
          <p className="text-gray-500 mt-2">
            Your tip for <span className="font-semibold">{worker.name}</span> is on its way, straight to their own bank account.
          </p>
          <button
            onClick={() => { setSent(false); setSelectedAmount(null); setCustomAmount(""); }}
            className="mt-6 w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-2.5 rounded-xl transition"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3 text-3xl">
            💚
          </div>
          <h1 className="text-xl font-bold text-gray-800">Tip {worker.name}</h1>
          <p className="text-sm text-gray-500">{worker.position}</p>
        </div>

        {/* Step 1: pick an amount (for the tipper's own reference) */}
        <p className="text-sm font-medium text-gray-700 mb-2">1. How much would you like to tip?</p>
        <div className="grid grid-cols-5 gap-2 mb-3">
          {TIP_AMOUNTS.map((amt) => (
            <button key={amt}
              onClick={() => { setSelectedAmount(amt); setCustomAmount(""); }}
              className={`py-2 rounded-lg text-sm font-semibold border transition ${
                selectedAmount === amt
                  ? "bg-green-500 text-white border-green-500"
                  : "bg-white text-gray-700 border-gray-200 hover:border-green-400"
              }`}
            >
              R{amt}
            </button>
          ))}
        </div>
        <input type="number" placeholder="Or enter a custom amount (R)"
          value={customAmount} min={1}
          onChange={(e) => { setCustomAmount(e.target.value); setSelectedAmount(null); }}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 mb-5"
        />

        {/* Step 2: the worker's PayShap number */}
        <p className="text-sm font-medium text-gray-700 mb-2">2. Pay this ShapID via PayShap</p>
        <div className="bg-green-50 border border-green-100 rounded-xl p-4 mb-2 flex items-center justify-between gap-3">
          <span className="text-base font-bold text-gray-800 break-all">{fullShapId(worker.phone, worker.bank)}</span>
          <button
            onClick={handleCopy}
            className="shrink-0 text-xs font-semibold bg-white border border-green-300 text-green-700 px-3 py-1.5 rounded-lg hover:bg-green-100 transition"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
        <p className="text-xs text-gray-400 mb-5">
          {worker.bank
            ? <>This is {worker.name}'s cellphone number at {bankLabel(worker.bank)}. Use it exactly as shown, including the part after the @.</>
            : <>This is {worker.name}'s own cellphone number, registered with their bank.</>}
        </p>

        {/* Step 3: instructions */}
        <p className="text-sm font-medium text-gray-700 mb-2">3. In your own banking app</p>
        <ol className="text-sm text-gray-600 space-y-1.5 mb-6 list-decimal list-inside">
          <li>Open your banking app and choose <span className="font-medium">Pay</span> or <span className="font-medium">PayShap</span>.</li>
          <li>Paste the full ShapID above as the recipient, exactly as shown{worker.bank ? <>, including <span className="font-medium">@{correctedBank(worker.bank)}</span></> : ""}. Your app may only accept it with the @ part.</li>
          <li>Enter{finalAmount >= 1 ? <> <span className="font-medium">R{finalAmount.toFixed(2)}</span></> : " your amount"} and confirm the payment goes to <span className="font-medium">{worker.name}</span>.</li>
        </ol>

        <button
          onClick={handleMarkSent}
          disabled={reporting}
          className="w-full bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition text-sm"
        >
          {reporting ? "One moment…" : "I've sent the tip"}
        </button>

        <p className="text-center text-xs text-gray-400 mt-3">Paid directly to {worker.name} via PayShap. TipMe never handles your money.</p>
      </div>
    </div>
  );
}
