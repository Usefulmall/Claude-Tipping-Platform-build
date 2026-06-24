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
    description: "Tips are processed in real-time through Paystack, straight to the worker's bank account.",
  },
  {
    icon: "🔒",
    title: "Secure & Safe",
    description: "Bank-grade security with encrypted transactions and verified worker accounts.",
  },
  {
    icon: "👋",
    title: "Easy Onboarding",
    description: "A simple form captures everything needed. Bank account setup happens automatically.",
  },
  {
    icon: "📊",
    title: "Transparent Tracking",
    description: "Employers can track tips, workers, and payouts in one simple dashboard.",
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
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
      {/* Top bar */}
      <header className="bg-white/70 backdrop-blur border-b border-gray-100 px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">💸</span>
          <span className="font-bold text-gray-800">TipMe Platform</span>
        </div>
        <button
          onClick={onGetStarted}
          className="text-sm bg-green-500 hover:bg-green-600 text-white font-semibold px-4 py-2 rounded-lg transition"
        >
          Sign In / Register
        </button>
      </header>

      {/* Hero */}
      <section className="text-center px-4 pt-16 pb-14 max-w-2xl mx-auto">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-4">
          Digital Tipping Made Simple
        </h1>
        <p className="text-gray-600 mb-8">
          Enable your workers to receive tips directly through QR codes. Secure, fast,
          and transparent — with automatic tracking for every tip.
        </p>
        <button
          onClick={onGetStarted}
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
            <div
              key={f.title}
              className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm"
            >
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
              <div
                className={`w-12 h-12 ${STEP_COLORS[i].bg} ${STEP_COLORS[i].text} rounded-full flex items-center justify-center font-bold text-lg mx-auto mb-3`}
              >
                {s.number}
              </div>
              <h3 className="font-semibold text-gray-800 text-sm mb-1">{s.title}</h3>
              <p className="text-xs text-gray-500">{s.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer CTA */}
      <section className="text-center px-4 pb-16">
        <button
          onClick={onGetStarted}
          className="bg-green-500 hover:bg-green-600 text-white font-bold px-8 py-3 rounded-xl transition shadow-md"
        >
          Get Started
        </button>
      </section>
    </div>
  );
}
