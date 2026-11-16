/**
 * OSPP Engine - Implementation 2: Priority Scheduling (Non-Preemptive with Arrival Times)
 * Purpose: Schedules processes/candidate panels according to priority values.
 * Convention: Lower numeric value represents Higher Priority (e.g., 1 is higher priority than 5).
 */

function runPriorityScheduling(processes = [], options = {}) {
  if (!Array.isArray(processes) || processes.length === 0) {
    throw new Error('Processes list must be a non-empty array.');
  }

  const lowerNumberHigher = options.lowerNumberHigherPriority !== false; // Default true

  // Deep copy and sanitize
  const remaining = processes.map(p => ({
    id: String(p.id || p.processId || 'P?'),
    arrivalTime: Math.max(0, parseInt(p.arrivalTime, 10) || 0),
    burstTime: Math.max(1, parseInt(p.burstTime, 10) || 1),
    priority: parseInt(p.priority, 10) || 1,
    isCompleted: false
  }));

  let currentTime = 0;
  let completedCount = 0;
  const totalCount = remaining.length;
  const ganttChart = [];
  const results = [];
  const stepLog = [];

  let stepNumber = 1;

  while (completedCount < totalCount) {
    // Find all arrived and uncompleted processes
    const available = remaining.filter(p => !p.isCompleted && p.arrivalTime <= currentTime);

    if (available.length === 0) {
      // Find the next earliest arriving process
      const uncompleted = remaining.filter(p => !p.isCompleted);
      const nextArrival = Math.min(...uncompleted.map(p => p.arrivalTime));

      ganttChart.push({
        id: 'IDLE',
        startTime: currentTime,
        endTime: nextArrival,
        duration: nextArrival - currentTime,
        isIdle: true
      });
      stepLog.push(`At t=${currentTime}: Resource idle until t=${nextArrival}.`);
      currentTime = nextArrival;
      continue;
    }

    // Sort available by priority
    available.sort((a, b) => {
      if (a.priority !== b.priority) {
        return lowerNumberHigher ? a.priority - b.priority : b.priority - a.priority;
      }
      // Tie breaker 1: Arrival time
      if (a.arrivalTime !== b.arrivalTime) return a.arrivalTime - b.arrivalTime;
      // Tie breaker 2: Process ID
      return a.id.localeCompare(b.id);
    });

    const chosen = available[0];
    const startTime = currentTime;
    const completionTime = startTime + chosen.burstTime;
    const turnaroundTime = completionTime - chosen.arrivalTime;
    const waitingTime = turnaroundTime - chosen.burstTime;

    currentTime = completionTime;
    chosen.isCompleted = true;
    completedCount++;

    ganttChart.push({
      id: chosen.id,
      priority: chosen.priority,
      startTime,
      endTime: completionTime,
      duration: chosen.burstTime,
      isIdle: false
    });

    results.push({
      id: chosen.id,
      arrivalTime: chosen.arrivalTime,
      burstTime: chosen.burstTime,
      priority: chosen.priority,
      startTime,
      completionTime,
      turnaroundTime,
      waitingTime
    });

    stepLog.push(
      `Step ${stepNumber++}: Selected [${chosen.id}] (Priority ${chosen.priority}) from ${available.length} ready process(es). Executed from t=${startTime} to t=${completionTime}. (WT=${waitingTime}, TAT=${turnaroundTime})`
    );
  }

  const totalWT = results.reduce((acc, r) => acc + r.waitingTime, 0);
  const totalTAT = results.reduce((acc, r) => acc + r.turnaroundTime, 0);
  const avgWT = parseFloat((totalWT / totalCount).toFixed(2));
  const avgTAT = parseFloat((totalTAT / totalCount).toFixed(2));

  return {
    algorithm: 'Priority Scheduling (Non-Preemptive)',
    priorityConvention: lowerNumberHigher
      ? 'Smaller numeric value = Higher Priority (Priority 1 > Priority 2)'
      : 'Larger numeric value = Higher Priority (Priority 5 > Priority 1)',
    priorityOrder: [...processes].sort((a, b) => lowerNumberHigher ? a.priority - b.priority : b.priority - a.priority).map(p => `${p.id} (P:${p.priority})`),
    executionOrder: results.map(r => r.id),
    ganttChart,
    processResults: results,
    metrics: {
      totalProcesses: totalCount,
      totalExecutionTime: currentTime,
      totalWaitingTime: totalWT,
      totalTurnaroundTime: totalTAT,
      averageWaitingTime: avgWT,
      averageTurnaroundTime: avgTAT
    },
    stepByStepLog: stepLog
  };
}

module.exports = {
  runPriorityScheduling
};
