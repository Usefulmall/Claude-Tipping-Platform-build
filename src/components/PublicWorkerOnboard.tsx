import { useEffect, useState } from "react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../firebase";

interface Props {
  employerId: string;
}

interface Bank {
  name: string;
  code: string;
}

export default function PublicWorkerOnboard({ employerId }: Props) {
  const [banks, setBanks] = useState<Bank[]>([]);
  const [name, setName] = useState("");
  const [position, setPosition] = useState("");
  const [bankCode, setBankCode] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/paystack/banks?currency=ZAR&country=south%20africa")
      .then((r) => r.json())
      .then((d) => { if (d.status && d.data) setBanks(d.data); })
      .catch(() => {});
  }, []);

  async function verifyAccount() {
    if (!accountNumber || !bankCode) return;
    setVerifying(true);
    setError("");
    try {
      const res = await fetch("/api/paystack/verify-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountNumber, bankCode }),
      });
      const data = await res.json();
      if (data.status && data.data?.account_name) {
        setAccountName(data.data.account_name);
        setVerified(true);
      } else {
        setError("Could not verify account. Please check the details.");
      }
    } catch {
      setError("Verification failed. Please try again.");
    } finally {
      setVerifying(false);
    }
  }

  async function handleSubmit() {
    if (!name || !position || !bankCode || !accountNumber || !verified) {
      setError("Please complete all fields and verify your account.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const subRes = await fetch("/api/paystack/create-subaccount", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessName: name, settlementBank: bankCode, accountNumber }),
      });
      const subData = await subRes.json();
      if (!subData.status || !subData.data?.subaccount_code) {
        throw new Error(subData.message || "Subaccount creation failed");
      }
      const workerId = `worker_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      await setDoc(doc(db, "workers", workerId), {
        id: workerId,
        employerId,
        name,
        position,
        bankName,
        bankCode,
        accountNumber,
        accountName,
        subaccountCode: subData.data.subaccount_code,
        createdAt: new Date().toISOString(),
      });
      setDone(true);
    } catch (e: any) {
      setError(e.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
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
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg p-3 mb-4">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-400"
              placeholder="Jane Smith"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Job Position</label>
            <input
              type="text"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-400"
              placeholder="Waitress, Valet, Housekeeper…"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bank</label>
            <select
              value={bankCode}
              onChange={(e) => {
                setBankCode(e.target.value);
                setBankName(banks.find((b) => b.code === e.target.value)?.name || "");
                setVerified(false);
                setAccountName("");
              }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-400"
            >
              <option value="">Select your bank…</option>
              {banks.map((b) => (
                <option key={b.code} value={b.code}>{b.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={accountNumber}
                onChange={(e) => { setAccountNumber(e.target.value); setVerified(false); setAccountName(""); }}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-400"
                placeholder="Your bank account number"
              />
              <button
                onClick={verifyAccount}
                disabled={verifying || !accountNumber || !bankCode}
                className="bg-green-500 hover:bg-green-600 disabled:opacity-40 text-white text-sm font-medium px-3 rounded-lg transition"
              >
                {verifying ? "…" : "Verify"}
              </button>
            </div>
            {verified && (
              <p className="text-green-600 text-xs mt-1 font-medium">✅ {accountName}</p>
            )}
          </div>

          <button
            onClick={handleSubmit}
            disabled={submitting || !verified}
            className="w-full bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition"
          >
            {submitting ? "Registering…" : "Complete Registration"}
          </button>
        </div>
      </div>
    </div>
  );
}
