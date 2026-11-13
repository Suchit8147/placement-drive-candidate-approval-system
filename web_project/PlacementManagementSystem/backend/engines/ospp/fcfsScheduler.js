/**
 * OSPP Engine - Implementation 1: First-Come, First-Served (FCFS) Scheduling
 * Purpose: Schedules processes/interview tasks strictly in the order of arrival time.
 */

function runFCFS(processes = []) {
  if (!Array.isArray(processes) || processes.length === 0) {
    throw new Error('Processes list must be a non-empty array.');
  }

  // Deep copy and sanitize input
  const procList = processes.map(p => ({
    id: String(p.id || p.processId || 'P?'),
    arrivalTime: Math.max(0, parseInt(p.arrivalTime, 10) || 0),
    burstTime: Math.max(1, parseInt(p.burstTime, 10) || 1)
  }));

  // Sort by Arrival Time ascending (tie breaker: process ID)
  procList.sort((a, b) => {
    if (a.arrivalTime !== b.arrivalTime) return a.arrivalTime - b.arrivalTime;
    return a.id.localeCompare(b.id);
  });

  let currentTime = 0;
  const ganttChart = [];
  const results = [];
  let totalWT = 0;
  let totalTAT = 0;

  for (const proc of procList) {
    // If CPU/resource is idle before process arrives
    if (currentTime < proc.arrivalTime) {
      ganttChart.push({
        id: 'IDLE',
        startTime: currentTime,
        endTime: proc.arrivalTime,
        duration: proc.arrivalTime - currentTime,
        isIdle: true
      });
      currentTime = proc.arrivalTime;
    }

    const startTime = currentTime;
    const completionTime = startTime + proc.burstTime;
    const turnaroundTime = completionTime - proc.arrivalTime; // TAT = CT - AT
    const waitingTime = turnaroundTime - proc.burstTime;       // WT = TAT - BT

    currentTime = completionTime;
    totalWT += waitingTime;
    totalTAT += turnaroundTime;

    ganttChart.push({
      id: proc.id,
      startTime,
      endTime: completionTime,
      duration: proc.burstTime,
      isIdle: false
    });

    results.push({
      id: proc.id,
      arrivalTime: proc.arrivalTime,
      burstTime: proc.burstTime,
      startTime,
      completionTime,
      turnaroundTime,
      waitingTime
    });
  }

  const avgWT = parseFloat((totalWT / procList.length).toFixed(2));
  const avgTAT = parseFloat((totalTAT / procList.length).toFixed(2));

  return {
    algorithm: 'First-Come, First-Served (FCFS)',
    executionOrder: results.map(r => r.id),
    ganttChart,
    processResults: results,
    metrics: {
      totalProcesses: procList.length,
      totalExecutionTime: currentTime,
      totalWaitingTime: totalWT,
      totalTurnaroundTime: totalTAT,
      averageWaitingTime: avgWT,
      averageTurnaroundTime: avgTAT
    },
    stepByStepLog: results.map((r, i) => 
      `Step ${i + 1}: [${r.id}] arrived at t=${r.arrivalTime}, started at t=${r.startTime}, finished at t=${r.completionTime}. (WT=${r.waitingTime}, TAT=${r.turnaroundTime})`
    )
  };
}

module.exports = {
  runFCFS
};
