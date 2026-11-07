export type Role = 'STUDENT' | 'FACULTY' | 'STAFF' | 'ADMIN';

export type Priority = 'LOW' | 'MEDIUM' | 'HIGH';

export type ComplaintStatus =
  | 'NEW'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'ON_HOLD'
  | 'RESOLVED'
  | 'CLOSED'
  | 'REJECTED';

export interface User {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  avatar?: string;
  studentId?: string;
  course?: string;
  department?: string;
  year?: number;
  phone?: string;
  staffDepartmentId?: string;
  staffDepartmentName?: string;
}

export interface Department {
  id: string;
  name: string;
  description: string;
  contactEmail: string;
  isActive: boolean;
  headName: string;
  openCount: number;
  slaTargetHours: number;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  departmentId: string;
  departmentName: string;
  isActive: boolean;
  defaultPriority: Priority;
  icon: string;
}

export interface ComplaintHistory {
  id: string;
  complaintId: string;
  changedByName: string;
  changedByRole: Role;
  previousStatus: ComplaintStatus | 'NONE';
  newStatus: ComplaintStatus;
  remarks: string;
  createdAt: string;
}

export interface Feedback {
  id: string;
  complaintId: string;
  userId: string;
  userName: string;
  rating: number; // 1-5
  comments: string;
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  complaintId?: string;
  type: 'ASSIGNMENT' | 'STATUS_CHANGE' | 'RESOLVED' | 'FEEDBACK' | 'OVERDUE';
}

export interface Complaint {
  id: string;
  complaintNumber: string; // e.g. SCMS-2026-000101
  title: string;
  description: string;
  categoryId: string;
  categoryName: string;
  priority: Priority;
  status: ComplaintStatus;
  createdBy: string;
  createdByName: string;
  createdByRole: Role;
  createdByEmail: string;
  assignedDepartmentId: string;
  assignedDepartmentName: string;
  assignedStaffId?: string;
  assignedStaffName?: string;
  campus: string;
  building: string;
  room: string;
  location: string;
  resolutionNotes?: string;
  holdReason?: string;
  attachmentName?: string;
  attachmentSize?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  slaTargetHours: number;
  isOverdue: boolean;
  feedback?: Feedback;
  history: ComplaintHistory[];
}

export type ViewTab =
  | 'dashboard'
  | 'complaints'
  | 'register'
  | 'departments'
  | 'categories'
  | 'users'
  | 'feedback'
  | 'settings';

