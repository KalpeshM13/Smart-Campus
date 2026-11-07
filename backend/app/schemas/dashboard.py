from typing import List, Dict, Any
from pydantic import BaseModel

class AdminDashboardMetrics(BaseModel):
    total_complaints: int
    new_complaints: int
    assigned_complaints: int
    in_progress_complaints: int
    resolved_complaints: int
    overdue_complaints: int
    average_resolution_hours: float
    resolution_rate_percent: float
    category_distribution: List[Dict[str, Any]]
    department_workload: List[Dict[str, Any]]
    monthly_trends: List[Dict[str, Any]]

class StudentDashboardMetrics(BaseModel):
    total_submitted: int
    open_complaints: int
    resolved_complaints: int
    recent_complaints: List[Any]
    unread_notifications_count: int

class DepartmentDashboardMetrics(BaseModel):
    department_name: str
    total_assigned: int
    new_requests: int
    in_progress: int
    on_hold: int
    resolved: int
    high_priority: int
    overdue_requests: int
    average_resolution_hours: float

