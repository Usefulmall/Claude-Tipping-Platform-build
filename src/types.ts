export type UserRole = "admin" | "employer";

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
