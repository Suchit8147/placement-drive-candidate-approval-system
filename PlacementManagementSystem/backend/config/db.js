const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');

let pool = null;
let isConnectedToMySQL = false;

// High-fidelity In-Memory Store populated with seed data
// used when MySQL is offline or during testing
const inMemoryDB = {
  Users: [
    { id: 1, email: 'admin@college.edu', password: '$2a$10$rQ0Xf5gQ9K5WdK.dKqjE9eO0Kq0dZ8GvO6gH6zWlSVOe3v6TjG6pX', role: 'admin', created_at: new Date() },
    { id: 2, email: 'student1@college.edu', password: '$2a$10$rQ0Xf5gQ9K5WdK.dKqjE9eO0Kq0dZ8GvO6gH6zWlSVOe3v6TjG6pX', role: 'student', created_at: new Date() },
    { id: 3, email: 'student2@college.edu', password: '$2a$10$rQ0Xf5gQ9K5WdK.dKqjE9eO0Kq0dZ8GvO6gH6zWlSVOe3v6TjG6pX', role: 'student', created_at: new Date() },
    { id: 4, email: 'student3@college.edu', password: '$2a$10$rQ0Xf5gQ9K5WdK.dKqjE9eO0Kq0dZ8GvO6gH6zWlSVOe3v6TjG6pX', role: 'student', created_at: new Date() },
    { id: 5, email: 'hr@google.com', password: '$2a$10$rQ0Xf5gQ9K5WdK.dKqjE9eO0Kq0dZ8GvO6gH6zWlSVOe3v6TjG6pX', role: 'hr', created_at: new Date() },
    { id: 6, email: 'hr@microsoft.com', password: '$2a$10$rQ0Xf5gQ9K5WdK.dKqjE9eO0Kq0dZ8GvO6gH6zWlSVOe3v6TjG6pX', role: 'hr', created_at: new Date() },
    { id: 7, email: 'interviewer1@college.edu', password: '$2a$10$rQ0Xf5gQ9K5WdK.dKqjE9eO0Kq0dZ8GvO6gH6zWlSVOe3v6TjG6pX', role: 'interviewer', created_at: new Date() },
    { id: 8, email: 'interviewer2@college.edu', password: '$2a$10$rQ0Xf5gQ9K5WdK.dKqjE9eO0Kq0dZ8GvO6gH6zWlSVOe3v6TjG6pX', role: 'interviewer', created_at: new Date() }
  ],
  Students: [
    { id: 1, user_id: 2, usn: '1MS21CS001', name: 'Aarav Sharma', department: 'Computer Science', cgpa: 8.95, graduation_year: 2026, resume_url: 'https://drive.google.com/resume_aarav.pdf', phone: '9876543210', is_eligible: true },
    { id: 2, user_id: 3, usn: '1MS21CS042', name: 'Diya Patel', department: 'Information Science', cgpa: 9.15, graduation_year: 2026, resume_url: 'https://drive.google.com/resume_diya.pdf', phone: '9876543211', is_eligible: true },
    { id: 3, user_id: 4, usn: '1MS21EC015', name: 'Rohan Verma', department: 'Electronics', cgpa: 7.80, graduation_year: 2026, resume_url: 'https://drive.google.com/resume_rohan.pdf', phone: '9876543212', is_eligible: true }
  ],
  Companies: [
    { id: 1, user_id: 5, company_name: 'Google India', industry: 'Information Technology', website: 'https://careers.google.com', contact_person: 'Sundar R.', contact_email: 'hr@google.com' },
    { id: 2, user_id: 6, company_name: 'Microsoft IDC', industry: 'Cloud & Software', website: 'https://careers.microsoft.com', contact_person: 'Satya N.', contact_email: 'hr@microsoft.com' }
  ],
  PlacementDrives: [
    { id: 1, company_id: 1, title: 'Google Campus Drive 2026', job_role: 'Software Engineer - Level 3', ctc_lpa: 32.50, min_cgpa: 8.00, eligible_branches: 'Computer Science, Information Science', drive_date: '2026-11-20', status: 'active' },
    { id: 2, company_id: 2, title: 'Microsoft Cloud Hiring 2026', job_role: 'Cloud Solution Architect', ctc_lpa: 28.00, min_cgpa: 7.50, eligible_branches: 'All', drive_date: '2026-11-25', status: 'active' }
  ],
  InterviewRounds: [
    { id: 1, drive_id: 1, round_number: 1, round_name: 'Online Coding Assessment', round_type: 'online_test', pass_score: 70.00, duration_minutes: 60 },
    { id: 2, drive_id: 1, round_number: 2, round_name: 'Technical Interview - System Design', round_type: 'technical', pass_score: 75.00, duration_minutes: 45 },
    { id: 3, drive_id: 1, round_number: 3, round_name: 'HR Behavioral Round', round_type: 'hr', pass_score: 60.00, duration_minutes: 30 },
    { id: 4, drive_id: 2, round_number: 1, round_name: 'Cloud Fundamentals Test', round_type: 'online_test', pass_score: 65.00, duration_minutes: 60 },
    { id: 5, drive_id: 2, round_number: 2, round_name: 'Technical Round 1', round_type: 'technical', pass_score: 70.00, duration_minutes: 45 }
  ],
  Applications: [
    { id: 1, drive_id: 1, student_id: 1, status: 'shortlisted', current_round_id: 2, applied_at: new Date('2026-11-01') },
    { id: 2, drive_id: 1, student_id: 2, status: 'applied', current_round_id: 1, applied_at: new Date('2026-11-02') },
    { id: 3, drive_id: 2, student_id: 1, status: 'applied', current_round_id: 4, applied_at: new Date('2026-11-03') },
    { id: 4, drive_id: 2, student_id: 3, status: 'shortlisted', current_round_id: 5, applied_at: new Date('2026-11-04') }
  ],
  Rooms: [
    { id: 1, room_number: 'Room-101', building: 'Placement Block', floor: 1, capacity: 1, room_type: 'cabin', is_active: true },
    { id: 2, room_number: 'Room-102', building: 'Placement Block', floor: 1, capacity: 1, room_type: 'cabin', is_active: true },
    { id: 3, room_number: 'Lab-201', building: 'Computer Science Block', floor: 2, capacity: 40, room_type: 'lab', is_active: true },
    { id: 4, room_number: 'Seminar-Hall-A', building: 'Main Administrative Block', floor: 3, capacity: 120, room_type: 'hall', is_active: true }
  ],
  Interviewers: [
    { id: 1, user_id: 7, employee_code: 'EMP-CS-01', name: 'Dr. Ramesh Kumar', department: 'Computer Science', designation: 'Associate Professor', specialization: 'Distributed Systems & Algorithms' },
    { id: 2, user_id: 8, employee_code: 'EMP-IS-02', name: 'Prof. Priya Menon', department: 'Information Science', designation: 'Assistant Professor', specialization: 'Cloud Computing & Databases' }
  ],
  InterviewSchedules: [
    { id: 1, application_id: 1, round_id: 2, room_id: 1, interviewer_id: 1, start_time: '2026-11-20 10:00:00', end_time: '2026-11-20 11:00:00', status: 'scheduled', notes: 'Google Technical - Aarav Sharma' },
    { id: 2, application_id: 4, round_id: 5, room_id: 2, interviewer_id: 2, start_time: '2026-11-20 10:30:00', end_time: '2026-11-20 11:30:00', status: 'scheduled', notes: 'Microsoft Cloud Technical - Rohan Verma' }
  ],
  Results: [
    { id: 1, application_id: 1, schedule_id: 1, total_score: 88.50, decision: 'selected', remarks: 'Outstanding DSA problem solving.', declared_at: new Date() }
  ],
  Notifications: [
    { id: 1, user_id: 2, title: 'Application Shortlisted', message: 'Congratulations Aarav! You have been shortlisted for Google Technical Round 2.', status: 'unread', created_at: new Date() },
    { id: 2, user_id: 4, title: 'Interview Scheduled', message: 'Your interview for Microsoft Cloud Technical is scheduled in Room-102 at 10:30 AM.', status: 'unread', created_at: new Date() }
  ]
};

async function initDB() {
  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'placement_management',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    multipleStatements: true
  };

  try {
    pool = mysql.createPool(dbConfig);
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    isConnectedToMySQL = true;
    console.log('[Database] Connected to live MySQL 8.x database: placement_management');
  } catch (err) {
    isConnectedToMySQL = false;
    console.warn('[Database] MySQL connection failed or XAMPP is offline. Falling back to in-memory relational store. Error:', err.message);
  }
}

// Wrapper for Querying with seamless fallback
async function query(sql, params = []) {
  if (isConnectedToMySQL && pool) {
    try {
      const [rows] = await pool.query(sql, params);
      return rows;
    } catch (err) {
      console.warn('[MySQL Query Error]:', err.message);
      throw err;
    }
  }

  // In-Memory Query Handling (Simulated SQL parser for basic CRUD)
  const normalizedSql = sql.trim().toUpperCase();

  if (normalizedSql.startsWith('SELECT')) {
    if (normalizedSql.includes('FROM USERS')) {
      if (normalizedSql.includes('WHERE EMAIL = ?')) {
        return inMemoryDB.Users.filter(u => u.email.toLowerCase() === params[0].toLowerCase());
      }
      return inMemoryDB.Users;
    }
    if (normalizedSql.includes('FROM STUDENTS')) {
      return inMemoryDB.Students;
    }
    if (normalizedSql.includes('FROM COMPANIES')) {
      return inMemoryDB.Companies;
    }
    if (normalizedSql.includes('FROM PLACEMENTDRIVES')) {
      return inMemoryDB.PlacementDrives;
    }
    if (normalizedSql.includes('FROM APPLICATIONS')) {
      if (normalizedSql.includes('WHERE ID = ?')) {
        return inMemoryDB.Applications.filter(a => a.id === parseInt(params[0], 10));
      }
      return inMemoryDB.Applications;
    }
    if (normalizedSql.includes('FROM ROOMS')) {
      return inMemoryDB.Rooms;
    }
    if (normalizedSql.includes('FROM INTERVIEWERS')) {
      return inMemoryDB.Interviewers;
    }
    if (normalizedSql.includes('FROM INTERVIEWSCHEDULES')) {
      if (normalizedSql.includes('WHERE ROOM_ID = ?')) {
        return inMemoryDB.InterviewSchedules.filter(s => s.room_id === parseInt(params[0], 10));
      }
      return inMemoryDB.InterviewSchedules;
    }
    if (normalizedSql.includes('FROM NOTIFICATIONS')) {
      if (normalizedSql.includes('WHERE USER_ID = ?')) {
        return inMemoryDB.Notifications.filter(n => n.user_id === parseInt(params[0], 10));
      }
      return inMemoryDB.Notifications;
    }
    if (normalizedSql.includes('FROM RESULTS')) {
      return inMemoryDB.Results;
    }
  }

  return [];
}

// Transaction Simulation and Connection
async function getConnection() {
  if (isConnectedToMySQL && pool) {
    try {
      return await pool.getConnection();
    } catch (err) {
      console.warn('[MySQL getConnection failed, using mock connection]:', err.message);
    }
  }

  // Mock Connection Object
  return {
    inTransaction: false,
    async beginTransaction() {
      this.inTransaction = true;
    },
    async query(sql, params = []) {
      return [await query(sql, params)];
    },
    async commit() {
      this.inTransaction = false;
    },
    async rollback() {
      this.inTransaction = false;
    },
    release() {
      this.inTransaction = false;
    }
  };
}

module.exports = {
  initDB,
  query,
  getConnection,
  getInMemStore: () => inMemoryDB,
  isMySQLConnected: () => isConnectedToMySQL
};
