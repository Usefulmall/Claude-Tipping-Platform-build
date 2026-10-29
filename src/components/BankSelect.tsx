import { useState } from "react";
import { BANKS, cleanBankSuffix } from "../banks";

interface Props {
  value: string;                  // the bank suffix chosen so far ("" = nothing yet)
  onChange: (suffix: string) => void;
  phone: string;                  // used only to show a live example
  audience: "worker" | "employer"; // changes the wording slightly
}

// Dropdown of banks (plus "Other") with a clear explanation of why it matters.
export default function BankSelect({ value, onChange, phone, audience }: Props) {
  const knownBank = BANKS.some((b) => b.suffix === value);
  const [otherMode, setOtherMode] = useState(false);
  const [otherText, setOtherText] = useState("");

  const selectValue = otherMode ? "__other" : knownBank ? value : "";

  function handleSelect(v: string) {
    if (v === "__other") {
      setOtherMode(true);
      onChange(cleanBankSuffix(otherText));
    } else {
      setOtherMode(false);
      onChange(v);
    }
  }

  const exampleNumber = phone.replace(/\D/g, "") || "0821234567";
  const exampleBank = value || "standardbank";
  const who = audience === "worker" ? "your" : "the worker's";

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">Which bank is the number registered with?</label>
      <select
        value={selectValue}
        onChange={(e) => handleSelect(e.target.value)}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-green-400"
      >
        <option value="">Choose a bank…</option>
        {BANKS.map((b) => (
          <option key={b.suffix} value={b.suffix}>{b.label}</option>
        ))}
        <option value="__other">My bank isn't listed</option>
      </select>

      {otherMode && (
        <input
          type="text"
          value={otherText}
          onChange={(e) => { setOtherText(e.target.value); onChange(cleanBankSuffix(e.target.value)); }}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 mt-2 focus:outline-none focus:ring-2 focus:ring-green-400"
          placeholder="Type your bank's name, e.g. africanbank"
        />
      )}

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-3 text-xs text-amber-800 space-y-1">
        <p className="font-semibold">Important: TipMe only works with the bank name added</p>
        <p>
          Tippers must pay {who} ShapID, which is the cellphone number <span className="font-semibold">followed by @ and the bank name</span>.
          Some banking apps will reject the number on its own.
        </p>
        <p>
          Example: <span className="font-mono font-semibold">{exampleNumber}@{exampleBank}</span>
        </p>
        <p>Please choose {audience === "worker" ? "your" : "the"} bank carefully. If it is wrong, tips will fail.</p>
      </div>
    </div>
  );
}
