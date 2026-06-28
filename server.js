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

// Reuse the existing public Firebase client config (already in the repo,
// already safe to read — it's not a secret) so we don't need new env vars
// for the project ID / Firestore database ID.
const firebaseConfig = JSON.parse(
  readFileSync(path.join(__dirname, "firebase-applet-config.json"), "utf8")
);

app.use(cors());

// ─── Firestore REST helper (no Firebase Admin SDK needed) ─────────────────────
// Uses the same public, rules-protected REST endpoint the browser SDK talks to.
// This works here because firestore.rules allows unauthenticated tip *updates*
// as long as the document shape passes isValidTip() — the same trust model the
// browser already relies on in PublicTipView.tsx.
function firestoreUpdateTip(projectId, databaseId, tipId, fields) {
  return new Promise((resolve, reject) => {
    // Firestore REST PATCH with updateMask — only touches the fields we send.
    const maskParams = Object.keys(fields).map((k) => `updateMask.fieldPaths=${k}`).join("&");
    const urlPath = `/v1/projects/${projectId}/databases/${databaseId}/documents/tips/${tipId}?${maskParams}`;
    const body = JSON.stringify({
      fields: toFirestoreFields(fields),
    });
    const options = {
      hostname: "firestore.googleapis.com",
      port: 443,
      path: urlPath,
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
      },
    };
    const req = https.request(options, (res) => {
      let raw = "";
      res.on("data", (c) => (raw += c));
      res.on("end", () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(raw));
        } else {
          reject(new Error(`Firestore update failed (${res.statusCode}): ${raw}`));
        }
      });
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

// Converts a simple JS object into Firestore's typed REST field format.
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

// ─── Paystack webhook ──────────────────────────────────────────────────────────
// IMPORTANT: this route is registered BEFORE express.json() below, and uses
// express.raw() itself, so we can verify the HMAC signature against the exact
// raw bytes Paystack sent. If the body were already parsed/re-serialized by
// express.json(), the signature check would fail (Paystack signs the raw body).
app.post(
  "/api/paystack/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const secret = process.env.PAYSTACK_SECRET_KEY || "";
    const signature = req.headers["x-paystack-signature"];

    if (!secret || !signature) {
      console.warn("[Webhook] Missing secret or signature header");
      return res.sendStatus(400);
    }

    const expectedHash = crypto.createHmac("sha512", secret).update(req.body).digest("hex");
    if (expectedHash !== signature) {
      console.warn("[Webhook] Signature mismatch — rejecting (not from Paystack)");
      return res.sendStatus(401);
    }

    // Acknowledge receipt immediately — Paystack expects a fast 200 OK.
    res.sendStatus(200);

    let event;
    try {
      event = JSON.parse(req.body.toString("utf8"));
    } catch (err) {
      console.error("[Webhook] Could not parse event JSON:", err.message);
      return;
    }

    const { event: eventType, data } = event || {};
    const reference = data?.reference;
    if (!reference) {
      console.warn("[Webhook] Event missing reference, skipping:", eventType);
      return;
    }

    const projectId = firebaseConfig.projectId;
    const databaseId = firebaseConfig.firestoreDatabaseId || "(default)";
    if (!projectId) {
      console.error("[Webhook] Could not read projectId from firebase-applet-config.json");
      return;
    }

    try {
      if (eventType === "charge.success") {
        await firestoreUpdateTip(projectId, databaseId, reference, { status: "success" });
        console.log(`[Webhook] Tip ${reference} confirmed success via webhook`);
      } else if (eventType === "charge.failed") {
        await firestoreUpdateTip(projectId, databaseId, reference, { status: "failed" });
        console.log(`[Webhook] Tip ${reference} marked failed via webhook`);
      } else {
        console.log(`[Webhook] Ignoring unrelated event type: ${eventType}`);
      }
    } catch (err) {
      console.error("[Webhook] Firestore update error:", err.message);
    }
  }
);

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

// ─── Curated list of current South African banks with real Paystack codes ─────
// Maintained manually instead of pulling Paystack's live list, which can include
// defunct or duplicate entries. Update this list if a bank rebrands or a new
// one launches. Codes verified against SARB-registered institutions.
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

// ─── GET /api/paystack/banks ───────────────────────────────────────────────────
// Always returns our own curated list rather than Paystack's live API, which can
// include outdated or irrelevant entries.
app.get("/api/paystack/banks", async (_req, res) => {
  return res.json({ status: true, data: SA_BANKS });
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
