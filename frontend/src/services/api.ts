import {
  Category,
  Complaint,
  ComplaintStatus,
  Department,
  Feedback,
  NotificationItem,
  Priority,
  Role,
  User,
} from '../types';

const RAW_API_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) || 'http://localhost:8000';
const BACKEND_URL = RAW_API_URL.replace(/\/+$/, '');
const API_BASE_URL = BACKEND_URL.endsWith('/api') ? BACKEND_URL : `${BACKEND_URL}/api`;
const HEALTH_URL = BACKEND_BASE_HEALTH_URL(BACKEND_URL);

function BACKEND_BASE_HEALTH_URL(url: string): string {
  if (url.endsWith('/api')) {
    return `${url.slice(0, -4)}/health`;
  }
  return `${url}/health`;
}

class ApiClient {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('scms_auth_token');
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('scms_auth_token', token);
    } else {
      localStorage.removeItem('scms_auth_token');
    }
  }

  getToken(): string | null {
    return this.token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorData = await response.json();
        if (errorData.detail) {
          errorMessage = typeof errorData.detail === 'string'
            ? errorData.detail
            : JSON.stringify(errorData.detail);
        }
      } catch (e) {
        // Fallback to text or status
      }
      throw new Error(errorMessage);
    }

    return response.json();
  }

  // Health check
  async checkHealth(): Promise<boolean> {
    try {
      const res = await fetch(HEALTH_URL, { method: 'GET' });
      return res.ok;
    } catch {
      return false;
    }
  }

  // Auth Endpoints (PRD Section 10)
  async login(email: string, password: string = 'CampusSecret2026!'): Promise<{ access_token: string; user: any }> {
    const data = await this.request<{ access_token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setToken(data.access_token);
    return data;
  }

  async register(payload: any): Promise<{ access_token: string; user: any }> {
    const data = await this.request<{ access_token: string; user: any }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    this.setToken(data.access_token);
    return data;
  }

  async getMe(): Promise<any> {
    return this.request('/auth/me');
  }

  // Complaints Endpoints (PRD Section 10)
  async getComplaints(params?: {
    status?: string;
    priority?: string;
    department_id?: string;
    category_id?: string;
    search?: string;
    only_overdue?: boolean;
  }): Promise<Complaint[]> {
    const query = new URLSearchParams();
    if (params?.status && params.status !== 'ALL') query.set('status', params.status);
    if (params?.priority && params.priority !== 'ALL') query.set('priority', params.priority);
    if (params?.department_id && params.department_id !== 'ALL') query.set('department_id', params.department_id);
    if (params?.category_id) query.set('category_id', params.category_id);
    if (params?.search) query.set('search', params.search);
    if (params?.only_overdue) query.set('only_overdue', 'true');

    const qs = query.toString();
    const raw = await this.request<any[]>(`/complaints${qs ? `?${qs}` : ''}`);
    
    // Map backend snake_case to frontend camelCase
    return raw.map((c) => this.mapComplaint(c));
  }

  async getComplaint(id: string): Promise<Complaint> {
    const c = await this.request<any>(`/complaints/${id}`);
    return this.mapComplaint(c);
  }

  async createComplaint(payload: {
    title: string;
    description: string;
    categoryId: string;
    priority: Priority;
    campus: string;
    building: string;
    room: string;
    attachmentName?: string;
  }): Promise<Complaint> {
    const c = await this.request<any>('/complaints', {
      method: 'POST',
      body: JSON.stringify({
        title: payload.title,
        description: payload.description,
        category_id: payload.categoryId,
        priority: payload.priority,
        campus: payload.campus,
        building: payload.building,
        room: payload.room,
        attachment_name: payload.attachmentName,
      }),
    });
    return this.mapComplaint(c);
  }

  async updateComplaintStatus(
    id: string,
    status: ComplaintStatus,
    resolutionNotes?: string,
    holdReason?: string
  ): Promise<Complaint> {
    const c = await this.request<any>(`/complaints/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({
        status,
        resolution_notes: resolutionNotes,
        hold_reason: holdReason,
      }),
    });
    return this.mapComplaint(c);
  }

  async assignComplaint(
    id: string,
    departmentId: string,
    staffId?: string
  ): Promise<Complaint> {
    const c = await this.request<any>(`/complaints/${id}/assign`, {
      method: 'PATCH',
      body: JSON.stringify({
        department_id: departmentId,
        staff_id: staffId,
      }),
    });
    return this.mapComplaint(c);
  }

  // Departments Endpoints (PRD Section 10)
  async getDepartments(includeInactive = false): Promise<Department[]> {
    const raw = await this.request<any[]>(
      `/departments${includeInactive ? '?include_inactive=true' : ''}`
    );
    return raw.map((d) => ({
      id: d.id,
      name: d.name,
      description: d.description || '',
      contactEmail: d.contact_email,
      isActive: d.is_active,
      headName: d.head_name || 'Department Supervisor',
      openCount: d.open_complaints_count || 0,
      slaTargetHours: d.sla_target_hours || 24,
    }));
  }

  // Categories Endpoints (PRD Section 10)
  async getCategories(includeInactive = false): Promise<Category[]> {
    const raw = await this.request<any[]>(
      `/categories${includeInactive ? '?include_inactive=true' : ''}`
    );
    return raw.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description || '',
      departmentId: c.department_id,
      departmentName: c.department_name || 'Unassigned',
      isActive: c.is_active,
      defaultPriority: c.default_priority,
      icon: 'HelpCircle',
    }));
  }

  // Feedback Endpoints (PRD Section 10)
  async submitFeedback(
    complaintId: string,
    rating: number,
    comments?: string
  ): Promise<Feedback> {
    const fb = await this.request<any>('/feedback', {
      method: 'POST',
      body: JSON.stringify({
        complaint_id: complaintId,
        rating,
        comments,
      }),
    });
    return {
      id: fb.id,
      complaintId: fb.complaint_id,
      userId: fb.user_id,
      userName: fb.user_name || 'Student',
      rating: fb.rating,
      comments: fb.comments || '',
      createdAt: fb.created_at,
    };
  }

  async getFeedbackAnalytics(): Promise<any> {
    return this.request('/feedback/analytics');
  }

  // Notifications Endpoints (PRD Section 10)
  async getNotifications(unreadOnly = false): Promise<NotificationItem[]> {
    const raw = await this.request<any[]>(
      `/notifications${unreadOnly ? '?unread_only=true' : ''}`
    );
    return raw.map((n) => ({
      id: n.id,
      userId: n.user_id,
      title: n.title,
      message: n.message,
      isRead: n.is_read,
      complaintId: n.complaint_id,
      type: n.type,
      createdAt: n.created_at,
    }));
  }

  async markNotificationRead(id: string): Promise<void> {
    await this.request(`/notifications/${id}/read`, { method: 'PATCH' });
  }

  // Dashboards Endpoints (PRD Section 10)
  async getAdminDashboard(): Promise<any> {
    return this.request('/dashboard/admin');
  }

  async getStudentDashboard(): Promise<any> {
    return this.request('/dashboard/student');
  }

  async getDepartmentDashboard(): Promise<any> {
    return this.request('/dashboard/department');
  }

  // Helper mapper
  private mapComplaint(c: any): Complaint {
    return {
      id: c.id,
      complaintNumber: c.complaint_number,
      title: c.title,
      description: c.description,
      categoryId: c.category_id,
      categoryName: c.category_name || 'General',
      priority: c.priority,
      status: c.status,
      createdBy: c.created_by,
      createdByName: c.created_by_name || 'Requester',
      createdByRole: c.created_by_role || 'STUDENT',
      createdByEmail: c.created_by_email || '',
      assignedDepartmentId: c.assigned_department_id,
      assignedDepartmentName: c.assigned_department_name || 'Unassigned',
      assignedStaffId: c.assigned_staff_id,
      assignedStaffName: c.assigned_staff_name,
      campus: c.campus || 'Main University Campus',
      building: c.building || '',
      room: c.room || '',
      location: c.location,
      resolutionNotes: c.resolution_notes,
      holdReason: c.hold_reason,
      attachmentName: c.attachment_name,
      attachmentSize: c.attachment_name ? '1.8 MB' : undefined,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
      resolvedAt: c.resolved_at,
      slaTargetHours: c.sla_target_hours || 24,
      isOverdue: c.is_overdue || false,
      feedback: c.feedback
        ? {
            id: c.feedback.id,
            complaintId: c.feedback.complaint_id,
            userId: c.feedback.user_id,
            userName: c.feedback.user_name || 'Requester',
            rating: c.feedback.rating,
            comments: c.feedback.comments || '',
            createdAt: c.feedback.created_at,
          }
        : undefined,
      history: (c.history || []).map((h: any) => ({
        id: h.id,
        complaintId: c.id,
        changedByName: h.changed_by_name || 'System',
        changedByRole: h.changed_by_role || 'SYSTEM',
        previousStatus: h.previous_status,
        newStatus: h.new_status,
        remarks: h.remarks,
        createdAt: h.created_at,
      })),
    };
  }
}

export const api = new ApiClient();
