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
  bankName: string;
  bankCode: string;
  accountNumber: string;
  accountName: string;
  subaccountCode: string;
  createdAt: string;
}

export interface Tip {
  id: string;
  workerId: string;
  workerName: string;
  employerId: string;
  amount: number;
  feeAmount: number;
  workerAmount: number;
  status: "pending" | "success" | "failed";
  reference: string;
  customerEmail: string;
  customerName?: string;
  createdAt: string;
}
