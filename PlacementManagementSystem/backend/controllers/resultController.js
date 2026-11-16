const db = require('../config/db');

// GET /api/placement/results - List all results
async function getAllResults(req, res) {
  try {
    const { student_id, drive_id, decision } = req.query;

    if (db.isMySQLConnected()) {
      let sql = `
        SELECT res.*,
               a.student_id, a.drive_id,
               s.name as student_name, s.usn, s.department as student_dept, s.cgpa,
               pd.title as drive_title, pd.job_role, pd.ctc_lpa,
               c.company_name,
               sch.start_time, sch.end_time,
               r.room_number,
               inv.name as interviewer_name
        FROM Results res
        JOIN Applications a ON res.application_id = a.id
        JOIN Students s ON a.student_id = s.id
        JOIN PlacementDrives pd ON a.drive_id = pd.id
        JOIN Companies c ON pd.company_id = c.id
        LEFT JOIN InterviewSchedules sch ON res.schedule_id = sch.id
        LEFT JOIN Rooms r ON sch.room_id = r.id
        LEFT JOIN Interviewers inv ON sch.interviewer_id = inv.id
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
      if (decision) {
        sql += ' AND res.decision = ?';
        params.push(decision);
      }

      sql += ' ORDER BY res.id DESC';
      const rows = await db.query(sql, params);
      return res.json({ success: true, results: rows || [] });
    }

    // In-memory fallback
    const inMem = db.getInMemStore();
    let results = inMem.Results;

    const mapped = results.map(resItem => {
      const app = inMem.Applications.find(a => a.id === resItem.application_id);
      const student = app ? inMem.Students.find(s => s.id === app.student_id) : null;
      const drive = app ? inMem.PlacementDrives.find(d => d.id === app.drive_id) : null;
      const comp = drive ? inMem.Companies.find(c => c.id === drive.company_id) : null;
      const sch = resItem.schedule_id ? inMem.InterviewSchedules.find(s => s.id === resItem.schedule_id) : null;
      const room = sch ? inMem.Rooms.find(r => r.id === sch.room_id) : null;
      const inv = sch ? inMem.Interviewers.find(i => i.id === sch.interviewer_id) : null;

      return {
        ...resItem,
        student_id: app ? app.student_id : null,
        drive_id: app ? app.drive_id : null,
        student_name: student ? student.name : 'Unknown',
        usn: student ? student.usn : '',
        student_dept: student ? student.department : '',
        cgpa: student ? student.cgpa : null,
        drive_title: drive ? drive.title : '',
        job_role: drive ? drive.job_role : '',
        ctc_lpa: drive ? drive.ctc_lpa : null,
        company_name: comp ? comp.company_name : '',
        start_time: sch ? sch.start_time : null,
        end_time: sch ? sch.end_time : null,
        room_number: room ? room.room_number : '',
        interviewer_name: inv ? inv.name : ''
      };
    });

    let filtered = mapped;
    if (student_id) {
      filtered = filtered.filter(r => r.student_id === parseInt(student_id, 10));
    }
    if (drive_id) {
      filtered = filtered.filter(r => r.drive_id === parseInt(drive_id, 10));
    }
    if (decision) {
      filtered = filtered.filter(r => r.decision === decision);
    }

    res.json({ success: true, results: filtered });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to retrieve results: ' + err.message });
  }
}

// GET /api/placement/results/:id
async function getResultById(req, res) {
  try {
    const resultId = parseInt(req.params.id, 10);
    if (isNaN(resultId)) {
      return res.status(400).json({ success: false, message: 'Invalid result ID.' });
    }

    if (db.isMySQLConnected()) {
      const rows = await db.query('SELECT * FROM Results WHERE id = ?', [resultId]);
      if (!rows || rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Result not found.' });
      }
      return res.json({ success: true, result: rows[0] });
    }

    const inMem = db.getInMemStore();
    const r = inMem.Results.find(resItem => resItem.id === resultId);
    if (!r) {
      return res.status(404).json({ success: false, message: 'Result not found.' });
    }
    res.json({ success: true, result: r });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to retrieve result: ' + err.message });
  }
}

// POST /api/placement/results - Add interview result
async function createResult(req, res) {
  try {
    const {
      application_id,
      schedule_id = null,
      total_score = 0.00,
      decision,
      remarks = null
    } = req.body;

    const validDecisions = ['selected', 'rejected', 'on_hold'];
    if (!application_id || !decision || !validDecisions.includes(decision)) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields or invalid decision. Decision must be one of: ${validDecisions.join(', ')}`
      });
    }

    const parsedAppId = parseInt(application_id, 10);
    const parsedSchedId = schedule_id ? parseInt(schedule_id, 10) : null;
    const parsedScore = parseFloat(total_score) || 0.00;

    if (db.isMySQLConnected()) {
      // Check existing result for application (application_id is UNIQUE in Results)
      const existing = await db.query('SELECT id FROM Results WHERE application_id = ?', [parsedAppId]);
      if (existing && existing.length > 0) {
        return res.status(409).json({
          success: false,
          message: `Result has already been declared for Application #${parsedAppId}. You can update it instead.`
        });
      }

      // Insert Result
      const insertRes = await db.query(
        `INSERT INTO Results (application_id, schedule_id, total_score, decision, remarks)
         VALUES (?, ?, ?, ?, ?)`,
        [parsedAppId, parsedSchedId, parsedScore, decision, remarks]
      );
      const newResultId = insertRes.insertId;

      // Update Application Status
      const appStatus = decision === 'on_hold' ? 'in_progress' : decision;
      await db.query('UPDATE Applications SET status = ? WHERE id = ?', [appStatus, parsedAppId]);

      // If schedule provided, update schedule status
      if (parsedSchedId) {
        await db.query("UPDATE InterviewSchedules SET status = 'completed' WHERE id = ?", [parsedSchedId]);
      }

      // Notify candidate
      const app = (await db.query(
        `SELECT a.student_id, s.user_id, s.name as student_name, pd.title as drive_title, c.company_name
         FROM Applications a
         JOIN Students s ON a.student_id = s.id
         JOIN PlacementDrives pd ON a.drive_id = pd.id
         JOIN Companies c ON pd.company_id = c.id
         WHERE a.id = ?`,
        [parsedAppId]
      ))[0];

      if (app) {
        const notifTitle = decision === 'selected' ? '🎉 Offer Extended / Selected!' : `Interview Result: ${decision.toUpperCase()}`;
        const notifMsg = `Your interview evaluation for ${app.company_name} (${app.drive_title}) has concluded. Final Decision: ${decision.toUpperCase()} (Total Score: ${parsedScore}/100). ${remarks || ''}`;
        await db.query('INSERT INTO Notifications (user_id, title, message) VALUES (?, ?, ?)', [
          app.user_id,
          notifTitle,
          notifMsg
        ]);
      }

      return res.status(201).json({
        success: true,
        message: 'Interview evaluation & result recorded successfully.',
        resultId: newResultId
      });
    }

    // In-memory fallback
    const inMem = db.getInMemStore();
    const existing = inMem.Results.find(r => r.application_id === parsedAppId);
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `Result has already been declared for Application #${parsedAppId}.`
      });
    }

    const newResult = {
      id: inMem.Results.length + 1,
      application_id: parsedAppId,
      schedule_id: parsedSchedId,
      total_score: parsedScore,
      decision,
      remarks,
      declared_at: new Date()
    };
    inMem.Results.push(newResult);

    const app = inMem.Applications.find(a => a.id === parsedAppId);
    if (app) {
      app.status = decision === 'on_hold' ? 'in_progress' : decision;
      const student = inMem.Students.find(s => s.id === app.student_id);
      if (student) {
        inMem.Notifications.push({
          id: inMem.Notifications.length + 1,
          user_id: student.user_id,
          title: `Interview Result: ${decision.toUpperCase()}`,
          message: `Evaluation completed with score ${parsedScore}/100. Status: ${decision.toUpperCase()}.`,
          status: 'unread',
          created_at: new Date()
        });
      }
    }

    if (parsedSchedId) {
      const sch = inMem.InterviewSchedules.find(s => s.id === parsedSchedId);
      if (sch) sch.status = 'completed';
    }

    res.status(201).json({
      success: true,
      message: 'Interview evaluation & result recorded successfully.',
      resultId: newResult.id
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to record result: ' + err.message });
  }
}

// PUT /api/placement/results/:id - Update result
async function updateResult(req, res) {
  try {
    const resultId = parseInt(req.params.id, 10);
    if (isNaN(resultId)) {
      return res.status(400).json({ success: false, message: 'Invalid result ID.' });
    }

    const { total_score, decision, remarks } = req.body;

    if (db.isMySQLConnected()) {
      const existing = await db.query('SELECT * FROM Results WHERE id = ?', [resultId]);
      if (!existing || existing.length === 0) {
        return res.status(404).json({ success: false, message: 'Result not found.' });
      }

      await db.query(
        `UPDATE Results 
         SET total_score = COALESCE(?, total_score),
             decision = COALESCE(?, decision),
             remarks = COALESCE(?, remarks)
         WHERE id = ?`,
        [
          total_score !== undefined ? parseFloat(total_score) : null,
          decision !== undefined ? decision : null,
          remarks !== undefined ? remarks : null,
          resultId
        ]
      );

      if (decision) {
        const appStatus = decision === 'on_hold' ? 'in_progress' : decision;
        await db.query('UPDATE Applications SET status = ? WHERE id = ?', [appStatus, existing[0].application_id]);
      }

      const updated = await db.query('SELECT * FROM Results WHERE id = ?', [resultId]);
      return res.json({
        success: true,
        message: 'Result updated successfully.',
        result: updated[0]
      });
    }

    const inMem = db.getInMemStore();
    const r = inMem.Results.find(resItem => resItem.id === resultId);
    if (!r) {
      return res.status(404).json({ success: false, message: 'Result not found.' });
    }

    if (total_score !== undefined) r.total_score = parseFloat(total_score);
    if (decision !== undefined) {
      r.decision = decision;
      const app = inMem.Applications.find(a => a.id === r.application_id);
      if (app) app.status = decision === 'on_hold' ? 'in_progress' : decision;
    }
    if (remarks !== undefined) r.remarks = remarks;

    res.json({
      success: true,
      message: 'Result updated successfully.',
      result: r
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update result: ' + err.message });
  }
}

// DELETE /api/placement/results/:id - Delete result
async function deleteResult(req, res) {
  try {
    const resultId = parseInt(req.params.id, 10);
    if (isNaN(resultId)) {
      return res.status(400).json({ success: false, message: 'Invalid result ID.' });
    }

    if (db.isMySQLConnected()) {
      await db.query('DELETE FROM Results WHERE id = ?', [resultId]);
      return res.json({ success: true, message: `Result #${resultId} deleted successfully.` });
    }

    const inMem = db.getInMemStore();
    const idx = inMem.Results.findIndex(r => r.id === resultId);
    if (idx === -1) {
      return res.status(404).json({ success: false, message: 'Result not found.' });
    }
    inMem.Results.splice(idx, 1);

    res.json({ success: true, message: `Result #${resultId} deleted successfully.` });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete result: ' + err.message });
  }
}

module.exports = {
  getAllResults,
  getResultById,
  createResult,
  updateResult,
  deleteResult
};
