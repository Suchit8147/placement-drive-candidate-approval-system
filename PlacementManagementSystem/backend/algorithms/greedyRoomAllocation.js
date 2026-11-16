/**
 * DSA Engine - Implementation 2: Greedy Room Allocation (Interval Partitioning with Min-Heap)
 * Purpose: Allocates the minimum theoretical number of physical rooms required for N interview schedules.
 * Algorithm:
 *   1. Sort intervals by start time in ascending order.
 *   2. Maintain a Min-Heap of allocated rooms keyed by their current free timestamp (earliest end time).
 *   3. For each interview:
 *      - If earliest freeing room is free <= interview start time:
 *          Reuse that room, update its free time, push back to Min-Heap.
 *      - Else:
 *          All active rooms busy! Instantiate a new room, push to Min-Heap.
 * Time Complexity: O(n log n)
 * Space Complexity: O(d) where d is the minimum number of rooms required.
 */

// Min-Heap Implementation
class MinHeap {
  constructor() {
    this.heap = [];
  }

  size() {
    return this.heap.length;
  }

  peek() {
    return this.heap[0] || null;
  }

  push(item) {
    this.heap.push(item);
    this._heapifyUp(this.heap.length - 1);
  }

  pop() {
    if (this.heap.length === 0) return null;
    if (this.heap.length === 1) return this.heap.pop();
    const min = this.heap[0];
    this.heap[0] = this.heap.pop();
    this._heapifyDown(0);
    return min;
  }

  _heapifyUp(idx) {
    while (idx > 0) {
      const parentIdx = Math.floor((idx - 1) / 2);
      if (this.heap[idx].freeTime < this.heap[parentIdx].freeTime) {
        [this.heap[idx], this.heap[parentIdx]] = [this.heap[parentIdx], this.heap[idx]];
        idx = parentIdx;
      } else {
        break;
      }
    }
  }

  _heapifyDown(idx) {
    const length = this.heap.length;
    while (true) {
      let smallest = idx;
      const left = 2 * idx + 1;
      const right = 2 * idx + 2;

      if (left < length && this.heap[left].freeTime < this.heap[smallest].freeTime) {
        smallest = left;
      }
      if (right < length && this.heap[right].freeTime < this.heap[smallest].freeTime) {
        smallest = right;
      }
      if (smallest !== idx) {
        [this.heap[idx], this.heap[smallest]] = [this.heap[smallest], this.heap[idx]];
        idx = smallest;
      } else {
        break;
      }
    }
  }

  getState() {
    return this.heap.map(h => ({
      roomName: h.roomName,
      freeTime: h.freeTime,
      freeTimeFormatted: new Date(h.freeTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
    }));
  }
}

// Helper to convert time strings (e.g., "10:00", "11:00" or ISO timestamps) into epoch milliseconds
function toTimestamp(timeInput, baseDate = '2026-11-20') {
  if (typeof timeInput === 'number') return timeInput;
  if (timeInput.includes('T') || timeInput.includes('-')) {
    return new Date(timeInput).getTime();
  }
  // Assume "HH:MM" or "HH:MM AM/PM"
  return new Date(`${baseDate} ${timeInput}`).getTime();
}

function allocateRoomsGreedy(interviews = []) {
  if (!Array.isArray(interviews) || interviews.length === 0) {
    throw new Error('Interview schedules must be a non-empty array.');
  }

  // 1. Sanitize and prepare intervals
  const formatted = interviews.map((item, index) => {
    const id = item.id || `Interview ${index + 1}`;
    const start = toTimestamp(item.start || item.start_time || item.startTime);
    const end = toTimestamp(item.end || item.end_time || item.endTime);

    if (isNaN(start) || isNaN(end) || end <= start) {
      throw new Error(`Invalid time bounds for interview [${id}]: Start: ${item.start}, End: ${item.end}`);
    }

    return {
      id,
      title: item.title || item.notes || id,
      start,
      end,
      startFormatted: new Date(start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }),
      endFormatted: new Date(end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
    };
  });

  // 2. Sort by Start Time ascending (tie breaker: end time)
  const sortedSchedules = [...formatted].sort((a, b) => {
    if (a.start !== b.start) return a.start - b.start;
    return a.end - b.end;
  });

  // 3. Greedy Min-Heap Interval Partitioning
  const minHeap = new MinHeap();
  const allocationSteps = [];
  const roomAllocations = {}; // Room Name -> Array of assigned interviews
  let nextRoomNumber = 1;

  for (let i = 0; i < sortedSchedules.length; i++) {
    const interview = sortedSchedules[i];
    const earliestRoom = minHeap.peek();

    let assignedRoomName = '';
    let actionType = '';
    let explanation = '';

    if (earliestRoom && earliestRoom.freeTime <= interview.start) {
      // Room is freed up! Reuse it
      const reused = minHeap.pop();
      assignedRoomName = reused.roomName;
      actionType = 'REUSE_ROOM';
      explanation = `Room ${assignedRoomName} is free since ${new Date(reused.freeTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })} <= interview start (${interview.startFormatted}). Reusing room.`;

      // Update free time to this interview's end
      minHeap.push({
        roomName: assignedRoomName,
        freeTime: interview.end
      });
    } else {
      // All existing rooms are occupied! Allocate a new room
      assignedRoomName = `Room ${nextRoomNumber++}`;
      actionType = 'ALLOCATE_NEW_ROOM';
      explanation = earliestRoom
        ? `All current rooms occupied (Earliest room ${earliestRoom.roomName} busy until ${new Date(earliestRoom.freeTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })} > interview start ${interview.startFormatted}). Opening ${assignedRoomName}.`
        : `Initial interview. Allocated first room: ${assignedRoomName}.`;

      minHeap.push({
        roomName: assignedRoomName,
        freeTime: interview.end
      });
    }

    if (!roomAllocations[assignedRoomName]) {
      roomAllocations[assignedRoomName] = [];
    }
    roomAllocations[assignedRoomName].push({
      id: interview.id,
      title: interview.title,
      startFormatted: interview.startFormatted,
      endFormatted: interview.endFormatted
    });

    allocationSteps.push({
      step: i + 1,
      interviewId: interview.id,
      timeSlot: `${interview.startFormatted} - ${interview.endFormatted}`,
      assignedRoom: assignedRoomName,
      action: actionType,
      explanation,
      activeRoomsInHeap: minHeap.getState()
    });
  }

  const totalRoomsRequired = Object.keys(roomAllocations).length;

  return {
    algorithm: 'Greedy Room Allocation (Interval Partitioning)',
    totalInterviews: sortedSchedules.length,
    totalRoomsRequired,
    timeComplexity: 'O(n log n) - Dominated by start-time sorting and min-heap operations',
    spaceComplexity: `O(d) where d = ${totalRoomsRequired} rooms (depth of interval graph)`,
    sortedSchedules,
    allocationSteps,
    finalRoomAllocations: roomAllocations
  };
}

module.exports = {
  allocateRoomsGreedy
};
