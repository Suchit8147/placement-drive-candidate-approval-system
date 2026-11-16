const express = require('express');
const router = express.Router();
const dbmsController = require('../controllers/dbmsController');

// Implementation 1: Transactions and Rollback Demo
router.post('/transaction-demo', dbmsController.simulateConcurrentTransaction);

// Implementation 2: Stored Procedure & Trigger Execution
router.post('/execute-procedure', dbmsController.executeStatusProcedure);

module.exports = router;
