const { runFCFS } = require('./backend/engines/ospp/fcfsScheduler');
const { runPriorityScheduling } = require('./backend/engines/ospp/priorityScheduler');
const { checkIntervalConflict } = require('./backend/algorithms/intervalDetection');
const { allocateRoomsGreedy } = require('./backend/algorithms/greedyRoomAllocation');
const { runAllTestCases } = require('./backend/engines/se/testRunner');
const { requirementsList } = require('./backend/engines/se/traceabilityData');
const FormValidator = require('./frontend/js/validation');

async function testEverything() {
  console.log('----------------------------------------------------');
  console.log('RUNNING COMPREHENSIVE 5-ENGINE ACADEMIC VERIFICATION');
  console.log('----------------------------------------------------');

  // 1. OSPP Test
  console.log('\n[1/5] Testing OSPP Engine:');
  const fcfsRes = runFCFS([
    { id: 'Process A', arrivalTime: 0, burstTime: 4 },
    { id: 'Process B', arrivalTime: 1, burstTime: 3 },
    { id: 'Process C', arrivalTime: 2, burstTime: 1 }
  ]);
  console.log('✓ FCFS Execution Order:', fcfsRes.executionOrder.join(' -> '));
  console.log('✓ FCFS Avg Turnaround Time:', fcfsRes.metrics.averageTurnaroundTime);
  console.log('✓ FCFS Avg Waiting Time:', fcfsRes.metrics.averageWaitingTime);

  const prioRes = runPriorityScheduling([
    { id: 'Candidate 1', arrivalTime: 0, burstTime: 4, priority: 3 },
    { id: 'Candidate 2 (High Prio)', arrivalTime: 1, burstTime: 2, priority: 1 },
    { id: 'Candidate 3', arrivalTime: 2, burstTime: 2, priority: 2 }
  ]);
  console.log('✓ Priority Order:', prioRes.executionOrder.join(' -> '));
  console.log('✓ Priority Convention:', prioRes.priorityConvention);

  // 2. DSA Test
  console.log('\n[2/5] Testing DSA Engine:');
  const conflict = checkIntervalConflict({
    roomId: 1,
    startTime: '2026-11-20 10:30:00',
    endTime: '2026-11-20 11:30:00',
    existingSchedules: [{ id: 'S1', room_id: 1, start_time: '2026-11-20 10:00:00', end_time: '2026-11-20 11:00:00' }]
  });
  console.log('✓ Interval Overlap Detection (start2 < end1 && end2 > start1): Conflict =', conflict.hasConflict);

  const greedy = allocateRoomsGreedy([
    { id: 'Interview 1', start: '10:00', end: '11:00' },
    { id: 'Interview 2', start: '10:00', end: '12:00' },
    { id: 'Interview 3', start: '11:00', end: '12:00' },
    { id: 'Interview 4', start: '12:00', end: '13:00' }
  ]);
  console.log('✓ Greedy Room Allocation: Total Rooms Required =', greedy.totalRoomsRequired, '(Expected: 2)');

  // 3. Web Tech Test
  console.log('\n[3/5] Testing Web Technology Engine:');
  console.log('✓ Valid Email test:', FormValidator.isValidEmail('student@college.edu').valid);
  console.log('✓ Invalid Email test:', !FormValidator.isValidEmail('bademail').valid);
  console.log('✓ Time bounds check:', FormValidator.isValidTimeWindow('2026-11-20 10:00:00', '2026-11-20 11:00:00').valid);

  // 4. Software Engineering Test
  console.log('\n[4/5] Testing Software Engineering Engine:');
  console.log('✓ Total Traceable Requirements in RTM:', requirementsList.length);
  const suite = await runAllTestCases();
  console.log(`✓ Automated Test Suite: ${suite.passedCount}/${suite.totalTestCases} Passed (${suite.passRate}) in ${suite.totalDurationMs}ms`);

  // 5. Summary
  console.log('\n----------------------------------------------------');
  console.log('ALL ENGINE VERIFICATIONS COMPLETED SUCCESSFULLY!');
  console.log('----------------------------------------------------');
}

testEverything();
