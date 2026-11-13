/**
 * DSA Engine - Implementation 1: Interval Overlap Detection
 * Purpose: Detects resource (Room / Interviewer) scheduling conflicts.
 * Overlap Condition: (start2 < end1) AND (end2 > start1)
 * Boundary touch policy: Schedules touching only at boundary (end1 === start2 or end2 === start1) are NON-CONFLICTING.
 * Time Complexity: O(n) where n is the number of existing schedules.
 */

function parseTimeToMinutes(timeStr) {
  if (typeof timeStr === 'number') return timeStr;
  // If it's a date string like '2026-11-20 10:30:00' or ISO
  if (timeStr.includes(':')) {
    const parts = timeStr.split(' ');
    const timePart = parts.length > 1 ? parts[1] : parts[0];
    const [hh, mm] = timePart.split(':').map(n => parseInt(n, 10));
    return (hh * 60) + (mm || 0);
  }
  return parseInt(timeStr, 10) || 0;
}

function checkIntervalConflict({
  roomId,
  interviewerId = null,
  startTime,
  endTime,
  existingSchedules = []
}) {
  const start2 = new Date(startTime).getTime();
  const end2 = new Date(endTime).getTime();

  if (isNaN(start2) || isNaN(end2)) {
    throw new Error('Invalid start or end timestamp provided.');
  }

  if (end2 <= start2) {
    throw new Error('Requested end time must be strictly after start time.');
  }

  const comparisonSteps = [];
  const conflictingSchedules = [];

  for (let i = 0; i < existingSchedules.length; i++) {
    const sched = existingSchedules[i];
    const schedId = sched.id || `SCHED-${i + 1}`;
    const start1 = new Date(sched.start_time || sched.startTime).getTime();
    const end1 = new Date(sched.end_time || sched.endTime).getTime();
    const schedRoomId = parseInt(sched.room_id || sched.roomId, 10);
    const schedInterviewerId = sched.interviewer_id ? parseInt(sched.interviewer_id, 10) : null;

    let resourceMatches = false;
    let matchType = '';

    if (roomId && schedRoomId === parseInt(roomId, 10)) {
      resourceMatches = true;
      matchType = 'Room ' + roomId;
    }
    if (interviewerId && schedInterviewerId && schedInterviewerId === parseInt(interviewerId, 10)) {
      resourceMatches = true;
      matchType = matchType ? `${matchType} & Interviewer ${interviewerId}` : `Interviewer ${interviewerId}`;
    }

    if (!resourceMatches) {
      comparisonSteps.push({
        step: i + 1,
        scheduleId: schedId,
        resource: `Room ${schedRoomId}`,
        comparison: 'Skipped - Different resource (no spatial/panel collision)',
        hasOverlap: false
      });
      continue;
    }

    // Apply the mathematical condition: start2 < end1 AND end2 > start1
    const condition1 = start2 < end1;
    const condition2 = end2 > start1;
    const isOverlapping = condition1 && condition2;

    const readableStart1 = new Date(start1).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    const readableEnd1 = new Date(end1).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    const readableStart2 = new Date(start2).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    const readableEnd2 = new Date(end2).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

    comparisonSteps.push({
      step: i + 1,
      scheduleId: schedId,
      resource: matchType,
      existingSlot: `${readableStart1} - ${readableEnd1}`,
      requestedSlot: `${readableStart2} - ${readableEnd2}`,
      condition: `(start2 < end1) [${start2} < ${end1} => ${condition1}] AND (end2 > start1) [${end2} > ${start1} => ${condition2}]`,
      hasOverlap: isOverlapping,
      evaluation: isOverlapping
        ? `CONFLICT DETECTED: Overlaps with ${schedId} on ${matchType}`
        : `CLEAR: Touching boundary or disjoint interval`
    });

    if (isOverlapping) {
      conflictingSchedules.push({
        scheduleId: schedId,
        resourceType: matchType,
        existingStart: sched.start_time || sched.startTime,
        existingEnd: sched.end_time || sched.endTime,
        overlapNotes: sched.notes || 'Occupied slot'
      });
    }
  }

  const hasConflict = conflictingSchedules.length > 0;

  return {
    algorithm: 'Interval Overlap Detection',
    formula: 'start2 < end1 AND end2 > start1',
    hasConflict,
    totalEvaluated: existingSchedules.length,
    conflictCount: conflictingSchedules.length,
    requestedWindow: {
      startTime,
      endTime,
      roomId,
      interviewerId
    },
    conflictingSchedules,
    comparisonSteps,
    timeComplexity: 'O(n) - Linear scan of n existing schedules'
  };
}

module.exports = {
  checkIntervalConflict
};
