const bcrypt = require('bcryptjs');
const db = require('../config/db');

// GET /api/placement/students - List all students
async function getAllStudents(req, res) {
  try {
    if (db.isMySQLConnected()) {
      const sql = `
        SELECT s.*, u.email 
        FROM Students s 
        JOIN Users u ON s.user_id = u.id 
        ORDER BY s.id ASC
      `;
      const students = await db.query(sql);
      return res.json({ success: true, students: students || [] });
    }

    // Fallback in-memory
    const inMem = db.getInMemStore();
    const students = inMem.Students.map(s => {
      const user = inMem.Users.find(u => u.id === s.user_id);
      return { ...s, email: user ? user.email : '' };
    });
    res.json({ success: true, students });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to retrieve students: ' + err.message });
  }
}

// GET /api/placement/students/:id - Get student by ID
async function getStudentById(req, res) {
  try {
    const studentId = parseInt(req.params.id, 10);
    if (isNaN(studentId)) {
      return res.status(400).json({ success: false, message: 'Invalid student ID.' });
    }

    if (db.isMySQLConnected()) {
      const sql = `
        SELECT s.*, u.email 
        FROM Students s 
        JOIN Users u ON s.user_id = u.id 
        WHERE s.id = ?
      `;
      const rows = await db.query(sql, [studentId]);
      if (!rows || rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Student not found.' });
      }
      return res.json({ success: true, student: rows[0] });
    }

    const inMem = db.getInMemStore();
    const s = inMem.Students.find(st => st.id === studentId);
    if (!s) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }
    const user = inMem.Users.find(u => u.id === s.user_id);
    res.json({ success: true, student: { ...s, email: user ? user.email : '' } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to retrieve student: ' + err.message });
  }
}

// POST /api/placement/students - Add student
async function createStudent(req, res) {
  try {
    const {
      name,
      email,
      usn,
      department,
      cgpa,
      graduation_year,
      resume_url = null,
      phone = null,
      password = 'Student@123',
      is_eligible = true
    } = req.body;

    if (!name || !email || !usn || !department || cgpa === undefined || !graduation_year) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: name, email, usn, department, cgpa, graduation_year.'
      });
    }

    const parsedCgpa = parseFloat(cgpa);
    if (isNaN(parsedCgpa) || parsedCgpa < 0 || parsedCgpa > 10) {
      return res.status(400).json({ success: false, message: 'CGPA must be a decimal between 0.00 and 10.00.' });
    }

    const parsedGradYear = parseInt(graduation_year, 10);
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    if (db.isMySQLConnected()) {
      // Check existing email
      const userCheck = await db.query('SELECT id FROM Users WHERE email = ?', [email]);
      if (userCheck && userCheck.length > 0) {
        return res.status(409).json({ success: false, message: `Email '${email}' is already registered.` });
      }

      // Check existing USN
      const usnCheck = await db.query('SELECT id FROM Students WHERE usn = ?', [usn]);
      if (usnCheck && usnCheck.length > 0) {
        return res.status(409).json({ success: false, message: `USN '${usn}' is already registered.` });
      }

      // Insert User
      const userRes = await db.query(
        'INSERT INTO Users (email, password, role) VALUES (?, ?, ?)',
        [email, passwordHash, 'student']
      );
      const newUserId = userRes.insertId;

      // Insert Student
      const studentRes = await db.query(
        `INSERT INTO Students (user_id, usn, name, department, cgpa, graduation_year, resume_url, phone, is_eligible)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [newUserId, usn, name, department, parsedCgpa, parsedGradYear, resume_url, phone, Boolean(is_eligible)]
      );
      const newStudentId = studentRes.insertId;

      // Welcome notification
      await db.query(
        'INSERT INTO Notifications (user_id, title, message) VALUES (?, ?, ?)',
        [newUserId, 'Student Account Created', `Welcome ${name}! Your student registration is complete.`]
      );

      const created = {
        id: newStudentId,
        user_id: newUserId,
        usn,
        name,
        department,
        cgpa: parsedCgpa,
        graduation_year: parsedGradYear,
        resume_url,
        phone,
        is_eligible: Boolean(is_eligible),
        email
      };

      return res.status(201).json({
        success: true,
        message: 'Student created successfully.',
        student: created
      });
    }

    // In-memory fallback
    const inMem = db.getInMemStore();
    if (inMem.Users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
      return res.status(409).json({ success: false, message: `Email '${email}' is already registered.` });
    }
    if (inMem.Students.some(s => s.usn.toLowerCase() === usn.toLowerCase())) {
      return res.status(409).json({ success: false, message: `USN '${usn}' is already registered.` });
    }

    const newUserId = inMem.Users.length + 1;
    inMem.Users.push({
      id: newUserId,
      email,
      password: passwordHash,
      role: 'student',
      created_at: new Date()
    });

    const newStudentId = inMem.Students.length + 1;
    const newStudent = {
      id: newStudentId,
      user_id: newUserId,
      usn,
      name,
      department,
      cgpa: parsedCgpa,
      graduation_year: parsedGradYear,
      resume_url,
      phone,
      is_eligible: Boolean(is_eligible),
      created_at: new Date()
    };
    inMem.Students.push(newStudent);

    inMem.Notifications.push({
      id: inMem.Notifications.length + 1,
      user_id: newUserId,
      title: 'Student Account Created',
      message: `Welcome ${name}! Your student registration is complete.`,
      status: 'unread',
      created_at: new Date()
    });

    res.status(201).json({
      success: true,
      message: 'Student created successfully.',
      student: { ...newStudent, email }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to create student: ' + err.message });
  }
}

// PUT /api/placement/students/:id - Edit student details
async function updateStudent(req, res) {
  try {
    const studentId = parseInt(req.params.id, 10);
    if (isNaN(studentId)) {
      return res.status(400).json({ success: false, message: 'Invalid student ID.' });
    }

    const {
      name,
      department,
      cgpa,
      graduation_year,
      resume_url,
      phone,
      is_eligible,
      email
    } = req.body;

    if (cgpa !== undefined) {
      const parsedCgpa = parseFloat(cgpa);
      if (isNaN(parsedCgpa) || parsedCgpa < 0 || parsedCgpa > 10) {
        return res.status(400).json({ success: false, message: 'CGPA must be a decimal between 0.00 and 10.00.' });
      }
    }

    if (db.isMySQLConnected()) {
      const existing = await db.query('SELECT * FROM Students WHERE id = ?', [studentId]);
      if (!existing || existing.length === 0) {
        return res.status(404).json({ success: false, message: 'Student not found.' });
      }
      const current = existing[0];

      await db.query(
        `UPDATE Students 
         SET name = COALESCE(?, name),
             department = COALESCE(?, department),
             cgpa = COALESCE(?, cgpa),
             graduation_year = COALESCE(?, graduation_year),
             resume_url = COALESCE(?, resume_url),
             phone = COALESCE(?, phone),
             is_eligible = COALESCE(?, is_eligible)
         WHERE id = ?`,
        [
          name !== undefined ? name : null,
          department !== undefined ? department : null,
          cgpa !== undefined ? parseFloat(cgpa) : null,
          graduation_year !== undefined ? parseInt(graduation_year, 10) : null,
          resume_url !== undefined ? resume_url : null,
          phone !== undefined ? phone : null,
          is_eligible !== undefined ? Boolean(is_eligible) : null,
          studentId
        ]
      );

      if (email) {
        await db.query('UPDATE Users SET email = ? WHERE id = ?', [email, current.user_id]);
      }

      const updated = await db.query(
        `SELECT s.*, u.email FROM Students s JOIN Users u ON s.user_id = u.id WHERE s.id = ?`,
        [studentId]
      );

      return res.json({
        success: true,
        message: 'Student details updated successfully.',
        student: updated[0]
      });
    }

    // In-memory fallback
    const inMem = db.getInMemStore();
    const st = inMem.Students.find(s => s.id === studentId);
    if (!st) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    if (name !== undefined) st.name = name;
    if (department !== undefined) st.department = department;
    if (cgpa !== undefined) st.cgpa = parseFloat(cgpa);
    if (graduation_year !== undefined) st.graduation_year = parseInt(graduation_year, 10);
    if (resume_url !== undefined) st.resume_url = resume_url;
    if (phone !== undefined) st.phone = phone;
    if (is_eligible !== undefined) st.is_eligible = Boolean(is_eligible);

    const user = inMem.Users.find(u => u.id === st.user_id);
    if (user && email) user.email = email;

    res.json({
      success: true,
      message: 'Student details updated successfully.',
      student: { ...st, email: user ? user.email : '' }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update student: ' + err.message });
  }
}

// DELETE /api/placement/students/:id - Delete student
async function deleteStudent(req, res) {
  try {
    const studentId = parseInt(req.params.id, 10);
    if (isNaN(studentId)) {
      return res.status(400).json({ success: false, message: 'Invalid student ID.' });
    }

    if (db.isMySQLConnected()) {
      const existing = await db.query('SELECT * FROM Students WHERE id = ?', [studentId]);
      if (!existing || existing.length === 0) {
        return res.status(404).json({ success: false, message: 'Student not found.' });
      }
      const userId = existing[0].user_id;

      // Deleting from Users cascades to Students via foreign key fk_students_user
      await db.query('DELETE FROM Users WHERE id = ?', [userId]);

      return res.json({
        success: true,
        message: `Student #${studentId} and associated user account deleted successfully.`
      });
    }

    // In-memory fallback
    const inMem = db.getInMemStore();
    const sIndex = inMem.Students.findIndex(s => s.id === studentId);
    if (sIndex === -1) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }
    const student = inMem.Students[sIndex];
    inMem.Students.splice(sIndex, 1);
    const uIndex = inMem.Users.findIndex(u => u.id === student.user_id);
    if (uIndex !== -1) inMem.Users.splice(uIndex, 1);

    // Clean up applications
    inMem.Applications = inMem.Applications.filter(a => a.student_id !== studentId);

    res.json({
      success: true,
      message: `Student #${studentId} and associated user account deleted successfully.`
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete student: ' + err.message });
  }
}

module.exports = {
  getAllStudents,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent
};
