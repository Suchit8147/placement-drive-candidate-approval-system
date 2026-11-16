const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { checkIntervalConflict } = require('../algorithms/intervalDetection');

// =================== INTERVIEWERS ===================

// GET /api/placement/interviewers - List all interviewers
async function getAllInterviewers(req, res) {
  try {
    if (db.isMySQLConnected()) {
      const sql = `
        SELECT i.*, u.email,
               (SELECT COUNT(*) FROM InterviewSchedules sch WHERE sch.interviewer_id = i.id) as total_interviews
        FROM Interviewers i
        JOIN Users u ON i.user_id = u.id
        ORDER BY i.id ASC
      `;
      const rows = await db.query(sql);
      return res.json({ success: true, interviewers: rows || [] });
    }

    const inMem = db.getInMemStore();
    const list = inMem.Interviewers.map(i => {
      const user = inMem.Users.find(u => u.id === i.user_id);
      const count = inMem.InterviewSchedules.filter(s => s.interviewer_id === i.id).length;
      return {
        ...i,
        email: user ? user.email : '',
        total_interviews: count
      };
    });
    res.json({ success: true, interviewers: list });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to retrieve interviewers: ' + err.message });
  }
}

// GET /api/placement/interviewers/:id
async function getInterviewerById(req, res) {
  try {
    const interviewerId = parseInt(req.params.id, 10);
    if (isNaN(interviewerId)) {
      return res.status(400).json({ success: false, message: 'Invalid interviewer ID.' });
    }

    if (db.isMySQLConnected()) {
      const sql = `
        SELECT i.*, u.email
        FROM Interviewers i
        JOIN Users u ON i.user_id = u.id
        WHERE i.id = ?
      `;
      const rows = await db.query(sql, [interviewerId]);
      if (!rows || rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Interviewer not found.' });
      }
      return res.json({ success: true, interviewer: rows[0] });
    }

    const inMem = db.getInMemStore();
    const inv = inMem.Interviewers.find(i => i.id === interviewerId);
    if (!inv) {
      return res.status(404).json({ success: false, message: 'Interviewer not found.' });
    }
    const user = inMem.Users.find(u => u.id === inv.user_id);
    res.json({ success: true, interviewer: { ...inv, email: user ? user.email : '' } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to retrieve interviewer: ' + err.message });
  }
}

// POST /api/placement/interviewers - Add interviewer
async function createInterviewer(req, res) {
  try {
    const {
      name,
      email,
      employee_code,
      department,
      designation,
      specialization = null,
      password = 'Panel@123'
    } = req.body;

    if (!name || !email || !employee_code || !department || !designation) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: name, email, employee_code, department, designation.'
      });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    if (db.isMySQLConnected()) {
      // Check existing email
      const uCheck = await db.query('SELECT id FROM Users WHERE email = ?', [email]);
      if (uCheck && uCheck.length > 0) {
        return res.status(409).json({ success: false, message: `Email '${email}' is already registered.` });
      }

      // Check existing code
      const cCheck = await db.query('SELECT id FROM Interviewers WHERE employee_code = ?', [employee_code]);
      if (cCheck && cCheck.length > 0) {
        return res.status(409).json({ success: false, message: `Employee code '${employee_code}' already exists.` });
      }

      const uRes = await db.query(
        'INSERT INTO Users (email, password, role) VALUES (?, ?, ?)',
        [email, passwordHash, 'interviewer']
      );
      const newUserId = uRes.insertId;

      const iRes = await db.query(
        `INSERT INTO Interviewers (user_id, employee_code, name, department, designation, specialization)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [newUserId, employee_code, name, department, designation, specialization]
      );

      const created = {
        id: iRes.insertId,
        user_id: newUserId,
        employee_code,
        name,
        department,
        designation,
        specialization,
        email
      };

      return res.status(201).json({
        success: true,
        message: 'Interviewer registered successfully.',
        interviewer: created
      });
    }

    // In-memory fallback
    const inMem = db.getInMemStore();
    if (inMem.Users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
      return res.status(409).json({ success: false, message: `Email '${email}' is already registered.` });
    }
    if (inMem.Interviewers.some(i => i.employee_code.toLowerCase() === employee_code.toLowerCase())) {
      return res.status(409).json({ success: false, message: `Employee code '${employee_code}' already exists.` });
    }

    const newUserId = inMem.Users.length + 1;
    inMem.Users.push({
      id: newUserId,
      email,
      password: passwordHash,
      role: 'interviewer',
      created_at: new Date()
    });

    const newInvId = inMem.Interviewers.length + 1;
    const newInv = {
      id: newInvId,
      user_id: newUserId,
      employee_code,
      name,
      department,
      designation,
      specialization
    };
    inMem.Interviewers.push(newInv);

    res.status(201).json({
      success: true,
      message: 'Interviewer registered successfully.',
      interviewer: { ...newInv, email }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to create interviewer: ' + err.message });
  }
}

// PUT /api/placement/interviewers/:id
async function updateInterviewer(req, res) {
  try {
    const interviewerId = parseInt(req.params.id, 10);
    if (isNaN(interviewerId)) {
      return res.status(400).json({ success: false, message: 'Invalid interviewer ID.' });
    }

    const { employee_code, name, department, designation, specialization, email } = req.body;

    if (db.isMySQLConnected()) {
      const existing = await db.query('SELECT * FROM Interviewers WHERE id = ?', [interviewerId]);
      if (!existing || existing.length === 0) {
        return res.status(404).json({ success: false, message: 'Interviewer not found.' });
      }

      await db.query(
        `UPDATE Interviewers 
         SET employee_code = COALESCE(?, employee_code),
             name = COALESCE(?, name),
             department = COALESCE(?, department),
             designation = COALESCE(?, designation),
             specialization = COALESCE(?, specialization)
         WHERE id = ?`,
        [
          employee_code !== undefined ? employee_code : null,
          name !== undefined ? name : null,
          department !== undefined ? department : null,
          designation !== undefined ? designation : null,
          specialization !== undefined ? specialization : null,
          interviewerId
        ]
      );

      if (email) {
        await db.query('UPDATE Users SET email = ? WHERE id = ?', [email, existing[0].user_id]);
      }

      const updated = await db.query('SELECT * FROM Interviewers WHERE id = ?', [interviewerId]);
      return res.json({
        success: true,
        message: 'Interviewer updated successfully.',
        interviewer: updated[0]
      });
    }

    // In-memory fallback
    const inMem = db.getInMemStore();
    const inv = inMem.Interviewers.find(i => i.id === interviewerId);
    if (!inv) {
      return res.status(404).json({ success: false, message: 'Interviewer not found.' });
    }

    if (employee_code !== undefined) inv.employee_code = employee_code;
    if (name !== undefined) inv.name = name;
    if (department !== undefined) inv.department = department;
    if (designation !== undefined) inv.designation = designation;
    if (specialization !== undefined) inv.specialization = specialization;

    const user = inMem.Users.find(u => u.id === inv.user_id);
    if (user && email) user.email = email;

    res.json({
      success: true,
      message: 'Interviewer updated successfully.',
      interviewer: { ...inv, email: user ? user.email : '' }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update interviewer: ' + err.message });
  }
}

// DELETE /api/placement/interviewers/:id
async function deleteInterviewer(req, res) {
  try {
    const interviewerId = parseInt(req.params.id, 10);
    if (isNaN(interviewerId)) {
      return res.status(400).json({ success: false, message: 'Invalid interviewer ID.' });
    }

    if (db.isMySQLConnected()) {
      const existing = await db.query('SELECT * FROM Interviewers WHERE id = ?', [interviewerId]);
      if (!existing || existing.length === 0) {
        return res.status(404).json({ success: false, message: 'Interviewer not found.' });
      }

      await db.query('DELETE FROM Users WHERE id = ?', [existing[0].user_id]);
      return res.json({ success: true, message: `Interviewer #${interviewerId} deleted successfully.` });
    }

    const inMem = db.getInMemStore();
    const idx = inMem.Interviewers.findIndex(i => i.id === interviewerId);
    if (idx === -1) {
      return res.status(404).json({ success: false, message: 'Interviewer not found.' });
    }
    const inv = inMem.Interviewers[idx];
    inMem.Interviewers.splice(idx, 1);
    const uIdx = inMem.Users.findIndex(u => u.id === inv.user_id);
    if (uIdx !== -1) inMem.Users.splice(uIdx, 1);

    res.json({ success: true, message: `Interviewer #${interviewerId} deleted successfully.` });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete interviewer: ' + err.message });
  }
}

// =================== INTERVIEW SCHEDULES ===================

// GET /api/placement/schedules - List interview schedules
async function getAllSchedules(req, res) {
  try {
    const { interviewer_id, student_id, drive_id, room_id, status } = req.query;

    if (db.isMySQLConnected()) {
      let sql = `
        SELECT sch.*,
               a.student_id, a.drive_id,
               s.name as student_name, s.usn, s.department as student_dept, s.cgpa, s.resume_url,
               pd.title as drive_title, pd.job_role,
               c.company_name,
               ir.round_name, ir.round_number, ir.round_type,
               r.room_number, r.building, r.floor, r.room_type,
               inv.name as interviewer_name, inv.employee_code, inv.designation as interviewer_designation
        FROM InterviewSchedules sch
        JOIN Applications a ON sch.application_id = a.id
        JOIN Students s ON a.student_id = s.id
        JOIN PlacementDrives pd ON a.drive_id = pd.id
        JOIN Companies c ON pd.company_id = c.id
        JOIN InterviewRounds ir ON sch.round_id = ir.id
        JOIN Rooms r ON sch.room_id = r.id
        JOIN Interviewers inv ON sch.interviewer_id = inv.id
        WHERE 1=1
      `;
      const params = [];

      if (interviewer_id) {
        sql += ' AND sch.interviewer_id = ?';
        params.push(parseInt(interviewer_id, 10));
      }
      if (student_id) {
        sql += ' AND a.student_id = ?';
        params.push(parseInt(student_id, 10));
      }
      if (drive_id) {
        sql += ' AND a.drive_id = ?';
        params.push(parseInt(drive_id, 10));
      }
      if (room_id) {
        sql += ' AND sch.room_id = ?';
        params.push(parseInt(room_id, 10));
      }
      if (status) {
        sql += ' AND sch.status = ?';
        params.push(status);
      }

      sql += ' ORDER BY sch.start_time ASC';
      const rows = await db.query(sql, params);
      return res.json({ success: true, schedules: rows || [] });
    }

    // In-memory fallback
    const inMem = db.getInMemStore();
    let schedules = inMem.InterviewSchedules;

    if (interviewer_id) {
      schedules = schedules.filter(s => s.interviewer_id === parseInt(interviewer_id, 10));
    }
    if (room_id) {
      schedules = schedules.filter(s => s.room_id === parseInt(room_id, 10));
    }
    if (status) {
      schedules = schedules.filter(s => s.status === status);
    }

    const mapped = schedules.map(sch => {
      const app = inMem.Applications.find(a => a.id === sch.application_id);
      const student = app ? inMem.Students.find(s => s.id === app.student_id) : null;
      const drive = app ? inMem.PlacementDrives.find(d => d.id === app.drive_id) : null;
      const comp = drive ? inMem.Companies.find(c => c.id === drive.company_id) : null;
      const round = inMem.InterviewRounds.find(r => r.id === sch.round_id);
      const room = inMem.Rooms.find(r => r.id === sch.room_id);
      const inv = inMem.Interviewers.find(i => i.id === sch.interviewer_id);

      return {
        ...sch,
        student_id: app ? app.student_id : null,
        drive_id: app ? app.drive_id : null,
        student_name: student ? student.name : 'Unknown',
        usn: student ? student.usn : '',
        student_dept: student ? student.department : '',
        cgpa: student ? student.cgpa : null,
        resume_url: student ? student.resume_url : '',
        drive_title: drive ? drive.title : '',
        job_role: drive ? drive.job_role : '',
        company_name: comp ? comp.company_name : '',
        round_name: round ? round.round_name : '',
        round_number: round ? round.round_number : 1,
        room_number: room ? room.room_number : '',
        building: room ? room.building : '',
        interviewer_name: inv ? inv.name : '',
        employee_code: inv ? inv.employee_code : ''
      };
    });

    if (student_id) {
      return res.json({
        success: true,
        schedules: mapped.filter(s => s.student_id === parseInt(student_id, 10))
      });
    }

    res.json({ success: true, schedules: mapped });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to retrieve schedules: ' + err.message });
  }
}

// POST /api/placement/schedules - Create interview schedule with Conflict Resource Allocation Check
async function createSchedule(req, res) {
  try {
    const {
      application_id,
      round_id,
      room_id,
      interviewer_id,
      start_time,
      end_time,
      notes = null
    } = req.body;

    if (!application_id || !round_id || !room_id || !interviewer_id || !start_time || !end_time) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: application_id, round_id, room_id, interviewer_id, start_time, end_time.'
      });
    }

    const parsedAppId = parseInt(application_id, 10);
    const parsedRoundId = parseInt(round_id, 10);
    const parsedRoomId = parseInt(room_id, 10);
    const parsedInvId = parseInt(interviewer_id, 10);

    const sTime = new Date(start_time).getTime();
    const eTime = new Date(end_time).getTime();
    if (isNaN(sTime) || isNaN(eTime) || eTime <= sTime) {
      return res.status(400).json({
        success: false,
        message: 'Invalid time window: end_time must be strictly after start_time.'
      });
    }

    if (db.isMySQLConnected()) {
      // 1. Check Spatial Conflict: Room Collision
      const roomConflicts = await db.query(
        `SELECT * FROM InterviewSchedules
         WHERE room_id = ? AND status = 'scheduled'
           AND (start_time < ? AND end_time > ?)`,
        [parsedRoomId, end_time, start_time]
      );
      if (roomConflicts && roomConflicts.length > 0) {
        return res.status(409).json({
          success: false,
          conflictType: 'ROOM_CONFLICT',
          message: `Spatial Conflict Detected: Room #${parsedRoomId} is already scheduled between ${roomConflicts[0].start_time} and ${roomConflicts[0].end_time}.`,
          conflictingSchedule: roomConflicts[0]
        });
      }

      // 2. Check Personnel Conflict: Interviewer Panel Collision
      const invConflicts = await db.query(
        `SELECT * FROM InterviewSchedules
         WHERE interviewer_id = ? AND status = 'scheduled'
           AND (start_time < ? AND end_time > ?)`,
        [parsedInvId, end_time, start_time]
      );
      if (invConflicts && invConflicts.length > 0) {
        return res.status(409).json({
          success: false,
          conflictType: 'INTERVIEWER_CONFLICT',
          message: `Interviewer Conflict Detected: Interviewer #${parsedInvId} is already booked on another panel during this window.`,
          conflictingSchedule: invConflicts[0]
        });
      }

      // 3. Check Candidate Double-Booking Collision
      const appRows = await db.query('SELECT * FROM Applications WHERE id = ?', [parsedAppId]);
      if (!appRows || appRows.length === 0) {
        return res.status(404).json({ success: false, message: 'Application not found.' });
      }
      const app = appRows[0];

      const candConflicts = await db.query(
        `SELECT sch.*, pd.title as drive_title
         FROM InterviewSchedules sch
         JOIN Applications a ON sch.application_id = a.id
         JOIN PlacementDrives pd ON a.drive_id = pd.id
         WHERE a.student_id = ? AND sch.status = 'scheduled'
           AND (sch.start_time < ? AND sch.end_time > ?)`,
        [app.student_id, end_time, start_time]
      );
      if (candConflicts && candConflicts.length > 0) {
        return res.status(409).json({
          success: false,
          conflictType: 'CANDIDATE_DOUBLE_BOOKING',
          message: `Candidate Double-Booking Conflict: Student #${app.student_id} is already in an interview for '${candConflicts[0].drive_title}' at this time.`,
          conflictingSchedule: candConflicts[0]
        });
      }

      // 4. Zero Conflict Guaranteed -> Insert Schedule
      const insertRes = await db.query(
        `INSERT INTO InterviewSchedules 
         (application_id, round_id, room_id, interviewer_id, start_time, end_time, status, notes)
         VALUES (?, ?, ?, ?, ?, ?, 'scheduled', ?)`,
        [parsedAppId, parsedRoundId, parsedRoomId, parsedInvId, start_time, end_time, notes]
      );
      const newScheduleId = insertRes.insertId;

      // Update Application status
      await db.query(
        `UPDATE Applications SET status = 'in_progress', current_round_id = ? WHERE id = ?`,
        [parsedRoundId, parsedAppId]
      );

      // Notify Student
      const student = (await db.query('SELECT user_id FROM Students WHERE id = ?', [app.student_id]))[0];
      const room = (await db.query('SELECT room_number, building FROM Rooms WHERE id = ?', [parsedRoomId]))[0];
      if (student) {
        await db.query(
          'INSERT INTO Notifications (user_id, title, message) VALUES (?, ?, ?)',
          [
            student.user_id,
            'Interview Scheduled',
            `Your interview has been scheduled in ${room ? room.room_number : 'Room'} (${room ? room.building : ''}) from ${start_time} to ${end_time}.`
          ]
        );
      }

      return res.status(201).json({
        success: true,
        message: 'Conflict-Free Interview Scheduled successfully.',
        scheduleId: newScheduleId
      });
    }

    // In-memory fallback with DSA Interval Conflict Detection
    const inMem = db.getInMemStore();
    const app = inMem.Applications.find(a => a.id === parsedAppId);
    if (!app) {
      return res.status(404).json({ success: false, message: 'Application not found.' });
    }

    const existingForRoom = inMem.InterviewSchedules.filter(s => s.room_id === parsedRoomId && s.status === 'scheduled');
    const roomCheck = checkIntervalConflict({
      roomId: parsedRoomId,
      startTime: start_time,
      endTime: end_time,
      existingSchedules: existingForRoom
    });

    if (roomCheck.hasConflict) {
      return res.status(409).json({
        success: false,
        conflictType: 'ROOM_CONFLICT',
        message: `Spatial Conflict: Room #${parsedRoomId} is already occupied in this interval.`,
        details: roomCheck.conflictingSchedules
      });
    }

    const newSched = {
      id: inMem.InterviewSchedules.length + 1,
      application_id: parsedAppId,
      round_id: parsedRoundId,
      room_id: parsedRoomId,
      interviewer_id: parsedInvId,
      start_time,
      end_time,
      status: 'scheduled',
      notes,
      created_at: new Date()
    };
    inMem.InterviewSchedules.push(newSched);

    app.status = 'in_progress';
    app.current_round_id = parsedRoundId;

    const student = inMem.Students.find(s => s.id === app.student_id);
    if (student) {
      inMem.Notifications.push({
        id: inMem.Notifications.length + 1,
        user_id: student.user_id,
        title: 'Interview Scheduled',
        message: `Your interview has been scheduled from ${start_time} to ${end_time}.`,
        status: 'unread',
        created_at: new Date()
      });
    }

    res.status(201).json({
      success: true,
      message: 'Conflict-Free Interview Scheduled successfully.',
      scheduleId: newSched.id
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Scheduling failed: ' + err.message });
  }
}

// PUT /api/placement/schedules/:id - Update schedule
async function updateSchedule(req, res) {
  try {
    const scheduleId = parseInt(req.params.id, 10);
    if (isNaN(scheduleId)) {
      return res.status(400).json({ success: false, message: 'Invalid schedule ID.' });
    }

    const { room_id, interviewer_id, start_time, end_time, status, notes } = req.body;

    if (db.isMySQLConnected()) {
      await db.query(
        `UPDATE InterviewSchedules 
         SET room_id = COALESCE(?, room_id),
             interviewer_id = COALESCE(?, interviewer_id),
             start_time = COALESCE(?, start_time),
             end_time = COALESCE(?, end_time),
             status = COALESCE(?, status),
             notes = COALESCE(?, notes)
         WHERE id = ?`,
        [
          room_id !== undefined ? parseInt(room_id, 10) : null,
          interviewer_id !== undefined ? parseInt(interviewer_id, 10) : null,
          start_time !== undefined ? start_time : null,
          end_time !== undefined ? end_time : null,
          status !== undefined ? status : null,
          notes !== undefined ? notes : null,
          scheduleId
        ]
      );

      const updated = await db.query('SELECT * FROM InterviewSchedules WHERE id = ?', [scheduleId]);
      return res.json({
        success: true,
        message: 'Interview schedule updated successfully.',
        schedule: updated[0]
      });
    }

    const inMem = db.getInMemStore();
    const sch = inMem.InterviewSchedules.find(s => s.id === scheduleId);
    if (!sch) {
      return res.status(404).json({ success: false, message: 'Schedule not found.' });
    }

    if (room_id !== undefined) sch.room_id = parseInt(room_id, 10);
    if (interviewer_id !== undefined) sch.interviewer_id = parseInt(interviewer_id, 10);
    if (start_time !== undefined) sch.start_time = start_time;
    if (end_time !== undefined) sch.end_time = end_time;
    if (status !== undefined) sch.status = status;
    if (notes !== undefined) sch.notes = notes;

    res.json({
      success: true,
      message: 'Interview schedule updated successfully.',
      schedule: sch
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update schedule: ' + err.message });
  }
}

// DELETE /api/placement/schedules/:id - Delete schedule
async function deleteSchedule(req, res) {
  try {
    const scheduleId = parseInt(req.params.id, 10);
    if (isNaN(scheduleId)) {
      return res.status(400).json({ success: false, message: 'Invalid schedule ID.' });
    }

    if (db.isMySQLConnected()) {
      await db.query('DELETE FROM InterviewSchedules WHERE id = ?', [scheduleId]);
      return res.json({ success: true, message: `Interview schedule #${scheduleId} cancelled / deleted.` });
    }

    const inMem = db.getInMemStore();
    const idx = inMem.InterviewSchedules.findIndex(s => s.id === scheduleId);
    if (idx === -1) {
      return res.status(404).json({ success: false, message: 'Schedule not found.' });
    }
    inMem.InterviewSchedules.splice(idx, 1);

    res.json({ success: true, message: `Interview schedule #${scheduleId} cancelled / deleted.` });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete schedule: ' + err.message });
  }
}

module.exports = {
  getAllInterviewers,
  getInterviewerById,
  createInterviewer,
  updateInterviewer,
  deleteInterviewer,
  getAllSchedules,
  createSchedule,
  updateSchedule,
  deleteSchedule
};
