const db = require('../config/db');

// GET /api/placement/drives - List all placement drives
async function getAllDrives(req, res) {
  try {
    if (db.isMySQLConnected()) {
      const sql = `
        SELECT pd.*, c.company_name, c.contact_person, c.contact_email,
               (SELECT COUNT(*) FROM Applications a WHERE a.drive_id = pd.id) as total_applicants
        FROM PlacementDrives pd
        JOIN Companies c ON pd.company_id = c.id
        ORDER BY pd.drive_date ASC, pd.id ASC
      `;
      const drives = await db.query(sql);
      return res.json({ success: true, drives: drives || [] });
    }

    // In-memory fallback
    const inMem = db.getInMemStore();
    const drives = inMem.PlacementDrives.map(d => {
      const comp = inMem.Companies.find(c => c.id === d.company_id);
      const appCount = inMem.Applications.filter(a => a.drive_id === d.id).length;
      return {
        ...d,
        company_name: comp ? comp.company_name : 'Unknown Company',
        contact_person: comp ? comp.contact_person : '',
        contact_email: comp ? comp.contact_email : '',
        total_applicants: appCount
      };
    });
    res.json({ success: true, drives });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to retrieve drives: ' + err.message });
  }
}

// GET /api/placement/drives/:id - Get single drive with rounds
async function getDriveById(req, res) {
  try {
    const driveId = parseInt(req.params.id, 10);
    if (isNaN(driveId)) {
      return res.status(400).json({ success: false, message: 'Invalid drive ID.' });
    }

    if (db.isMySQLConnected()) {
      const sql = `
        SELECT pd.*, c.company_name, c.contact_person, c.contact_email
        FROM PlacementDrives pd
        JOIN Companies c ON pd.company_id = c.id
        WHERE pd.id = ?
      `;
      const rows = await db.query(sql, [driveId]);
      if (!rows || rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Drive not found.' });
      }

      const rounds = await db.query(
        'SELECT * FROM InterviewRounds WHERE drive_id = ? ORDER BY round_number ASC',
        [driveId]
      );
      const applicants = await db.query(
        `SELECT a.*, s.name as student_name, s.usn, s.cgpa, s.department
         FROM Applications a
         JOIN Students s ON a.student_id = s.id
         WHERE a.drive_id = ?`,
        [driveId]
      );

      return res.json({
        success: true,
        drive: {
          ...rows[0],
          rounds: rounds || [],
          applicants: applicants || []
        }
      });
    }

    const inMem = db.getInMemStore();
    const d = inMem.PlacementDrives.find(dr => dr.id === driveId);
    if (!d) {
      return res.status(404).json({ success: false, message: 'Drive not found.' });
    }

    const comp = inMem.Companies.find(c => c.id === d.company_id);
    const rounds = inMem.InterviewRounds.filter(r => r.drive_id === driveId);
    const applicants = inMem.Applications.filter(a => a.drive_id === driveId).map(a => {
      const student = inMem.Students.find(s => s.id === a.student_id);
      return {
        ...a,
        student_name: student ? student.name : 'Unknown',
        usn: student ? student.usn : '',
        cgpa: student ? student.cgpa : null,
        department: student ? student.department : ''
      };
    });

    res.json({
      success: true,
      drive: {
        ...d,
        company_name: comp ? comp.company_name : '',
        contact_person: comp ? comp.contact_person : '',
        contact_email: comp ? comp.contact_email : '',
        rounds,
        applicants
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to retrieve drive: ' + err.message });
  }
}

// POST /api/placement/drives - Create placement drive
async function createDrive(req, res) {
  try {
    const {
      company_id,
      title,
      job_role,
      ctc_lpa,
      min_cgpa = 6.00,
      eligible_branches = 'All',
      drive_date,
      status = 'active',
      rounds = []
    } = req.body;

    if (!company_id || !title || !job_role || ctc_lpa === undefined || !drive_date) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: company_id, title, job_role, ctc_lpa, drive_date.'
      });
    }

    const parsedCompanyId = parseInt(company_id, 10);
    const parsedCtc = parseFloat(ctc_lpa);
    const parsedMinCgpa = parseFloat(min_cgpa);

    if (isNaN(parsedMinCgpa) || parsedMinCgpa < 0 || parsedMinCgpa > 10) {
      return res.status(400).json({ success: false, message: 'min_cgpa must be between 0.00 and 10.00.' });
    }

    if (db.isMySQLConnected()) {
      // Validate company exists
      const compCheck = await db.query('SELECT id FROM Companies WHERE id = ?', [parsedCompanyId]);
      if (!compCheck || compCheck.length === 0) {
        return res.status(404).json({ success: false, message: 'Company not found with ID ' + parsedCompanyId });
      }

      const insertRes = await db.query(
        `INSERT INTO PlacementDrives 
         (company_id, title, job_role, ctc_lpa, min_cgpa, eligible_branches, drive_date, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [parsedCompanyId, title, job_role, parsedCtc, parsedMinCgpa, eligible_branches, drive_date, status]
      );
      const newDriveId = insertRes.insertId;

      // Create initial rounds if provided
      if (Array.isArray(rounds) && rounds.length > 0) {
        for (let i = 0; i < rounds.length; i++) {
          const r = rounds[i];
          await db.query(
            `INSERT INTO InterviewRounds (drive_id, round_number, round_name, round_type, pass_score, duration_minutes)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
              newDriveId,
              r.round_number || (i + 1),
              r.round_name || `Round ${i + 1}`,
              r.round_type || 'technical',
              parseFloat(r.pass_score) || 60.00,
              parseInt(r.duration_minutes, 10) || 45
            ]
          );
        }
      } else {
        // Default online assessment round
        await db.query(
          `INSERT INTO InterviewRounds (drive_id, round_number, round_name, round_type, pass_score, duration_minutes)
           VALUES (?, 1, 'Online Assessment', 'online_test', 60.00, 60)`,
          [newDriveId]
        );
      }

      const created = {
        id: newDriveId,
        company_id: parsedCompanyId,
        title,
        job_role,
        ctc_lpa: parsedCtc,
        min_cgpa: parsedMinCgpa,
        eligible_branches,
        drive_date,
        status
      };

      return res.status(201).json({
        success: true,
        message: 'Placement drive created successfully.',
        drive: created
      });
    }

    // In-memory fallback
    const inMem = db.getInMemStore();
    const newDriveId = inMem.PlacementDrives.length + 1;
    const newDrive = {
      id: newDriveId,
      company_id: parsedCompanyId,
      title,
      job_role,
      ctc_lpa: parsedCtc,
      min_cgpa: parsedMinCgpa,
      eligible_branches,
      drive_date,
      status,
      created_at: new Date()
    };
    inMem.PlacementDrives.push(newDrive);

    // Initial round
    inMem.InterviewRounds.push({
      id: inMem.InterviewRounds.length + 1,
      drive_id: newDriveId,
      round_number: 1,
      round_name: 'Online Assessment',
      round_type: 'online_test',
      pass_score: 60.00,
      duration_minutes: 60
    });

    res.status(201).json({
      success: true,
      message: 'Placement drive created successfully.',
      drive: newDrive
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to create drive: ' + err.message });
  }
}

// PUT /api/placement/drives/:id - Update drive details
async function updateDrive(req, res) {
  try {
    const driveId = parseInt(req.params.id, 10);
    if (isNaN(driveId)) {
      return res.status(400).json({ success: false, message: 'Invalid drive ID.' });
    }

    const {
      company_id,
      title,
      job_role,
      ctc_lpa,
      min_cgpa,
      eligible_branches,
      drive_date,
      status
    } = req.body;

    if (min_cgpa !== undefined) {
      const parsedMin = parseFloat(min_cgpa);
      if (isNaN(parsedMin) || parsedMin < 0 || parsedMin > 10) {
        return res.status(400).json({ success: false, message: 'min_cgpa must be between 0.00 and 10.00.' });
      }
    }

    if (db.isMySQLConnected()) {
      const existing = await db.query('SELECT * FROM PlacementDrives WHERE id = ?', [driveId]);
      if (!existing || existing.length === 0) {
        return res.status(404).json({ success: false, message: 'Drive not found.' });
      }

      await db.query(
        `UPDATE PlacementDrives 
         SET company_id = COALESCE(?, company_id),
             title = COALESCE(?, title),
             job_role = COALESCE(?, job_role),
             ctc_lpa = COALESCE(?, ctc_lpa),
             min_cgpa = COALESCE(?, min_cgpa),
             eligible_branches = COALESCE(?, eligible_branches),
             drive_date = COALESCE(?, drive_date),
             status = COALESCE(?, status)
         WHERE id = ?`,
        [
          company_id !== undefined ? parseInt(company_id, 10) : null,
          title !== undefined ? title : null,
          job_role !== undefined ? job_role : null,
          ctc_lpa !== undefined ? parseFloat(ctc_lpa) : null,
          min_cgpa !== undefined ? parseFloat(min_cgpa) : null,
          eligible_branches !== undefined ? eligible_branches : null,
          drive_date !== undefined ? drive_date : null,
          status !== undefined ? status : null,
          driveId
        ]
      );

      const updated = await db.query('SELECT * FROM PlacementDrives WHERE id = ?', [driveId]);
      return res.json({
        success: true,
        message: 'Placement drive updated successfully.',
        drive: updated[0]
      });
    }

    // In-memory fallback
    const inMem = db.getInMemStore();
    const d = inMem.PlacementDrives.find(dr => dr.id === driveId);
    if (!d) {
      return res.status(404).json({ success: false, message: 'Drive not found.' });
    }

    if (company_id !== undefined) d.company_id = parseInt(company_id, 10);
    if (title !== undefined) d.title = title;
    if (job_role !== undefined) d.job_role = job_role;
    if (ctc_lpa !== undefined) d.ctc_lpa = parseFloat(ctc_lpa);
    if (min_cgpa !== undefined) d.min_cgpa = parseFloat(min_cgpa);
    if (eligible_branches !== undefined) d.eligible_branches = eligible_branches;
    if (drive_date !== undefined) d.drive_date = drive_date;
    if (status !== undefined) d.status = status;

    res.json({
      success: true,
      message: 'Placement drive updated successfully.',
      drive: d
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update drive: ' + err.message });
  }
}

// DELETE /api/placement/drives/:id - Delete placement drive
async function deleteDrive(req, res) {
  try {
    const driveId = parseInt(req.params.id, 10);
    if (isNaN(driveId)) {
      return res.status(400).json({ success: false, message: 'Invalid drive ID.' });
    }

    if (db.isMySQLConnected()) {
      const existing = await db.query('SELECT * FROM PlacementDrives WHERE id = ?', [driveId]);
      if (!existing || existing.length === 0) {
        return res.status(404).json({ success: false, message: 'Drive not found.' });
      }

      await db.query('DELETE FROM PlacementDrives WHERE id = ?', [driveId]);
      return res.json({
        success: true,
        message: `Placement drive #${driveId} and its interview rounds deleted successfully.`
      });
    }

    // In-memory fallback
    const inMem = db.getInMemStore();
    const dIndex = inMem.PlacementDrives.findIndex(d => d.id === driveId);
    if (dIndex === -1) {
      return res.status(404).json({ success: false, message: 'Drive not found.' });
    }

    inMem.PlacementDrives.splice(dIndex, 1);
    inMem.InterviewRounds = inMem.InterviewRounds.filter(r => r.drive_id !== driveId);
    inMem.Applications = inMem.Applications.filter(a => a.drive_id !== driveId);

    res.json({
      success: true,
      message: `Placement drive #${driveId} and its interview rounds deleted successfully.`
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete drive: ' + err.message });
  }
}

// =================== INTERVIEW ROUNDS ===================

// GET /api/placement/rounds - List rounds
async function getAllRounds(req, res) {
  try {
    const { drive_id } = req.query;

    if (db.isMySQLConnected()) {
      let sql = `
        SELECT ir.*, pd.title as drive_title, pd.job_role, c.company_name
        FROM InterviewRounds ir
        JOIN PlacementDrives pd ON ir.drive_id = pd.id
        JOIN Companies c ON pd.company_id = c.id
      `;
      const params = [];
      if (drive_id) {
        sql += ' WHERE ir.drive_id = ?';
        params.push(parseInt(drive_id, 10));
      }
      sql += ' ORDER BY ir.drive_id ASC, ir.round_number ASC';

      const rounds = await db.query(sql, params);
      return res.json({ success: true, rounds: rounds || [] });
    }

    const inMem = db.getInMemStore();
    let rounds = inMem.InterviewRounds;
    if (drive_id) {
      rounds = rounds.filter(r => r.drive_id === parseInt(drive_id, 10));
    }
    const mapped = rounds.map(r => {
      const drive = inMem.PlacementDrives.find(d => d.id === r.drive_id);
      const comp = drive ? inMem.Companies.find(c => c.id === drive.company_id) : null;
      return {
        ...r,
        drive_title: drive ? drive.title : '',
        job_role: drive ? drive.job_role : '',
        company_name: comp ? comp.company_name : ''
      };
    });
    res.json({ success: true, rounds: mapped });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to retrieve rounds: ' + err.message });
  }
}

// GET /api/placement/rounds/:id
async function getRoundById(req, res) {
  try {
    const roundId = parseInt(req.params.id, 10);
    if (isNaN(roundId)) {
      return res.status(400).json({ success: false, message: 'Invalid round ID.' });
    }

    if (db.isMySQLConnected()) {
      const rows = await db.query('SELECT * FROM InterviewRounds WHERE id = ?', [roundId]);
      if (!rows || rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Round not found.' });
      }
      return res.json({ success: true, round: rows[0] });
    }

    const inMem = db.getInMemStore();
    const r = inMem.InterviewRounds.find(rd => rd.id === roundId);
    if (!r) {
      return res.status(404).json({ success: false, message: 'Round not found.' });
    }
    res.json({ success: true, round: r });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to retrieve round: ' + err.message });
  }
}

// POST /api/placement/rounds - Create round
async function createRound(req, res) {
  try {
    const {
      drive_id,
      round_number,
      round_name,
      round_type = 'technical',
      pass_score = 60.00,
      duration_minutes = 45
    } = req.body;

    if (!drive_id || !round_number || !round_name) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: drive_id, round_number, round_name.'
      });
    }

    const parsedDriveId = parseInt(drive_id, 10);
    const parsedRoundNum = parseInt(round_number, 10);

    if (db.isMySQLConnected()) {
      // Check duplicate round_number for this drive
      const existing = await db.query(
        'SELECT id FROM InterviewRounds WHERE drive_id = ? AND round_number = ?',
        [parsedDriveId, parsedRoundNum]
      );
      if (existing && existing.length > 0) {
        return res.status(409).json({
          success: false,
          message: `Round #${parsedRoundNum} already exists for drive #${parsedDriveId}.`
        });
      }

      const insertRes = await db.query(
        `INSERT INTO InterviewRounds (drive_id, round_number, round_name, round_type, pass_score, duration_minutes)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [parsedDriveId, parsedRoundNum, round_name, round_type, parseFloat(pass_score), parseInt(duration_minutes, 10)]
      );

      const created = {
        id: insertRes.insertId,
        drive_id: parsedDriveId,
        round_number: parsedRoundNum,
        round_name,
        round_type,
        pass_score: parseFloat(pass_score),
        duration_minutes: parseInt(duration_minutes, 10)
      };

      return res.status(201).json({
        success: true,
        message: 'Interview round created successfully.',
        round: created
      });
    }

    // In-memory fallback
    const inMem = db.getInMemStore();
    const existing = inMem.InterviewRounds.find(r => r.drive_id === parsedDriveId && r.round_number === parsedRoundNum);
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `Round #${parsedRoundNum} already exists for drive #${parsedDriveId}.`
      });
    }

    const newRound = {
      id: inMem.InterviewRounds.length + 1,
      drive_id: parsedDriveId,
      round_number: parsedRoundNum,
      round_name,
      round_type,
      pass_score: parseFloat(pass_score),
      duration_minutes: parseInt(duration_minutes, 10)
    };
    inMem.InterviewRounds.push(newRound);

    res.status(201).json({
      success: true,
      message: 'Interview round created successfully.',
      round: newRound
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to create round: ' + err.message });
  }
}

// PUT /api/placement/rounds/:id - Update round
async function updateRound(req, res) {
  try {
    const roundId = parseInt(req.params.id, 10);
    if (isNaN(roundId)) {
      return res.status(400).json({ success: false, message: 'Invalid round ID.' });
    }

    const { round_number, round_name, round_type, pass_score, duration_minutes } = req.body;

    if (db.isMySQLConnected()) {
      await db.query(
        `UPDATE InterviewRounds 
         SET round_number = COALESCE(?, round_number),
             round_name = COALESCE(?, round_name),
             round_type = COALESCE(?, round_type),
             pass_score = COALESCE(?, pass_score),
             duration_minutes = COALESCE(?, duration_minutes)
         WHERE id = ?`,
        [
          round_number !== undefined ? parseInt(round_number, 10) : null,
          round_name !== undefined ? round_name : null,
          round_type !== undefined ? round_type : null,
          pass_score !== undefined ? parseFloat(pass_score) : null,
          duration_minutes !== undefined ? parseInt(duration_minutes, 10) : null,
          roundId
        ]
      );

      const updated = await db.query('SELECT * FROM InterviewRounds WHERE id = ?', [roundId]);
      return res.json({
        success: true,
        message: 'Interview round updated successfully.',
        round: updated[0]
      });
    }

    // In-memory fallback
    const inMem = db.getInMemStore();
    const r = inMem.InterviewRounds.find(rd => rd.id === roundId);
    if (!r) {
      return res.status(404).json({ success: false, message: 'Round not found.' });
    }

    if (round_number !== undefined) r.round_number = parseInt(round_number, 10);
    if (round_name !== undefined) r.round_name = round_name;
    if (round_type !== undefined) r.round_type = round_type;
    if (pass_score !== undefined) r.pass_score = parseFloat(pass_score);
    if (duration_minutes !== undefined) r.duration_minutes = parseInt(duration_minutes, 10);

    res.json({
      success: true,
      message: 'Interview round updated successfully.',
      round: r
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update round: ' + err.message });
  }
}

// DELETE /api/placement/rounds/:id - Delete round
async function deleteRound(req, res) {
  try {
    const roundId = parseInt(req.params.id, 10);
    if (isNaN(roundId)) {
      return res.status(400).json({ success: false, message: 'Invalid round ID.' });
    }

    if (db.isMySQLConnected()) {
      await db.query('DELETE FROM InterviewRounds WHERE id = ?', [roundId]);
      return res.json({ success: true, message: `Round #${roundId} deleted successfully.` });
    }

    const inMem = db.getInMemStore();
    const idx = inMem.InterviewRounds.findIndex(r => r.id === roundId);
    if (idx === -1) {
      return res.status(404).json({ success: false, message: 'Round not found.' });
    }
    inMem.InterviewRounds.splice(idx, 1);

    res.json({ success: true, message: `Round #${roundId} deleted successfully.` });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete round: ' + err.message });
  }
}

module.exports = {
  getAllDrives,
  getDriveById,
  createDrive,
  updateDrive,
  deleteDrive,
  getAllRounds,
  getRoundById,
  createRound,
  updateRound,
  deleteRound
};
