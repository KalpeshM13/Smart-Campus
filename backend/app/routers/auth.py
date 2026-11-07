from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from pymongo.database import Database
from app.core.database import get_db
from app.core.security import get_password_hash, verify_password, create_access_token
from app.core.dependencies import get_current_user
from app.models.user import User, StudentProfile, Role
from app.schemas.user import UserRegister, UserLogin, UserResponse, Token

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register_user(data: UserRegister, db: Database = Depends(get_db)):
    """
    Register new student or faculty account in MongoDB (PRD Section 6 FR-01, Test T1).
    - Hash password using bcrypt.
    - Prevents public creation of Admin or Staff accounts.
    """
    normalized_email = data.email.lower().strip()
    existing_user = db.users.find_one({"email": normalized_email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists."
        )

    hashed_pw = get_password_hash(data.password)
    now = datetime.now(timezone.utc)

    new_user = User(
        email=normalized_email,
        full_name=data.full_name.strip(),
        password_hash=hashed_pw,
        role=data.role,
        is_active=True,
        created_at=now
    )

    if data.student_id:
        profile = StudentProfile(
            user_id=new_user.id,
            student_id=data.student_id.strip(),
            course=data.course,
            department=data.department,
            year=data.year,
            phone=data.phone
        )
        new_user.student_profile = profile
        db.student_profiles.insert_one(profile.to_mongo())

    db.users.insert_one(new_user.to_mongo())

    access_token = create_access_token(subject=new_user.id, role=new_user.role.value)
    return Token(access_token=access_token, token_type="bearer", user=UserResponse.model_validate(new_user))

@router.post("/login", response_model=Token)
def login_user(credentials: UserLogin, db: Database = Depends(get_db)):
    """
    Authenticate user with credentials in MongoDB and return JWT bearer token (PRD Section 6 FR-01, Test T2, T3).
    """
    normalized_email = credentials.email.lower().strip()
    user_doc = db.users.find_one({"email": normalized_email})
    if not user_doc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password credentials."
        )

    user = User.from_mongo(user_doc)
    if not verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password credentials."
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been deactivated. Please contact an administrator."
        )

    # Attach profile if not embedded
    if not user.student_profile:
        prof_doc = db.student_profiles.find_one({"user_id": user.id})
        if prof_doc:
            user.student_profile = StudentProfile.from_mongo(prof_doc)

    access_token = create_access_token(subject=user.id, role=user.role.value)
    return Token(access_token=access_token, token_type="bearer", user=UserResponse.model_validate(user))

@router.get("/me", response_model=UserResponse)
def get_current_user_profile(current_user: User = Depends(get_current_user), db: Database = Depends(get_db)):
    """Return currently authenticated profile."""
    if not current_user.student_profile:
        prof_doc = db.student_profiles.find_one({"user_id": current_user.id})
        if prof_doc:
            current_user.student_profile = StudentProfile.from_mongo(prof_doc)
    return current_user

@router.post("/logout")
def logout(current_user: User = Depends(get_current_user)):
    """Logout session confirmation."""
    return {"message": "Successfully logged out."}
