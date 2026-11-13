const express = require('express');
const router = express.Router();
const { runFCFS } = require('../engines/ospp/fcfsScheduler');
const { runPriorityScheduling } = require('../engines/ospp/priorityScheduler');

// Implementation 1: FCFS Scheduling Endpoint
router.post('/fcfs', (req, res) => {
  try {
    const { processes } = req.body;
    if (!processes || !Array.isArray(processes) || processes.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid input: Expected non-empty array of processes [{ id, arrivalTime, burstTime }]'
      });
    }

    const output = runFCFS(processes);
    res.json({ success: true, data: output });
  } catch (err) {
    res.status(500).json({ success: false, message: 'FCFS Scheduling Error: ' + err.message });
  }
});

// Implementation 2: Priority Scheduling Endpoint
router.post('/priority', (req, res) => {
  try {
    const { processes, lowerNumberHigherPriority } = req.body;
    if (!processes || !Array.isArray(processes) || processes.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid input: Expected non-empty array of processes [{ id, arrivalTime, burstTime, priority }]'
      });
    }

    const output = runPriorityScheduling(processes, { lowerNumberHigherPriority });
    res.json({ success: true, data: output });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Priority Scheduling Error: ' + err.message });
  }
});

module.exports = router;
