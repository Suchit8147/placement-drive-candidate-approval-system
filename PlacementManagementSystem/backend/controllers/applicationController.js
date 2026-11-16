const db = require('../config/db');

// GET /api/placement/applications - List all applications
async function getAllApplications(req, res) {
  try {
    const { student_id, drive_id, company_id, status } = req.query;

    if (db.isMySQLConnected()) {
      let sql = `
        SELECT a.*,
               s.name as student_name, s.usn, s.department as student_dept, s.cgpa, s.resume_url, s.phone as student_phone,
               pd.title as drive_title, pd.job_role, pd.ctc_lpa, pd.min_cgpa, pd.drive_date,
               c.id as company_id, c.company_name, c.contact_person,
               ir.round_name as current_round_name, ir.round_number as current_round_number
        FROM Applications a
        JOIN Students s ON a.student_id = s.id
        JOIN PlacementDrives pd ON a.drive_id = pd.id
        JOIN Companies c ON pd.company_id = c.id
        LEFT JOIN InterviewRounds ir ON a.current_round_id = ir.id
        WHERE 1=1
      `;
      const params = [];

      if (student_id) {
        sql += ' AND a.student_id = ?';
        params.push(parseInt(student_id, 10));
      }
      if (drive_id) {
        sql += ' AND a.drive_id = ?';
        params.push(parseInt(drive_id, 10));
      }
      if (company_id) {
        sql += ' AND pd.company_id = ?';
        params.push(parseInt(company_id, 10));
      }
      if (status) {
        sql += ' AND a.status = ?';
        params.push(status);
      }

      sql += ' ORDER BY a.id ASC';
      const rows = await db.query(sql, params);
      return res.json({ success: true, applications: rows || [] });
    }

    // In-memory fallback
    const inMem = db.getInMemStore();
    let apps = inMem.Applications;

    if (student_id) {
      apps = apps.filter(a => a.student_id === parseInt(student_id, 10));
    }
    if (drive_id) {
      apps = apps.filter(a => a.drive_id === parseInt(drive_id, 10));
    }
    if (status) {
      apps = apps.filter(a => a.status === status);
    }

    const mapped = apps.map(a => {
      const student = inMem.Students.find(s => s.id === a.student_id);
      const drive = inMem.PlacementDrives.find(d => d.id === a.drive_id);
      const company = drive ? inMem.Companies.find(c => c.id === drive.company_id) : null;
      const round = a.current_round_id ? inMem.InterviewRounds.find(r => r.id === a.current_round_id) : null;

      return {
        ...a,
        student_name: student ? student.name : 'Unknown',
        usn: student ? student.usn : '',
        student_dept: student ? student.department : '',
        cgpa: student ? student.cgpa : null,
        resume_url: student ? student.resume_url : '',
        student_phone: student ? student.phone : '',
        drive_title: drive ? drive.title : '',
        job_role: drive ? drive.job_role : '',
        ctc_lpa: drive ? drive.ctc_lpa : null,
        min_cgpa: drive ? drive.min_cgpa : null,
        drive_date: drive ? drive.drive_date : '',
        company_id: company ? company.id : null,
        company_name: company ? company.company_name : '',
        contact_person: company ? company.contact_person : '',
        current_round_name: round ? round.round_name : null,
        current_round_number: round ? round.round_number : null
      };
    });

    if (company_id) {
      return res.json({
        success: true,
        applications: mapped.filter(a => a.company_id === parseInt(company_id, 10))
      });
    }

    res.json({ success: true, applications: mapped });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to retrieve applications: ' + err.message });
  }
}

// GET /api/placement/applications/:id
async function getApplicationById(req, res) {
  try {
    const appId = parseInt(req.params.id, 10);
    if (isNaN(appId)) {
      return res.status(400).json({ success: false, message: 'Invalid application ID.' });
    }

    if (db.isMySQLConnected()) {
      const sql = `
        SELECT a.*,
               s.name as student_name, s.usn, s.department as student_dept, s.cgpa, s.resume_url,
               pd.title as drive_title, pd.job_role, pd.ctc_lpa,
               c.company_name,
               ir.round_name as current_round_name
        FROM Applications a
        JOIN Students s ON a.student_id = s.id
        JOIN PlacementDrives pd ON a.drive_id = pd.id
        JOIN Companies c ON pd.company_id = c.id
        LEFT JOIN InterviewRounds ir ON a.current_round_id = ir.id
        WHERE a.id = ?
      `;
      const rows = await db.query(sql, [appId]);
      if (!rows || rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Application not found.' });
      }
      return res.json({ success: true, application: rows[0] });
    }

    const inMem = db.getInMemStore();
    const a = inMem.Applications.find(app => app.id === appId);
    if (!a) {
      return res.status(404).json({ success: false, message: 'Application not found.' });
    }

    const student = inMem.Students.find(s => s.id === a.student_id);
    const drive = inMem.PlacementDrives.find(d => d.id === a.drive_id);
    const company = drive ? inMem.Companies.find(c => c.id === drive.company_id) : null;
    const round = a.current_round_id ? inMem.InterviewRounds.find(r => r.id === a.current_round_id) : null;

    res.json({
      success: true,
      application: {
        ...a,
        student_name: student ? student.name : 'Unknown',
        usn: student ? student.usn : '',
        student_dept: student ? student.department : '',
        cgpa: student ? student.cgpa : null,
        resume_url: student ? student.resume_url : '',
        drive_title: drive ? drive.title : '',
        job_role: drive ? drive.job_role : '',
        ctc_lpa: drive ? drive.ctc_lpa : null,
        company_name: company ? company.company_name : '',
        current_round_name: round ? round.round_name : null
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to retrieve application: ' + err.message });
  }
}

// POST /api/placement/apply or /applications - Apply for placement drive
async function applyForDrive(req, res) {
  try {
    const studentId = parseInt(req.body.studentId || req.body.student_id, 10);
    const driveId = parseInt(req.body.driveId || req.body.drive_id, 10);

    if (!studentId || !driveId || isNaN(studentId) || isNaN(driveId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid studentId and driveId are required.'
      });
    }

    if (db.isMySQLConnected()) {
      // 1. Verify student exists and check eligibility
      const studentRows = await db.query('SELECT * FROM Students WHERE id = ?', [studentId]);
      if (!studentRows || studentRows.length === 0) {
        return res.status(404).json({ success: false, message: 'Student not found.' });
      }
      const student = studentRows[0];

      // 2. Verify drive exists and check CGPA cutoff
      const driveRows = await db.query(
        'SELECT pd.*, c.company_name FROM PlacementDrives pd JOIN Companies c ON pd.company_id = c.id WHERE pd.id = ?',
        [driveId]
      );
      if (!driveRows || driveRows.length === 0) {
        return res.status(404).json({ success: false, message: 'Placement drive not found.' });
      }
      const drive = driveRows[0];

      if (parseFloat(student.cgpa) < parseFloat(drive.min_cgpa)) {
        return res.status(400).json({
          success: false,
          message: `Ineligible: Your CGPA (${student.cgpa}) is below the minimum cutoff requirement of ${drive.min_cgpa} for this drive.`
        });
      }

      // 3. Check for existing application
      const existing = await db.query(
        'SELECT id FROM Applications WHERE student_id = ? AND drive_id = ?',
        [studentId, driveId]
      );
      if (existing && existing.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'You have already applied for this placement drive.'
        });
      }

      // 4. Find first interview round for this drive (if any)
      const rounds = await db.query(
        'SELECT id FROM InterviewRounds WHERE drive_id = ? ORDER BY round_number ASC LIMIT 1',
        [driveId]
      );
      const firstRoundId = rounds && rounds.length > 0 ? rounds[0].id : null;

      // 5. Insert Application
      const insertRes = await db.query(
        'INSERT INTO Applications (drive_id, student_id, status, current_round_id) VALUES (?, ?, ?, ?)',
        [driveId, studentId, 'applied', firstRoundId]
      );
      const newAppId = insertRes.insertId;

      // 6. Send notification to student
      await db.query(
        'INSERT INTO Notifications (user_id, title, message) VALUES (?, ?, ?)',
        [
          student.user_id,
          'Application Submitted',
          `Your application for ${drive.company_name} (${drive.title}) was successfully registered.`
        ]
      );

      const created = {
        id: newAppId,
        drive_id: driveId,
        student_id: studentId,
        status: 'applied',
        current_round_id: firstRoundId,
        applied_at: new Date()
      };

      return res.status(201).json({
        success: true,
        message: 'Application submitted successfully.',
        application: created
      });
    }

    // In-memory fallback
    const inMem = db.getInMemStore();
    const student = inMem.Students.find(s => s.id === studentId);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    const drive = inMem.PlacementDrives.find(d => d.id === driveId);
    if (!drive) {
      return res.status(404).json({ success: false, message: 'Placement drive not found.' });
    }

    if (parseFloat(student.cgpa) < parseFloat(drive.min_cgpa)) {
      return res.status(400).json({
        success: false,
        message: `Ineligible: Your CGPA (${student.cgpa}) is below the minimum cutoff requirement of ${drive.min_cgpa} for this drive.`
      });
    }

    const alreadyApplied = inMem.Applications.find(a => a.student_id === studentId && a.drive_id === driveId);
    if (alreadyApplied) {
      return res.status(409).json({ success: false, message: 'You have already applied for this placement drive.' });
    }

    const firstRound = inMem.InterviewRounds.find(r => r.drive_id === driveId && r.round_number === 1);
    const newApp = {
      id: inMem.Applications.length + 1,
      drive_id: driveId,
      student_id: studentId,
      status: 'applied',
      current_round_id: firstRound ? firstRound.id : null,
      applied_at: new Date()
    };
    inMem.Applications.push(newApp);

    inMem.Notifications.push({
      id: inMem.Notifications.length + 1,
      user_id: student.user_id,
      title: 'Application Submitted',
      message: `Your application for ${drive.title} was successfully registered.`,
      status: 'unread',
      created_at: new Date()
    });

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully.',
      application: newApp
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Application submission failed: ' + err.message });
  }
}

// PUT /api/placement/applications/:id/status - Approve, reject, or shortlist application
async function updateApplicationStatus(req, res) {
  try {
    const appId = parseInt(req.params.id, 10);
    if (isNaN(appId)) {
      return res.status(400).json({ success: false, message: 'Invalid application ID.' });
    }

    const { status, current_round_id, remarks } = req.body;
    const allowed = ['applied', 'shortlisted', 'in_progress', 'selected', 'rejected'];
    if (!status || !allowed.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${allowed.join(', ')}`
      });
    }

    if (db.isMySQLConnected()) {
      const existing = await db.query(
        `SELECT a.*, s.user_id, s.name as student_name, pd.title as drive_title, c.company_name
         FROM Applications a
         JOIN Students s ON a.student_id = s.id
         JOIN PlacementDrives pd ON a.drive_id = pd.id
         JOIN Companies c ON pd.company_id = c.id
         WHERE a.id = ?`,
        [appId]
      );
      if (!existing || existing.length === 0) {
        return res.status(404).json({ success: false, message: 'Application not found.' });
      }
      const app = existing[0];

      await db.query(
        `UPDATE Applications 
         SET status = ?,
             current_round_id = COALESCE(?, current_round_id),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [status, current_round_id !== undefined ? parseInt(current_round_id, 10) : null, appId]
      );

      // Notification to student
      await db.query(
        'INSERT INTO Notifications (user_id, title, message) VALUES (?, ?, ?)',
        [
          app.user_id,
          `Application Status: ${status.toUpperCase()}`,
          `Your application for ${app.company_name} (${app.drive_title}) has been updated to: ${status.toUpperCase()}.${remarks ? ' Note: ' + remarks : ''}`
        ]
      );

      const updated = await db.query('SELECT * FROM Applications WHERE id = ?', [appId]);
      return res.json({
        success: true,
        message: `Application #${appId} status updated to ${status}.`,
        application: updated[0]
      });
    }

    // In-memory fallback
    const inMem = db.getInMemStore();
    const app = inMem.Applications.find(a => a.id === appId);
    if (!app) {
      return res.status(404).json({ success: false, message: 'Application not found.' });
    }

    app.status = status;
    if (current_round_id !== undefined) app.current_round_id = parseInt(current_round_id, 10);
    app.updated_at = new Date();

    const student = inMem.Students.find(s => s.id === app.student_id);
    const drive = inMem.PlacementDrives.find(d => d.id === app.drive_id);

    if (student) {
      inMem.Notifications.push({
        id: inMem.Notifications.length + 1,
        user_id: student.user_id,
        title: `Application Status: ${status.toUpperCase()}`,
        message: `Your application for ${drive ? drive.title : 'Placement Drive'} has been updated to: ${status.toUpperCase()}.`,
        status: 'unread',
        created_at: new Date()
      });
    }

    res.json({
      success: true,
      message: `Application #${appId} status updated to ${status}.`,
      application: app
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update application status: ' + err.message });
  }
}

// DELETE /api/placement/applications/:id - Cancel or delete application
async function deleteApplication(req, res) {
  try {
    const appId = parseInt(req.params.id, 10);
    if (isNaN(appId)) {
      return res.status(400).json({ success: false, message: 'Invalid application ID.' });
    }

    if (db.isMySQLConnected()) {
      const existing = await db.query('SELECT id FROM Applications WHERE id = ?', [appId]);
      if (!existing || existing.length === 0) {
        return res.status(404).json({ success: false, message: 'Application not found.' });
      }

      await db.query('DELETE FROM Applications WHERE id = ?', [appId]);
      return res.json({ success: true, message: `Application #${appId} deleted successfully.` });
    }

    const inMem = db.getInMemStore();
    const idx = inMem.Applications.findIndex(a => a.id === appId);
    if (idx === -1) {
      return res.status(404).json({ success: false, message: 'Application not found.' });
    }

    inMem.Applications.splice(idx, 1);
    inMem.InterviewSchedules = inMem.InterviewSchedules.filter(s => s.application_id !== appId);
    inMem.Results = inMem.Results.filter(r => r.application_id !== appId);

    res.json({ success: true, message: `Application #${appId} deleted successfully.` });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete application: ' + err.message });
  }
}

module.exports = {
  getAllApplications,
  getApplicationById,
  applyForDrive,
  updateApplicationStatus,
  deleteApplication
};
