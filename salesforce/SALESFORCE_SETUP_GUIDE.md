# ☁️ Salesforce Service Cloud Configuration & Deployment Guide
## Smart Campus Service Management System (PRD v2.1)

This guide documents the exact configuration steps for a Salesforce Administrator to set up **Salesforce Service Cloud** as the primary Case management platform and system of record for the Smart Campus Service Management System.

---

## 📑 Table of Contents

1. [Prerequisites & Edition Support](#1-prerequisites--edition-support)
2. [Case Status Picklist Configuration](#2-case-status-picklist-configuration)
3. [Custom Objects Specification](#3-custom-objects-specification)
4. [Custom Fields on Case](#4-custom-fields-on-case)
5. [Department Queues Setup](#5-department-queues-setup)
6. [Case Assignment Rules & Flow Automation](#6-case-assignment-rules--flow-automation)
7. [Validation Rules](#7-validation-rules)
8. [OAuth 2.0 Connected App Configuration](#8-oauth-20-connected-app-configuration)
9. [Permission Sets & Field-Level Security (FLS)](#9-permission-sets--field-level-security-fls)
10. [Reports & Service Console Setup](#10-reports--service-console-setup)

---

## 1. Prerequisites & Edition Support

* **Supported Salesforce Editions:** Developer Edition (Free for testing/academic demonstration), Enterprise Edition, or Unlimited Edition.
* **Required Features:** Service Cloud Case Management, Queues, Record-Triggered Flows, Connected Apps / External Client Apps.
* **Optional Features:** Experience Cloud (for student/faculty self-service portal, if licensed).

---

## 2. Case Status Picklist Configuration

In **Setup → Object Manager → Case → Fields & Relationships → Status**:
Ensure the following picklist values are active with corresponding Case categories:

| Status Label | API Name | Category | Description |
| :--- | :--- | :--- | :--- |
| **New** | `New` | Open | Initial state upon submission before triage |
| **Assigned** | `Assigned` | Open | Routed to responsible department queue |
| **In Progress** | `In_Progress` | Open | Technician actively working on issue |
| **On Hold** | `On_Hold` | Open | Pending parts, vendor support, or student info |
| **Resolved** | `Resolved` | Closed | Work complete; mandatory resolution notes saved |
| **Closed** | `Closed` | Closed | Student submitted CSAT feedback; ticket archived |
| **Rejected** | `Rejected` | Closed | Invalid or duplicate request (Admin/Staff only) |

---

## 3. Custom Objects Specification

Create the following custom objects in **Setup → Object Manager → Create → Custom Object**:

### 3.1 `Department__c`
* **Label:** Campus Department
* **Plural Label:** Campus Departments
* **Object Name:** `Department` (API Name: `Department__c`)
* **Record Name:** Text (`Department Name`)

**Custom Fields:**
| Field Label | Field Name | Data Type | Properties |
| :--- | :--- | :--- | :--- |
| Department Code | `Code__c` | Text(10) | Unique, Required |
| Queue Developer Name | `Queue_Name__c` | Text(80) | Required (e.g. `IT_Queue`) |
| Contact Email | `Contact_Email__c` | Email | Required |
| Active Flag | `Is_Active__c` | Checkbox | Default: `Checked` |

---

### 3.2 `Complaint_Category__c`
* **Label:** Complaint Category
* **Plural Label:** Complaint Categories
* **Object Name:** `Complaint_Category` (API Name: `Complaint_Category__c`)
* **Record Name:** Text (`Category Name`)

**Custom Fields:**
| Field Label | Field Name | Data Type | Properties |
| :--- | :--- | :--- | :--- |
| Category Code | `Code__c` | Text(20) | Unique |
| Default Department | `Default_Department__c` | Lookup (`Department__c`) | Required |
| SLA Hours (High) | `SLA_Hours_High__c` | Number(5,0) | Default: `24` |
| SLA Hours (Medium) | `SLA_Hours_Medium__c` | Number(5,0) | Default: `72` |
| SLA Hours (Low) | `SLA_Hours_Low__c` | Number(5,0) | Default: `120` |
| Active Flag | `Is_Active__c` | Checkbox | Default: `Checked` |

---

### 3.3 `Complaint_Feedback__c`
* **Label:** Complaint Feedback
* **Plural Label:** Complaint Feedback
* **Object Name:** `Complaint_Feedback` (API Name: `Complaint_Feedback__c`)
* **Record Name:** Auto Number (`FB-{YYYY}-{00000}`)

**Custom Fields:**
| Field Label | Field Name | Data Type | Properties |
| :--- | :--- | :--- | :--- |
| Case Reference | `Case__c` | Master-Detail (`Case`) | Required, Cascade Delete |
| CSAT Rating | `Rating__c` | Number(1,0) | Required (1 to 5) |
| Feedback Comments | `Comments__c` | Long Text Area(2000) | Optional |
| Requester Identifier | `Requester_Id__c` | Text(100) | Indexed |
| Submission Date | `Submitted_Date__c` | Date/Time | Default: `NOW()` |

---

## 4. Custom Fields on Case

In **Setup → Object Manager → Case → Fields & Relationships**, add:

| Field Label | Field Name | Data Type | Properties |
| :--- | :--- | :--- | :--- |
| Complaint Category | `Complaint_Category__c` | Lookup (`Complaint_Category__c`) | Optional |
| Campus Location | `Campus_Location__c` | Text(255) | Optional (e.g. `Main Campus`) |
| Building / Block | `Building__c` | Text(100) | Optional |
| Room / Lab Number | `Room__c` | Text(100) | Optional |
| Resolution Notes | `Resolution_Notes__c` | Long Text Area(4000) | Mandatory prior to Resolved |
| Hold Reason | `Hold_Reason__c` | Text(255) | Mandatory prior to On Hold |
| Department | `Department__c` | Lookup (`Department__c`) | Optional |
| SLA Target Deadline | `SLA_Target_Time__c` | Date/Time | Auto-calculated |
| Overdue Flag | `Is_Overdue__c` | Checkbox | Default: `Unchecked` |
| Admin Triage Needed | `Needs_Admin_Triage__c`| Checkbox | Default: `Unchecked` |

---

## 5. Department Queues Setup

In **Setup → Queues → New**, create the department work queues:

| Queue Label | Queue Name (API) | Supported Objects | Default Assigned Department |
| :--- | :--- | :--- | :--- |
| **IT Department Queue** | `IT_Queue` | `Case` | IT Department |
| **Maintenance Department Queue** | `Maintenance_Queue` | `Case` | Maintenance Department |
| **Electrical Department Queue** | `Electrical_Queue` | `Case` | Electrical Department |
| **Laboratory Department Queue** | `Laboratory_Queue` | `Case` | Laboratory Department |
| **Housekeeping Department Queue**| `Housekeeping_Queue` | `Case` | Housekeeping Department |
| **Security Department Queue** | `Security_Queue` | `Case` | Security Department |
| **Admin Review Queue** | `Admin_Review_Queue` | `Case` | Administration (Fallback) |

---

## 6. Case Assignment Rules & Flow Automation

### 6.1 Record-Triggered Flow: `Smart_Campus_New_Case_Routing`
* **Trigger:** Record is created (`Case`)
* **Condition:** None (run for all campus portal cases)
* **Actions:**
  1. **Get Category Record:** Fetch `Complaint_Category__c` matching `Case.Complaint_Category__c`.
  2. **Decision: Has Active Mapped Department?**
     - **Yes:** Set `Case.OwnerId = Queue(DeveloperName == Department.Queue_Name__c)`, `Case.Status = 'Assigned'`, `Case.Department__c = Department.Id`.
     - **No (Unmapped/Inactive):** Set `Case.OwnerId = Queue('Admin_Review_Queue')`, `Case.Status = 'New'`, `Case.Needs_Admin_Triage__c = true`.
  3. **Calculate SLA Target Time:** Add `SLA_Hours__c` from Category to `CreatedDate` and write to `Case.SLA_Target_Time__c`.

---

## 7. Validation Rules

In **Setup → Object Manager → Case → Validation Rules**:

### 7.1 Mandatory Resolution Notes (`VR_Case_Require_Resolution_Notes`)
* **Error Condition Formula:**
  ```text
  AND(
      ISPICKVAL(Status, "Resolved"),
      OR(
          ISBLANK(Resolution_Notes__c),
          LEN(TRIM(Resolution_Notes__c)) < 5
      )
  )
  ```
* **Error Message:** `Technical resolution notes (minimum 5 characters) are mandatory before marking this Case as Resolved.`
* **Error Location:** Field: `Resolution_Notes__c`

### 7.2 Mandatory Hold Reason (`VR_Case_Require_Hold_Reason`)
* **Error Condition Formula:**
  ```text
  AND(
      ISPICKVAL(Status, "On Hold"),
      OR(
          ISBLANK(Hold_Reason__c),
          LEN(TRIM(Hold_Reason__c)) < 3
      )
  )
  ```
* **Error Message:** `A valid justification is required when placing this Case on hold.`
* **Error Location:** Field: `Hold_Reason__c`

---

## 8. OAuth 2.0 Connected App Configuration

To allow the FastAPI backend to securely query and mutate Cases:

1. In **Setup → App Manager → New Connected App** (or External Client App):
   - **Connected App Name:** `Smart Campus Integration Gateway`
   - **API Name:** `Smart_Campus_Integration_Gateway`
   - **Contact Email:** `admin@smartcampus.edu`
   - **Enable OAuth Settings:** Checked
   - **Callback URL:** `http://localhost:8000/api/auth/salesforce/callback`
   - **Selected OAuth Scopes:**
     - `Manage user data via APIs (api)`
     - `Perform requests on your behalf at any time (refresh_token, offline_access)`
2. Click **Save** and wait 2–10 minutes for activation.
3. In **Manage Connected Apps → Edit Policies**:
   - **IP Relaxation:** Set to `Relax IP restrictions` (or enforce whitelist).
   - **Permitted Users:** Set to `All users may self-authorize` or `Admin approved users`.
4. Copy the credentials into [`backend/.env`](../backend/.env):
   ```env
   SALESFORCE_ENABLED=true
   SALESFORCE_MOCK_MODE=false
   SALESFORCE_LOGIN_URL="https://login.salesforce.com"
   SALESFORCE_INSTANCE_URL="https://your-domain.my.salesforce.com"
   SALESFORCE_CLIENT_ID="<your_consumer_key>"
   SALESFORCE_CLIENT_SECRET="<your_consumer_secret>"
   SALESFORCE_USERNAME="integration_user@smartcampus.edu"
   SALESFORCE_PASSWORD="<user_password>"
   SALESFORCE_SECURITY_TOKEN="<security_token>"
   ```

---

## 9. Permission Sets & Field-Level Security (FLS)

1. **`Smart_Campus_Staff_Permission_Set`**:
   - Object Permissions: Read/Create/Edit on `Case`, `Complaint_Feedback__c`, `Department__c`, `Complaint_Category__c`.
   - Field Permissions: Edit on `Resolution_Notes__c`, `Hold_Reason__c`, `Status`.
2. **`Smart_Campus_Admin_Permission_Set`**:
   - Full CRUD on all campus custom objects and Case overrides.

---

## 10. Reports & Service Console Setup

1. In **App Launcher → Service Console**:
   - Add **Cases** tab with list views for each Queue (`IT Queue Cases`, `Maintenance Queue Cases`, etc.).
   - Configure the Case Lightning Record Page with the Highlights Panel, Path component (`Status`), and Related Lists (`Case History`, `Complaint Feedback`, `Files`).
2. In **Reports Tab**:
   - Create report: `Campus Complaints by Department & SLA Status`.
   - Create report: `CSAT Feedback Ratings Summary`.

