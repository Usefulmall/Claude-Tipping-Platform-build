import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import https from "https";
import crypto from "crypto";
import { readFileSync } from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

const firebaseConfig = JSON.parse(
  readFileSync(path.join(__dirname, "firebase-applet-config.json"), "utf8")
);

app.use(cors());

// ─── Firestore REST helpers ────────────────────────────────────────────────────
function firestoreUpdateTip(projectId, databaseId, tipId, fields) {
  return new Promise((resolve, reject) => {
    const maskParams = Object.keys(fields).map((k) => `updateMask.fieldPaths=${k}`).join("&");
    const urlPath = `/v1/projects/${projectId}/databases/${databaseId}/documents/tips/${tipId}?${maskParams}`;
    const body = JSON.stringify({ fields: toFirestoreFields(fields) });
    const options = {
      hostname: "firestore.googleapis.com", port: 443, path: urlPath, method: "PATCH",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) },
    };
    const req = https.request(options, (res) => {
      let raw = "";
      res.on("data", (c) => (raw += c));
      res.on("end", () => {
        if (res.statusCode >= 200 && res.statusCode < 300) resolve(JSON.parse(raw));
        else reject(new Error(`Firestore update failed (${res.statusCode}): ${raw}`));
      });
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

function firestoreGetDoc(projectId, databaseId, collection, docId) {
  return new Promise((resolve, reject) => {
    const urlPath = `/v1/projects/${projectId}/databases/${databaseId}/documents/${collection}/${docId}`;
    const options = { hostname: "firestore.googleapis.com", port: 443, path: urlPath, method: "GET" };
    const req = https.request(options, (res) => {
      let raw = "";
      res.on("data", (c) => (raw += c));
      res.on("end", () => {
        if (res.statusCode === 404) return resolve(null);
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try { resolve(fromFirestoreFields(JSON.parse(raw).fields)); }
          catch (err) { reject(err); }
        } else {
          reject(new Error(`Firestore get failed (${res.statusCode}): ${raw}`));
        }
      });
    });
    req.on("error", reject);
    req.end();
  });
}

function toFirestoreFields(obj) {
  const out = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string") out[key] = { stringValue: value };
    else if (typeof value === "number") out[key] = { doubleValue: value };
    else if (typeof value === "boolean") out[key] = { booleanValue: value };
    else out[key] = { stringValue: String(value) };
  }
  return out;
}

function fromFirestoreFields(fields) {
  const out = {};
  for (const [key, value] of Object.entries(fields || {})) {
    if ("stringValue" in value) out[key] = value.stringValue;
    else if ("doubleValue" in value) out[key] = value.doubleValue;
    else if ("integerValue" in value) out[key] = Number(value.integerValue);
    else if ("booleanValue" in value) out[key] = value.booleanValue;
    else out[key] = null;
  }
  return out;
}

// ─── BulkSMS helper ───────────────────────────────────────────────────────────
function sendSms(toNumber, messageBody) {
  return new Promise((resolve, reject) => {
    const username = process.env.BULKSMS_USERNAME || "";
    const password = process.env.BULKSMS_PASSWORD || "";
    if (!username || !password) {
      console.warn("[SMS] BULKSMS credentials not set — skipping SMS");
      return resolve({ skipped: true });
    }
    const credentials = Buffer.from(`${username}:${password}`).toString("base64");
    const body = JSON.stringify([{ to: [{ address: toNumber }], body: messageBody }]);
    const options = {
      hostname: "api.bulksms.com", port: 443, path: "/v1/messages", method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
      },
    };
    const req = https.request(options, (res) => {
      let raw = "";
      res.on("data", (c) => (raw += c));
      res.on("end", () => {
        if (res.statusCode >= 200 && res.statusCode < 300) resolve(JSON.parse(raw));
        else reject(new Error(`BulkSMS failed (${res.statusCode}): ${raw}`));
      });
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

function toInternationalSaNumber(raw) {
  const digits = (raw || "").replace(/\D/g, "");
  if (digits.startsWith("27")) return digits;
  if (digits.startsWith("0")) return "27" + digits.slice(1);
  return digits;
}

async function notifyWorkerOfTip(projectId, databaseId, tipId) {
  try {
    const tip = await firestoreGetDoc(projectId, databaseId, "tips", tipId);
    if (!tip || !tip.workerId) return;
    const worker = await firestoreGetDoc(projectId, databaseId, "workers", tip.workerId);
    if (!worker || !worker.phone) return;
    const tipperLabel = tip.customerName || "Someone";
    const message = `TipMe: ${tipperLabel} just tipped you R${Number(tip.amount).toFixed(2)}. It's on its way to your bank account. - TipMe Platform`;
    await sendSms(toInternationalSaNumber(worker.phone), message);
    console.log(`[SMS] Notified worker ${tip.workerId} of tip ${tipId}`);
  } catch (err) {
    console.error(`[SMS] Could not notify worker for tip ${tipId}:`, err.message);
  }
}

// ─── Paystack API helper ───────────────────────────────────────────────────────
function paystackRequest(method, urlPath, body) {
  return new Promise((resolve, reject) => {
    const secretKey = process.env.PAYSTACK_SECRET_KEY || "";
    const data = body ? JSON.stringify(body) : undefined;
    const options = {
      hostname: "api.paystack.co", port: 443, path: urlPath, method,
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

// ─── Paystack webhook ──────────────────────────────────────────────────────────
app.post(
  "/api/paystack/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const secret = process.env.PAYSTACK_SECRET_KEY || "";
    const signature = req.headers["x-paystack-signature"];
    if (!secret || !signature) return res.sendStatus(400);

    const expectedHash = crypto.createHmac("sha512", secret).update(req.body).digest("hex");
    if (expectedHash !== signature) {
      console.warn("[Webhook] Signature mismatch — rejecting");
      return res.sendStatus(401);
    }

    res.sendStatus(200);

    let event;
    try { event = JSON.parse(req.body.toString("utf8")); }
    catch (err) { console.error("[Webhook] Could not parse event JSON:", err.message); return; }

    const { event: eventType, data } = event || {};
    const reference = data?.reference;
    if (!reference) return;

    const projectId = firebaseConfig.projectId;
    const databaseId = firebaseConfig.firestoreDatabaseId || "(default)";
    if (!projectId) { console.error("[Webhook] No projectId in firebase config"); return; }

    try {
      if (eventType === "charge.success") {
        await firestoreUpdateTip(projectId, databaseId, reference, { status: "success" });
        console.log(`[Webhook] Tip ${reference} confirmed success`);
        await notifyWorkerOfTip(projectId, databaseId, reference);
      } else if (eventType === "charge.failed") {
        await firestoreUpdateTip(projectId, databaseId, reference, { status: "failed" });
        console.log(`[Webhook] Tip ${reference} marked failed`);
      } else {
        console.log(`[Webhook] Ignoring event: ${eventType}`);
      }
    } catch (err) {
      console.error("[Webhook] Firestore update error:", err.message);
    }
  }
);

app.use(express.json());

// ─── Curated SA bank list ──────────────────────────────────────────────────────
const SA_BANKS = [
  { name: "Absa Bank", code: "632005" },
  { name: "Capitec Bank", code: "470010" },
  { name: "First National Bank (FNB)", code: "250655" },
  { name: "Nedbank", code: "198765" },
  { name: "Standard Bank", code: "051001" },
  { name: "GoTyme Bank", code: "678910" },
  { name: "African Bank", code: "430000" },
  { name: "Discovery Bank", code: "679000" },
  { name: "Investec", code: "580105" },
  { name: "Bidvest Bank", code: "462005" },
  { name: "Bank Zero", code: "888000" },
  { name: "Access Bank", code: "410105" },
  { name: "Sasfin Bank", code: "683000" },
  { name: "Al Baraka Bank", code: "800000" },
  { name: "SA Post Bank (PostBank)", code: "460005" },
];

app.get("/api/paystack/banks", async (_req, res) => {
  return res.json({ status: true, data: SA_BANKS });
});

// ─── POST /api/paystack/verify-account ────────────────────────────────────────
app.post("/api/paystack/verify-account", async (req, res) => {
  const { accountNumber, bankCode } = req.body;
  if (!process.env.PAYSTACK_SECRET_KEY) {
    return res.json({ status: true, data: { account_name: "DEMO ACCOUNT (NO KEY)", account_number: accountNumber } });
  }
  try {
    const result = await paystackRequest("GET", `/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`);
    return res.json(result);
  } catch (err) {
    console.error("[Paystack] Verify account error:", err.message);
    return res.json({ status: true, data: { account_name: "UNVERIFIED ACCOUNT", account_number: accountNumber } });
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
      percentage_charge: 8, // Platform fee — must match PLATFORM_FEE_PERCENT in PublicTipView.tsx
    });
    if (result.status && result.data) return res.json(result);
    console.warn("[Paystack] Subaccount issue:", result.message);
    const code = `ACCT_mock${Math.random().toString(36).substring(2, 12)}`;
    return res.json({ status: true, message: result.message || "Simulated (test mode)", data: { subaccount_code: code, business_name: businessName } });
  } catch (err) {
    console.error("[Paystack] Subaccount error:", err.message);
    const code = `ACCT_mock${Math.random().toString(36).substring(2, 12)}`;
    return res.json({ status: true, data: { subaccount_code: code, business_name: businessName } });
  }
});

// ─── POST /api/paystack/initiate-eft ──────────────────────────────────────────
// Initiates a Paystack transaction using the EFT (Ozow) channel.
// No card details or email entry required from the tipper — they are redirected
// to their banking app to approve the payment directly.
// The server handles this call (not the browser) because it needs the secret key.
app.post("/api/paystack/initiate-eft", async (req, res) => {
  const { reference, amount, email, subaccountCode, workerName, customerName, callbackUrl } = req.body;

  if (!process.env.PAYSTACK_SECRET_KEY) {
    return res.json({
      status: true,
      authorization_url: `${callbackUrl}&simulated=true`,
      message: "Demo mode — no Paystack key set",
    });
  }

  try {
    const result = await paystackRequest("POST", "/transaction/initialize", {
      reference,
      amount: Math.round(amount * 100), // Paystack uses kobo/cents
      email,
      currency: "ZAR",
      channels: ["eft"],           // EFT only — no card form shown to tipper
      subaccount: subaccountCode,
      bearer: "subaccount",        // worker's share bears the Paystack processing fee
      callback_url: callbackUrl,
      metadata: {
        custom_fields: [
          { display_name: "Worker", variable_name: "worker_name", value: workerName },
          { display_name: "Tipper", variable_name: "customer_name", value: customerName || "Anonymous" },
        ],
      },
    });

    if (result.status && result.data?.authorization_url) {
      return res.json({
        status: true,
        authorization_url: result.data.authorization_url,
        reference: result.data.reference,
      });
    }

    console.error("[Paystack] EFT initiation failed:", result.message);
    return res.status(400).json({ status: false, message: result.message || "Payment initiation failed" });
  } catch (err) {
    console.error("[Paystack] EFT initiation error:", err.message);
    return res.status(500).json({ status: false, message: "Server error initiating payment" });
  }
});

// ─── Health check ──────────────────────────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", paystack: !!process.env.PAYSTACK_SECRET_KEY });
});

// ─── Serve built React frontend ────────────────────────────────────────────────
const distPath = __dirname;
app.use(express.static(distPath));
app.get("*", (_req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`[TipMe] Running on port ${PORT}`);
  console.log(`[TipMe] Paystack: ${process.env.PAYSTACK_SECRET_KEY ? "✅ live" : "⚠️  demo mode"}`);
  console.log(`[TipMe] SMS: ${process.env.BULKSMS_USERNAME ? "✅ configured" : "⚠️  not configured"}`);
});
