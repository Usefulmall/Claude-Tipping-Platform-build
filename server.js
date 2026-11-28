import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import https from "https";
import fs from "fs";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { runReminders, dayKey } from "./reminders.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ─── Secrets ──────────────────────────────────────────────────────────────────
// A secret can be saved on Render either as an environment variable or as a
// "Secret File" (which appears at /etc/secrets/<NAME>). Look in both places.
function getSecret(name) {
  if (process.env[name]) return process.env[name].trim();
  for (const dir of ["/etc/secrets", process.cwd(), __dirname]) {
    try {
      const value = fs.readFileSync(path.join(dir, name), "utf8").trim();
      if (value) return value;
    } catch {
      // not in this folder, try the next one
    }
  }
  return "";
}

// ─── BulkSMS helper ───────────────────────────────────────────────────────────
function sendSms(toNumber, messageBody) {
  return new Promise((resolve, reject) => {
    const username = getSecret("BULKSMS_USERNAME");
    const password = getSecret("BULKSMS_PASSWORD");
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

// ─── POST /api/notify-tip ──────────────────────────────────────────────────────
// Called by the tip page when a tipper taps "I've sent the tip". TipMe never
// sees the actual PayShap payment, so this is a courtesy SMS based on the
// tipper's own self-report — not a confirmed-payment notification. The server
// handles the call because the BulkSMS credentials must stay off the client.
app.post("/api/notify-tip", async (req, res) => {
  const { phone, workerName, amount } = req.body || {};
  if (!phone) return res.status(400).json({ status: false, message: "Missing phone" });

  try {
    const amountText = amount > 0 ? `R${Number(amount).toFixed(2)}` : "a tip";
    const message = `TipMe: Someone reported sending you ${amountText} via PayShap. Check your banking app to confirm it's arrived. - TipMe Platform`;
    await sendSms(toInternationalSaNumber(phone), message);
    return res.json({ status: true });
  } catch (err) {
    console.error(`[SMS] Could not notify worker ${workerName || ""}:`, err.message);
    // Notification failure shouldn't surface as an error to the tipper — they've
    // done their part. Still respond 200 so the frontend doesn't show an error.
    return res.json({ status: false });
  }
});

// ─── Subscription reminders ────────────────────────────────────────────────────
// The server reads the workers straight from the database with a private
// service-account key (env var FIREBASE_SERVICE_ACCOUNT, the whole JSON file
// pasted in). Without the key the rest of the site still works; only the
// reminder SMS messages are switched off.
let adminApp = null;
function getAdminApp() {
  if (adminApp) return adminApp;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) return null;
  try {
    adminApp = getApps()[0] || initializeApp({ credential: cert(JSON.parse(raw)) });
    return adminApp;
  } catch (err) {
    console.error("[Reminders] FIREBASE_SERVICE_ACCOUNT is not valid:", err.message);
    return null;
  }
}

function getDb() {
  const appInstance = getAdminApp();
  if (!appInstance) return null;
  const config = JSON.parse(fs.readFileSync(path.join(__dirname, "firebase-applet-config.json"), "utf8"));
  return getFirestore(appInstance, config.firestoreDatabaseId);
}

async function sendDueReminders() {
  const db = getDb();
  if (!db) throw new Error("Reminders are not set up: FIREBASE_SERVICE_ACCOUNT is missing.");
  return runReminders({
    listWorkers: async () => (await db.collection("workers").get()).docs.map((d) => d.data()),
    sendSms,
    markSent: (workerId, marker) => db.collection("workers").doc(workerId).update({ lastReminder: marker }),
    toInternational: toInternationalSaNumber,
  });
}

// A reminder run can be started by a signed-in TipMe admin (the button on the
// Admin page) or by an outside timer that knows CRON_SECRET (optional).
async function isAllowedToRun(req) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.get("x-cron-secret") === secret) return true;

  const header = req.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return false;
  const appInstance = getAdminApp();
  if (!appInstance) return false;
  try {
    const decoded = await getAuth(appInstance).verifyIdToken(token);
    const snap = await getDb().collection("users").doc(decoded.uid).get();
    return snap.exists && snap.data().role === "admin";
  } catch {
    return false;
  }
}

app.post("/api/run-reminders", async (req, res) => {
  if (!getAdminApp()) {
    return res.status(503).json({ message: "Reminders are not set up yet (the server is missing its database key)." });
  }
  if (!(await isAllowedToRun(req))) return res.status(403).json({ message: "Not allowed." });
  try {
    const result = await sendDueReminders();
    console.log("[Reminders] Run finished:", JSON.stringify(result));
    return res.json(result);
  } catch (err) {
    console.error("[Reminders] Run failed:", err.message);
    return res.status(500).json({ message: "Could not send reminders." });
  }
});

// Once a day, from 08:00 South African time, check who is due a reminder.
// (Each worker's lastReminder marker stops any message going out twice, so an
// extra or repeated run is harmless.)
let lastAutoRunDay = "";
function startDailyReminderTimer() {
  const tick = async () => {
    const now = new Date();
    const sastHour = (now.getUTCHours() + 2) % 24;
    const today = dayKey(now);
    if (sastHour < 8 || lastAutoRunDay === today) return;
    lastAutoRunDay = today;
    try {
      const result = await sendDueReminders();
      console.log("[Reminders] Daily run:", JSON.stringify(result));
    } catch (err) {
      console.error("[Reminders] Daily run failed:", err.message);
      lastAutoRunDay = ""; // try again at the next check
    }
  };
  setInterval(tick, 30 * 60 * 1000);
  setTimeout(tick, 60 * 1000);
}

// ─── Health check ──────────────────────────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", sms: !!getSecret("BULKSMS_USERNAME"), reminders: !!process.env.FIREBASE_SERVICE_ACCOUNT });
});

// ─── Serve built React frontend ────────────────────────────────────────────────
const distPath = __dirname;
app.use(express.static(distPath));
app.get("*", (_req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`[TipMe] Running on port ${PORT}`);
  console.log(`[TipMe] SMS: ${getSecret("BULKSMS_USERNAME") ?"✅ configured" : "⚠️  not configured"}`);
  console.log(`[TipMe] Reminders: ${process.env.FIREBASE_SERVICE_ACCOUNT ? "✅ configured" : "⚠️  not configured"}`);
  if (process.env.FIREBASE_SERVICE_ACCOUNT) startDailyReminderTimer();
});
