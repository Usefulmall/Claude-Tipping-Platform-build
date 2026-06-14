var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_dotenv = __toESM(require("dotenv"), 1);
var import_vite = require("vite");
import_dotenv.default.config();
var app = (0, import_express.default)();
var PORT = 3e3;
app.use(import_express.default.json());
var FALLBACK_BANKS = [
  { name: "Capitec Bank Limited", code: "470010" },
  { name: "First National Bank", code: "250655" },
  { name: "Standard Bank South Africa", code: "051001" },
  { name: "Nedbank", code: "198765" },
  { name: "Absa Bank Limited", code: "632005" },
  { name: "TymeBank", code: "678910" },
  { name: "African Bank Limited", code: "430000" },
  { name: "Discovery Bank Limited", code: "679000" }
];
function sanitizeBankCode(code) {
  if (!code) return code;
  const normalized = code.trim().toLowerCase().replace(/_/g, "-");
  const mapping = {
    "standard-bank": "051001",
    "standard-bank-za": "051001",
    "standard-bank-of-south-africa": "051001",
    "standard-bank-south-africa": "051001",
    "capitec-bank": "470010",
    "capitec": "470010",
    "capitec-bank-za": "470010",
    "capitec-bank-limited": "470010",
    "first-national-bank": "250655",
    "fnb": "250655",
    "first-national-bank-fnb": "250655",
    "first-national-bank-za": "250655",
    "nedbank": "198765",
    "nedbank-za": "198765",
    "absa-bank": "632005",
    "absa": "632005",
    "absa-za": "632005",
    "tyme-bank": "678910",
    "tymebank": "678910",
    "tyme-bank-za": "678910",
    "african-bank": "430000",
    "african-bank-za": "430000",
    "discovery-bank": "679000",
    "discovery-bank-za": "679000"
  };
  return mapping[normalized] || code;
}
app.get("/api/paystack/banks", async (req, res) => {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    console.log("[Paystack] PAYSTACK_SECRET_KEY is missing. Using local mock banks list.");
    return res.json({ status: true, data: FALLBACK_BANKS });
  }
  try {
    const response = await fetch("https://api.paystack.co/bank?country=south%20africa", {
      headers: {
        Authorization: `Bearer ${secretKey}`
      }
    });
    if (!response.ok) {
      throw new Error(`Paystack bank API returned ${response.status}`);
    }
    const result = await response.json();
    if (result && result.status && Array.isArray(result.data) && result.data.length > 0) {
      return res.json(result);
    } else {
      console.log("[Paystack] Empty or failed bank response from API, cascading to FALLBACK_BANKS.");
      return res.json({ status: true, data: FALLBACK_BANKS });
    }
  } catch (error) {
    console.error("[Paystack] Error fetching banks from Paystack. Cascading to fallback list:", error);
    return res.json({ status: true, data: FALLBACK_BANKS });
  }
});
app.post("/api/paystack/verify-account", async (req, res) => {
  const { accountNumber, bankCode } = req.body;
  if (!accountNumber || !bankCode) {
    return res.status(400).json({ status: false, message: "Missing accountNumber or bankCode" });
  }
  const sanitizedBankCode = sanitizeBankCode(bankCode);
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    console.log("[Paystack] PAYSTACK_SECRET_KEY is missing. Mock verification succeeded.");
    const seed = accountNumber.split("").reduce((acc, val) => acc + parseInt(val || "0", 10), 0);
    const mockNames = [
      "SIPHO NGWENYA",
      "LINDIWE DLAMINI",
      "FRANCOIS DU TOIT",
      "THABO MOKOENA",
      "JOHANNA BOTHA",
      "NUR ADAMS",
      "SIYABONGA KHUMALO",
      "WILLEM VAN DER MERWE"
    ];
    const mockName = mockNames[seed % mockNames.length];
    return res.json({
      status: true,
      message: "Account number resolved",
      data: {
        account_number: accountNumber,
        account_name: mockName,
        bank_id: parseInt(sanitizedBankCode, 10) || 1
      }
    });
  }
  try {
    const queryParams = new URLSearchParams({
      account_number: accountNumber,
      bank_code: sanitizedBankCode
    });
    const response = await fetch(`https://api.paystack.co/bank/resolve?${queryParams.toString()}`, {
      headers: {
        Authorization: `Bearer ${secretKey}`
      }
    });
    const result = await response.json();
    if (!response.ok || !result.status) {
      return res.status(400).json({
        status: false,
        message: result.message || "Could not resolve bank account details securely"
      });
    }
    return res.json(result);
  } catch (error) {
    console.error("[Paystack] Error resolving account:", error);
    return res.status(500).json({ status: false, message: "Internal server error during account check" });
  }
});
app.post("/api/paystack/create-subaccount", async (req, res) => {
  const { businessName, settlementBank, accountNumber } = req.body;
  if (!businessName || !settlementBank || !accountNumber) {
    return res.status(400).json({ status: false, message: "Missing subaccount creation parameters" });
  }
  const sanitizedBankCode = sanitizeBankCode(settlementBank);
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    console.log("[Paystack] PAYSTACK_SECRET_KEY is missing. Simulating subaccount creation...");
    const mockSubaccountCode = `ACCT_mock_${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    return res.json({
      status: true,
      message: "Subaccount created successfully",
      data: {
        id: Math.floor(Math.random() * 1e6),
        subaccount_code: mockSubaccountCode,
        business_name: businessName,
        settlement_bank: sanitizedBankCode,
        account_number: accountNumber,
        percentage_charge: 2,
        is_mock: true
      }
    });
  }
  try {
    const payload = {
      business_name: businessName,
      settlement_bank: sanitizedBankCode,
      account_number: accountNumber,
      percentage_charge: 2
      // Platform retains 2% platform fee autonomously
    };
    const response = await fetch("https://api.paystack.co/subaccount", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (!response.ok || !result.status) {
      return res.status(400).json({
        status: false,
        message: result.message || "Failed to create Paystack subaccount"
      });
    }
    return res.json(result);
  } catch (error) {
    console.error("[Paystack] Subaccount API Error:", error);
    return res.status(500).json({ status: false, message: "Failed to communicate with Paystack server" });
  }
});
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Tipping Platform] Server running at http://localhost:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
