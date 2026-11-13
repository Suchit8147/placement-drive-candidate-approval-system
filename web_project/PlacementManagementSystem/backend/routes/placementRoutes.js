const express = require('express');
const router = express.Router();
const db = require('../config/db');

// List all placement drives
router.get('/drives', async (req, res) => {
  try {
    let drives = await db.query('SELECT * FROM PlacementDrives');
    if (!drives || drives.length === 0) drives = db.getInMemStore().PlacementDrives;
    res.json({ success: true, drives });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// List student applications
router.get('/applications', async (req, res) => {
  try {
    let apps = await db.query('SELECT * FROM Applications');
    if (!apps || apps.length === 0) apps = db.getInMemStore().Applications;
    res.json({ success: true, applications: apps });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// List rooms catalog
router.get('/rooms', async (req, res) => {
  try {
    let rooms = await db.query('SELECT * FROM Rooms');
    if (!rooms || rooms.length === 0) rooms = db.getInMemStore().Rooms;
    res.json({ success: true, rooms });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// List interviewers catalog
router.get('/interviewers', async (req, res) => {
  try {
    let interviewers = await db.query('SELECT * FROM Interviewers');
    if (!interviewers || interviewers.length === 0) interviewers = db.getInMemStore().Interviewers;
    res.json({ success: true, interviewers });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// List notifications
router.get('/notifications', async (req, res) => {
  try {
    let notifs = await db.query('SELECT * FROM Notifications ORDER BY id DESC');
    if (!notifs || notifs.length === 0) notifs = db.getInMemStore().Notifications;
    res.json({ success: true, notifications: notifs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Apply for a placement drive
router.post('/apply', async (req, res) => {
  try {
    const { studentId = 1, driveId = 1 } = req.body;
    const inMem = db.getInMemStore();
    const existing = inMem.Applications.find(a => a.student_id === studentId && a.drive_id === driveId);
    if (existing) {
      return res.status(409).json({ success: false, message: 'You have already applied for this placement drive.' });
    }

    const newApp = {
      id: inMem.Applications.length + 1,
      drive_id: driveId,
      student_id: studentId,
      status: 'applied',
      current_round_id: 1,
      applied_at: new Date()
    };
    inMem.Applications.push(newApp);

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully.',
      application: newApp
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
