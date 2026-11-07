from typing import List
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from pymongo.database import Database
from app.core.config import settings
from app.core.database import get_db
from app.models.user import User, Role
from app.models.complaint import Complaint

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login")

def get_current_user(token: str = Depends(oauth2_scheme), db: Database = Depends(get_db)) -> User:
    """Validate JWT access token and return authenticated active user from MongoDB."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials or token expired",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user_doc = db.users.find_one({"$or": [{"_id": user_id}, {"id": user_id}]})
    if user_doc is None:
        raise credentials_exception
        
    user = User.from_mongo(user_doc)
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Inactive user account")
    return user

def require_roles(*allowed_roles: Role):
    """Enforce endpoint-level Role-Based Access Control (RBAC)."""
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required roles: {[r.value for r in allowed_roles]}"
            )
        return current_user
    return role_checker

def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != Role.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Administrator privilege required.")
    return current_user

def require_staff_or_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in [Role.STAFF, Role.ADMIN]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Department staff or administrator privilege required.")
    return current_user

def verify_complaint_access(complaint: Complaint, user: User) -> None:
    """
    Enforce backend record-level authorization (PRD Section 5.1, 5.3, 10, Test T12, T13).
    - Students and Faculty can only view/access their own complaints.
    - Department Staff can only view/access complaints assigned to their department.
    - Administrators have system-wide access.
    """
    if user.role == Role.ADMIN:
        return

    if user.role in [Role.STUDENT, Role.FACULTY]:
        if complaint.created_by != user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You are not authorized to view or modify this complaint."
            )
        return

    if user.role == Role.STAFF:
        if user.staff_department_id and complaint.assigned_department_id != user.staff_department_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: This complaint is assigned to another department."
            )
        return
