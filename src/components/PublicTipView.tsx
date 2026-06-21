import { useEffect, useState } from "react";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { Worker, Tip } from "../types";

interface Props {
  workerId: string;
}

const TIP_AMOUNTS = [10, 20, 50, 100, 200];
const PLATFORM_FEE_PERCENT = 0.05; // 5%

declare global {
  interface Window { PaystackPop: any; }
}

export default function PublicTipView({ workerId }: Props) {
  const [worker, setWorker] = useState<Worker | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [paying, setPaying] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const publicKey = (import.meta as any).env.VITE_PAYSTACK_PUBLIC_KEY || "";

  useEffect(() => {
    async function load() {
      try {
        const snap = await getDoc(doc(db, "workers", workerId));
        if (snap.exists()) {
          setWorker(snap.data() as Worker);
        } else {
          setNotFound(true);
        }
      } catch (e) {
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
    if (!customerEmail || !customerEmail.includes("@")) {
      setErrorMsg("Please enter a valid email address.");
      return;
    }
    if (!worker) return;

    const hasRealKey = publicKey && publicKey !== "" && !publicKey.startsWith("pk_test_xxx");
    const paystackReady = typeof window.PaystackPop !== "undefined";

    if (!hasRealKey || !paystackReady) {
      setErrorMsg("Paystack is not configured. Please contact the administrator.");
      return;
    }

    setPaying(true);
    const refId = `tip_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    // Save pending tip to Firestore before payment
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
      customerEmail,
      createdAt: new Date().toISOString(),
      ...(customerName ? { customerName } : {}),
    };

    try {
      await setDoc(doc(db, "tips", refId), pendingTip);
    } catch (e: any) {
      setErrorMsg("Could not initiate payment. Please try again.");
      setPaying(false);
      return;
    }

    // Launch Paystack popup
    const handler = window.PaystackPop.setup({
      key: publicKey,
      email: customerEmail,
      amount: Math.round(finalAmount * 100), // Paystack uses kobo/cents
      currency: "ZAR",
      ref: refId,
      subaccount: worker.subaccountCode,
      bearer: "account", // platform bears the fee
      metadata: {
        custom_fields: [
          { display_name: "Worker", variable_name: "worker_name", value: worker.name },
          { display_name: "Tipper", variable_name: "customer_name", value: customerName || "Anonymous" },
        ],
      },
      callback: function (response: any) {
        // Payment succeeded — update Firestore (fire and forget)
        updateDoc(doc(db, "tips", refId), {
          status: "success",
          reference: response.reference,
        }).catch(() => {});
        setSuccess(true);
        setPaying(false);
      },
      onClose: function () {
        // Customer closed the popup — mark as failed (fire and forget)
        updateDoc(doc(db, "tips", refId), { status: "failed" }).catch(() => {});
        setPaying(false);
      },
    });

    handler.openIframe();
  }

  // ── Loading state ────────────────────────────────────────────────────────────
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

  // ── Success state ────────────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-gray-800">Thank you!</h2>
          <p className="text-gray-500 mt-2">
            Your tip of <span className="font-semibold text-green-600">R{finalAmount.toFixed(2)}</span> for{" "}
            <span className="font-semibold">{worker.name}</span> was sent successfully.
          </p>
          <button
            onClick={() => { setSuccess(false); setSelectedAmount(null); setCustomAmount(""); setCustomerEmail(""); setCustomerName(""); }}
            className="mt-6 w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-2.5 rounded-xl transition"
          >
            Tip Again
          </button>
        </div>
      </div>
    );
  }

  // ── Main tip form ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3 text-3xl">
            💚
          </div>
          <h1 className="text-xl font-bold text-gray-800">Tip {worker.name}</h1>
          <p className="text-sm text-gray-500">{worker.position}</p>
        </div>

        {/* Amount selection */}
        <p className="text-sm font-medium text-gray-700 mb-2">Select an amount (ZAR)</p>
        <div className="grid grid-cols-5 gap-2 mb-3">
          {TIP_AMOUNTS.map((amt) => (
            <button
              key={amt}
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

        <input
          type="number"
          placeholder="Or enter custom amount (R)"
          value={customAmount}
          min={5}
          onChange={(e) => { setCustomAmount(e.target.value); setSelectedAmount(null); }}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 mb-4"
        />

        {finalAmount >= 5 && (
          <div className="bg-green-50 rounded-lg p-3 text-xs text-gray-600 mb-4 space-y-1">
            <div className="flex justify-between"><span>Tip amount</span><span className="font-medium">R{finalAmount.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>Platform fee (5%)</span><span>R{feeAmount.toFixed(2)}</span></div>
            <div className="flex justify-between font-semibold text-green-700"><span>{worker.name} receives</span><span>R{workerAmount.toFixed(2)}</span></div>
          </div>
        )}

        {/* Customer details */}
        <div className="space-y-3 mb-4">
          <input
            type="text"
            placeholder="Your name (optional)"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
          />
          <input
            type="email"
            placeholder="Your email (for receipt) *"
            value={customerEmail}
            onChange={(e) => setCustomerEmail(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
          />
        </div>

        {errorMsg && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg p-2 mb-3">
            {errorMsg}
          </div>
        )}

        <button
          onClick={handlePay}
          disabled={paying || !finalAmount}
          className="w-full bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition text-sm"
        >
          {paying ? "Opening payment…" : `Send Tip${finalAmount >= 5 ? ` · R${finalAmount.toFixed(2)}` : ""}`}
        </button>

        <p className="text-center text-xs text-gray-400 mt-3">Secured by Paystack 🔒</p>
      </div>
    </div>
  );
}
