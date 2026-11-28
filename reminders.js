// Subscription reminder logic for TipMe.
//
// Rules (keep identical to src/subscription.ts):
//  - the first month is free, counted from registration;
//  - after that a worker is active until their stored paidUntil date;
//  - the QR code works while "now" is before that date.
//
// Two SMS messages per paid period, never more:
//  1. "pre"    - 3 days before the QR code switches off;
//  2. "lapsed" - after it has switched off (only within 7 days of lapsing, so
//                old inactive accounts are never spammed).
// Each worker's `lastReminder` field records what was sent for which end date
// ("pre:2026-12-22"), so a message is never sent twice, and the markers reset
// by themselves when a new paid month moves the end date forward.

export const PRICE_RAND = 20;
export const PERIOD_DAYS = 30;
export const SUBSCRIPTION_SHAPID = "+27-843088317@SB.BIZ"; // keep identical to src/subscription.ts
export const PRE_DAYS = 3;
export const LAPSED_WINDOW_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;
const SAST_OFFSET_MS = 2 * 60 * 60 * 1000;

export function activeUntil(worker) {
  if (worker.paidUntil) return new Date(worker.paidUntil);
  return new Date(new Date(worker.createdAt).getTime() + PERIOD_DAYS * DAY_MS);
}

// "2026-12-22" in South African time.
export function dayKey(date) {
  return new Date(date.getTime() + SAST_OFFSET_MS).toISOString().slice(0, 10);
}

function shortDate(date) {
  const d = new Date(date.getTime() + SAST_OFFSET_MS);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${d.getUTCDate()} ${months[d.getUTCMonth()]}`;
}

function cleanPhone(phone) {
  return (phone || "").replace(/\D/g, "");
}

// Which reminder (if any) is due for this worker right now.
// Returns { kind, marker, message } or null.
export function pickReminder(worker, now = new Date()) {
  if (!worker.phone || !worker.createdAt) return null;

  const until = activeUntil(worker);
  if (Number.isNaN(until.getTime())) return null;

  const key = dayKey(until);
  const msLeft = until.getTime() - now.getTime();
  const ref = cleanPhone(worker.phone);
  const pay = `pay R${PRICE_RAND} by PayShap to ${SUBSCRIPTION_SHAPID}, reference ${ref}`;

  if (msLeft > 0 && msLeft <= PRE_DAYS * DAY_MS) {
    const marker = `pre:${key}`;
    if (worker.lastReminder === marker) return null;
    const lead = worker.paidUntil
      ? `TipMe: your QR code is active until ${shortDate(until)}.`
      : `TipMe: your free month ends on ${shortDate(until)}.`;
    return { kind: "pre", marker, message: `${lead} To keep it on, ${pay}.` };
  }

  if (msLeft <= 0 && -msLeft <= LAPSED_WINDOW_DAYS * DAY_MS) {
    const marker = `lapsed:${key}`;
    if (worker.lastReminder === marker) return null;
    return {
      kind: "lapsed",
      marker,
      message: `TipMe: your QR code is now inactive, so customers cannot tip you. To switch it back on, ${pay}.`,
    };
  }

  return null;
}

// Goes through every worker and sends the reminders that are due.
// Everything outside the logic is passed in, so this can be tested without
// a database or a real SMS service.
//   listWorkers(): Promise<Worker[]>
//   sendSms(number, text): Promise<{ skipped?: boolean }>
//   markSent(workerId, marker): Promise<void>
//   toInternational(rawPhone): string
export async function runReminders({ listWorkers, sendSms, markSent, toInternational, now = new Date() }) {
  const workers = await listWorkers();
  const result = { sent: 0, skipped: 0, failed: 0, noSms: 0 };

  for (const worker of workers) {
    const due = pickReminder(worker, now);
    if (!due) {
      result.skipped++;
      continue;
    }
    try {
      const out = await sendSms(toInternational(worker.phone), due.message);
      if (out && out.skipped) {
        // SMS service not set up: do not mark as sent, so it is tried again later.
        result.noSms++;
        continue;
      }
      await markSent(worker.id, due.marker);
      result.sent++;
    } catch (err) {
      console.error(`[Reminders] Could not send to ${worker.name || worker.id}:`, err.message);
      result.failed++;
    }
  }
  return result;
}
