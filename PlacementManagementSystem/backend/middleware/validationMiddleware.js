/**
 * Web Technology Engine - Implementation 1: Server-Side Form Validation Middleware
 */

function validateRegistration(req, res, next) {
  const { email, password, role } = req.body;
  const errors = [];

  if (!email || typeof email !== 'string' || !email.trim()) {
    errors.push('Email is required.');
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      errors.push('Invalid email format (e.g., user@college.edu).');
    }
  }

  if (!password || typeof password !== 'string') {
    errors.push('Password is required.');
  } else if (password.length < 6) {
    errors.push('Password must be at least 6 characters long.');
  }

  const validRoles = ['admin', 'student', 'hr', 'interviewer'];
  if (!role || !validRoles.includes(role)) {
    errors.push(`Role must be one of: ${validRoles.join(', ')}.`);
  }

  if (errors.length > 0) {
    return res.status(400).json({ success: false, errors });
  }

  next();
}

function validateLogin(req, res, next) {
  const { email, password } = req.body;
  const errors = [];

  if (!email || !email.trim()) errors.push('Email is required.');
  if (!password) errors.push('Password is required.');

  if (errors.length > 0) {
    return res.status(400).json({ success: false, errors });
  }

  next();
}

function validateDriveCreation(req, res, next) {
  const { title, job_role, ctc_lpa, min_cgpa, drive_date } = req.body;
  const errors = [];

  if (!title || !title.trim()) errors.push('Drive title is required.');
  if (!job_role || !job_role.trim()) errors.push('Job role is required.');

  const ctc = parseFloat(ctc_lpa);
  if (isNaN(ctc) || ctc <= 0) {
    errors.push('CTC must be a positive numeric value in LPA.');
  }

  const cgpa = parseFloat(min_cgpa);
  if (isNaN(cgpa) || cgpa < 0.0 || cgpa > 10.0) {
    errors.push('Minimum CGPA must be a numeric value between 0.00 and 10.00.');
  }

  if (!drive_date || isNaN(Date.parse(drive_date))) {
    errors.push('Valid drive date is required.');
  }

  if (errors.length > 0) {
    return res.status(400).json({ success: false, errors });
  }

  next();
}

function validateInterviewScheduling(req, res, next) {
  const { room_id, interviewer_id, start_time, end_time } = req.body;
  const errors = [];

  if (!room_id || isNaN(parseInt(room_id, 10))) errors.push('Valid Room ID is required.');
  if (!interviewer_id || isNaN(parseInt(interviewer_id, 10))) errors.push('Valid Interviewer ID is required.');

  const start = new Date(start_time);
  const end = new Date(end_time);

  if (isNaN(start.getTime())) errors.push('Valid start time is required.');
  if (isNaN(end.getTime())) errors.push('Valid end time is required.');

  if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
    if (end <= start) {
      errors.push('Invalid time range: End time must be strictly after start time.');
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({ success: false, errors });
  }

  next();
}

module.exports = {
  validateRegistration,
  validateLogin,
  validateDriveCreation,
  validateInterviewScheduling
};
