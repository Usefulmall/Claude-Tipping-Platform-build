import { useState } from "react";
import TermsGateModal from "./TermsGateModal";

interface Props {
  onGetStarted: () => void;
}

const FEATURES = [
  {
    icon: "📱",
    title: "QR Code Tipping",
    description: "Customers scan a QR code to send a tip instantly. No cash, no hassle.",
  },
  {
    icon: "⚡",
    title: "Instant Payouts",
    description: "Tips go straight from the customer's banking app to the worker's own bank account via PayShap — no delay, no middleman.",
  },
  {
    icon: "🔒",
    title: "Secure & Safe",
    description: "Payments move bank-to-bank over PayShap. TipMe never holds or touches tip money.",
  },
  {
    icon: "👋",
    title: "Easy Onboarding",
    description: "A simple form captures everything needed — just a name, position, cellphone number and bank.",
  },
  {
    icon: "💚",
    title: "Workers Keep Every Tip",
    description: "Each tip goes straight to the worker's own account. TipMe takes no cut of any tip and never holds the money.",
  },
  {
    icon: "🖨️",
    title: "Printable QR Cards",
    description: "Print a QR code for each worker to display at a till point or name badge.",
  },
];

const STEPS = [
  { number: 1, title: "Register", description: "Sign up as an employer and create your account in seconds." },
  { number: 2, title: "Onboard Workers", description: "Add your workers, or share a link so they register themselves." },
  { number: 3, title: "Share the QR Code", description: "Each worker gets a unique QR code to display or print." },
  { number: 4, title: "Receive Tips", description: "Customers scan and tip. Money goes straight to the worker's bank account." },
];

const STEP_COLORS = [
  { bg: "bg-blue-100", text: "text-blue-600" },
  { bg: "bg-green-100", text: "text-green-600" },
  { bg: "bg-purple-100", text: "text-purple-600" },
  { bg: "bg-orange-100", text: "text-orange-600" },
];

export default function LandingPage({ onGetStarted }: Props) {
  const [showTerms, setShowTerms] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
      {showTerms && (
        <TermsGateModal
          onAgree={onGetStarted}
          onCancel={() => setShowTerms(false)}
        />
      )}

      {/* Top bar */}
      <header className="bg-white/70 backdrop-blur border-b border-gray-100 px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/tipme-icon.png" alt="TipMe" className="w-12 h-12 object-contain" />
          <span className="font-bold text-gray-800 text-2xl">TipMe Platform</span>
        </div>
        <button
          onClick={() => setShowTerms(true)}
          className="text-sm bg-green-500 hover:bg-green-600 text-white font-semibold px-4 py-2 rounded-lg transition"
        >
          Sign In / Register
        </button>
      </header>

      {/* Hero */}
      <section className="text-center px-4 pt-16 pb-14 max-w-2xl mx-auto">
        <h1 className="text-4xl sm:text-6xl font-bold text-gray-800 mb-4">
          Digital Tipping Made Simple
        </h1>
        <p className="text-gray-600 mb-8">
          Let your workers receive tips straight into their own bank accounts through a
          QR code. Fast, secure and cashless — customers pay from their own banking app,
          and TipMe never touches the money.
        </p>
        <button
          onClick={() => setShowTerms(true)}
          className="bg-green-500 hover:bg-green-600 text-white font-bold px-8 py-3 rounded-xl transition shadow-md"
        >
          Get Started
        </button>
      </section>

      {/* Why choose us */}
      <section className="px-4 pb-16 max-w-5xl mx-auto">
        <h2 className="text-xl font-bold text-gray-800 text-center mb-8">
          Why Choose Our Platform?
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
              <div className="text-2xl mb-2">{f.icon}</div>
              <h3 className="font-semibold text-gray-800 text-sm mb-1">{f.title}</h3>
              <p className="text-xs text-gray-500">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="px-4 pb-20 max-w-4xl mx-auto">
        <h2 className="text-xl font-bold text-gray-800 text-center mb-10">
          How It Works
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {STEPS.map((s, i) => (
            <div key={s.number} className="text-center">
              <div className={`w-12 h-12 ${STEP_COLORS[i].bg} ${STEP_COLORS[i].text} rounded-full flex items-center justify-center font-bold text-lg mx-auto mb-3`}>
                {s.number}
              </div>
              <h3 className="font-semibold text-gray-800 text-sm mb-1">{s.title}</h3>
              <p className="text-xs text-gray-500">{s.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* About */}
      <section className="px-4 pb-16 max-w-3xl mx-auto">
        <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
          <h2 className="text-xl font-bold text-gray-800 text-center mb-4">
            About TipMe
          </h2>
          <p className="text-sm text-gray-600 leading-relaxed mb-3">
            TipMe is sponsored by Sabraro Alpha (Pty) Ltd. In an increasingly cashless
            society, service workers do not have a means to raise tips other than
            turning to sites like this one.
          </p>
          <p className="text-sm text-gray-600 leading-relaxed mb-3">
            Sabraro Alpha can be contacted at{" "}
            <a href="mailto:jolwage@yahoo.com" className="text-green-600 font-medium">
              jolwage@yahoo.com
            </a>
            .
          </p>
          <p className="text-sm text-gray-600 leading-relaxed mb-3">
            Physical address: 997 De Swantje Close, Langebaan Country Estate,
            Langebaan, Western Cape, South Africa.
          </p>
          <p className="text-sm text-gray-600 leading-relaxed mb-3">
            WhatsApp:{" "}
            <a href="https://wa.me/27843088317" className="text-green-600 font-medium">
              +27 84 308 8317
            </a>
          </p>
          <p className="text-sm text-gray-600 leading-relaxed">
            Should you or a customer experience any difficulty, or wish to have
            faulty transactions reversed, please contact Johan Olwage at the above.
          </p>
        </div>
      </section>

      <footer className="text-center px-4 pb-10">
        <a href="/terms" className="text-xs text-gray-500 underline hover:text-gray-700">
          Terms of Use
        </a>
      </footer>
    </div>
  );
}
