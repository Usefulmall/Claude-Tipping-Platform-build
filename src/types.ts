export type UserRole = "admin" | "employer" | "worker";

export interface AppUser {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
}

export interface Worker {
  id: string;
  employerId: string;
  name: string;
  position: string;
  phone: string; // the worker's cellphone number (first half of their PayShap ShapID)
  bank?: string; // text after the "@" in the ShapID, e.g. "standardbank" (missing on workers registered before this field existed)
  createdAt: string;
  // Subscription: the QR code is active until this date. Missing means "still in
  // the free first month" (see subscription.ts). Only an admin or the server may set it.
  paidUntil?: string;
  // Which reminder SMS was last sent (e.g. "pre:2026-12-22"), so none is sent twice.
  lastReminder?: string;
}

// A tip is never confirmed by TipMe (we don't process the money), so this is
// always a self-report from the tipper clicking "I've sent the tip" — shown
// to employers as an unverified indicator, not a confirmed payment record.
export interface Tip {
  id: string;
  workerId: string;
  workerName: string;
  employerId: string;
  amount: number;
  status: "reported";
  createdAt: string;
}
