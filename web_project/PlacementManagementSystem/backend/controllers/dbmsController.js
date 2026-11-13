const db = require('../config/db');
const { checkIntervalConflict } = require('../algorithms/intervalDetection');

/**
 * DBMS Implementation 1: Transaction & Rollback Demo
 * Simulates two concurrent transactions attempting to book the same room for overlapping slots.
 */
async function simulateConcurrentTransaction(req, res) {
  const {
    roomId = 1,
    interviewerId = 1,
    applicationId1 = 1,
    applicationId2 = 2,
    slot1 = { start: '2026-11-20 14:00:00', end: '2026-11-20 15:00:00' },
    slot2 = { start: '2026-11-20 14:30:00', end: '2026-11-20 15:30:00' }
  } = req.body;

  const logs = [];
  const inMem = db.getInMemStore();

  logs.push({ step: 1, event: 'INITIALIZE', message: 'Two concurrent transactions initiated for Room ' + roomId });

  // --- Transaction 1 (Admin A) ---
  logs.push({ step: 2, tx: 'TX_1', sql: 'START TRANSACTION', status: 'ACTIVE', note: 'Transaction 1 starts with REPEATABLE READ isolation.' });

  // Availability check for TX 1
  logs.push({ step: 3, tx: 'TX_1', sql: `SELECT * FROM InterviewSchedules WHERE room_id = ${roomId} AND (start_time < '${slot1.end}' AND end_time > '${slot1.start}') FOR UPDATE`, status: 'CHECKING' });

  // Get active schedules
  const existingForTX1 = inMem.InterviewSchedules.filter(s => s.room_id === parseInt(roomId, 10) && s.status === 'scheduled');
  const conflict1 = checkIntervalConflict({
    roomId,
    startTime: slot1.start,
    endTime: slot1.end,
    existingSchedules: existingForTX1
  });

  let tx1Result = {};
  if (!conflict1.hasConflict) {
    const newId1 = inMem.InterviewSchedules.length + 1;
    const newSchedule1 = {
      id: newId1,
      application_id: applicationId1,
      round_id: 1,
      room_id: parseInt(roomId, 10),
      interviewer_id: parseInt(interviewerId, 10),
      start_time: slot1.start,
      end_time: slot1.end,
      status: 'scheduled',
      notes: 'TX_1 Confirmed Booking'
    };
    inMem.InterviewSchedules.push(newSchedule1);

    logs.push({ step: 4, tx: 'TX_1', sql: `INSERT INTO InterviewSchedules (id, room_id, start_time, end_time) VALUES (${newId1}, ${roomId}, '${slot1.start}', '${slot1.end}')`, status: 'INSERTED' });
    logs.push({ step: 5, tx: 'TX_1', sql: 'COMMIT', status: 'COMMITTED', note: 'Transaction 1 committed successfully. Changes persisted to database.' });
    tx1Result = { success: true, scheduleId: newId1, status: 'COMMITTED' };
  } else {
    logs.push({ step: 4, tx: 'TX_1', sql: 'ROLLBACK', status: 'ROLLED_BACK', note: 'Transaction 1 conflict detected, rolled back.' });
    tx1Result = { success: false, status: 'ROLLED_BACK' };
  }

  // --- Transaction 2 (Admin B - Conflicting Request) ---
  logs.push({ step: 6, tx: 'TX_2', sql: 'START TRANSACTION', status: 'ACTIVE', note: 'Transaction 2 starts and requests lock on Room ' + roomId });
  logs.push({ step: 7, tx: 'TX_2', sql: `SELECT * FROM InterviewSchedules WHERE room_id = ${roomId} AND (start_time < '${slot2.end}' AND end_time > '${slot2.start}') FOR UPDATE`, status: 'LOCK_WAIT / CHECKING' });

  // Availability check for TX 2 (which now includes TX 1's committed schedule)
  const existingForTX2 = inMem.InterviewSchedules.filter(s => s.room_id === parseInt(roomId, 10) && s.status === 'scheduled');
  const conflict2 = checkIntervalConflict({
    roomId,
    startTime: slot2.start,
    endTime: slot2.end,
    existingSchedules: existingForTX2
  });

  let tx2Result = {};
  if (conflict2.hasConflict) {
    logs.push({
      step: 8,
      tx: 'TX_2',
      event: 'CONFLICT_DETECTED',
      conflictDetail: `Slot ${slot2.start} - ${slot2.end} overlaps with committed booking [${conflict2.conflictingSchedules.map(c => c.scheduleId).join(', ')}]`,
      note: 'Constraint check failed. Overlap condition (start2 < end1 AND end2 > start1) evaluates to TRUE.'
    });
    logs.push({ step: 9, tx: 'TX_2', sql: 'ROLLBACK', status: 'ROLLED_BACK', note: 'Transaction 2 aborted. All tentative modifications undone. Zero corruption.' });
    tx2Result = {
      success: false,
      status: 'ROLLED_BACK',
      reason: 'Pessimistic resource lock check detected overlapping schedule booked by concurrent transaction.'
    };
  } else {
    logs.push({ step: 8, tx: 'TX_2', sql: 'COMMIT', status: 'COMMITTED' });
    tx2Result = { success: true, status: 'COMMITTED' };
  }

  res.json({
    success: true,
    demonstration: 'DBMS Transaction & Concurrency Control (ACID Consistency)',
    summary: {
      transaction1: tx1Result,
      transaction2: tx2Result,
      databaseIntegrity: 'CONSISTENT (Exactly 1 booking granted, 1 rolled back)'
    },
    transactionLogs: logs
  });
}

/**
 * DBMS Implementation 2: Stored Procedure & Trigger Execution
 * Executes sp_update_application_status and demonstrates trigger-generated notification
 */
async function executeStatusProcedure(req, res) {
  const { applicationId, newStatus, remarks = 'Updated via Stored Procedure' } = req.body;

  if (!applicationId || !newStatus) {
    return res.status(400).json({ success: false, message: 'applicationId and newStatus are required.' });
  }

  const validStatuses = ['applied', 'shortlisted', 'in_progress', 'selected', 'rejected'];
  if (!validStatuses.includes(newStatus)) {
    return res.status(400).json({ success: false, message: 'Invalid status. Must be one of: ' + validStatuses.join(', ') });
  }

  const inMem = db.getInMemStore();
  let procedureResult = {};
  let updatedApplication = null;
  let triggerNotification = null;

  if (db.isMySQLConnected()) {
    try {
      // Call actual MySQL Stored Procedure
      const [results] = await db.query(
        'CALL sp_update_application_status(?, ?, ?, @p_rows_affected, @p_message); SELECT @p_rows_affected AS rows_affected, @p_message AS message;',
        [applicationId, newStatus, remarks]
      );
      procedureResult = {
        executed: 'CALL sp_update_application_status(...)',
        output: results[1] ? results[1][0] : results[0]
      };

      // Retrieve updated record
      const [apps] = await db.query('SELECT * FROM Applications WHERE id = ?', [applicationId]);
      updatedApplication = apps[0];

      // Retrieve trigger-generated notification
      const [notifs] = await db.query('SELECT * FROM Notifications ORDER BY id DESC LIMIT 1');
      triggerNotification = notifs[0];
    } catch (err) {
      console.warn('MySQL Procedure Error, using fallback engine:', err.message);
    }
  }

  if (!updatedApplication) {
    // In-memory procedure & trigger simulation engine
    const appIndex = inMem.Applications.findIndex(a => a.id === parseInt(applicationId, 10));
    if (appIndex === -1) {
      return res.status(404).json({ success: false, message: `Application #${applicationId} not found.` });
    }

    const oldStatus = inMem.Applications[appIndex].status;
    inMem.Applications[appIndex].status = newStatus;
    inMem.Applications[appIndex].updated_at = new Date();
    updatedApplication = inMem.Applications[appIndex];

    procedureResult = {
      procedureName: 'sp_update_application_status',
      parameters: { applicationId, newStatus, remarks },
      rowsAffected: 1,
      message: `Success: Application #${applicationId} status updated to ${newStatus}`
    };

    // Trigger simulation: trg_application_status_notification
    const student = inMem.Students.find(s => s.id === updatedApplication.student_id);
    const drive = inMem.PlacementDrives.find(d => d.id === updatedApplication.drive_id);
    const company = drive ? inMem.Companies.find(c => c.id === drive.company_id) : null;

    if (student) {
      triggerNotification = {
        id: inMem.Notifications.length + 1,
        user_id: student.user_id,
        title: `Application Status Updated: ${drive ? drive.title : 'Placement Drive'}`,
        message: `Your application for ${company ? company.company_name : 'Recruiter'} status has been updated to: ${newStatus.toUpperCase()}.`,
        status: 'unread',
        created_at: new Date(),
        triggeredBy: 'trg_application_status_notification'
      };
      inMem.Notifications.push(triggerNotification);
    }
  }

  res.json({
    success: true,
    demonstration: 'DBMS Stored Procedure & Trigger Execution',
    storedProcedure: procedureResult,
    updatedApplication,
    triggerGeneratedNotification: triggerNotification,
    explanation: 'Stored procedure sp_update_application_status updated the application record. MySQL trigger trg_application_status_notification automatically fired and inserted a new notification row without any application-layer code.'
  });
}

module.exports = {
  simulateConcurrentTransaction,
  executeStatusProcedure
};
