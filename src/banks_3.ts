// Banks a worker can choose at registration, and the text that goes after the
// "@" in their PayShap ShapID (e.g. 0821234567@standardbank).
//
// This is the ONE place to correct a bank's suffix if a bank ever changes it.
// Each suffix below was checked against the bank's own published material
// (31 Oct 2026):
//   standardbank  - Standard Bank help pages (0812345678@standardbank)
//   absa          - Absa help page (0831234567@absa)
//   capitec       - Capitec PayShap terms (cellphone number@capitec)
//   nedbank       - Nedbank PayShap FAQ (cellphonenumber@Nedbank)
//   discoverybank - Discovery Bank page (0821112345@discoverybank)
//   tyme          - GoTyme Bank (formerly TymeBank) page (cellphonenumber@Tyme)
//   investec      - Investec factsheet (mobile number@investec)
//   fnb           - FNB's own executive quoted in the press (cellphonenumber@FNB);
//                   not yet proven by a real payment here
// Banks not listed (African Bank, OM Bank, Al Baraka, HBZ...) use "My bank isn't listed".

export interface BankOption {
  suffix: string; // text after the "@"
  label: string;  // what people see in the dropdown
}

export const BANKS: BankOption[] = [
  { suffix: "standardbank", label: "Standard Bank" },
  { suffix: "absa", label: "Absa" },
  { suffix: "capitec", label: "Capitec" },
  { suffix: "fnb", label: "FNB" },
  { suffix: "nedbank", label: "Nedbank" },
  { suffix: "discoverybank", label: "Discovery Bank" },
  { suffix: "tyme", label: "GoTyme Bank (TymeBank)" },
  { suffix: "investec", label: "Investec" },
];

// Earlier versions saved two suffixes that turned out to be wrong. Workers
// registered with those values are corrected automatically when displayed.
const CORRECTIONS: Record<string, string> = {
  discovery: "discoverybank",
  tymebank: "tyme",
};

export function correctedBank(suffix: string | undefined): string | undefined {
  if (!suffix) return suffix;
  return CORRECTIONS[suffix] ?? suffix;
}

// Turns whatever a person typed for a phone number into plain local digits,
// e.g. "082 123 4567" or "+27 82 123 4567" -> "0821234567".
export function cleanPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("27")) return "0" + digits.slice(2);
  return digits;
}

// Makes a typed bank name safe to use after the "@": lowercase letters/digits only.
export function cleanBankSuffix(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function bankLabel(suffix: string | undefined): string {
  const fixed = correctedBank(suffix);
  if (!fixed) return "";
  return BANKS.find((b) => b.suffix === fixed)?.label ?? fixed;
}

// The full ShapID a tipper must use, e.g. "0821234567@standardbank".
// Workers registered before the bank field existed have no bank, so for them
// we can only return the plain number.
export function fullShapId(phone: string, bank: string | undefined): string {
  const number = cleanPhone(phone);
  const fixed = correctedBank(bank);
  return fixed ? `${number}@${fixed}` : number;
}
