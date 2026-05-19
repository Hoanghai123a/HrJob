export type UserRole = "user" | "admin";

export interface BankInfo {
  bankName: string;
  accountNumber: string;
  accountName: string;
}

export interface UserProfile {
  id: string;
  uid: string; // for backward compatibility
  email: string;
  username?: string;
  role: UserRole;
  created?: string;
  employeeId?: string;
  fullName?: string;
  phoneNumber?: string;
  defaultHC?: number;
  defaultOT?: number;
  company?: string;
  lcb?: number;
  chuyenCan?: number;
  doiSong?: number;
  thamNien?: number;
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
  bankInfo?: BankInfo;
  pendingBankInfo?: BankInfo;
  bankInfoStatus?: "pending" | "approved" | "rejected";
  approvalStatus?: "pending" | "approved" | "rejected";
  bankNotificationRead?: boolean;
  status?: "active" | "disabled";
  lastLogin?: any;
}

export interface BankChangeLog {
  id: string;
  userId: string;
  userName: string;
  type: "update" | "request" | "approval" | "rejection";
  bankInfo: BankInfo;
  status: "pending" | "approved" | "rejected";
  processedBy?: string;
  processedByName?: string;
  created?: string;
  updated?: string;
  createdAt?: any;
}

export interface AppSettings {
  companies: string[];
  requireApproval?: boolean;
}

export interface CompanySettings {
  name: string;
  logoUrl: string;
  advanceConditions?: string;
  address?: string;
  mapLink?: string;
  phone?: string;
  email?: string;
  website?: string;
  documents?: CompanyDocument[];
  description?: string;
  stats?: {
    workers: string;
    partners: string;
  };
  requireApproval?: boolean;
}

export interface AttendanceRecord {
  id?: string;
  userId: string;
  date: string; // YYYY-MM-DD
  shift: "day" | "night";
  isHoliday: boolean;
  hoursHC: number;
  hoursOT: number;
}

export interface Instruction {
  id: string;
  icon: string;
  title: string;
  content: string;
  fontSize: number;
}

export interface ApprovalRecord {
  approvedBy: string; // user ID
  approvedByName: string;
  date: string;
  status: "completed" | "recovered"; // action taken
  note?: string; // comment/reason from admin
}

export interface Complaint {
  id: string;
  userId: string;
  employeeId?: string;
  name: string;
  company: string;
  phone: string;
  content: string;
  type: "complaint" | "advance";
  advanceAmount?: number;
  bankInfo?: BankInfo;
  approvalHistory?: ApprovalRecord[];
  approvedBy?: string; // last approver ID
  approvedByName?: string;
  approvedDate?: string; // last approval date
  approvalNote?: string; // last approval note
  created?: string;
  updated?: string;
  createdAt?: any;
  status: "pending" | "completed" | "recovered";
}

export interface JobPost {
  id: string;
  companyName: string;
  address?: string;
  images: string[];
  mapsUrl: string;
  interviewTime: string;
  gender: string;
  baseSalary: number;
  allowance: number;
  requiredDocs: string;
  notes: string;
  created?: string;
  updated?: string;
  createdAt?: any;
}

export interface DirectGuidance {
  id: string;
  senderId: string;
  receiverId: string;
  title?: string;
  content: string;
  read: boolean;
  created?: string;
  updated?: string;
  createdAt?: any;
}

export interface CompanyDocument {
  id: string;
  name: string;
  imageUrl: string;
  updatedAt: any;
}

export interface CompanySettings {
  name: string;
  logoUrl: string;
  advanceConditions?: string;
  address?: string;
  mapLink?: string;
  phone?: string;
  email?: string;
  website?: string;
  documents?: CompanyDocument[];
  description?: string;
  stats?: {
    workers: string;
    partners: string;
  };
}

export interface PayrollRecord {
  id: string;
  userId: string;
  employeeId: string;
  fullName: string;
  companyName: string;
  month: string; // YYYY-MM
  version: number;
  type: "attendance" | "payroll";
  data: any; // Flexible data for specific fields
  created?: string;
  updated?: string;
  createdAt?: any;
  batchId?: string;
}

export interface PayrollBatch {
  id: string;
  companyName: string;
  month: string;
  type: "attendance" | "payroll";
  fileName: string;
  fileData: string; // Base64
  recordCount: number;
  created?: string;
  updated?: string;
  createdAt?: any;
}

export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  };
}
