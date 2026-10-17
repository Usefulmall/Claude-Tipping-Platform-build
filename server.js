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

// ─── Health check ──────────────────────────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", sms: !!process.env.BULKSMS_USERNAME });
});

// ─── Serve built React frontend ────────────────────────────────────────────────
const distPath = __dirname;
app.use(express.static(distPath));
app.get("*", (_req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`[TipMe] Running on port ${PORT}`);
  console.log(`[TipMe] SMS: ${process.env.BULKSMS_USERNAME ? "✅ configured" : "⚠️  not configured"}`);
});
