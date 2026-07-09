import { useEffect, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { Worker, Tip } from "../types";

interface Props { workerId: string; }

const TIP_AMOUNTS = [10, 20, 50, 100, 200];
const PLATFORM_FEE_PERCENT = 0.08; // 8% — must match percentage_charge in server.js

export default function PublicTipView({ workerId }: Props) {
  const [worker, setWorker] = useState<Worker | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [paying, setPaying] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

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
  const feeAmount = parseFloat((finalAmount * PLATFORM_FEE_PERCENT).toFixed(2));
  const workerAmount = parseFloat((finalAmount - feeAmount).toFixed(2));

  async function handlePay() {
    setErrorMsg("");
    if (!finalAmount || finalAmount < 5) {
      setErrorMsg("Minimum tip is R5.");
      return;
    }
    if (!worker) return;

    setPaying(true);
    const refId = `tip_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    // Generate a placeholder email for Paystack's internal requirement.
    // The tipper never sees or enters this — it's handled entirely server-side.
    const emailForPaystack = `${refId}@tipme.noemail`;

    // Save pending tip to Firestore before initiating payment
    const pendingTip: Tip = {
      id: refId,
      workerId: worker.id,
      workerName: worker.name,
      employerId: worker.employerId,
      amount: finalAmount,
      feeAmount,
      workerAmount,
      status: "pending",
      reference: refId,
      customerEmail: emailForPaystack,
      createdAt: new Date().toISOString(),
      ...(customerName ? { customerName } : {}),
    };

    try {
      await setDoc(doc(db, "tips", refId), pendingTip);
    } catch {
      setErrorMsg("Could not initiate payment. Please try again.");
      setPaying(false);
      return;
    }

    // Ask our server to initiate the Paystack charge via EFT (Ozow).
    // The server holds the secret key and calls Paystack's Charge API.
    // Paystack returns an authorization URL we redirect the tipper to.
    try {
      const res = await fetch("/api/paystack/initiate-eft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reference: refId,
          amount: finalAmount,
          email: emailForPaystack,
          subaccountCode: worker.subaccountCode,
          workerName: worker.name,
          customerName: customerName || "Anonymous",
          callbackUrl: `${window.location.origin}?payment=done&ref=${refId}&worker=${worker.id}`,
        }),
      });
      const data = await res.json();

      if (data.status && data.authorization_url) {
        // Redirect tipper to Paystack's EFT/Ozow page — they pay via banking app
        window.location.href = data.authorization_url;
      } else {
        throw new Error(data.message || "Could not initiate payment.");
      }
    } catch (e: any) {
      setErrorMsg(e.message || "Something went wrong. Please try again.");
      setPaying(false);
    }
  }

  // ── Check for payment return (tipper redirected back after paying) ───────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("payment") === "done") {
      setSuccess(true);
    }
  }, []);

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

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-gray-800">Thank you!</h2>
          <p className="text-gray-500 mt-2">
            Your tip for <span className="font-semibold">{worker.name}</span> was sent successfully.
          </p>
          <button
            onClick={() => {
              setSuccess(false);
              setSelectedAmount(null);
              setCustomAmount("");
              setCustomerName("");
              window.history.replaceState({}, "", `?worker=${worker.id}`);
            }}
            className="mt-6 w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-2.5 rounded-xl transition"
          >
            Tip Again
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

        <p className="text-sm font-medium text-gray-700 mb-2">Select an amount (ZAR)</p>
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

        <input type="number" placeholder="Or enter custom amount (R)"
          value={customAmount} min={5}
          onChange={(e) => { setCustomAmount(e.target.value); setSelectedAmount(null); }}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 mb-4"
        />

        {finalAmount >= 5 && (
          <div className="bg-green-50 rounded-lg p-3 text-xs text-gray-600 mb-4 space-y-1">
            <div className="flex justify-between"><span>Tip amount</span><span className="font-medium">R{finalAmount.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>Platform fee (8%)</span><span>R{feeAmount.toFixed(2)}</span></div>
            <div className="flex justify-between font-semibold text-green-700"><span>{worker.name} receives</span><span>R{workerAmount.toFixed(2)}</span></div>
          </div>
        )}

        <div className="mb-4">
          <input type="text" placeholder="Your name (optional)"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
          />
        </div>

        {errorMsg && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg p-2 mb-3">{errorMsg}</div>
        )}

        <button onClick={handlePay} disabled={paying || !finalAmount}
          className="w-full bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition text-sm"
        >
          {paying ? "Opening payment…" : `Pay via Banking App${finalAmount >= 5 ? ` · R${finalAmount.toFixed(2)}` : ""}`}
        </button>

        <p className="text-center text-xs text-gray-400 mt-3">Secured by Paystack & Ozow 🔒</p>
      </div>
    </div>
  );
}
