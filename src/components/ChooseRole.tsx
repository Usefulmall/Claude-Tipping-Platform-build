interface Props {
  onWorker: () => void;
  onEmployer: () => void;
  onBack: () => void;
}

export default function ChooseRole({ onWorker, onEmployer, onBack }: Props) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="text-center mb-6">
          <img src="/tipme-icon.png" alt="TipMe" className="w-16 h-16 object-contain mx-auto mb-2" />
          <h1 className="text-2xl font-bold text-gray-800">How will you use TipMe?</h1>
          <p className="text-gray-500 text-sm mt-1">Choose the option that fits you</p>
        </div>

        <div className="space-y-4">
          <button
            onClick={onWorker}
            className="w-full text-left border-2 border-green-200 hover:border-green-500 hover:bg-green-50 rounded-xl p-4 transition"
          >
            <div className="text-2xl mb-1">🙋</div>
            <p className="font-bold text-gray-800">I'm a worker</p>
            <p className="text-sm text-gray-500">
              I want to receive tips myself. Create my own login, then get and print my own QR code.
            </p>
          </button>

          <button
            onClick={onEmployer}
            className="w-full text-left border-2 border-gray-200 hover:border-green-500 hover:bg-green-50 rounded-xl p-4 transition"
          >
            <div className="text-2xl mb-1">🏢</div>
            <p className="font-bold text-gray-800">I'm an employer / manager</p>
            <p className="text-sm text-gray-500">
              I manage a team. Sign in or create an account to register my workers and print their QR codes.
            </p>
          </button>
        </div>

        <p className="text-center text-sm mt-6">
          <button onClick={onBack} className="text-gray-500 hover:underline">← Back</button>
        </p>
      </div>
    </div>
  );
}
