# ☁️ Smart Campus Service Management System (SCMS) - Salesforce Cloud Native

[![Salesforce Service Cloud](https://img.shields.io/badge/Salesforce-Service_Cloud_v60.0-00A1E0?logo=salesforce)](https://www.salesforce.com/products/service-cloud/)
[![Lightning Web Components](https://img.shields.io/badge/LWC-Native_Components-0070D2?logo=salesforce)](https://developer.salesforce.com/docs/component-library/overview/components)
[![Apex Passing](https://img.shields.io/badge/Apex_Tests-2%2F2_Passing_(100%25)-brightgreen)](force-app/main/default/classes/SmartCampusTest.cls)
[![Architecture](https://img.shields.io/badge/Architecture-100%25_Cloud_Native-purple)](#-architecture-overview)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

An enterprise campus facilities, IT, and operations management platform built **100% natively on Salesforce Service Cloud**. The system unifies students, faculty members, facility maintenance engineers, and university administrators under a single Salesforce Lightning platform with **zero external backend, zero external frontend, and zero middleware barriers**.

Every feature previously running on standalone React and FastAPI now operates directly inside Salesforce via **Lightning Web Components (LWC)**, **Apex Controllers**, **Apex Triggers**, **Custom Objects**, **Automated Queues**, and **Validation Rules**.

---

## 📑 Table of Contents

- [Architectural Overview](#-architectural-overview)
- [How to Access in Salesforce](#-how-to-access-in-salesforce)
- [Zero-Barrier Feature Parity](#-zero-barrier-feature-parity)
- [Data Model & Custom Objects](#-data-model--custom-objects)
- [Automated Business Logic & Triggers](#-automated-business-logic--triggers)
- [Service Level Agreement (SLA) Matrix](#-service-level-agreement-sla-matrix)
- [Department Queues](#-department-queues)
- [Automated Setup & Verification Script](#-automated-setup--verification-script)
- [Repository Structure (SFDX)](#-repository-structure-sfdx)
- [License](#-license)

---

## 🏛 Architectural Overview

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Salesforce Service Cloud                        │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │     Lightning Application: "Smart Campus Operations"             │  │
│  │                                                                  │  │
│  │   [Smart Campus Portal LWC]  [Cases]  [Departments] [Categories] │  │
│  │                                                                  │  │
│  │   • Student / Faculty Requester Hub (Log Issues, Track Status)   │  │
│  │   • Department Work Queue Terminal (Technician Claim & Resolve)  │  │
│  │   • Administrator Operations Command Center (KPIs, CSAT, SLAs)   │  │
│  └──────────────────────────────────┬───────────────────────────────┘  │
│                                     │                                  │
│                                     ▼                                  │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                Apex Controller Service Layer                     │  │
│  │                 `SmartCampusController.cls`                      │  │
│  │   - Reactive `@AuraEnabled` endpoints for all UI operations     │  │
│  │   - Dynamic SOQL filtering, metrics aggregation & CSAT feeds     │  │
│  └──────────────────┬───────────────────────────────┬───────────────┘  │
│                     │                               │                  │
│                     ▼                               ▼                  │
│  ┌──────────────────────────────────┐ ┌─────────────────────────────┐  │
│  │    Triggers & Validation Engine  │ │  Native Salesforce Data SoR │  │
│  │  • SmartCampusCaseTrigger        │ │  • Case (Standard)          │  │
│  │  • SmartCampusFeedbackTrigger    │ │  • Department__c            │  │
│  │  • Mandatory Resolution Notes VR │ │  • Complaint_Category__c   │  │
│  │  • Mandatory Hold Reason VR      │ │  • Complaint_Feedback__c   │  │
│  │  • Auto SLA Target Time Engine   │ │  • Group (Queues)           │  │
│  └──────────────────────────────────┘ └─────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

### Why 100% Salesforce Cloud Native?
- **Zero Infrastructure Maintenance**: No Python web servers, no Node/Vite processes, no MongoDB clusters to maintain.
- **Enterprise High Availability**: Built-in 99.99% uptime, automated backups, and SOC 2 / ISO 27001 compliance.
- **Native Security & RBAC**: Real-time Field-Level Security (FLS), Sharing Rules, and Profiles without external JWT tokens.
- **Omni-Channel & Mobile**: Runs instantly on desktop Lightning Experience and the Salesforce Mobile App (iOS / Android).

---

## 🚀 How to Access in Salesforce

1. Log into your Salesforce Org:
   - **Instance URL:** `https://orgfarm-bc1061b553-dev-ed.develop.my.salesforce.com` (or your assigned domain).
2. Click the **App Launcher** (the 9-dot grid icon in the top left).
3. Search for and select **"Smart Campus Operations"**.
4. You will see the native navigation tabs:
   - **Smart Campus Operations** (Unified interactive LWC dashboard).
   - **Cases** (Standard Salesforce Case console with queue list views).
   - **Campus Departments** (`Department__c`).
   - **Complaint Categories** (`Complaint_Category__c`).
   - **Complaint Feedback** (`Complaint_Feedback__c`).

---

## ⚡ Zero-Barrier Feature Parity

All capabilities from the previous frontend and backend now execute natively in Salesforce:

| Previous Frontend / Backend Feature | Native Salesforce Cloud Implementation |
| :--- | :--- |
| **Student / Faculty Ticket Submission** | `smartCampusPortal` LWC Modal with real-time category SLA preview and building/room inputs. |
| **Automated Department Queue Dispatch** | `SmartCampusCaseTrigger` automatically assigns the Case `OwnerId` to the mapped Queue (`IT_Queue`, `Electrical_Queue`, etc.). |
| **Dynamic SLA Target Calculation** | `SmartCampusCaseTrigger` adds category SLA hours (24h/72h/120h) to `CreatedDate` and writes to `SLA_Target_Time__c`. |
| **Overdue SLA Detection** | Trigger and Controller automatically evaluate `SLA_Target_Time__c < NOW()` and display red `OVERDUE` warnings. |
| **Technician Work Order Management** | `smartCampusPortal` LWC Work Order action modal allowing quick transition between `In Progress`, `On Hold`, `Resolved`, and `Closed`. |
| **Mandatory Hold Justification** | Enforced by both LWC client-side validation and `Mandatory_Hold_Reason` validation rule / trigger (minimum 3 chars). |
| **Mandatory Resolution Notes** | Enforced by both LWC client-side validation and `Mandatory_Resolution_Notes` validation rule / trigger (minimum 10 chars). |
| **Closed-Loop CSAT Feedback** | Interactive 5-star rating widget in LWC. Submitting feedback creates `Complaint_Feedback__c` and automatically transitions Case to `Closed`. |
| **Administrator Command Center** | Real-time KPI summary cards (Total Requests, In Progress, Overdue Breaches, Average CSAT Rating), department charts, and feedback reviews feed. |

---

## 🗄 Data Model & Custom Objects

### 1. `Case` (Standard Object - Extended)
Holds all service requests and operational tickets.
- `Complaint_Category__c`: Lookup to `Complaint_Category__c`.
- `Department__c`: Lookup to `Department__c`.
- `Campus_Location__c`: Text(255) - e.g. "Main Campus".
- `Building__c`: Text(100) - e.g. "Engineering Block C".
- `Room__c`: Text(100) - e.g. "Lab 305".
- `Resolution_Notes__c`: Long Text Area(4000) - Mandatory prior to marking `Resolved`.
- `Hold_Reason__c`: Text(255) - Mandatory prior to marking `On Hold`.
- `SLA_Target_Time__c`: Date/Time - Auto-calculated SLA resolution deadline.
- `Is_Overdue__c`: Checkbox - Automated breach indicator.
- `Needs_Admin_Triage__c`: Checkbox - Flag for unmapped categories.

### 2. `Department__c` (Custom Object)
Represents university operational units.
- `Code__c`: Text(10) - e.g. `IT`, `ELEC`, `MAINT`.
- `Queue_Name__c`: Text(80) - DeveloperName of the associated Queue (e.g. `IT_Queue`).
- `Contact_Email__c`: Email - Notification contact address.
- `Is_Active__c`: Checkbox - Default checked.

### 3. `Complaint_Category__c` (Custom Object)
Defines service categories and default routing policies.
- `Code__c`: Text(20) - e.g. `WIFI`, `ELEC`, `LAB`.
- `Default_Department__c`: Lookup to `Department__c`.
- `SLA_Hours_High__c`: Number(5,0) - High urgency SLA target (e.g. 24h).
- `SLA_Hours_Medium__c`: Number(5,0) - Medium urgency SLA target (e.g. 72h).
- `SLA_Hours_Low__c`: Number(5,0) - Low urgency SLA target (e.g. 120h).
- `Is_Active__c`: Checkbox - Default checked.

### 4. `Complaint_Feedback__c` (Custom Object)
Records requester CSAT scores and testimonials upon resolution.
- `Case__c`: Master-Detail / Lookup to `Case`.
- `Rating__c`: Number(1,0) - 1 to 5 Stars.
- `Comments__c`: Long Text Area(2000).
- `Requester_Id__c`: Text(100) - Requester username or student ID.
- `Submitted_Date__c`: Date/Time - Timestamp of submission.

---

## ⚙️ Automated Business Logic & Triggers

### 1. `SmartCampusCaseTrigger`
- **Before Insert:**
  - Evaluates `Complaint_Category__c` and automatically resolves the responsible `Department__c`.
  - Calculates `SLA_Target_Time__c` based on priority and category SLA configuration.
  - Queries the target department queue and sets `Case.OwnerId = Queue.Id` with `Status = 'Assigned'`.
- **Before Update:**
  - **Resolution Guard:** Validates that `Resolution_Notes__c` is non-empty and contains at least 10 characters before allowing transition to `Resolved`.
  - **Hold Guard:** Validates that `Hold_Reason__c` is non-empty before allowing transition to `On Hold`.
  - **SLA Monitor:** Dynamically evaluates overdue tickets.

### 2. `SmartCampusFeedbackTrigger`
- **After Insert:**
  - When a student or faculty submits CSAT feedback on a resolved ticket, the trigger automatically transitions the parent `Case.Status` to `'Closed'`.

---

## ⏱ Service Level Agreement (SLA) Matrix

| Category | Mapped Department | Default Queue | High SLA | Medium SLA | Low SLA |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Internet / Wi-Fi** | IT Department | `IT_Queue` | **24 Hours** | 72 Hours | 120 Hours |
| **Lab Workstations** | IT Department | `IT_Queue` | **24 Hours** | 72 Hours | 120 Hours |
| **Electrical** | Electrical Department | `Electrical_Queue` | **24 Hours** | 72 Hours | 120 Hours |
| **Laboratory Equipment** | Laboratory Department | `Laboratory_Queue` | **24 Hours** | 72 Hours | 120 Hours |
| **Plumbing** | Maintenance Department | `Maintenance_Queue` | **24 Hours** | 72 Hours | 120 Hours |
| **Security** | Security Department | `Security_Queue` | **24 Hours** | 72 Hours | 120 Hours |
| **Classroom Equipment** | Maintenance Department | `Maintenance_Queue` | 24 Hours | **72 Hours** | 120 Hours |
| **Civil Infrastructure** | Maintenance Department | `Maintenance_Queue` | 24 Hours | **72 Hours** | 120 Hours |
| **Sanitation** | Housekeeping Department | `Housekeeping_Queue` | 24 Hours | **72 Hours** | 120 Hours |
| **General / Other** | Administration Review | `Admin_Review_Queue` | 24 Hours | 72 Hours | **120 Hours** |

---

## 📬 Department Queues

The platform includes 7 pre-configured Case Queues in Salesforce:
1. `IT_Queue` - IT Department Queue
2. `Electrical_Queue` - Electrical Department Queue
3. `Maintenance_Queue` - Maintenance Department Queue
4. `Laboratory_Queue` - Laboratory Department Queue
5. `Housekeeping_Queue` - Housekeeping Department Queue
6. `Security_Queue` - Security Department Queue
7. `Admin_Review_Queue` - Admin Review Queue (Fallback & Triage)

---

## 🛠 Automated Setup & Verification Script

The repository includes a zero-dependency Python script to audit, verify, and run Apex unit tests against the live Salesforce org at any time:

```bash
python scripts/setup_salesforce_cloud.py
```

### Verification Output:
```text
==================================================================
☁️ SMART CAMPUS - NATIVE SALESFORCE CLOUD SETUP & AUDIT
==================================================================
Connected to: https://orgfarm-bc1061b553-dev-ed.develop.my.salesforce.com

1. Apex Controllers & Tests:
   [PASS] SmartCampusController (Status: Active, IsValid: True)
   [PASS] SmartCampusTest (Status: Active, IsValid: True)

2. Apex Triggers:
   [PASS] SmartCampusCaseTrigger on Case (Status: Active, IsValid: True)
   [PASS] SmartCampusFeedbackTrigger on Complaint_Feedback__c (Status: Active, IsValid: True)

3. Lightning Web Component:
   [PASS] smartCampusPortal ('Smart Campus Portal') - Deployed & Exposed to Tabs/App Pages

4. Custom Tabs:
   [PASS] Smart Campus Operations (Smart_Campus_Portal)

5. Lightning Application:
   [PASS] Smart Campus Operations (Smart_Campus_Operations)

6. Department Queues (7 Configured):
   - Admin Review Queue (Admin_Review_Queue)
   - Electrical Department Queue (Electrical_Queue)
   - Housekeeping Department Queue (Housekeeping_Queue)
   - IT Department Queue (IT_Queue)
   - Laboratory Department Queue (Laboratory_Queue)
   - Maintenance Department Queue (Maintenance_Queue)
   - Security Department Queue (Security_Queue)

7. Active Master Data:
   - Campus Departments:   7 active records
   - Complaint Categories: 10 active records with SLA configuration

8. Executing Apex Automated Test Suite in Salesforce...
   - Tests Run:      2
   - Total Failures: 0
   - [PASS] testComplaintLifecycleAndController (853.0ms)
   - [PASS] testValidationErrors (100.0ms)

==================================================================
SUCCESS: Smart Campus Service Management System is 100% active on Salesforce Cloud!
==================================================================
```

---

## 📂 Repository Structure (SFDX)

```
Smart Campus/
├── .env                                       # Live Salesforce Connected App Credentials
├── .env.example                               # Template for credentials
├── .forceignore                               # SFDX deployment ignore rules
├── .gitignore                                 # Git ignore configuration
├── LICENSE                                    # MIT License
├── README.md                                  # Complete System Documentation
├── sfdx-project.json                          # Salesforce DX Project Configuration
├── force-app/                                 # Salesforce DX Source Directory
│   └── main/default/
│       ├── applications/
│       │   └── Smart_Campus_Operations.app-meta.xml
│       ├── classes/
│       │   ├── SmartCampusController.cls
│       │   ├── SmartCampusController.cls-meta.xml
│       │   ├── SmartCampusTest.cls
│       │   └── SmartCampusTest.cls-meta.xml
│       ├── lwc/
│       │   └── smartCampusPortal/
│       │       ├── smartCampusPortal.html
│       │       ├── smartCampusPortal.js
│       │       ├── smartCampusPortal.css
│       │       └── smartCampusPortal.js-meta.xml
│       ├── objects/
│       │   ├── Case/
│       │   │   ├── fields/                    # Custom fields (SLA, Location, Hold, Notes, etc.)
│       │   │   └── validationRules/           # Mandatory Resolution & Hold rules
│       │   ├── Department__c/
│       │   ├── Complaint_Category__c/
│       │   └── Complaint_Feedback__c/
│       ├── permissionsets/
│       │   ├── Smart_Campus_Admin_Permission_Set.permissionset-meta.xml
│       │   └── Smart_Campus_Staff_Permission_Set.permissionset-meta.xml
│       ├── queues/                            # 7 Department Queues
│       └── tabs/
│           ├── Smart_Campus_Portal.tab-meta.xml
│           ├── Department__c.tab-meta.xml
│           ├── Complaint_Category__c.tab-meta.xml
│           └── Complaint_Feedback__c.tab-meta.xml
└── scripts/
    └── setup_salesforce_cloud.py              # Standalone Setup & Audit Tool
```

---

## 📄 License

This project is open-source under the [MIT License](LICENSE).
