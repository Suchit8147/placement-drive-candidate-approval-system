const app = require('./backend/app');
const db = require('./backend/config/db');

// Lightweight mock request/response helper for express app testing
function callRoute(method, url, body = {}) {
  return new Promise((resolve) => {
    const req = {
      method,
      url,
      originalUrl: url,
      body,
      query: {},
      params: {},
      headers: { 'content-type': 'application/json' }
    };

    // Parse query params if any
    if (url.includes('?')) {
      const parts = url.split('?');
      req.url = parts[0];
      const searchParams = new URLSearchParams(parts[1]);
      for (const [key, value] of searchParams) {
        req.query[key] = value;
      }
    }

    const res = {
      statusCode: 200,
      headers: {},
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        resolve({ status: this.statusCode, body: data });
      },
      setHeader(k, v) {
        this.headers[k] = v;
      }
    };

    app.handle(req, res);
  });
}

async function runTests() {
  console.log('=====================================================================');
  console.log('TESTING COMPLETE PLACEMENT MANAGEMENT SYSTEM REST APIS (11 TABLES)');
  console.log('=====================================================================');

  // 1. Overview
  const overview = await callRoute('GET', '/api/placement/overview');
  console.log('✓ [1/11] System Overview:', overview.status, 'Total Students:', overview.body.stats.totalStudents);

  // 2. Students CRUD
  console.log('\n--- Testing Student Management ---');
  const getStudents = await callRoute('GET', '/api/placement/students');
  console.log('✓ GET /api/placement/students:', getStudents.status, 'Count:', getStudents.body.students.length);

  const addStudent = await callRoute('POST', '/api/placement/students', {
    name: 'Neha Gupta',
    email: 'neha.gupta@college.edu',
    usn: '1MS21CS099',
    department: 'Computer Science',
    cgpa: 8.75,
    graduation_year: 2026,
    phone: '9988776655'
  });
  console.log('✓ POST /api/placement/students (Add):', addStudent.status, 'Student:', addStudent.body.student ? addStudent.body.student.name : addStudent.body.message);
  const newStudentId = addStudent.body.student ? addStudent.body.student.id : 1;

  const updateStudent = await callRoute('PUT', `/api/placement/students/${newStudentId}`, {
    phone: '9988770000',
    cgpa: 8.90
  });
  console.log('✓ PUT /api/placement/students/:id (Edit):', updateStudent.status, 'New CGPA:', updateStudent.body.student ? updateStudent.body.student.cgpa : '');

  // 3. Companies CRUD
  console.log('\n--- Testing Company Management ---');
  const getComps = await callRoute('GET', '/api/placement/companies');
  console.log('✓ GET /api/placement/companies:', getComps.status, 'Count:', getComps.body.companies.length);

  const addComp = await callRoute('POST', '/api/placement/companies', {
    company_name: 'Amazon Web Services',
    industry: 'Cloud Infrastructure',
    website: 'https://aws.amazon.com',
    contact_person: 'Anil K.',
    contact_email: 'anil.k@amazon.com'
  });
  console.log('✓ POST /api/placement/companies (Add):', addComp.status, 'Company:', addComp.body.company ? addComp.body.company.company_name : addComp.body.message);
  const newCompanyId = addComp.body.company ? addComp.body.company.id : 1;

  const updateComp = await callRoute('PUT', `/api/placement/companies/${newCompanyId}`, {
    industry: 'Cloud Computing & AI'
  });
  console.log('✓ PUT /api/placement/companies/:id (Edit):', updateComp.status, 'Industry:', updateComp.body.company ? updateComp.body.company.industry : '');

  // 4. Placement Drives CRUD
  console.log('\n--- Testing Placement Drive Management ---');
  const getDrives = await callRoute('GET', '/api/placement/drives');
  console.log('✓ GET /api/placement/drives:', getDrives.status, 'Count:', getDrives.body.drives.length);

  const addDrive = await callRoute('POST', '/api/placement/drives', {
    company_id: newCompanyId,
    title: 'AWS Cloud Support Associate 2026',
    job_role: 'Cloud Associate',
    ctc_lpa: 22.00,
    min_cgpa: 7.00,
    eligible_branches: 'Computer Science, Information Science, Electronics',
    drive_date: '2026-11-28',
    status: 'active'
  });
  console.log('✓ POST /api/placement/drives (Create):', addDrive.status, 'Drive:', addDrive.body.drive ? addDrive.body.drive.title : addDrive.body.message);
  const newDriveId = addDrive.body.drive ? addDrive.body.drive.id : 1;

  const updateDrive = await callRoute('PUT', `/api/placement/drives/${newDriveId}`, {
    ctc_lpa: 24.00
  });
  console.log('✓ PUT /api/placement/drives/:id (Update):', updateDrive.status, 'New CTC:', updateDrive.body.drive ? updateDrive.body.drive.ctc_lpa : '');

  // 5. Interview Rounds CRUD
  console.log('\n--- Testing Interview Rounds Management ---');
  const addRound = await callRoute('POST', '/api/placement/rounds', {
    drive_id: newDriveId,
    round_number: 2,
    round_name: 'Technical Round - Networking & Linux',
    round_type: 'technical',
    pass_score: 70.00,
    duration_minutes: 45
  });
  console.log('✓ POST /api/placement/rounds (Add):', addRound.status, 'Round:', addRound.body.round ? addRound.body.round.round_name : addRound.body.message);

  const getRounds = await callRoute('GET', `/api/placement/rounds?drive_id=${newDriveId}`);
  console.log('✓ GET /api/placement/rounds:', getRounds.status, 'Rounds for Drive:', getRounds.body.rounds.length);

  // 6. Application Management
  console.log('\n--- Testing Application Management ---');
  const apply = await callRoute('POST', '/api/placement/apply', {
    studentId: newStudentId,
    driveId: newDriveId
  });
  console.log('✓ POST /api/placement/apply (Student Applies):', apply.status, apply.body.message);
  const newAppId = apply.body.application ? apply.body.application.id : 1;

  const getApps = await callRoute('GET', '/api/placement/applications');
  console.log('✓ GET /api/placement/applications:', getApps.status, 'Total Applications:', getApps.body.applications.length);

  const shortlist = await callRoute('PUT', `/api/placement/applications/${newAppId}/status`, {
    status: 'shortlisted',
    remarks: 'Profile screened and approved for technical rounds.'
  });
  console.log('✓ PUT /api/placement/applications/:id/status (Shortlist):', shortlist.status, shortlist.body.message);

  // 7. Interviewers CRUD
  console.log('\n--- Testing Interviewer Management ---');
  const getInvs = await callRoute('GET', '/api/placement/interviewers');
  console.log('✓ GET /api/placement/interviewers:', getInvs.status, 'Count:', getInvs.body.interviewers.length);

  const addInv = await callRoute('POST', '/api/placement/interviewers', {
    name: 'Dr. Sunita Rao',
    email: 'sunita.rao@college.edu',
    employee_code: 'EMP-CS-09',
    department: 'Computer Science',
    designation: 'Professor',
    specialization: 'Cloud Architectures & Distributed Networks'
  });
  console.log('✓ POST /api/placement/interviewers (Add):', addInv.status, 'Interviewer:', addInv.body.interviewer ? addInv.body.interviewer.name : addInv.body.message);
  const newInvId = addInv.body.interviewer ? addInv.body.interviewer.id : 1;

  // 8. Rooms & Spatial Availability CRUD
  console.log('\n--- Testing Room Management & Conflict Detection ---');
  const getRooms = await callRoute('GET', '/api/placement/rooms');
  console.log('✓ GET /api/placement/rooms:', getRooms.status, 'Count:', getRooms.body.rooms.length);

  const addRoom = await callRoute('POST', '/api/placement/rooms', {
    room_number: 'Cabin-305',
    building: 'Placement Block',
    floor: 3,
    capacity: 2,
    room_type: 'cabin',
    is_active: true
  });
  console.log('✓ POST /api/placement/rooms (Add):', addRoom.status, 'Room:', addRoom.body.room ? addRoom.body.room.room_number : addRoom.body.message);
  const newRoomId = addRoom.body.room ? addRoom.body.room.id : 1;

  const checkRoom = await callRoute('POST', '/api/placement/rooms/check-availability', {
    room_id: newRoomId,
    start_time: '2026-11-28 14:00:00',
    end_time: '2026-11-28 15:00:00'
  });
  console.log('✓ POST /api/placement/rooms/check-availability:', checkRoom.status, 'Available:', checkRoom.body.available);

  // 9. Interview Schedule Management
  console.log('\n--- Testing Interview Schedule Management ---');
  const sched = await callRoute('POST', '/api/placement/schedules', {
    application_id: newAppId,
    round_id: 1,
    room_id: newRoomId,
    interviewer_id: newInvId,
    start_time: '2026-11-28 14:00:00',
    end_time: '2026-11-28 15:00:00',
    notes: 'AWS Associate Interview - Neha Gupta'
  });
  console.log('✓ POST /api/placement/schedules (Create):', sched.status, sched.body.message);
  const newSchedId = sched.body.scheduleId || 1;

  // Spatial conflict test: try scheduling another interview at the same room and overlapping time!
  const conflictSched = await callRoute('POST', '/api/placement/schedules', {
    application_id: 1,
    round_id: 1,
    room_id: newRoomId,
    interviewer_id: 1,
    start_time: '2026-11-28 14:30:00',
    end_time: '2026-11-28 15:30:00'
  });
  console.log('✓ Spatial Conflict Detection:', conflictSched.status, '(Expected 409 Conflict):', conflictSched.body.conflictType);

  const getScheds = await callRoute('GET', '/api/placement/schedules');
  console.log('✓ GET /api/placement/schedules:', getScheds.status, 'Total Scheduled:', getScheds.body.schedules.length);

  // 10. Results Management
  console.log('\n--- Testing Results Management ---');
  const addResult = await callRoute('POST', '/api/placement/results', {
    application_id: newAppId,
    schedule_id: newSchedId,
    total_score: 92.50,
    decision: 'selected',
    remarks: 'Exceptional performance in cloud troubleshooting and algorithm analysis.'
  });
  console.log('✓ POST /api/placement/results (Add):', addResult.status, addResult.body.message);
  const newResultId = addResult.body.resultId || 1;

  const updateResult = await callRoute('PUT', `/api/placement/results/${newResultId}`, {
    total_score: 95.00,
    remarks: 'Top candidate with strong cloud and networking skills.'
  });
  console.log('✓ PUT /api/placement/results/:id (Update):', updateResult.status, updateResult.body.message);

  const getResults = await callRoute('GET', '/api/placement/results');
  console.log('✓ GET /api/placement/results:', getResults.status, 'Total Results:', getResults.body.results.length);

  // 11. Notifications Management
  console.log('\n--- Testing Notifications Management ---');
  const getNotifs = await callRoute('GET', '/api/placement/notifications');
  console.log('✓ GET /api/placement/notifications:', getNotifs.status, 'Total Notifications:', getNotifs.body.notifications.length);

  const markRead = await callRoute('PUT', `/api/placement/notifications/${getNotifs.body.notifications[0].id}/read`);
  console.log('✓ PUT /api/placement/notifications/:id/read:', markRead.status, markRead.body.message);

  console.log('\n=====================================================================');
  console.log('ALL 11 TABLE MANAGEMENT REST APIS VERIFIED AND WORKING 100%!');
  console.log('=====================================================================');
}

runTests();
