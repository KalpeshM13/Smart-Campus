import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  INITIAL_CATEGORIES,
  INITIAL_DEPARTMENTS,
  USERS,
} from '../data/mockData';
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
  ViewTab,
} from '../types';
import { api } from '../services/api';

interface ToastData {
  text: string;
  type: 'success' | 'info' | 'warning' | 'error';
}

interface AppContextType {
  currentUser: User;
  setCurrentUser: (u: User) => void;
  switchRole: (role: Role) => void;
  allUsers: User[];
  complaints: Complaint[];
  departments: Department[];
  categories: Category[];
  notifications: NotificationItem[];
  unreadNotifsCount: number;
  activeTab: ViewTab;
  setActiveTab: (tab: ViewTab) => void;
  selectedComplaint: Complaint | null;
  setSelectedComplaint: (c: Complaint | null) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedCampus: string;
  setSelectedCampus: (campus: string) => void;
  isBackendConnected: boolean;
  salesforceStatus: { mode?: string; orgName?: string };

  // Modals & Panels
  isRegisterModalOpen: boolean;
  setIsRegisterModalOpen: (open: boolean) => void;
  isFeedbackModalOpen: boolean;
  setIsFeedbackModalOpen: (open: boolean) => void;
  feedbackTargetComplaint: Complaint | null;
  setFeedbackTargetComplaint: (c: Complaint | null) => void;
  isCommandPaletteOpen: boolean;
  setIsCommandPaletteOpen: (open: boolean) => void;
  isNotificationDrawerOpen: boolean;
  setIsNotificationDrawerOpen: (open: boolean) => void;
  isMobileSidebarOpen: boolean;
  setIsMobileSidebarOpen: (open: boolean) => void;

  toast: ToastData | null;
  showToast: (text: string, type?: 'success' | 'info' | 'warning' | 'error') => void;

  // Business Actions
  createComplaint: (data: {
    title: string;
    description: string;
    categoryId: string;
    priority: Priority;
    campus: string;
    building: string;
    room: string;
    attachmentName?: string;
  }) => Promise<Complaint>;

  updateComplaintStatus: (
    complaintId: string,
    newStatus: ComplaintStatus,
    notes?: string,
    holdReason?: string
  ) => Promise<boolean>;

  assignComplaint: (
    complaintId: string,
    departmentId: string,
    staffId?: string,
    staffName?: string
  ) => Promise<boolean>;

  submitFeedback: (complaintId: string, rating: number, comments: string) => Promise<void>;
  refreshBackendData: () => Promise<void>;

  updateCategoryMapping: (categoryId: string, departmentId: string) => void;
  addCategory: (cat: Omit<Category, 'id' | 'departmentName'>) => void;
  toggleCategoryActive: (categoryId: string) => void;
  toggleDepartmentActive: (departmentId: string) => void;

  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  exportComplaintsCSV: (filteredComplaints?: Complaint[]) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Defensive deduplication helper ensuring no duplicate tickets appear in the UI
function deduplicateComplaints(list: Complaint[]): Complaint[] {
  const seenKeys = new Set<string>();
  const seenSemantic = new Set<string>();
  const result: Complaint[] = [];

  for (const c of list) {
    // 1. Direct key match: Salesforce Case ID, ticket number, or internal ID
    const idKey = c.id ? `id-${c.id}` : null;
    const sfKey = c.salesforceCaseId ? `sf-${c.salesforceCaseId}` : null;
    const sfNumKey = c.salesforceCaseNumber ? `sfnum-${c.salesforceCaseNumber}` : null;
    const cmpNumKey = c.complaintNumber ? `cmp-${c.complaintNumber}` : null;

    if (idKey && seenKeys.has(idKey)) continue;
    if (sfKey && seenKeys.has(sfKey)) continue;
    if (sfNumKey && seenKeys.has(sfNumKey)) continue;
    if (cmpNumKey && seenKeys.has(cmpNumKey)) continue;

    // 2. Semantic matching: same title + same requester
    const titleNorm = (c.title || '').trim().toLowerCase();
    const requesterNorm = (c.createdByName || c.createdBy || '').trim().toLowerCase();
    const semanticKey = `${titleNorm}|${requesterNorm}`;

    if (titleNorm.length > 3 && seenSemantic.has(semanticKey)) {
      continue;
    }

    if (idKey) seenKeys.add(idKey);
    if (sfKey) seenKeys.add(sfKey);
    if (sfNumKey) seenKeys.add(sfNumKey);
    if (cmpNumKey) seenKeys.add(cmpNumKey);
    if (titleNorm.length > 3) seenSemantic.add(semanticKey);

    result.push(c);
  }
  return result;
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User>(() => {
    const saved = localStorage.getItem('scms_current_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return USERS[3]; // Default to Administrator for reviewing the full suite
  });

  const [activeTab, setActiveTab] = useState<ViewTab>('dashboard');
  const [selectedCampus, setSelectedCampus] = useState<string>('Main University Campus');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [departments, setDepartments] = useState<Department[]>(() => {
    const saved = localStorage.getItem('scms_departments');
    return saved ? JSON.parse(saved) : INITIAL_DEPARTMENTS;
  });

  const [categories, setCategories] = useState<Category[]>(() => {
    const saved = localStorage.getItem('scms_categories');
    return saved ? JSON.parse(saved) : INITIAL_CATEGORIES;
  });

  const [complaints, setComplaints] = useState<Complaint[]>(() => {
    const saved = localStorage.getItem('scms_complaints');
    if (!saved) return [];
    try {
      const parsed: Complaint[] = JSON.parse(saved);
      return deduplicateComplaints(parsed);
    } catch {
      return [];
    }
  });

  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    const saved = localStorage.getItem('scms_notifications');
    return saved ? JSON.parse(saved) : [];
  });

  // Dialog & Drawer state
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState<boolean>(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState<boolean>(false);
  const [feedbackTargetComplaint, setFeedbackTargetComplaint] = useState<Complaint | null>(null);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState<boolean>(false);
  const [isNotificationDrawerOpen, setIsNotificationDrawerOpen] = useState<boolean>(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  const [toast, setToast] = useState<ToastData | null>(null);
  const [isBackendConnected, setIsBackendConnected] = useState<boolean>(false);
  const [salesforceStatus, setSalesforceStatus] = useState<{ mode?: string; orgName?: string }>({});

  // Periodic Backend Health Monitoring
  useEffect(() => {
    let isMounted = true;
    const testHealth = async () => {
      try {
        const res = await api.checkHealth();
        if (isMounted) {
          setIsBackendConnected(res.ok);
          if (res.salesforceMode) {
            setSalesforceStatus({ mode: res.salesforceMode, orgName: res.orgName });
          }
        }
      } catch {
        if (isMounted) {
          setIsBackendConnected(false);
          setSalesforceStatus({});
        }
      }
    };
    testHealth();
    const interval = setInterval(testHealth, 10000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Live Backend Data Synchronizer
  const refreshBackendData = useCallback(async () => {
    try {
      const loginRes = await api.login(currentUser.email, 'CampusSecret2026!');
      if (loginRes?.user) {
        setCurrentUser((prev) => ({
          ...prev,
          id: loginRes.user.id || prev.id,
          fullName: loginRes.user.full_name || prev.fullName,
          role: loginRes.user.role || prev.role,
          staffDepartmentId: loginRes.user.staff_department_id || prev.staffDepartmentId,
        }));
      }

      const [depts, cats, cmps] = await Promise.all([
        api.getDepartments(),
        api.getCategories(),
        api.getComplaints(),
      ]);
      if (depts && depts.length > 0) setDepartments(depts);
      if (cats && cats.length > 0) setCategories(cats);
      if (cmps) {
        const uniqueCmps = deduplicateComplaints(cmps);
        setComplaints(uniqueCmps);
      }
    } catch {
      // Backend polling notice handled gracefully without console clutter
    }
  }, [currentUser.email]);

  // Load live data on connection or persona switch
  useEffect(() => {
    if (isBackendConnected) {
      let isMounted = true;
      const load = async () => {
        if (isMounted) {
          await refreshBackendData();
        }
      };
      void load();
      const interval = setInterval(() => {
        void refreshBackendData();
      }, 15000);
      return () => {
        isMounted = false;
        clearInterval(interval);
      };
    }
  }, [isBackendConnected, refreshBackendData]);

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem('scms_complaints', JSON.stringify(complaints));
  }, [complaints]);

  useEffect(() => {
    localStorage.setItem('scms_categories', JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    localStorage.setItem('scms_departments', JSON.stringify(departments));
  }, [departments]);

  useEffect(() => {
    localStorage.setItem('scms_notifications', JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem('scms_current_user', JSON.stringify(currentUser));
  }, [currentUser]);

  const showToast = (text: string, type: 'success' | 'info' | 'warning' | 'error' = 'success') => {
    setToast({ text, type });
    setTimeout(() => {
      setToast((prev) => (prev?.text === text ? null : prev));
    }, 4000);
  };

  const switchRole = (role: Role) => {
    let target = USERS.find((u) => u.role === role) || USERS[0];
    
    // Dynamically associate live department ID from fetched departments
    if (role === 'STAFF') {
      const itDept = departments.find(
        (d) => d.code === 'IT' || d.name.toLowerCase().includes('it') || d.name.toLowerCase().includes('information')
      );
      if (itDept) {
        target = {
          ...target,
          staffDepartmentId: itDept.id,
          staffDepartmentName: itDept.name,
        };
      }
    } else if (role === 'FACULTY') {
      const elecDept = departments.find(
        (d) => d.code === 'ELEC' || d.name.toLowerCase().includes('electrical')
      );
      if (elecDept) {
        target = {
          ...target,
          staffDepartmentId: elecDept.id,
          staffDepartmentName: elecDept.name,
        };
      }
    }

    setCurrentUser(target);
    showToast(`Switched persona to ${target.fullName} (${role})`, 'info');
  };

  // FR-02 & FR-05: Complaint Registration & Auto-assignment
  const createComplaint = async (data: {
    title: string;
    description: string;
    categoryId: string;
    priority: Priority;
    campus: string;
    building: string;
    room: string;
    attachmentName?: string;
  }): Promise<Complaint> => {
    if (isBackendConnected) {
      try {
        await api.login(currentUser.email, 'CampusSecret2026!');
        const created = await api.createComplaint({
          title: data.title,
          description: data.description,
          categoryId: data.categoryId,
          priority: data.priority,
          campus: data.campus,
          building: data.building,
          room: data.room,
          attachmentName: data.attachmentName,
        });

        setComplaints((prev) => deduplicateComplaints([created, ...prev]));

        // Create in-app notification
        const newNotif: NotificationItem = {
          id: `notif-${Date.now()}`,
          userId: currentUser.id,
          title: `Service Request Logged: ${created.complaintNumber}`,
          message: created.assignedDepartmentName
            ? `Routed directly to ${created.assignedDepartmentName} (${created.queueName || 'Queue'}).`
            : `Awaiting administrator triage. Tracking ID ${created.complaintNumber}.`,
          isRead: false,
          createdAt: new Date().toISOString(),
          complaintId: created.id,
          type: 'ASSIGNMENT',
        };
        setNotifications((prev) => [newNotif, ...prev]);

        showToast(
          `Case ${created.complaintNumber} created and routed in live Salesforce!`,
          'success'
        );
        return created;
      } catch (err: any) {
        console.error('Error creating complaint via backend/Salesforce:', err);
        showToast(`Salesforce Sync Error: ${err.message}`, 'error');
        throw err;
      }
    }

    // Fallback offline creation
    const cat = categories.find((c) => c.id === data.categoryId);
    const categoryName = cat ? cat.name : 'General';
    const dept = departments.find((d) => d.id === cat?.departmentId && d.isActive);

    const nextIndex = complaints.length + 101;
    const complaintNumber = `SCMS-2026-${String(nextIndex).padStart(6, '0')}`;
    const now = new Date().toISOString();

    const initialStatus: ComplaintStatus = dept ? 'ASSIGNED' : 'NEW';
    const slaHours = data.priority === 'HIGH' ? 24 : data.priority === 'MEDIUM' ? 72 : 120;

    const newComplaint: Complaint = {
      id: `cmp-${Date.now()}`,
      complaintNumber,
      title: data.title,
      description: data.description,
      categoryId: data.categoryId,
      categoryName,
      priority: data.priority,
      status: initialStatus,
      createdBy: currentUser.id,
      createdByName: currentUser.fullName,
      createdByRole: currentUser.role,
      createdByEmail: currentUser.email,
      assignedDepartmentId: dept ? dept.id : 'dept-admin',
      assignedDepartmentName: dept ? dept.name : 'Unassigned (Administrator Review)',
      campus: data.campus,
      building: data.building,
      room: data.room,
      location: `${data.building} - ${data.room}`,
      attachmentName: data.attachmentName,
      attachmentSize: data.attachmentName ? '1.8 MB' : undefined,
      createdAt: now,
      updatedAt: now,
      slaTargetHours: slaHours,
      isOverdue: false,
      history: [
        {
          id: `hist-${Date.now()}-1`,
          complaintId: `cmp-${Date.now()}`,
          changedByName: currentUser.fullName,
          changedByRole: currentUser.role,
          previousStatus: 'NONE',
          newStatus: 'NEW',
          remarks: 'Complaint registered via web portal.',
          createdAt: now,
        },
      ],
    };

    setComplaints((prev) => [newComplaint, ...prev]);
    showToast(`Request ${complaintNumber} registered locally (offline mode)!`, 'info');
    return newComplaint;
  };

  // FR-06: Status management & resolution enforcement
  const updateComplaintStatus = async (
    complaintId: string,
    newStatus: ComplaintStatus,
    notes?: string,
    holdReason?: string
  ): Promise<boolean> => {
    const target = complaints.find((c) => c.id === complaintId);
    if (!target) return false;

    // FR-06 Rule: Resolution notes are mandatory before setting to RESOLVED
    if (newStatus === 'RESOLVED' && (!notes || notes.trim().length < 5)) {
      showToast('Validation Error: Resolution notes (minimum 5 chars) are mandatory before marking as resolved.', 'error');
      return false;
    }

    if (newStatus === 'ON_HOLD' && (!holdReason || holdReason.trim().length < 5)) {
      showToast('Validation Error: A specific reason is required before putting a request on hold.', 'error');
      return false;
    }

    if (isBackendConnected) {
      try {
        await api.login(currentUser.email, 'CampusSecret2026!');
        const updated = await api.updateComplaintStatus(
          complaintId,
          newStatus,
          notes,
          holdReason
        );
        setComplaints((prev) =>
          prev.map((c) => (c.id === complaintId ? updated : c))
        );
        if (selectedComplaint && selectedComplaint.id === complaintId) {
          setSelectedComplaint(updated);
        }
        showToast(`Case status transitioned to ${newStatus} in Salesforce!`, 'success');
        return true;
      } catch (err: any) {
        console.error('Failed to update status in Salesforce:', err);
        showToast(`Salesforce update notice: ${err.message}`, 'error');
        return false;
      }
    }

    const now = new Date().toISOString();

    const updated = complaints.map((c) => {
      if (c.id === complaintId) {
        const historyEntry = {
          id: `hist-${Date.now()}`,
          complaintId: c.id,
          changedByName: currentUser.fullName,
          changedByRole: currentUser.role,
          previousStatus: c.status,
          newStatus,
          remarks:
            newStatus === 'RESOLVED'
              ? `Resolved by ${currentUser.fullName}. Notes: ${notes}`
              : newStatus === 'ON_HOLD'
              ? `Placed on hold: ${holdReason}`
              : `Status updated to ${newStatus} by ${currentUser.fullName}`,
          createdAt: now,
        };

        return {
          ...c,
          status: newStatus,
          updatedAt: now,
          resolutionNotes: notes ? notes : c.resolutionNotes,
          holdReason: holdReason ? holdReason : c.holdReason,
          resolvedAt: newStatus === 'RESOLVED' ? now : c.resolvedAt,
          history: [...c.history, historyEntry],
        };
      }
      return c;
    });

    setComplaints(updated);

    if (selectedComplaint && selectedComplaint.id === complaintId) {
      const refreshed = updated.find((c) => c.id === complaintId);
      if (refreshed) setSelectedComplaint(refreshed);
    }

    // In-app notification to requester
    const notif: NotificationItem = {
      id: `notif-${Date.now()}`,
      userId: target.createdBy,
      title: `Status Update: ${target.complaintNumber}`,
      message:
        newStatus === 'RESOLVED'
          ? `Your issue "${target.title}" was resolved by ${currentUser.fullName}. Click to inspect and provide feedback.`
          : `Status changed to ${newStatus}.`,
      isRead: false,
      createdAt: now,
      complaintId: target.id,
      type: newStatus === 'RESOLVED' ? 'RESOLVED' : 'STATUS_CHANGE',
    };
    setNotifications((prev) => [notif, ...prev]);

    showToast(`Status updated to ${newStatus}`, 'success');
    return true;
  };

  // Assign staff / department override
  const assignComplaint = async (
    complaintId: string,
    departmentId: string,
    staffId?: string,
    staffName?: string
  ): Promise<boolean> => {
    const dept = departments.find((d) => d.id === departmentId);
    if (!dept) return false;

    if (isBackendConnected) {
      try {
        await api.login(currentUser.email, 'CampusSecret2026!');
        const updated = await api.assignComplaint(complaintId, departmentId, staffId);
        setComplaints((prev) =>
          prev.map((c) => (c.id === complaintId ? updated : c))
        );
        if (selectedComplaint && selectedComplaint.id === complaintId) {
          setSelectedComplaint(updated);
        }
        showToast(`Complaint reassigned to ${updated.assignedDepartmentName || dept.name} in live Salesforce!`, 'success');
        return true;
      } catch (err: any) {
        console.error('Failed to assign complaint via backend:', err);
        showToast(`Reassign Error: ${err.message}`, 'error');
        return false;
      }
    }

    const now = new Date().toISOString();
    setComplaints((prev) =>
      prev.map((c) => {
        if (c.id === complaintId) {
          return {
            ...c,
            assignedDepartmentId: dept.id,
            assignedDepartmentName: dept.name,
            assignedStaffId: staffId || c.assignedStaffId,
            assignedStaffName: staffName || c.assignedStaffName,
            status: c.status === 'NEW' ? 'ASSIGNED' : c.status,
            updatedAt: now,
            history: [
              ...c.history,
              {
                id: `hist-${Date.now()}`,
                complaintId: c.id,
                changedByName: currentUser.fullName,
                changedByRole: currentUser.role,
                previousStatus: c.status,
                newStatus: c.status === 'NEW' ? 'ASSIGNED' : c.status,
                remarks: `Assigned to ${dept.name}${staffName ? ` (${staffName})` : ''} by ${currentUser.fullName}`,
                createdAt: now,
              },
            ],
          };
        }
        return c;
      })
    );
    showToast(`Complaint assigned to ${dept.name}`, 'success');
    return true;
  };

  // FR-09: Feedback submission
  const submitFeedback = async (complaintId: string, rating: number, comments: string): Promise<void> => {
    const now = new Date().toISOString();
    const fb: Feedback = {
      id: `fb-${Date.now()}`,
      complaintId,
      userId: currentUser.id,
      userName: currentUser.fullName,
      rating,
      comments,
      createdAt: now,
    };

    // Optimistically update complaint status to CLOSED with feedback attached
    setComplaints((prev) =>
      prev.map((c) => {
        if (c.id === complaintId || c.salesforceCaseId === complaintId) {
          const updatedHistory = [
            ...c.history,
            {
              id: `hist-${Date.now()}`,
              complaintId: c.id,
              changedByName: currentUser.fullName,
              changedByRole: currentUser.role,
              previousStatus: c.status,
              newStatus: 'CLOSED' as ComplaintStatus,
              remarks: `Requester provided ${rating}-star CSAT rating. Ticket officially closed.`,
              createdAt: now,
            },
          ];
          return {
            ...c,
            feedback: fb,
            status: 'CLOSED' as ComplaintStatus,
            updatedAt: now,
            history: updatedHistory,
          };
        }
        return c;
      })
    );

    if (selectedComplaint && (selectedComplaint.id === complaintId || selectedComplaint.salesforceCaseId === complaintId)) {
      setSelectedComplaint((prev) =>
        prev
          ? {
              ...prev,
              feedback: fb,
              status: 'CLOSED' as ComplaintStatus,
              updatedAt: now,
            }
          : null
      );
    }

    if (isBackendConnected) {
      try {
        await api.login(currentUser.email, 'CampusSecret2026!');
        await api.submitFeedback(complaintId, rating, comments);
        await refreshBackendData();
        showToast('CSAT feedback submitted to Salesforce and ticket closed!', 'success');
        return;
      } catch (err: any) {
        console.error('Failed to submit feedback to Salesforce:', err);
        showToast(`Salesforce feedback notice: ${err.message}`, 'error');
      }
    } else {
      showToast('Feedback submitted locally (offline mode) and ticket closed!', 'success');
    }
  };

  // Mapping updates
  const updateCategoryMapping = (categoryId: string, departmentId: string) => {
    const dept = departments.find((d) => d.id === departmentId);
    if (!dept) return;

    setCategories((prev) =>
      prev.map((cat) => {
        if (cat.id === categoryId) {
          return {
            ...cat,
            departmentId: dept.id,
            departmentName: dept.name,
          };
        }
        return cat;
      })
    );
    showToast('Category routing mapping updated successfully', 'success');
  };

  const addCategory = (cat: Omit<Category, 'id' | 'departmentName'>) => {
    const dept = departments.find((d) => d.id === cat.departmentId);
    const newCat: Category = {
      ...cat,
      id: `cat-${Date.now()}`,
      departmentName: dept ? dept.name : 'Unassigned',
    };
    setCategories((prev) => [...prev, newCat]);
    showToast(`Category "${newCat.name}" created`, 'success');
  };

  const toggleCategoryActive = (categoryId: string) => {
    setCategories((prev) =>
      prev.map((c) => (c.id === categoryId ? { ...c, isActive: !c.isActive } : c))
    );
    showToast('Category status updated', 'info');
  };

  const toggleDepartmentActive = (departmentId: string) => {
    setDepartments((prev) =>
      prev.map((d) => (d.id === departmentId ? { ...d, isActive: !d.isActive } : d))
    );
    showToast('Department status updated', 'info');
  };

  const markNotificationRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  const markAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    showToast('All notifications marked as read', 'info');
  };

  // FR-12: Export to CSV
  const exportComplaintsCSV = (filteredComplaints?: Complaint[]) => {
    const list = filteredComplaints || complaints;
    const headers = [
      'Complaint Number',
      'Title',
      'Category',
      'Priority',
      'Status',
      'Created By',
      'Role',
      'Assigned Department',
      'Assigned Staff',
      'Location',
      'Created At',
      'Resolved At',
      'SLA Target (Hours)',
      'Overdue',
      'Rating',
      'Feedback Comments',
    ];

    const rows = list.map((c) => [
      `"${c.complaintNumber}"`,
      `"${c.title.replace(/"/g, '""')}"`,
      `"${c.categoryName}"`,
      `"${c.priority}"`,
      `"${c.status}"`,
      `"${c.createdByName}"`,
      `"${c.createdByRole}"`,
      `"${c.assignedDepartmentName}"`,
      `"${c.assignedStaffName || 'Unassigned'}"`,
      `"${c.location.replace(/"/g, '""')}"`,
      `"${c.createdAt}"`,
      `"${c.resolvedAt || ''}"`,
      c.slaTargetHours,
      c.isOverdue ? 'YES' : 'NO',
      c.feedback ? c.feedback.rating : '',
      `"${(c.feedback?.comments || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Smart_Campus_Complaints_Export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Exported ${list.length} records to CSV`, 'success');
  };

  const unreadNotifsCount = notifications.filter(
    (n) => !n.isRead && (currentUser.role === 'ADMIN' || n.userId === currentUser.id)
  ).length;

  return (
    <AppContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        switchRole,
        allUsers: USERS,
        complaints,
        departments,
        categories,
        notifications,
        unreadNotifsCount,
        activeTab,
        setActiveTab,
        selectedComplaint,
        setSelectedComplaint,
        searchQuery,
        setSearchQuery,
        selectedCampus,
        setSelectedCampus,
        isBackendConnected,
        salesforceStatus,
        isRegisterModalOpen,
        setIsRegisterModalOpen,
        isFeedbackModalOpen,
        setIsFeedbackModalOpen,
        feedbackTargetComplaint,
        setFeedbackTargetComplaint,
        isCommandPaletteOpen,
        setIsCommandPaletteOpen,
        isNotificationDrawerOpen,
        setIsNotificationDrawerOpen,
        isMobileSidebarOpen,
        setIsMobileSidebarOpen,
        toast,
        showToast,
        createComplaint,
        updateComplaintStatus,
        assignComplaint,
        submitFeedback,
        refreshBackendData,
        updateCategoryMapping,
        addCategory,
        toggleCategoryActive,
        toggleDepartmentActive,
        markNotificationRead,
        markAllNotificationsRead,
        exportComplaintsCSV,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

// oxlint-disable-next-line react/only-export-components
export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

