const express = require('express');
const router = express.Router();
const { checkIntervalConflict } = require('../algorithms/intervalDetection');
const { allocateRoomsGreedy } = require('../algorithms/greedyRoomAllocation');
const db = require('../config/db');

// Implementation 1: Interval Overlap Detection Endpoint
router.post('/check-conflict', async (req, res) => {
  try {
    const { roomId, interviewerId, startTime, endTime, customSchedules } = req.body;

    if (!startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters: startTime and endTime are mandatory.'
      });
    }

    // Use custom schedules if provided, or fetch active schedules from database
    let schedules = customSchedules;
    if (!schedules || !Array.isArray(schedules) || schedules.length === 0) {
      schedules = await db.query('SELECT * FROM InterviewSchedules WHERE status = "scheduled"');
      if (!schedules || schedules.length === 0) {
        schedules = db.getInMemStore().InterviewSchedules;
      }
    }

    const result = checkIntervalConflict({
      roomId,
      interviewerId,
      startTime,
      endTime,
      existingSchedules: schedules
    });

    res.json({
      success: true,
      data: result
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Interval Detection Error: ' + err.message
    });
  }
});

// Implementation 2: Greedy Room Allocation Endpoint
router.post('/allocate-rooms', (req, res) => {
  try {
    const { interviews } = req.body;

    if (!interviews || !Array.isArray(interviews) || interviews.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid input: Expected an array of interview schedules [{ id, start, end }].'
      });
    }

    const result = allocateRoomsGreedy(interviews);
    res.json({
      success: true,
      data: result
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Greedy Allocation Error: ' + err.message
    });
  }
});

// Helper: Fetch existing schedules from database for demo UI
router.get('/existing-schedules', async (req, res) => {
  try {
    let schedules = await db.query('SELECT * FROM InterviewSchedules WHERE status = "scheduled"');
    if (!schedules || schedules.length === 0) {
      schedules = db.getInMemStore().InterviewSchedules;
    }
    res.json({ success: true, schedules });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
