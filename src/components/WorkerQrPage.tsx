import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import { Worker } from "../types";
import { fullShapId } from "../banks";
import QrCodeCard from "./QrCodeCard";
import {
  PRICE_RAND, SUBSCRIPTION_SHAPID, activeUntil, formatDate, inFreeMonth, isActive, paymentReference,
} from "../subscription";

// Shows whether the QR code is switched on, and how to pay the R20 to keep it on.
function SubscriptionBanner({ worker }: { worker: Worker }) {
  const active = isActive(worker);
  const until = formatDate(activeUntil(worker));
  return (
    <div className={`mb-4 rounded-lg border p-3 text-sm ${
      active ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800"
    }`}>
      <p className="font-semibold">
        {active
          ? inFreeMonth(worker) ? `Your first month is free, until ${until}.` : `Your QR code is active until ${until}.`
          : `Your QR code is inactive since ${until}. Customers cannot tip you until you pay.`}
      </p>
      <p className="mt-1 text-xs">
        To keep it on, pay <b>R{PRICE_RAND}</b> per month by PayShap in your banking app to{" "}
        <b className="font-mono break-all">{SUBSCRIPTION_SHAPID}</b>, and use your cellphone number{" "}
        <b className="font-mono">{paymentReference(worker)}</b> as the reference. We switch you on once
        your payment is received.
      </p>
    </div>
  );
}

interface Props {
  worker: Worker;
  justRegistered?: boolean;
}

export default function WorkerQrPage({ worker, justRegistered }: Props) {
  const baseUrl = window.location.origin;
  const firstName = worker.name.split(" ")[0];

  async function handleSignOut() {
    try { await signOut(auth); } catch { /* ignore */ }
    window.location.href = "/";
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="text-center mb-4">
          <div className="text-4xl mb-2">{justRegistered ? "🎉" : "👋"}</div>
          <h1 className="text-xl font-bold text-gray-800">
            {justRegistered ? `You're registered, ${firstName}!` : `Welcome back, ${firstName}`}
          </h1>
          <p className="text-sm text-gray-500">This is your personal tipping QR code.</p>
        </div>

        <SubscriptionBanner worker={worker} />

        <QrCodeCard worker={worker} baseUrl={baseUrl} large />

        <div className="mt-4 bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
          <p className="text-xs text-gray-500">Customers will pay this PayShap ID</p>
          <p className="font-mono font-semibold text-gray-800 text-sm break-all">
            {fullShapId(worker.phone, worker.bank)}
          </p>
        </div>

        <div className="mt-5 space-y-3 text-sm text-gray-600">
          <h2 className="font-bold text-gray-800">What to do next</h2>
          <ol className="list-decimal pl-5 space-y-2">
            <li>
              Tap <b>Print QR</b> above and print your card. Wear it on a lanyard or badge holder,
              or stick it where customers can see it.
            </li>
            <li>
              Make sure PayShap (your ShapID) is switched on for your cellphone number in your own
              banking app. Customers pay straight to your bank account.
            </li>
            <li>
              Customers scan your QR code with their phone camera, see your details and pay from
              their own banking app. No cash, no hassle.
            </li>
            <li>
              Come back any time: sign in with your cellphone number and password to see this page
              and print your card again.
            </li>
          </ol>
        </div>

        <div className="flex items-center justify-center gap-6 text-sm mt-6">
          <button onClick={handleSignOut} className="text-gray-500 hover:underline">Sign out</button>
        </div>
      </div>
    </div>
  );
}
