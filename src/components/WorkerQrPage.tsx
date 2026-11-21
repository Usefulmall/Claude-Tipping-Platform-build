import { Worker } from "../types";
import QrCodeCard from "./QrCodeCard";

interface Props { worker: Worker; }

export default function WorkerQrPage({ worker }: Props) {
  const baseUrl = window.location.origin;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="text-center mb-4">
          <div className="text-4xl mb-2">🎉</div>
          <h1 className="text-xl font-bold text-gray-800">You're registered, {worker.name.split(" ")[0]}!</h1>
          <p className="text-sm text-gray-500">This is your personal tipping QR code.</p>
        </div>

        <QrCodeCard worker={worker} baseUrl={baseUrl} large />

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
              <b>Keep your link safe.</b> Tap <b>Copy Link</b> and save it in your phone notes, or
              take a screenshot of this page, so you can print your card again later.
            </li>
          </ol>
        </div>

        <p className="text-center text-sm mt-6">
          <a href="/" className="text-green-600 font-medium hover:underline">Back to the home page</a>
        </p>
      </div>
    </div>
  );
}
