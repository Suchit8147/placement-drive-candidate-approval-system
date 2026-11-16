# Placement Drive and Candidate Approval Management System
> **Project Theme:** Conflict Resource Allocation  
> **Target Audience:** College Placement Cell, Recruiters, Interviewers, and Candidates  
> **Academic Disciplines:** OSPP, DSA, Web Technology, Software Engineering, DBMS

---

## 1. Project Overview

The **Placement Drive and Candidate Approval Management System** is a full-stack web application designed to orchestrate collegiate placement seasons with strict **Conflict Resource Allocation**. 

During peak placement drives, multiple multinational corporations conduct concurrent recruitment processes. This causes severe contention for shared, non-sharable institutional resources:
* **Rooms:** Interview cabins, group discussion rooms, online testing computer labs.
* **Personnel:** Interviewers, technical panelists, company HRs, faculty invigilators/moderators.
* **Time Windows:** Finite contiguous operating hours.
* **Candidates:** Preventing candidates from being double-booked across simultaneous corporate panels.

This project implements an end-to-end web system enforcing zero-conflict guarantees, race-condition immunity, and optimal room scheduling, while fulfilling **five distinct academic engines** and featuring a dedicated **DSA Algorithm Demonstration Lab**.

---

## 2. Technology Stack

* **Frontend:** HTML5, CSS3, Modern JavaScript (Vanilla ES6+). *No React, Vue, Angular, or other heavy frontend libraries.*
* **Backend:** Node.js & Express.js (Modular RESTful Architecture).
* **Database:** MySQL 8.x (Hosted on XAMPP / phpMyAdmin), utilizing 3NF/BCNF normalization, foreign key constraints, ACID transactions, stored procedures, triggers, views, and composite B-tree indexes.
* **Communication:** REST APIs with standardized JSON payloads and HTTP status codes.

---

## 3. Four User Roles & Core Capabilities

```
+-------------------------------------------------------------------------------------------------+
|                                        SYSTEM USERS                                             |
+--------------------------------+--------------------------------+-------------------------------+
|  1. ADMIN                      |  2. STUDENT                    |  3. HR / COMPANY              |
|  • Manage Students & Companies |  • Register & Manage Profile   |  • View Company Drives        |
|  • Create Placement Drives     |  • View Eligible Drives (CGPA) |  • Review Applications        |
|  • Configure Rounds & Venues   |  • Apply for Placement Drives  |  • Shortlist / Reject Rounds  |
|  • Allocate Rooms & Panels     |  • Live Interview Timetable    |  • Track Drive Progress       |
|  • Monitor Conflicts & Logs    |  • Instant Notifications       |  • Download Selected Lists    |
+--------------------------------+--------------------------------+-------------------------------+
|  4. INTERVIEWER                                                                                 |
|  • View Assigned Schedules, Venues & Candidate Profiles                                        |
|  • Technical / HR Evaluation Rubrics & Real-time Score Entry                                    |
|  • Submit Decision (Recommended / Not Recommended / On-Hold)                                    |
+-------------------------------------------------------------------------------------------------+
```

---

## 4. Five Academic Engine Requirements

### Engine 1: OSPP (Operating Systems Principles & Practices)
* **Mutual Exclusion & Locks:** In-memory asynchronous mutexes and MySQL row-level locking (`SELECT ... FOR UPDATE`) prevent parallel race conditions when booking venues or interviewers.
* **Deadlock Avoidance via Strict Total Ordering (Havender's Principle):** Resources are locked in an invariant global hierarchy ($\text{Room} \prec \text{Interviewer} \prec \text{Candidate}$ and ascending primary keys), mathematically eliminating the Circular Wait condition.
* **Banker's Algorithm:** Verifies system safety before committing bulk resource reservations.
* **CPU Scheduling Analogues:** FCFS queues for student document verification; Priority Scheduling based on $[(\text{CGPA} \times 10) + \text{TestScore}]$ for interview dispatching.
* **Producer-Consumer Notification Queue:** Bounded buffer queue decoupling transactional database triggers from background notification workers using counting semaphores.

### Engine 2: DSA (Data Structures & Algorithms)
* **Hashing ($O(1)$):** Fast lookup for room/slot availability tables and interviewer calendars with separate chaining.
* **Binary Search ($O(\log N)$):** Rapid candidate qualification filtering by CGPA cutoffs and non-overlapping time boundary searching.
* **Merge Sort ($O(N \log N)$):** Multi-tier stable sorting of candidate merit lists and interval sorting by start times.
* **Min-Heap / Priority Queue:** Priority candidate dispatch and optimal tracking of earliest room free times in $O(\log K)$ time.
* **Interval Overlap Detection:** Algebraic conflict validation: $\max(S_1, S_2) < \min(E_1, E_2)$.
* **Greedy Room Allocation (Interval Partitioning):** Minimizes total physical rooms required to hold $N$ concurrent interviews ($O(N \log N)$ optimal via Min-Heap).
* **Alternative Time-Slot Suggestion:** Gap-detection engine computing nearest non-conflicting time slots when a conflict is encountered.

### Engine 3: Web Technology
* Vanilla HTML5, CSS3 (variables, Flexbox, CSS Grid, responsive design).
* Modular Vanilla JavaScript with reusable fetch API wrappers and route management.
* Client-side & server-side form validation with real-time feedback.
* Role-based access control (RBAC) with JWT authentication.

### Engine 4: Software Engineering
* Three-tier modular architecture (Routes $\to$ Controllers $\to$ Engines $\to$ Models $\to$ Database).
* SRS specification, UML Use Case, Class, Sequence, and Component diagrams.
* Design patterns: Service-Repository, Factory Pattern, Strategy Pattern.

### Engine 5: DBMS
* MySQL 8.x schema in strict 3NF/BCNF.
* Referential integrity with foreign keys and check constraints.
* ACID transactions with explicit `START TRANSACTION`, `COMMIT`, `ROLLBACK`.
* Stored procedures (`sp_check_and_schedule_interview`), Triggers, Views, and Composite B-Tree Indexes.

---

## 5. DSA Algorithm Demonstration Lab

A dedicated laboratory page (`frontend/pages/lab/dsa-lab.html`) provides interactive visual step-throughs of:
1. **Hashing:** Separate chaining, collision handling, polynomial rolling hash visualization.
2. **Binary Search:** `Low`, `Mid`, `High` pointers with search-space reduction animation.
3. **Merge Sort:** Divide-and-conquer tree splitting and sorted merge phases.
4. **Min-Heap / Priority Queue:** Tree and linear array representations with heapify animations.
5. **Interval Overlap Detection:** Dynamic timeline with algebraic conflict intersection highlights.
6. **Greedy Room Allocation:** Multi-track timeline illustrating optimal interval partitioning into minimal rooms.

Each demonstration features interactive inputs, execution controls (`Run`, `Step Next`, `Reset`), real-time execution telemetry, and a Theoretical Complexity Card ($O(N \log N)$, etc.).

---

## 6. Project Folder Structure

```
PlacementManagementSystem/
├── backend/
│   ├── config/
│   │   ├── db.js                        # MySQL connection pool configuration
│   │   └── constants.js                 # Global constants & enums
│   ├── controllers/
│   │   ├── authController.js            # Authentication & JWT issuance
│   │   ├── studentController.js         # Student profile & applications
│   │   ├── companyController.js         # Company & HR profile management
│   │   ├── driveController.js           # Placement drives & round setup
│   │   ├── scheduleController.js        # Conflict-free allocation logic
│   │   ├── interviewerController.js     # Interviewer scoring & feedback
│   │   ├── algorithmController.js       # Endpoints powering DSA Lab
│   │   └── reportController.js          # Analytics & placement reports
│   ├── engines/
│   │   ├── ospp/
│   │   │   ├── mutexLock.js             # In-memory keyed resource mutexes
│   │   │   ├── deadlockDetector.js      # Havender ordering & Banker's check
│   │   │   ├── fcfsQueue.js             # FCFS registration queue
│   │   │   ├── priorityScheduler.js     # CGPA/score priority scheduler
│   │   │   └── producerConsumerQueue.js # Bounded-buffer notification queue
│   │   └── dsa/
│   │       ├── hashTable.js             # Chaining hash table
│   │       ├── binarySearch.js          # Cutoff & slot binary search
│   │       ├── mergeSort.js             # Stable interval/candidate sort
│   │       ├── minHeap.js               # Priority queue & room heap
│   │       ├── intervalOverlap.js       # Overlap verification engine
│   │       └── greedyRoomAllocator.js   # Interval partitioning optimizer
│   ├── middleware/
│   │   ├── authMiddleware.js            # JWT verification
│   │   ├── roleMiddleware.js            # Role-based authorization
│   │   ├── validationMiddleware.js      # Request schema sanitization
│   │   └── errorMiddleware.js           # Centralized error handler
│   ├── models/
│   │   ├── User.js
│   │   ├── Student.js
│   │   ├── Company.js
│   │   ├── PlacementDrive.js
│   │   ├── Application.js
│   │   ├── Schedule.js
│   │   ├── Room.js
│   │   ├── Interviewer.js
│   │   └── Notification.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── studentRoutes.js
│   │   ├── hrRoutes.js
│   │   ├── interviewerRoutes.js
│   │   ├── adminRoutes.js
│   │   ├── scheduleRoutes.js
│   │   └── algorithmRoutes.js
│   ├── database/
│   │   ├── schema.sql                   # Complete 3NF/BCNF DDL script
│   │   ├── triggers_procedures.sql      # Triggers and stored procedures
│   │   └── seed_data.sql                # Initial test dataset
│   ├── utils/
│   │   ├── logger.js                    # Execution & audit logger
│   │   └── responseFormatter.js         # Unified REST API response helper
│   ├── app.js                           # Express application setup
│   └── server.js                        # HTTP Server bootstrap
├── frontend/
│   ├── assets/
│   │   ├── images/                      # System diagrams and logos
│   │   └── icons/                       # SVG iconography
│   ├── css/
│   │   ├── style.css                    # Global typography & layout
│   │   ├── auth.css                     # Login & registration styling
│   │   ├── dashboard.css                # Role dashboard layouts
│   │   ├── table.css                    # Timetable & grid components
│   │   ├── modal.css                    # Dialogs & notifications
│   │   ├── conflict.css                 # Conflict visualizer styling
│   │   └── dsa-lab.css                  # DSA Lab animations & controls
│   ├── js/
│   │   ├── api.js                       # Centralized fetch client wrapper
│   │   ├── auth.js                      # Client authentication & token storage
│   │   ├── router.js                    # Client-side route guard
│   │   ├── utils.js                     # Date, time, format helpers
│   │   ├── conflictVisualizer.js        # Timeline intersection visualizer
│   │   ├── dsaLab.js                    # DSA Lab animation controller
│   │   └── roles/
│   │       ├── admin.js                 # Admin panel event handlers
│   │       ├── student.js               # Student portal event handlers
│   │       ├── hr.js                    # HR shortlisting handlers
│   │       └── interviewer.js           # Interviewer evaluation handlers
│   ├── pages/
│   │   ├── auth/
│   │   │   ├── login.html               # Multi-role authentication page
│   │   │   └── register.html            # Student & HR registration page
│   │   ├── admin/
│   │   │   ├── dashboard.html           # Admin master console
│   │   │   ├── drives.html              # Drive & round management
│   │   │   ├── scheduler.html           # Conflict-free schedule creator
│   │   │   ├── room-allocation.html     # Room provisioning & inventory
│   │   │   ├── conflicts.html           # Live conflict matrix & alerts
│   │   │   └── reports.html             # Analytics & placement reports
│   │   ├── student/
│   │   │   ├── dashboard.html           # Student overview & stats
│   │   │   ├── profile.html             # Profile, resume, and CGPA
│   │   │   ├── drives.html              # Active drives & eligibility
│   │   │   ├── applications.html        # Application status tracker
│   │   │   └── interview-schedule.html  # Personal interview timetable
│   │   ├── hr/
│   │   │   ├── dashboard.html           # Corporate drive dashboard
│   │   │   ├── candidates.html          # Candidate screening & resume view
│   │   │   ├── shortlisting.html        # Round-wise promote/reject actions
│   │   │   └── drive-status.html        # Interview round progression
│   │   ├── interviewer/
│   │   │   ├── dashboard.html           # Interviewer overview
│   │   │   ├── assigned-interviews.html # Daily timetable & venues
│   │   │   └── evaluation.html          # Candidate evaluation form
│   │   └── lab/
│   │       └── dsa-lab.html             # DSA Algorithm Demonstration Lab
│   └── index.html                       # System landing & portal portal
├── docs/
│   ├── ARCHITECTURE.md                  # Comprehensive architectural blueprint
│   ├── DATABASE_SCHEMA.sql              # Database schema reference
│   ├── OSPP_CONCURRENCY_MODEL.md        # Concurrency & deadlock proof
│   └── DSA_LAB_SPECIFICATION.md         # Detailed DSA lab specifications
├── package.json                         # Node.js project manifest
└── README.md                            # Main project overview
```

---

## 7. Setup & Installation Guide

### Prerequisites
1. **Node.js** (v18.x or later)
2. **XAMPP** (with Apache and MySQL 8.x enabled)

### Step 1: Database Initialization
1. Start **Apache** and **MySQL** from the XAMPP Control Panel.
2. Open your browser and navigate to `http://localhost/phpmyadmin/`.
3. Open the **SQL** tab and run the script located at:
   ```
   PlacementManagementSystem/backend/database/schema.sql
   ```
   *This creates the `placement_management_system` database with all tables, constraints, foreign keys, triggers, stored procedures, and views.*

### Step 2: Backend Setup
1. Open your terminal in the project directory:
   ```bash
   cd PlacementManagementSystem
   npm install
   ```
2. Configure environment variables in `backend/.env` (DB credentials, port `5000`, JWT secret).
3. Start the backend server:
   ```bash
   npm run dev
   ```
   *Server will listen at `http://localhost:5000`.*

### Step 3: Frontend Launch
1. Since the frontend is written in pure HTML5, CSS3, and JavaScript, open `frontend/index.html` in any modern web browser or serve it via a static web server:
   ```bash
   npx serve frontend -p 3000
   ```
2. Access the **DSA Algorithm Demonstration Lab** directly at `frontend/pages/lab/dsa-lab.html`.

---

## 8. Documentation References
- [Architecture Blueprint](docs/ARCHITECTURE.md)
- [OSPP Concurrency & Deadlock Model](docs/OSPP_CONCURRENCY_MODEL.md)
- [DSA Demonstration Lab Specification](docs/DSA_LAB_SPECIFICATION.md)
- [Database Schema (SQL)](docs/DATABASE_SCHEMA.sql)
