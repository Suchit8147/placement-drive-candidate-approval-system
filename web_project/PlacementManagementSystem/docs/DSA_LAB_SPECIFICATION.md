# DSA Algorithm Demonstration Lab Specification
## Interactive Academic Visualization Engine
**Page Route:** `frontend/pages/lab/dsa-lab.html`  
**API Prefix:** `/api/algorithms/`  
**Disciplines:** Data Structures and Algorithms, Human-Computer Interaction, Web Technology

---

## 1. Faculty Requirement & Architecture Overview

The academic faculty requires a dedicated, interactive laboratory page where students, evaluators, and faculty can run, visualize, and inspect the real-time execution of the core algorithms powering the Placement Drive and Conflict Resource Allocation System.

### Dual-Mode Execution Architecture
```mermaid
graph TD
    UI["Frontend DSA Lab UI (dsa-lab.html & dsaLab.js)"]
    TraceEngine["Animation & Step Replay Engine"]
    BackendAPI["Express Backend (/api/algorithms/:algo)"]
    CoreAlgorithms["Node.js DSA Engine (backend/engines/dsa/)"]

    UI -->|Mode 1: Client Interactive Step-Through| TraceEngine
    UI -->|Mode 2: Backend Verified Execution| BackendAPI
    BackendAPI --> CoreAlgorithms
    CoreAlgorithms -->|Returns Full Trace Array [Step 1, Step 2, ...]| BackendAPI
    BackendAPI -->|JSON Trace Payload| UI
    UI --> TraceEngine
```

---

## 2. Interactive Specifications for the Six Algorithms

---

### Algorithm 1: Hashing with Separate Chaining
* **Real-world System Use:** Constant-time $O(1)$ lookup for slot availability, resource lock registry, and student roll number indices.
* **Input Interface:**
  * Key Input (`string` or `number`, e.g., `"CSE-101"`, `"ROOM-4A"`)
  * Value Input (`string`, e.g., `"Allocated"`, `"Available"`)
  * Table Size $M$ (e.g., $7, 11, 13$ - prime numbers)
  * Preset buttons: *"Insert Sample Keys"*, *"Trigger Collision (Keys with same hash)"*, *"Clear Table"*
* **Visual Representation:**
  * Array of $M$ buckets rendered as vertical blocks.
  * Linked list nodes pointing horizontally from buckets with arrows `-> [Key: Val | Next]`.
  * Real-time polynomial rolling hash computation displayed:
    $$\text{hash} = \left(\sum k_i \cdot 31^{n-1-i}\right) \pmod M$$
* **Telemetry & Complexity:**
  * **Time Complexity:** Average $O(1)$ for Insert/Search, Worst $O(N)$ (when all keys collide into one bucket).
  * **Space Complexity:** $O(N + M)$
  * **Live Metrics:** Current Load Factor $\alpha = \frac{N}{M}$, Total Collisions, Longest Chain Length.

---

### Algorithm 2: Binary Search
* **Real-world System Use:** $O(\log N)$ qualification cutoff verification, candidate roll number lookup in sorted registers, and binary search on timestamps for available gap boundaries.
* **Input Interface:**
  * Target Value (e.g., target CGPA `7.85` or Student USN `108`)
  * Sorted Array (Custom comma-separated list or auto-generate sorted array of size $N = 10, 20, 50$)
* **Visual Representation:**
  * Horizontal bar chart or block array.
  * Animated pointers:
    * `Low` pointer (Blue)
    * `High` pointer (Red)
    * `Mid` pointer (Gold / Yellow highlight)
  * Greying-out of eliminated search halves at each iteration.
* **Telemetry & Complexity:**
  * **Time Complexity:** Best $O(1)$, Average/Worst $O(\log_2 N)$.
  * **Space Complexity:** $O(1)$ iterative.
  * **Live Metrics:** Iteration count, comparisons made, search space reduction percentage.

---

### Algorithm 3: Merge Sort
* **Real-world System Use:** $O(N \log N)$ stable sorting of candidate lists by multi-tier criteria (Aptitude $\to$ Technical $\to$ CGPA), and sorting interview intervals by start time for the Greedy Allocator.
* **Input Interface:**
  * Input Array of candidate scores or interval start times (e.g., `[85, 42, 96, 73, 58, 91, 64, 78]`)
  * Preset buttons: *"Random Array"*, *"Reversed Array (Worst Case)"*, *"Already Sorted"*
* **Visual Representation:**
  * Recursive divide-and-conquer tree diagram.
  * Two visual phases:
    1. **Divide Phase:** Array splits into halves with animation.
    2. **Merge Phase:** Two sorted subarrays merge into a temporary array using two-pointer comparison, highlighting stable element placement.
* **Telemetry & Complexity:**
  * **Time Complexity:** $O(N \log N)$ in all cases (Best, Average, Worst).
  * **Space Complexity:** $O(N)$ auxiliary space.
  * **Live Metrics:** Recursion depth, total comparisons, total merge operations.

---

### Algorithm 4: Min-Heap / Priority Queue
* **Real-world System Use:** Maintaining active interview room completion times (extracting the room that frees up earliest), and priority-based candidate interview queues.
* **Input Interface:**
  * Value to Insert (Integer key / timestamp, e.g., `10:30`, `11:15`)
  * Operations: `[Insert Element]`, `[Extract Min]`, `[Peek Min]`
* **Visual Representation:**
  * Synchronized dual-view:
    1. **Visual Binary Tree:** Nodes and branches with animated swaps during `heapify_up` and `heapify_down`.
    2. **Linear Array Representation:** Highlighting parent-child relationship formulas:
       $$\text{LeftChild}(i) = 2i + 1, \quad \text{RightChild}(i) = 2i + 2, \quad \text{Parent}(i) = \lfloor(i-1)/2\rfloor$$
* **Telemetry & Complexity:**
  * **Time Complexity:** Insert $O(\log N)$, Extract-Min $O(\log N)$, Peek $O(1)$, Build-Heap $O(N)$.
  * **Space Complexity:** $O(N)$ contiguous array.
  * **Live Metrics:** Current heap size, tree height $\lfloor\log_2 N\rfloor$, number of heapify swaps.

---

### Algorithm 5: Interval Overlap Detection
* **Real-world System Use:** Real-time conflict validation when an interviewer, room, or student is requested for a specific booking window.
* **Input Interface:**
  * Existing Allocated Intervals: List of $[S_i, E_i)$ (e.g., `[[09:00, 10:00], [10:30, 11:45], [13:00, 14:00]]`)
  * Requested New Interval: $[S_{new}, E_{new})$ (e.g., `[09:45, 10:45]`)
* **Visual Representation:**
  * Horizontal timeline ruler spanning 08:00 to 18:00.
  * Existing bookings rendered as green/blue blocks on the timeline.
  * Requested slot rendered as a semi-transparent floating slider block.
  * Intersection highlight in vivid red with the algebraic conflict condition:
    $$\text{Overlap} \iff \max(S_1, S_2) < \min(E_1, E_2)$$
* **Telemetry & Complexity:**
  * **Time Complexity:** Single interval query $O(1)$ with locked resources; $O(N)$ linear scan; $O(\log N + K)$ using an Interval Tree / Segment Tree.
  * **Space Complexity:** $O(1)$ auxiliary.
  * **Live Metrics:** Overlap duration (minutes), conflicting session IDs, conflict status boolean (`CONFLICT` / `CLEAR`).

---

### Algorithm 6: Greedy Room Allocation (Interval Partitioning)
* **Real-world System Use:** Master placement schedule optimizer. Given $N$ interview sessions with start and finish times, determines the minimum theoretical number of physical rooms $D$ required, and outputs the complete collision-free room assignment schedule.
* **Input Interface:**
  * Batch of Interview Sessions: Start and End times (e.g., $N = 6$ sessions):
    * `S1: [09:00, 10:30]`, `S2: [09:15, 11:00]`, `S3: [10:00, 11:30]`, `S4: [10:45, 12:15]`, `S5: [11:15, 13:00]`, `S6: [13:00, 14:00]`
  * Preset buttons: *"Load Morning Rush (High Contention)"*, *"Load Sparse Day"*, *"Generate Random 10 Sessions"*
* **Visual Representation:**
  * Multi-track timeline where each horizontal track represents a physical Room (`Room 1`, `Room 2`, ..., `Room D`).
  * As the algorithm iterates through start-time-sorted interviews:
    * Reused rooms light up as intervals slot into existing tracks.
    * When no existing room is free, a new room track is dynamically instantiated.
  * Parallel display of the internal Min-Heap of room free times.
* **Telemetry & Complexity:**
  * **Theoretical Optimality:** Guarantees minimum rooms $D = \text{max depth of overlap}$ (provably optimal via Greedy exchange argument).
  * **Time Complexity:** $O(N \log N)$ (dominated by initial sorting and $N$ heap operations).
  * **Space Complexity:** $O(D)$ auxiliary heap memory.
  * **Live Metrics:** Minimum rooms required ($D$), room utilization percentage, total idle gaps.

---

## 3. UI/UX Page Wireframe & Layout

```
+---------------------------------------------------------------------------------------------------+
|  PLACEMENT MANAGEMENT SYSTEM  |  Admin  |  Student  |  HR  |  Interviewer  |  [DSA LAB] (Active)  |
+---------------------------------------------------------------------------------------------------+
|  DSA ALGORITHM DEMONSTRATION LAB                                               [Backend Sync: ON] |
|  Select Algorithm: [1. Hashing] [2. Binary Search] [3. Merge Sort] [4. Min-Heap] [5. Overlap] [6. Greedy Allocation]
+--------------------------------------------------+------------------------------------------------+
|  INPUT & CONTROLS PANEL                          |  INTERACTIVE VISUALIZATION STAGE               |
|                                                  |                                                |
|  Select Preset: [Morning Rush] [Random] [Custom] |  +------------------------------------------+  |
|                                                  |  |                                          |  |
|  Session Inputs:                                 |  |   [Visual Canvas / SVG / DOM Elements]   |  |
|  [ Start Time ] [ End Time ]  [ + Add Session ]  |  |                                          |  |
|  1. 09:00 - 10:30 [Remove]                       |  |   Tracks / Trees / Pointers / Bars       |  |
|  2. 09:15 - 11:00 [Remove]                       |  |                                          |  |
|  3. 10:00 - 11:30 [Remove]                       |  +------------------------------------------+  |
|                                                  |                                                |
|  [ RUN ALGORITHM ]  [ STEP NEXT ]  [ RESET ]     |  STEP-BY-STEP EXECUTION LOG                    |
|  Speed: [====|=========] (Slow -> Fast)          |  > Step 3: Session S3 [10:00, 11:30] checked.   |
|                                                  |  > Earliest room frees at 10:30 (Room 1).      |
|  THEORETICAL COMPLEXITY CARD                     |  > Overlap detected! Opening new Room 3.       |
|  • Time Complexity:  O(N log N)                  |  > Pushed Room 3 with end 11:30 into Min-Heap. |
|  • Space Complexity: O(D)                        +------------------------------------------------+
|  • Current Rooms Required: 3 (Optimal)           |  Heap State: [10:30 (R1), 11:00 (R2), 11:30(R3)]|
+--------------------------------------------------+------------------------------------------------+
```

---

## 4. Backend Algorithm API Specification

To fulfill the requirement that the lab is connected to the backend algorithms module, the backend exposes endpoints returning step-by-step trace payloads:

### Request Example: `POST /api/algorithms/greedy-rooms`
```json
{
  "sessions": [
    { "id": "S1", "start": "09:00", "end": "10:30" },
    { "id": "S2", "start": "09:15", "end": "11:00" },
    { "id": "S3", "start": "10:00", "end": "11:30" }
  ]
}
```

### Response Example:
```json
{
  "success": true,
  "algorithm": "GreedyIntervalPartitioning",
  "minRoomsRequired": 3,
  "executionTimeMs": 1.25,
  "complexity": {
    "time": "O(N log N)",
    "space": "O(D)"
  },
  "trace": [
    {
      "step": 1,
      "action": "SORT_INPUT",
      "description": "Sorted 3 sessions by start time using Merge Sort.",
      "sortedSessions": ["S1", "S2", "S3"]
    },
    {
      "step": 2,
      "action": "PROCESS_SESSION",
      "sessionId": "S1",
      "assignedRoom": "Room 1",
      "heapState": [{ "room": "Room 1", "freeAt": "10:30" }],
      "description": "Room 1 assigned to S1 [09:00 - 10:30]."
    },
    {
      "step": 3,
      "action": "PROCESS_SESSION",
      "sessionId": "S2",
      "assignedRoom": "Room 2",
      "heapState": [{ "room": "Room 1", "freeAt": "10:30" }, { "room": "Room 2", "freeAt": "11:00" }],
      "description": "Earliest free room (Room 1 at 10:30) > 09:15. Conflict! Allocated new Room 2."
    }
  ],
  "finalAllocation": {
    "Room 1": ["S1"],
    "Room 2": ["S2"],
    "Room 3": ["S3"]
  }
}
```
