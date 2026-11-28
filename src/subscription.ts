import { Worker } from "./types";
import { cleanPhone } from "./banks";

// Subscription rules: the first month is free, then R20 per month.
// A worker's QR code works while "today" is before their active-until date.
export const PRICE_RAND = 20;
export const PERIOD_DAYS = 30;

// The PayShap ID workers pay their subscription to (Sabraro Alpha's business ShapID).
// Keep this identical to SUBSCRIPTION_SHAPID in server.js.
export const SUBSCRIPTION_SHAPID = "+27-843088317@SB.BIZ";

const DAY_MS = 24 * 60 * 60 * 1000;

// The date until which the worker's QR code is active.
// - Once the admin has recorded a payment, that is the stored paidUntil date.
// - Before any payment, the first month is free, counted from registration.
export function activeUntil(worker: Pick<Worker, "createdAt" | "paidUntil">): Date {
  if (worker.paidUntil) return new Date(worker.paidUntil);
  return new Date(new Date(worker.createdAt).getTime() + PERIOD_DAYS * DAY_MS);
}

export function isActive(worker: Pick<Worker, "createdAt" | "paidUntil">, now = new Date()): boolean {
  return now.getTime() < activeUntil(worker).getTime();
}

// True while the worker is still inside the free first month (nothing paid yet).
export function inFreeMonth(worker: Pick<Worker, "createdAt" | "paidUntil">, now = new Date()): boolean {
  return !worker.paidUntil && isActive(worker, now);
}

// The new paidUntil date after recording one more month: it starts from the
// later of "today" and the current active-until date, so paying early never
// loses days and paying late does not backdate.
export function extendedUntil(worker: Pick<Worker, "createdAt" | "paidUntil">, now = new Date()): string {
  const base = Math.max(now.getTime(), activeUntil(worker).getTime());
  return new Date(base + PERIOD_DAYS * DAY_MS).toISOString();
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });
}

// The reference the worker must use so the payment can be matched to them.
export function paymentReference(worker: Pick<Worker, "phone">): string {
  return cleanPhone(worker.phone);
}
