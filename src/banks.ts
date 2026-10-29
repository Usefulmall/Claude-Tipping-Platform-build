// Banks a worker can choose at registration, and the text that goes after the
// "@" in their PayShap ShapID (e.g. 0821234567@standardbank).
//
// This is the ONE place to correct a bank's suffix if a bank ever changes it.
//   - Confirmed from the banks' own published material: standardbank, absa,
//     capitec, nedbank, investec
//   - Not yet confirmed from a published source: fnb, discovery, tymebank
//     (these follow the same pattern, but test one real payment to each).

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
  { suffix: "discovery", label: "Discovery Bank" },
  { suffix: "tymebank", label: "TymeBank" },
  { suffix: "investec", label: "Investec" },
];

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
  if (!suffix) return "";
  return BANKS.find((b) => b.suffix === suffix)?.label ?? suffix;
}

// The full ShapID a tipper must use, e.g. "0821234567@standardbank".
// Workers registered before the bank field existed have no bank, so for them
// we can only return the plain number.
export function fullShapId(phone: string, bank: string | undefined): string {
  const number = cleanPhone(phone);
  return bank ? `${number}@${bank}` : number;
}
