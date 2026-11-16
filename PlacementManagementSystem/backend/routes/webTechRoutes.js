const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

// Implementation 1: Form Validation Demo Endpoint
router.post('/validate-demo', (req, res) => {
  const { formType, formData } = req.body;
  const results = [];
  let isValid = true;

  if (formType === 'student_registration') {
    // 1. Name
    if (!formData.name || !formData.name.trim()) {
      results.push({ field: 'name', valid: false, message: 'Student full name is required.' });
      isValid = false;
    } else {
      results.push({ field: 'name', valid: true, message: 'Valid student name.' });
    }

    // 2. Email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email || !emailRegex.test(formData.email)) {
      results.push({ field: 'email', valid: false, message: 'Valid institutional email is required (e.g., student@college.edu).' });
      isValid = false;
    } else {
      results.push({ field: 'email', valid: true, message: 'Valid email address format.' });
    }

    // 3. Password
    if (!formData.password || formData.password.length < 6) {
      results.push({ field: 'password', valid: false, message: 'Password must be at least 6 characters.' });
      isValid = false;
    } else {
      results.push({ field: 'password', valid: true, message: 'Password meets length requirement.' });
    }

    // 4. CGPA
    const cgpa = parseFloat(formData.cgpa);
    if (isNaN(cgpa) || cgpa < 0.0 || cgpa > 10.0) {
      results.push({ field: 'cgpa', valid: false, message: 'CGPA must be a valid number between 0.00 and 10.00.' });
      isValid = false;
    } else {
      results.push({ field: 'cgpa', valid: true, message: `Valid CGPA: ${cgpa.toFixed(2)}` });
    }
  } else if (formType === 'interview_scheduling') {
    // 1. Room ID
    if (!formData.room_id || isNaN(parseInt(formData.room_id, 10))) {
      results.push({ field: 'room_id', valid: false, message: 'Valid Room selection is required.' });
      isValid = false;
    } else {
      results.push({ field: 'room_id', valid: true, message: `Selected Room ID: ${formData.room_id}` });
    }

    // 2. Start & End Time
    const start = new Date(formData.start_time);
    const end = new Date(formData.end_time);

    if (isNaN(start.getTime())) {
      results.push({ field: 'start_time', valid: false, message: 'Valid start date/time is required.' });
      isValid = false;
    } else {
      results.push({ field: 'start_time', valid: true, message: 'Valid start time.' });
    }

    if (isNaN(end.getTime())) {
      results.push({ field: 'end_time', valid: false, message: 'Valid end date/time is required.' });
      isValid = false;
    } else if (!isNaN(start.getTime()) && end <= start) {
      results.push({ field: 'end_time', valid: false, message: 'End time must be strictly after start time.' });
      isValid = false;
    } else {
      results.push({ field: 'end_time', valid: true, message: 'Valid end time and duration.' });
    }
  } else {
    return res.status(400).json({ success: false, message: 'Unknown form type: ' + formType });
  }

  res.json({
    success: true,
    formType,
    isValid,
    validationResults: results,
    timestamp: new Date().toISOString()
  });
});

// Implementation 2: Role-Based Access Control Protected Routes
router.get('/admin-only', authenticateToken, authorizeRoles('admin'), (req, res) => {
  res.json({
    success: true,
    message: 'Access Granted: Welcome to the Admin Control Panel.',
    user: req.user,
    role: req.user.role
  });
});

router.get('/student-only', authenticateToken, authorizeRoles('student'), (req, res) => {
  res.json({
    success: true,
    message: 'Access Granted: Welcome to the Student Portal.',
    user: req.user,
    role: req.user.role
  });
});

router.get('/hr-only', authenticateToken, authorizeRoles('hr'), (req, res) => {
  res.json({
    success: true,
    message: 'Access Granted: Welcome to the HR / Recruiter Portal.',
    user: req.user,
    role: req.user.role
  });
});

router.get('/interviewer-only', authenticateToken, authorizeRoles('interviewer'), (req, res) => {
  res.json({
    success: true,
    message: 'Access Granted: Welcome to the Interviewer Evaluation Panel.',
    user: req.user,
    role: req.user.role
  });
});

// RBAC Simulator Demo (Allows testing any role credentials against any target endpoint)
router.post('/simulate-rbac', (req, res) => {
  const { simulatedRole, targetResource } = req.body;
  const permissions = {
    admin: ['admin-only', 'student-only', 'hr-only', 'interviewer-only'],
    student: ['student-only'],
    hr: ['hr-only'],
    interviewer: ['interviewer-only']
  };

  const allowedResources = permissions[simulatedRole] || [];
  const isAuthorized = allowedResources.includes(targetResource);

  res.json({
    success: true,
    simulatedRole,
    targetResource,
    isAuthorized,
    status: isAuthorized ? 200 : 403,
    explanation: isAuthorized
      ? `Role '${simulatedRole}' possesses required authorization for resource '${targetResource}'.`
      : `Role '${simulatedRole}' is forbidden from accessing resource '${targetResource}'. Only authorized roles can access this.`
  });
});

module.exports = router;
