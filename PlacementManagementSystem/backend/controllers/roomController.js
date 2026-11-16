const db = require('../config/db');
const { checkIntervalConflict } = require('../algorithms/intervalDetection');

// GET /api/placement/rooms - List all rooms
async function getAllRooms(req, res) {
  try {
    if (db.isMySQLConnected()) {
      const sql = `
        SELECT r.*,
               (SELECT COUNT(*) FROM InterviewSchedules s WHERE s.room_id = r.id AND s.status = 'scheduled') as scheduled_count
        FROM Rooms r
        ORDER BY r.room_number ASC
      `;
      const rooms = await db.query(sql);
      return res.json({ success: true, rooms: rooms || [] });
    }

    const inMem = db.getInMemStore();
    const rooms = inMem.Rooms.map(r => {
      const count = inMem.InterviewSchedules.filter(s => s.room_id === r.id && s.status === 'scheduled').length;
      return { ...r, scheduled_count: count };
    });
    res.json({ success: true, rooms });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to retrieve rooms: ' + err.message });
  }
}

// GET /api/placement/rooms/:id
async function getRoomById(req, res) {
  try {
    const roomId = parseInt(req.params.id, 10);
    if (isNaN(roomId)) {
      return res.status(400).json({ success: false, message: 'Invalid room ID.' });
    }

    if (db.isMySQLConnected()) {
      const rows = await db.query('SELECT * FROM Rooms WHERE id = ?', [roomId]);
      if (!rows || rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Room not found.' });
      }
      return res.json({ success: true, room: rows[0] });
    }

    const inMem = db.getInMemStore();
    const r = inMem.Rooms.find(rm => rm.id === roomId);
    if (!r) {
      return res.status(404).json({ success: false, message: 'Room not found.' });
    }
    res.json({ success: true, room: r });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to retrieve room: ' + err.message });
  }
}

// POST /api/placement/rooms - Add room
async function createRoom(req, res) {
  try {
    const {
      room_number,
      building,
      floor,
      capacity = 1,
      room_type = 'cabin',
      is_active = true
    } = req.body;

    if (!room_number || !building || floor === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: room_number, building, floor.'
      });
    }

    const parsedFloor = parseInt(floor, 10);
    const parsedCap = parseInt(capacity, 10) || 1;

    if (db.isMySQLConnected()) {
      const existing = await db.query('SELECT id FROM Rooms WHERE room_number = ?', [room_number]);
      if (existing && existing.length > 0) {
        return res.status(409).json({ success: false, message: `Room '${room_number}' already exists.` });
      }

      const insertRes = await db.query(
        `INSERT INTO Rooms (room_number, building, floor, capacity, room_type, is_active)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [room_number, building, parsedFloor, parsedCap, room_type, Boolean(is_active)]
      );

      const created = {
        id: insertRes.insertId,
        room_number,
        building,
        floor: parsedFloor,
        capacity: parsedCap,
        room_type,
        is_active: Boolean(is_active)
      };

      return res.status(201).json({
        success: true,
        message: 'Room registered successfully.',
        room: created
      });
    }

    // In-memory fallback
    const inMem = db.getInMemStore();
    if (inMem.Rooms.some(r => r.room_number.toLowerCase() === room_number.toLowerCase())) {
      return res.status(409).json({ success: false, message: `Room '${room_number}' already exists.` });
    }

    const newRoom = {
      id: inMem.Rooms.length + 1,
      room_number,
      building,
      floor: parsedFloor,
      capacity: parsedCap,
      room_type,
      is_active: Boolean(is_active)
    };
    inMem.Rooms.push(newRoom);

    res.status(201).json({
      success: true,
      message: 'Room registered successfully.',
      room: newRoom
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to create room: ' + err.message });
  }
}

// PUT /api/placement/rooms/:id - Update room
async function updateRoom(req, res) {
  try {
    const roomId = parseInt(req.params.id, 10);
    if (isNaN(roomId)) {
      return res.status(400).json({ success: false, message: 'Invalid room ID.' });
    }

    const { room_number, building, floor, capacity, room_type, is_active } = req.body;

    if (db.isMySQLConnected()) {
      const existing = await db.query('SELECT * FROM Rooms WHERE id = ?', [roomId]);
      if (!existing || existing.length === 0) {
        return res.status(404).json({ success: false, message: 'Room not found.' });
      }

      await db.query(
        `UPDATE Rooms 
         SET room_number = COALESCE(?, room_number),
             building = COALESCE(?, building),
             floor = COALESCE(?, floor),
             capacity = COALESCE(?, capacity),
             room_type = COALESCE(?, room_type),
             is_active = COALESCE(?, is_active)
         WHERE id = ?`,
        [
          room_number !== undefined ? room_number : null,
          building !== undefined ? building : null,
          floor !== undefined ? parseInt(floor, 10) : null,
          capacity !== undefined ? parseInt(capacity, 10) : null,
          room_type !== undefined ? room_type : null,
          is_active !== undefined ? Boolean(is_active) : null,
          roomId
        ]
      );

      const updated = await db.query('SELECT * FROM Rooms WHERE id = ?', [roomId]);
      return res.json({
        success: true,
        message: 'Room updated successfully.',
        room: updated[0]
      });
    }

    const inMem = db.getInMemStore();
    const r = inMem.Rooms.find(rm => rm.id === roomId);
    if (!r) {
      return res.status(404).json({ success: false, message: 'Room not found.' });
    }

    if (room_number !== undefined) r.room_number = room_number;
    if (building !== undefined) r.building = building;
    if (floor !== undefined) r.floor = parseInt(floor, 10);
    if (capacity !== undefined) r.capacity = parseInt(capacity, 10);
    if (room_type !== undefined) r.room_type = room_type;
    if (is_active !== undefined) r.is_active = Boolean(is_active);

    res.json({
      success: true,
      message: 'Room updated successfully.',
      room: r
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update room: ' + err.message });
  }
}

// DELETE /api/placement/rooms/:id - Delete room
async function deleteRoom(req, res) {
  try {
    const roomId = parseInt(req.params.id, 10);
    if (isNaN(roomId)) {
      return res.status(400).json({ success: false, message: 'Invalid room ID.' });
    }

    if (db.isMySQLConnected()) {
      // Check if scheduled
      const schedules = await db.query('SELECT id FROM InterviewSchedules WHERE room_id = ?', [roomId]);
      if (schedules && schedules.length > 0) {
        return res.status(409).json({
          success: false,
          message: `Cannot delete room #${roomId}: ${schedules.length} interview schedule(s) are bound to it. Please reallocate or cancel the schedules first.`
        });
      }

      await db.query('DELETE FROM Rooms WHERE id = ?', [roomId]);
      return res.json({ success: true, message: `Room #${roomId} deleted successfully.` });
    }

    const inMem = db.getInMemStore();
    const idx = inMem.Rooms.findIndex(r => r.id === roomId);
    if (idx === -1) {
      return res.status(404).json({ success: false, message: 'Room not found.' });
    }

    const boundSchedules = inMem.InterviewSchedules.filter(s => s.room_id === roomId);
    if (boundSchedules.length > 0) {
      return res.status(409).json({
        success: false,
        message: `Cannot delete room #${roomId}: ${boundSchedules.length} interview schedule(s) are bound to it.`
      });
    }

    inMem.Rooms.splice(idx, 1);
    res.json({ success: true, message: `Room #${roomId} deleted successfully.` });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete room: ' + err.message });
  }
}

// POST /api/placement/rooms/check-availability - Check availability for a time slot
async function checkAvailability(req, res) {
  try {
    const { room_id, start_time, end_time } = req.body;
    if (!room_id || !start_time || !end_time) {
      return res.status(400).json({
        success: false,
        message: 'room_id, start_time, and end_time are required.'
      });
    }

    const parsedRoomId = parseInt(room_id, 10);

    if (db.isMySQLConnected()) {
      const roomRows = await db.query('SELECT * FROM Rooms WHERE id = ?', [parsedRoomId]);
      if (!roomRows || roomRows.length === 0) {
        return res.status(404).json({ success: false, message: 'Room not found.' });
      }

      const conflicts = await db.query(
        `SELECT sch.*, inv.name as interviewer_name, s.name as candidate_name
         FROM InterviewSchedules sch
         JOIN Interviewers inv ON sch.interviewer_id = inv.id
         JOIN Applications a ON sch.application_id = a.id
         JOIN Students s ON a.student_id = s.id
         WHERE sch.room_id = ? AND sch.status = 'scheduled'
           AND (sch.start_time < ? AND sch.end_time > ?)`,
        [parsedRoomId, end_time, start_time]
      );

      const isAvailable = (!conflicts || conflicts.length === 0);
      return res.json({
        success: true,
        available: isAvailable,
        roomId: parsedRoomId,
        room: roomRows[0],
        conflictsCount: conflicts ? conflicts.length : 0,
        conflictingSchedules: conflicts || []
      });
    }

    // In-memory
    const inMem = db.getInMemStore();
    const room = inMem.Rooms.find(r => r.id === parsedRoomId);
    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found.' });
    }

    const existing = inMem.InterviewSchedules.filter(s => s.room_id === parsedRoomId && s.status === 'scheduled');
    const result = checkIntervalConflict({
      roomId: parsedRoomId,
      startTime: start_time,
      endTime: end_time,
      existingSchedules: existing
    });

    res.json({
      success: true,
      available: !result.hasConflict,
      roomId: parsedRoomId,
      room,
      conflictsCount: result.conflictCount,
      conflictingSchedules: result.conflictingSchedules
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Availability check failed: ' + err.message });
  }
}

module.exports = {
  getAllRooms,
  getRoomById,
  createRoom,
  updateRoom,
  deleteRoom,
  checkAvailability
};
