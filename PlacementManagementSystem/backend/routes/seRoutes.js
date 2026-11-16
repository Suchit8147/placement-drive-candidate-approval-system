const express = require('express');
const router = express.Router();
const { requirementsList } = require('../engines/se/traceabilityData');
const { runAllTestCases } = require('../engines/se/testRunner');

// Implementation 1: Requirement Traceability Matrix Endpoint
router.get('/traceability', (req, res) => {
  res.json({
    success: true,
    data: requirementsList,
    totalRequirements: requirementsList.length
  });
});

// Implementation 2: Automated Test Execution & Result Tracking Endpoint
router.post('/run-tests', async (req, res) => {
  try {
    const testSuiteResult = await runAllTestCases();
    res.json({
      success: true,
      data: testSuiteResult
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Test Runner Error: ' + err.message
    });
  }
});

module.exports = router;
