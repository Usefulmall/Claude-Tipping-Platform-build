import { useState } from "react";

interface Props {
  onAgree: () => void;
  onCancel: () => void;
}

export default function TermsGateModal({ onAgree, onCancel }: Props) {
  const [checked, setChecked] = useState(false);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center px-4 z-50">
      <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-lg">
        <h2 className="text-lg font-bold text-gray-800 mb-3">Before you continue</h2>
        <p className="text-sm text-gray-600 leading-relaxed mb-3">
          TipMe is operated by Sabraro Alpha (Pty) Ltd. Tips are paid directly from
          the tipper to the Service Worker via PayShap — TipMe never holds or
          processes tip money. Tips are generally final, though errors or
          unauthorised transactions can be reported for review.
        </p>
        <p className="text-sm text-gray-600 leading-relaxed mb-3">
          Service Workers: your first month is free, then the TipMe subscription is
          R20 per month. TipMe takes no fee on tips.
        </p>
        <p className="text-sm text-gray-600 leading-relaxed mb-4">
          Please read our full{" "}
          <a
            href="/terms"
            target="_blank"
            rel="noopener noreferrer"
            className="text-green-600 font-medium underline"
          >
            Terms of Use
          </a>{" "}
          before continuing.
        </p>

        <label className="flex items-start gap-2 mb-5 cursor-pointer">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            className="mt-1"
          />
          <span className="text-sm text-gray-700">
            I have read and agree to the TipMe Terms of Use.
          </span>
        </label>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 text-sm font-semibold px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={onAgree}
            disabled={!checked}
            className="flex-1 text-sm font-semibold px-4 py-2 rounded-lg bg-green-500 text-white hover:bg-green-600 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            Agree & Continue
          </button>
        </div>
      </div>
    </div>
  );
}
