export type UserRole = 'user' | 'admin';

export interface BankInfo {
  bankName: string;
  accountNumber: string;
  accountName: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  role: UserRole;
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
  bankInfo?: BankInfo;
  status?: 'active' | 'disabled';
  lastLogin?: any;
}

export interface AppSettings {
  companies: string[];
}

export interface AttendanceRecord {
  id?: string;
  userId: string;
  date: string; // YYYY-MM-DD
  shift: 'day' | 'night';
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

export interface Complaint {
  id: string;
  userId: string;
  name: string;
  company: string;
  phone: string;
  content: string;
  createdAt: any;
  status: 'pending' | 'completed';
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
  createdAt: any;
}

export interface DirectGuidance {
  id: string;
  senderId: string;
  receiverId: string;
  title?: string;
  content: string;
  read: boolean;
  createdAt: any;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
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
  }
}
