const db = require('../config/db');

// GET /api/placement/overview - System KPI statistics
async function getSystemOverview(req, res) {
  try {
    const isConnected = db.isMySQLConnected();

    if (isConnected) {
      const drivesRes = await db.query('SELECT COUNT(*) as count FROM PlacementDrives WHERE status = "active"');
      const appsRes = await db.query('SELECT COUNT(*) as count FROM Applications');
      const roomsRes = await db.query('SELECT COUNT(*) as count FROM Rooms WHERE is_active = TRUE');
      const schedsRes = await db.query('SELECT COUNT(*) as count FROM InterviewSchedules WHERE status = "scheduled"');
      const studsRes = await db.query('SELECT COUNT(*) as count FROM Students');
      const compsRes = await db.query('SELECT COUNT(*) as count FROM Companies');
      const invsRes = await db.query('SELECT COUNT(*) as count FROM Interviewers');
      const resultsRes = await db.query('SELECT COUNT(*) as count FROM Results');
      const notifsRes = await db.query('SELECT COUNT(*) as count FROM Notifications WHERE status = "unread"');

      return res.json({
        success: true,
        database: {
          connected: true,
          mode: 'MySQL 8.x Live (XAMPP)',
          databaseName: process.env.DB_NAME || 'placement_management'
        },
        stats: {
          activeDrives: (drivesRes && drivesRes[0]) ? drivesRes[0].count : 0,
          totalApplications: (appsRes && appsRes[0]) ? appsRes[0].count : 0,
          provisionedRooms: (roomsRes && roomsRes[0]) ? roomsRes[0].count : 0,
          scheduledSlots: (schedsRes && schedsRes[0]) ? schedsRes[0].count : 0,
          totalStudents: (studsRes && studsRes[0]) ? studsRes[0].count : 0,
          totalCompanies: (compsRes && compsRes[0]) ? compsRes[0].count : 0,
          totalInterviewers: (invsRes && invsRes[0]) ? invsRes[0].count : 0,
          totalResults: (resultsRes && resultsRes[0]) ? resultsRes[0].count : 0,
          unreadNotifications: (notifsRes && notifsRes[0]) ? notifsRes[0].count : 0
        }
      });
    }

    // In-memory fallback
    const inMem = db.getInMemStore();
    res.json({
      success: true,
      database: {
        connected: false,
        mode: 'In-Memory Relational Engine (XAMPP Offline)',
        databaseName: 'placement_management'
      },
      stats: {
        activeDrives: inMem.PlacementDrives.filter(d => d.status === 'active').length,
        totalApplications: inMem.Applications.length,
        provisionedRooms: inMem.Rooms.filter(r => r.is_active).length,
        scheduledSlots: inMem.InterviewSchedules.filter(s => s.status === 'scheduled').length,
        totalStudents: inMem.Students.length,
        totalCompanies: inMem.Companies.length,
        totalInterviewers: inMem.Interviewers.length,
        totalResults: inMem.Results.length,
        unreadNotifications: inMem.Notifications.filter(n => n.status === 'unread').length
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Overview failed: ' + err.message });
  }
}

// GET /api/placement/users - List all users
async function getAllUsers(req, res) {
  try {
    if (db.isMySQLConnected()) {
      const users = await db.query('SELECT id, email, role, created_at FROM Users ORDER BY id ASC');
      return res.json({ success: true, users: users || [] });
    }

    const inMem = db.getInMemStore();
    const users = inMem.Users.map(u => ({ id: u.id, email: u.email, role: u.role, created_at: u.created_at }));
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to retrieve users: ' + err.message });
  }
}

// POST /api/placement/reconnect-db - Try reconnecting to MySQL
async function reconnectDB(req, res) {
  try {
    await db.initDB();
    const isConnected = db.isMySQLConnected();
    res.json({
      success: true,
      connected: isConnected,
      message: isConnected
        ? 'Successfully connected to MySQL database: placement_management'
        : 'Could not connect to MySQL in XAMPP. Please ensure MySQL is started in XAMPP Control Panel.'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = {
  getSystemOverview,
  getAllUsers,
  reconnectDB
};
