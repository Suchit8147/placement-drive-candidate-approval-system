# Final Implementation & Viva-Voce Master Report
## Placement Drive and Candidate Approval Management System
**Project Theme:** Conflict Resource Allocation  
**Academic Disciplines:** OSPP, DSA, Web Technology, Software Engineering, DBMS

---

## 1. Executive Summary & Verification Matrix

The Placement Drive and Candidate Approval Management System has been fully developed, tested, and integrated. All **five academic subject engines** have been implemented with **exactly two working implementations each** (10 total implementations), accompanied by working backend endpoints, MySQL 8.x database schemas, and interactive web demonstration interfaces.

| Engine | Implementation 1 | Implementation 2 | Backend Module / Controller | Primary API Route | Frontend Demonstration Page |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1. OSPP** | First-Come, First-Served (FCFS) Scheduling | Priority Scheduling (Arrival Time Aware) | `backend/engines/ospp/fcfsScheduler.js`<br>`backend/engines/ospp/priorityScheduler.js` | `POST /api/ospp/fcfs`<br>`POST /api/ospp/priority` | `pages/admin/ospp-fcfs.html`<br>`pages/admin/ospp-priority.html` |
| **2. DSA** | Interval Overlap Detection (`start2 < end1 && end2 > start1`) | Greedy Room Allocation (Min-Heap Interval Partitioning) | `backend/algorithms/intervalDetection.js`<br>`backend/algorithms/greedyRoomAllocation.js` | `POST /api/algorithms/check-conflict`<br>`POST /api/algorithms/allocate-rooms` | `pages/admin/interval-detection.html`<br>`pages/admin/greedy-allocation.html` |
| **3. Web Tech** | Client & Server Form Validation Layer | Role-Based Access Control (RBAC) & Middleware | `frontend/js/validation.js`<br>`backend/middleware/validationMiddleware.js`<br>`backend/middleware/roleMiddleware.js` | `POST /api/webtech/validate-demo`<br>`POST /api/webtech/simulate-rbac` | `pages/admin/web-form-validation.html`<br>`pages/admin/web-rbac.html` |
| **4. Software Eng** | Requirement Traceability Matrix (RTM) | Automated Test Case Execution & Results Tracking | `backend/engines/se/traceabilityData.js`<br>`backend/engines/se/testRunner.js` | `GET /api/se/traceability`<br>`POST /api/se/run-tests` | `pages/admin/se-traceability.html`<br>`pages/admin/se-testing-dashboard.html` |
| **5. DBMS** | ACID Transactions & Rollback Concurrency | MySQL Stored Procedures & Automated Triggers | `backend/controllers/dbmsController.js`<br>`backend/database/stored_procedure.sql`<br>`backend/database/trigger.sql` | `POST /api/dbms/transaction-demo`<br>`POST /api/dbms/execute-procedure` | `pages/admin/dbms-transaction.html`<br>`pages/admin/dbms-procedures.html` |

---

## 2. Subject Engine Implementations: Technical & Integration Deep-Dive

---

### Engine 1: OSPP (Operating Systems Principles & Practices)

#### Implementation 1: First-Come, First-Served (FCFS) Scheduling
* **Files Created:**
  * Backend Engine: `backend/engines/ospp/fcfsScheduler.js`
  * API Route: `backend/routes/osppRoutes.js` (`POST /api/ospp/fcfs`)
  * Frontend UI: `frontend/pages/admin/ospp-fcfs.html`
* **Mathematical Formulations:**
  * Completion Time: $CT_i = \max(CT_{i-1}, AT_i) + BT_i$
  * Turnaround Time: $TAT_i = CT_i - AT_i$
  * Waiting Time: $WT_i = TAT_i - BT_i$
  * Average Metrics: $\text{Avg WT} = \frac{1}{n}\sum WT_i$, $\text{Avg TAT} = \frac{1}{n}\sum TAT_i$
* **Demonstration Features:** Dynamic input table (add/remove processes), preset loader, real-time Gantt chart rendering with idle detection, process timings table, and execution logs.
* **Real Project Integration:** Dispatches student registration approvals and document verification requests in strict chronological arrival order, preventing process starvation.

#### Implementation 2: Priority Scheduling (Non-Preemptive with Arrival Times)
* **Files Created:**
  * Backend Engine: `backend/engines/ospp/priorityScheduler.js`
  * API Route: `backend/routes/osppRoutes.js` (`POST /api/ospp/priority`)
  * Frontend UI: `frontend/pages/admin/ospp-priority.html`
* **Priority Convention Adopted:**
  * *Smaller numeric value = Higher Priority* (Priority 1 > Priority 2 > Priority 3).
  * Mimics Unix nice-value mechanics and institutional company tiers (Super Dream > Dream > Regular).
* **Demonstration Features:** Arrival-time aware dispatcher, priority order tracker, Gantt chart, step-by-step priority selection trace, average waiting and turnaround metrics.
* **Real Project Integration:** Orders candidate interview queues by academic merit ($CGPA \times 10 + \text{TestScore}$) so premier tier recruiters evaluate top candidates first.

---

### Engine 2: DSA (Data Structures & Algorithms)

#### Implementation 1: Interval Overlap Detection
* **Files Created:**
  * Algorithm Module: `backend/algorithms/intervalDetection.js`
  * API Route: `backend/routes/algorithmRoutes.js` (`POST /api/algorithms/check-conflict`)
  * Frontend UI: `frontend/pages/admin/interval-detection.html`
* **Mathematical Condition:**
  $$\text{Overlap} \iff (\text{start}_2 < \text{end}_1) \land (\text{end}_2 > \text{start}_1)$$
  * Boundary Touch Rule: Touching only at boundary ($\text{end}_1 = \text{start}_2$) is **CLEAR / Non-Conflicting**.
* **Complexity:** Time: $O(n)$ linear scan of $n$ existing bookings | Auxiliary Space: $O(1)$.
* **Demonstration Features:** Room & panel selector, start/end datetime inputs, presets ("Overlap Conflict", "Boundary Touch", "Free Slot"), step-by-step condition evaluation log.
* **Real Project Integration:** Fired atomically before any interview booking insertion to block spatial and interviewer double-booking.

#### Implementation 2: Greedy Room Allocation (Interval Partitioning with Min-Heap)
* **Files Created:**
  * Algorithm Module: `backend/algorithms/greedyRoomAllocation.js`
  * API Route: `backend/routes/algorithmRoutes.js` (`POST /api/algorithms/allocate-rooms`)
  * Frontend UI: `frontend/pages/admin/greedy-allocation.html`
* **Algorithm Mechanism:**
  1. Sort all interview requests by start time ascending ($O(n \log n)$).
  2. Maintain a Min-Heap of active room free times.
  3. If $\text{Heap.peek().freeTime} \le \text{Interview.start}$: Reuse room, update free time, push back to heap.
  4. Else: Open a new room track, push into heap.
* **Complexity:** Time: $O(n \log n)$ | Space: $O(d)$ where $d$ is minimal rooms required.
* **Demonstration Features:** Input interview table, faculty 4-session preset (`10-11, 10-12, 11-12, 12-1` $\implies$ 2 rooms), step-by-step heap allocation trace, final room schedule visual cards.
* **Real Project Integration:** Empowers Admin to auto-schedule mass recruitment drives into minimal campus labs without spatial wastage.

---

### Engine 3: Web Technology

#### Implementation 1: Form Validation Engine
* **Files Created:**
  * Client Library: `frontend/js/validation.js` (`FormValidator` object)
  * Server Middleware: `backend/middleware/validationMiddleware.js`
  * Demo Endpoint: `POST /api/webtech/validate-demo`
  * Frontend UI: `frontend/pages/admin/web-form-validation.html`
* **Validation Rules:**
  * Name / Required fields: Non-empty trimmed string.
  * Institutional Email: Strict regex `^[^\s@]+@[^\s@]+\.[^\s@]+$`.
  * Password: Minimum 6 characters.
  * Numeric Fields: CGPA between $0.00$ and $10.00$; CTC $> 0$.
  * Temporal Bounds: $\text{End Time} > \text{Start Time}$.
* **Demonstration Features:** Tabbed form switcher (Student Registration, Interview Scheduling, Drive Creation), valid/invalid quick presets, dual client & server validation diagnostics.
* **Real Project Integration:** Client-side gives instant keystroke UX feedback; Express middleware prevents malicious API injection.

#### Implementation 2: Role-Based Access Control (RBAC) & Route Protection
* **Files Created:**
  * Auth Controller: `backend/controllers/authController.js`
  * JWT Auth Middleware: `backend/middleware/authMiddleware.js` (`authenticateToken`)
  * RBAC Middleware: `backend/middleware/roleMiddleware.js` (`authorizeRoles`)
  * Frontend UI: `frontend/pages/admin/web-rbac.html`
* **User Roles:** `Admin`, `Student`, `HR`, `Interviewer`.
* **Demonstration Features:** Role permission matrix, interactive identity simulator testing protected routes (e.g. Student calling Admin route $\to$ HTTP 403 Forbidden).
* **Real Project Integration:** Protects sensitive placement mutations (e.g., student cannot alter drive cutoffs or approve applications).

---

### Engine 4: Software Engineering

#### Implementation 1: Requirement Traceability Matrix (RTM)
* **Files Created:**
  * Data Source: `backend/engines/se/traceabilityData.js`
  * API Route: `GET /api/se/traceability`
  * Frontend UI: `frontend/pages/admin/se-traceability.html`
* **Contents:** 13 verified requirements (9 Functional, 4 Non-Functional) mapped to unique IDs (`REQ01` – `REQ13`), architectural modules, test cases (`TC01` – `TC13`), and implementation statuses.
* **Demonstration Features:** Filter by Functional / Non-Functional, live requirement counter, direct links to test dashboard.
* **Real Project Integration:** Provides verifiable engineering governance proving all faculty requirements are met with zero orphaned code.

#### Implementation 2: Automated Test Execution & Result Tracking Dashboard
* **Files Created:**
  * Test Runner: `backend/engines/se/testRunner.js`
  * API Route: `POST /api/se/run-tests`
  * Frontend UI: `frontend/pages/admin/se-testing-dashboard.html`
* **Executed Test Cases:**
  * `TC01`: Student registration form validation (Valid/Invalid inputs) $\to$ **PASS**
  * `TC02`: User authentication & role mapping $\to$ **PASS**
  * `TC03`: Placement drive application eligibility (CGPA cutoff) $\to$ **PASS**
  * `TC04`: HR candidate shortlisting & state transition $\to$ **PASS**
  * `TC05`: Interview scheduling time window bounds check $\to$ **PASS**
  * `TC06`: DSA interval overlap detection (Conflict case) $\to$ **PASS**
  * `TC07`: DSA boundary touch non-conflict case $\to$ **PASS**
  * `TC08`: DSA greedy room allocation (4-session test: 2 rooms) $\to$ **PASS**
  * `TC09`: OSPP First-Come, First-Served scheduling metrics $\to$ **PASS**
  * `TC10`: OSPP Priority scheduling with arrival times $\to$ **PASS**
  * `TC11`: DBMS ACID transaction rollback on conflict $\to$ **PASS**
  * `TC12`: Role-based access control middleware security $\to$ **PASS**
* **Metrics:** **12/12 Passed (100.0%)**, Execution Time: **2 ms**. No mock or randomized results.

---

### Engine 5: DBMS

#### Implementation 1: ACID Transactions & Concurrency Rollback
* **Files Created:**
  * Controller: `backend/controllers/dbmsController.js` (`simulateConcurrentTransaction`)
  * API Route: `POST /api/dbms/transaction-demo`
  * Frontend UI: `frontend/pages/admin/dbms-transaction.html`
* **Mechanism:**
  * Transaction 1: `START TRANSACTION` $\to$ `SELECT ... FOR UPDATE` $\to$ `INSERT` $\to$ `COMMIT`.
  * Transaction 2: `START TRANSACTION` $\to$ `SELECT ... FOR UPDATE` $\to$ Conflict Detected $\to$ `ROLLBACK`.
* **Demonstration Features:** Slot configuration for two simultaneous bookings, step-by-step SQL trace log, database consistency status.
* **Real Project Integration:** Guarantees database consistency under concurrent room reservation requests.

#### Implementation 2: MySQL Stored Procedures & Automated Triggers
* **Files Created:**
  * Stored Procedure DDL: `backend/database/stored_procedure.sql` (`sp_update_application_status`)
  * Trigger DDL: `backend/database/trigger.sql` (`trg_application_status_notification`)
  * Schema & Seed DDL: `backend/database/database_schema.sql`, `backend/database/seed_data.sql`
  * API Route: `POST /api/dbms/execute-procedure`
  * Frontend UI: `frontend/pages/admin/dbms-procedures.html`
* **Mechanism:**
  * Executing `sp_update_application_status` mutates the record in `Applications`.
  * MySQL engine automatically fires `AFTER UPDATE` trigger `trg_application_status_notification` which creates a row in `Notifications`.
* **Demonstration Features:** Application selector, new status dropdown, execution output showing procedure response, mutated application record, and trigger-generated notification.

---

## 3. Comprehensive Viva-Voce Questions & Answers (All 10 Implementations)

### Q1 (OSPP - FCFS): What is the mathematical relationship between Turnaround Time and Waiting Time?
**Answer:**
Turnaround Time ($TAT$) is the total time elapsed from process arrival to process completion:
$$TAT = CT - AT$$
Waiting Time ($WT$) is the total time the process spent waiting in the ready queue without CPU allocation:
$$WT = TAT - BT$$
In FCFS, processes with long burst times arriving first cause the *Convoy Effect*, increasing the average waiting time for shorter subsequent processes.

---

### Q2 (OSPP - Priority): How does your Priority Scheduler handle arrival times and tie-breakers?
**Answer:**
Our priority scheduler is arrival-time aware. At any time $t$, it scans only uncompleted processes whose $AT \le t$. Among ready processes, it selects the one with the highest priority (lowest numeric priority value under our convention). If no process has arrived, the resource enters an `IDLE` state until the earliest arrival time. If two arrived processes share the same priority, arrival time is used as the primary tie-breaker, followed by alphabetical process ID.

---

### Q3 (DSA - Interval Overlap): Why is the overlap condition $\text{start}_2 < \text{end}_1 \land \text{end}_2 > \text{start}_1$ correct, and how does it handle boundary touches?
**Answer:**
Two intervals $[S_1, E_1)$ and $[S_2, E_2)$ do not overlap if either interval 1 finishes before or when interval 2 starts ($E_1 \le S_2$) OR interval 2 finishes before or when interval 1 starts ($E_2 \le S_1$).  
Applying De Morgan's laws to negate non-overlap yields the overlap condition:
$$\neg(E_1 \le S_2 \lor E_2 \le S_1) \iff (S_2 < E_1 \land S_1 < E_2)$$
If an interview finishes at 11:00 AM ($E_1 = 11:00$) and the next starts at 11:00 AM ($S_2 = 11:00$), the condition $S_2 < E_1$ evaluates to $11:00 < 11:00$ (False). Thus, boundary touches are correctly evaluated as non-conflicting.

---

### Q4 (DSA - Greedy Room Allocation): Why is Greedy Interval Partitioning with a Min-Heap optimal?
**Answer:**
By sorting intervals by start time and maintaining a Min-Heap of room completion times, we always assign an incoming interview to the room that becomes free earliest. If even the earliest-freed room is busy at time $S_i$, it proves that all currently opened rooms are occupied simultaneously. Hence, opening a new room is mathematically unavoidable. The number of rooms allocated equals the *maximum depth of overlapping intervals*, which is the theoretical minimum number of rooms needed.

---

### Q5 (Web Tech - Form Validation): Why must validation exist on both the frontend and backend?
**Answer:**
Client-side JavaScript validation improves User Experience (UX) by providing instant, real-time error indicators (e.g. invalid email format or inverted time bounds) before network dispatch. However, client-side validation can be bypassed by tools like Postman, curl, or browser developer tools. Therefore, backend Express middleware (`validationMiddleware.js`) strictly re-validates all payloads to protect database integrity and security.

---

### Q6 (Web Tech - RBAC): How does your system prevent unauthorized privilege escalation?
**Answer:**
Our system uses JSON Web Tokens (JWT) containing cryptographically signed user IDs and roles. When an endpoint is called, `authMiddleware.js` verifies the token signature against `JWT_SECRET`. Then, `roleMiddleware.js` (`authorizeRoles`) inspects the user's role against allowed roles for that route. If a `student` token attempts an administrative action, the middleware immediately halts execution and returns `HTTP 403 Forbidden`.

---

### Q7 (Software Eng - Traceability): What is the purpose of a Requirement Traceability Matrix (RTM)?
**Answer:**
An RTM establishes bidirectional traceability between customer requirements, architectural modules, and test cases. It guarantees:
1. *Forward Traceability:* Every requirement (e.g. `REQ06 - Conflict Detection`) has a corresponding implementation module (`DSA Conflict Engine`) and test case (`TC06`).
2. *Backward Traceability:* Prevents "gold plating" by ensuring no code exists without an originating requirement.

---

### Q8 (Software Eng - Testing): What is the difference between test verification and validation?
**Answer:**
*Verification* ("Are we building the system right?") ensures that software modules satisfy specific conditions (demonstrated by our 12 unit test assertions comparing Expected vs Actual values in `testRunner.js`).  
*Validation* ("Are we building the right system?") ensures that the system meets user recruitment goals (demonstrated by the end-to-end placement workflow where students apply, HR approves, and rooms are allocated without conflict).

---

### Q9 (DBMS - Transactions): How does `SELECT ... FOR UPDATE` prevent race conditions in room allocation?
**Answer:**
In standard MySQL execution, two concurrent transactions can simultaneously execute `SELECT` and see Room 101 as available. `SELECT ... FOR UPDATE` acquires an exclusive pessimistic row lock (X-lock) on the queried rows under `REPEATABLE READ` or `SERIALIZABLE` isolation. The second transaction must wait until the first transaction executes `COMMIT` or `ROLLBACK`. When the second transaction gains access, it detects the newly committed booking and immediately triggers a `ROLLBACK`, preventing double-booking.

---

### Q10 (DBMS - Triggers & Stored Procedures): Why use database triggers instead of application-level notification code?
**Answer:**
Database triggers guarantee *Data Integrity and Non-Bypassability*. If application status is updated via an Express API, a direct phpMyAdmin SQL query, or a batch cron script, the `AFTER UPDATE` trigger `trg_application_status_notification` fires unconditionally inside the database engine. This encapsulates business rules within the DBMS layer and ensures notification consistency across all database access channels.
