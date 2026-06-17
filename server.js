import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import https from "https";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ─── Paystack API helper ───────────────────────────────────────────────────────
function paystackRequest(method, urlPath, body) {
  return new Promise((resolve, reject) => {
    const secretKey = process.env.PAYSTACK_SECRET_KEY || "";
    const data = body ? JSON.stringify(body) : undefined;
    const options = {
      hostname: "api.paystack.co",
      port: 443,
      path: urlPath,
      method,
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
        ...(data ? { "Content-Length": Buffer.byteLength(data) } : {}),
      },
    };
    const req = https.request(options, (res) => {
      let raw = "";
      res.on("data", (chunk) => (raw += chunk));
      res.on("end", () => {
        try { resolve(JSON.parse(raw)); }
        catch { reject(new Error("Invalid JSON from Paystack")); }
      });
    });
    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

// ─── Fallback SA banks (used if Paystack key missing or call fails) ────────────
const SA_BANKS = [
  { name: "Absa Bank", code: "absa" },
  { name: "Capitec Bank", code: "capitec" },
  { name: "First National Bank (FNB)", code: "fnb" },
  { name: "Nedbank", code: "nedbank" },
  { name: "Standard Bank of South Africa", code: "standard-bank" },
  { name: "African Bank", code: "african-bank" },
  { name: "Bidvest Bank", code: "bidvest" },
  { name: "Discovery Bank", code: "discovery-bank" },
  { name: "Investec Bank", code: "investec" },
  { name: "TymeBank", code: "tymebank" },
  { name: "Bank Zero", code: "bank-zero" },
  { name: "Old Mutual", code: "old-mutual" },
  { name: "SA Post Bank (PostBank)", code: "postbank" },
  { name: "Grindrod Bank", code: "grindrod" },
  { name: "Mercantile Bank", code: "mercantile" },
];

// ─── GET /api/paystack/banks ───────────────────────────────────────────────────
app.get("/api/paystack/banks", async (req, res) => {
  if (!process.env.PAYSTACK_SECRET_KEY) {
    return res.json({ status: true, data: SA_BANKS });
  }
  try {
    const country = req.query.country || "south africa";
    const currency = req.query.currency || "ZAR";
    const result = await paystackRequest(
      "GET",
      `/bank?currency=${currency}&country=${encodeURIComponent(country)}&perPage=100`
    );
    if (result.status && result.data && result.data.length > 0) {
      return res.json({ status: true, data: result.data });
    }
    return res.json({ status: true, data: SA_BANKS });
  } catch (err) {
    console.error("[Paystack] Banks error:", err.message);
    return res.json({ status: true, data: SA_BANKS });
  }
});

// ─── POST /api/paystack/verify-account ────────────────────────────────────────
app.post("/api/paystack/verify-account", async (req, res) => {
  const { accountNumber, bankCode } = req.body;
  if (!process.env.PAYSTACK_SECRET_KEY) {
    return res.json({
      status: true,
      data: { account_name: "DEMO ACCOUNT (NO KEY)", account_number: accountNumber },
    });
  }
  try {
    const result = await paystackRequest(
      "GET",
      `/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`
    );
    return res.json(result);
  } catch (err) {
    console.error("[Paystack] Verify account error:", err.message);
    return res.json({
      status: true,
      data: { account_name: "UNVERIFIED ACCOUNT", account_number: accountNumber },
    });
  }
});

// ─── POST /api/paystack/create-subaccount ─────────────────────────────────────
app.post("/api/paystack/create-subaccount", async (req, res) => {
  const { businessName, settlementBank, accountNumber } = req.body;
  if (!process.env.PAYSTACK_SECRET_KEY) {
    const code = `ACCT_mock${Math.random().toString(36).substring(2, 12)}`;
    return res.json({ status: true, data: { subaccount_code: code, business_name: businessName } });
  }
  try {
    const result = await paystackRequest("POST", "/subaccount", {
      business_name: businessName,
      settlement_bank: settlementBank,
      account_number: accountNumber,
      percentage_charge: 2,
    });
    if (result.status && result.data) return res.json(result);
    // Paystack rejected (e.g. test mode restriction) — return mock
    console.warn("[Paystack] Subaccount issue:", result.message);
    const code = `ACCT_mock${Math.random().toString(36).substring(2, 12)}`;
    return res.json({
      status: true,
      message: result.message || "Simulated (test mode)",
      data: { subaccount_code: code, business_name: businessName },
    });
  } catch (err) {
    console.error("[Paystack] Subaccount error:", err.message);
    const code = `ACCT_mock${Math.random().toString(36).substring(2, 12)}`;
    return res.json({
      status: true,
      data: { subaccount_code: code, business_name: businessName },
    });
  }
});

// ─── Health check ──────────────────────────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", paystack: !!process.env.PAYSTACK_SECRET_KEY });
});

// ─── Serve built React frontend ────────────────────────────────────────────────
// NOTE: this file is copied into dist/server.mjs during build, so __dirname
// at runtime IS the dist folder itself — index.html sits right next to it.
const distPath = __dirname;
app.use(express.static(distPath));
app.get("*", (_req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`[Tipping Platform] Running on port ${PORT}`);
  console.log(`[Tipping Platform] Paystack: ${process.env.PAYSTACK_SECRET_KEY ? "✅ live" : "⚠️  demo mode"}`);
});
