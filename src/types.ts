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
  phone: string; // doubles as the worker's PayShap ShapID for receiving tips
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
