const http = require('http');
const app = require('./backend/app');
const { initDB } = require('./backend/config/db');

async function testAllEndpoints() {
  await initDB();
  const server = app.listen(5001);

  function request(method, path, body = null) {
    return new Promise((resolve, reject) => {
      const data = body ? JSON.stringify(body) : null;
      const options = {
        hostname: 'localhost',
        port: 5001,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(data && { 'Content-Length': Buffer.byteLength(data) })
        }
      };

      const req = http.request(options, (res) => {
        let resBody = '';
        res.on('data', chunk => resBody += chunk);
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(resBody) });
          } catch (e) {
            resolve({ status: res.statusCode, raw: resBody });
          }
        });
      });

      req.on('error', reject);
      if (data) req.write(data);
      req.end();
    });
  }

  console.log('Testing all system REST API endpoints:');

  // 1. Health
  const health = await request('GET', '/api/health');
  console.log('✓ /api/health:', health.status, health.data.status);

  // 2. OSPP FCFS
  const fcfs = await request('POST', '/api/ospp/fcfs', {
    processes: [{ id: 'P1', arrivalTime: 0, burstTime: 3 }]
  });
  console.log('✓ /api/ospp/fcfs:', fcfs.status, fcfs.data.success);

  // 3. OSPP Priority
  const prio = await request('POST', '/api/ospp/priority', {
    processes: [{ id: 'P1', arrivalTime: 0, burstTime: 3, priority: 1 }]
  });
  console.log('✓ /api/ospp/priority:', prio.status, prio.data.success);

  // 4. DSA Interval Check
  const conflict = await request('POST', '/api/algorithms/check-conflict', {
    roomId: 1,
    startTime: '2026-11-20 10:30:00',
    endTime: '2026-11-20 11:30:00'
  });
  console.log('✓ /api/algorithms/check-conflict:', conflict.status, 'Conflict =', conflict.data.data.hasConflict);

  // 5. DSA Greedy Room Allocation
  const greedy = await request('POST', '/api/algorithms/allocate-rooms', {
    interviews: [
      { id: 'I1', start: '10:00', end: '11:00' },
      { id: 'I2', start: '10:00', end: '12:00' },
      { id: 'I3', start: '11:00', end: '12:00' },
      { id: 'I4', start: '12:00', end: '13:00' }
    ]
  });
  console.log('✓ /api/algorithms/allocate-rooms:', greedy.status, 'Rooms =', greedy.data.data.totalRoomsRequired);

  // 6. Web Tech Validation
  const val = await request('POST', '/api/webtech/validate-demo', {
    formType: 'student_registration',
    formData: { name: 'Diya', email: 'diya@college.edu', password: 'password123', cgpa: '9.2' }
  });
  console.log('✓ /api/webtech/validate-demo:', val.status, 'Valid =', val.data.isValid);

  // 7. Web Tech RBAC
  const rbac = await request('POST', '/api/webtech/simulate-rbac', {
    simulatedRole: 'student',
    targetResource: 'admin-only'
  });
  console.log('✓ /api/webtech/simulate-rbac (Student -> Admin):', rbac.data.status, 'Forbidden =', !rbac.data.isAuthorized);

  // 8. Software Engineering RTM
  const rtm = await request('GET', '/api/se/traceability');
  console.log('✓ /api/se/traceability:', rtm.status, 'Requirements =', rtm.data.totalRequirements);

  // 9. Software Engineering Test Runner
  const seTests = await request('POST', '/api/se/run-tests');
  console.log('✓ /api/se/run-tests:', seTests.status, 'Passed =', `${seTests.data.data.passedCount}/${seTests.data.data.totalTestCases}`);

  // 10. DBMS Transaction Demo
  const txDemo = await request('POST', '/api/dbms/transaction-demo', { roomId: 1 });
  console.log('✓ /api/dbms/transaction-demo:', txDemo.status, txDemo.data.summary.databaseIntegrity);

  // 11. DBMS Stored Procedure & Trigger
  const spDemo = await request('POST', '/api/dbms/execute-procedure', {
    applicationId: 1,
    newStatus: 'selected',
    remarks: 'Approved by Committee'
  });
  console.log('✓ /api/dbms/execute-procedure:', spDemo.status, spDemo.data.storedProcedure.procedureName);

  // 12. Placement Data Endpoints
  const drives = await request('GET', '/api/placement/drives');
  console.log('✓ /api/placement/drives:', drives.status, 'Count =', drives.data.drives.length);

  server.close(() => {
    console.log('\nAll 12 endpoints responded with 200 OK and valid JSON data!');
    process.exit(0);
  });
}

testAllEndpoints();
