# 🎓 Smart Campus Service Management System (SCMS)

An enterprise service management and ticket automation platform designed for universities and colleges. SCMS centralizes campus maintenance, IT support, and facility management with automated department routing, SLA tracking, and closed-loop student feedback.

---

## 🚀 Tech Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, Lucide Icons, Recharts
- **Backend:** FastAPI (Python 3.11), Pydantic v2, PyMongo
- **Database:** MongoDB Atlas (Cloud) / Local MongoDB
- **Authentication:** JWT Bearer tokens with Role-Based Access Control (RBAC)
- **Deployment:** Render / Docker

---

## 🏛️ Project Architecture

```
Smart Campus/
├── run_all.bat               # Windows 1-click launch script
├── test_backend.bat          # Windows 1-click test runner
├── render.yaml               # Render cloud deployment blueprint
├── docker-compose.yml        # Docker configuration
│
├── backend/                  # FastAPI Backend
│   ├── app/
│   │   ├── core/             # Database client, security, config
│   │   ├── models/           # Pydantic v2 data models
│   │   ├── routers/          # API endpoints (auth, complaints, dashboards, etc.)
│   │   ├── schemas/          # Pydantic request/response schemas
│   │   └── services/         # Business logic (auto-assignment, SLA, lifecycle)
│   ├── scripts/              # Migration and seed scripts
│   ├── tests/                # Automated Pytest suite
│   ├── requirements.txt      # Python dependencies
│   └── .env.example          # Backend environment template
│
└── frontend/                 # React Frontend
    ├── src/
    │   ├── components/       # UI components (dashboards, tables, modals)
    │   ├── context/          # Global application state & auth context
    │   ├── services/         # Axios API client
    │   └── data/             # Initial mock/seed definitions
    ├── package.json          # Node dependencies
    └── .env.example          # Frontend environment template
```

---

## 🛠️ Development & Local Setup

### Quick Start (Windows 1-Click)
Run the automated launcher from the root directory:
```powershell
.\run_all.bat
```
- **Web Portal:** [http://localhost:5173](http://localhost:5173)
- **Interactive API Docs (Swagger):** [http://localhost:8000/docs](http://localhost:8000/docs)

---

### Manual Setup

#### 1. Backend Setup
```powershell
cd backend

# Create & activate virtual environment
python -m venv venv
.\venv\Scripts\Activate.ps1   # On Linux/macOS: source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables (copy template)
cp .env.example .env

# Start FastAPI server
uvicorn app.main:app --reload --port 8000
```

#### 2. Frontend Setup
```powershell
cd frontend

# Install dependencies
npm install

# Configure environment variables (copy template)
cp .env.example .env

# Start Vite dev server
npm run dev
```

---

## 🧪 Testing

Run backend unit and integration tests:
```powershell
cd backend
$env:PYTHONPATH="."
.\venv\Scripts\pytest -v tests/test_audit_scenarios.py
```
Or use the 1-click test script from the project root:
```powershell
.\test_backend.bat
```

---

## 👥 Demo Accounts

Universal Password: **`CampusSecret2026!`**

| Role | Email | Access Scope |
| :--- | :--- | :--- |
| **Administrator** | `dean.sterling@smartcampus.edu` | System configuration, live analytics, department & category management |
| **Department Staff** | `alex.vance@it.smartcampus.edu` | Assigned department queue, work orders, ticket resolution with notes |
| **Student** | `sarah.chen@student.smartcampus.edu` | Register tickets, track SLA countdown, submit CSAT feedback |
| **Faculty** | `r.miller@smartcampus.edu` | Register departmental and classroom service requests |

*(You can also use the **Persona Switcher** dropdown in the top-right navbar to switch roles instantly)*

---

## 🌐 Deployment (Render)

This repository includes a [`render.yaml`](./render.yaml) blueprint for 1-click deployment on [Render](https://render.com):

1. Link your GitHub repository to your Render account.
2. In Render, select **"New +" → "Blueprint"** and select this repository.
3. Configure the environment variables:
   - `MONGODB_URI`: Your MongoDB Atlas connection URI.
   - `SECRET_KEY`: A secure random string for JWT authentication.
4. Render provisions:
   - **`smartcampus-backend`**: FastAPI Python 3.11 web service.
   - **`smartcampus-frontend`**: React static site (`dist` folder).

---

## 🔐 Environment Variables Reference

### Backend (`backend/.env`)
```env
MONGODB_URI="mongodb+srv://<username>:<password>@cluster.mongodb.net/?retryWrites=true&w=majority"
MONGODB_DB_NAME="smartcampus_db"
SECRET_KEY="your-secret-key-here"
ACCESS_TOKEN_EXPIRE_MINUTES=1440
CORS_ORIGINS="http://localhost:5173,http://127.0.0.1:5173"
```

### Frontend (`frontend/.env`)
```env
VITE_API_BASE_URL="http://localhost:8000"
```
